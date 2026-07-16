const express = require('express');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all challenges accessible to team
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const team = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(req.team.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const challenges = db.prepare(`
      SELECT c.*,
        CASE WHEN sc.id IS NOT NULL THEN 1 ELSE 0 END as is_solved,
        sc.solved_at
      FROM challenges c
      LEFT JOIN solved_challenges sc ON sc.challenge_id = c.id AND sc.team_id = ?
      WHERE c.is_active = 1
      ORDER BY c.round_number, c.order_in_round
    `).all(team.id);

    // Hide flags for non-admin
    const sanitized = challenges.map(c => ({
      ...c,
      flag: undefined,
      hints: JSON.parse(c.hints || '[]'),
    }));

    res.json({ challenges: sanitized, team_round: team.current_round });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit flag
router.post('/:id/submit', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const challengeId = parseInt(req.params.id);
    const { flag } = req.body;

    if (!flag) return res.status(400).json({ error: 'Flag required' });

    const team = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(req.team.id);
    const challenge = db.prepare(`SELECT * FROM challenges WHERE id = ? AND is_active = 1`).get(challengeId);

    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    // Check round access
    if (challenge.round_number > team.current_round) {
      return res.status(403).json({ error: 'Round not yet unlocked' });
    }

    // Already solved?
    const alreadySolved = db.prepare(`
      SELECT id FROM solved_challenges WHERE team_id = ? AND challenge_id = ?
    `).get(team.id, challengeId);
    if (alreadySolved) return res.status(400).json({ error: 'Already solved', already_solved: true });

    // Check timer
    const config = {};
    db.prepare(`SELECT key, value FROM competition_config`).all().forEach(r => config[r.key] = r.value);
    const timerKey = ['easy', 'medium', 'hard'][challenge.round_number - 1];
    const timerMinutes = parseInt(config[`${timerKey}_time_minutes`] || 999);
    const roundTimer = db.prepare(`SELECT * FROM round_timers WHERE team_id = ? AND round_number = ?`).get(team.id, challenge.round_number);

    if (roundTimer) {
      const elapsed = (Date.now() - new Date(roundTimer.started_at).getTime()) / 60000;
      if (elapsed > timerMinutes) {
        return res.status(403).json({ error: 'Time expired for this round', time_expired: true });
      }
    }

    // Record submission
    const isCorrect = flag.trim() === challenge.flag.trim() ? 1 : 0;

    if (!isCorrect) {
      db.prepare(`
        INSERT INTO submissions (team_id, challenge_id, flag_submitted, is_correct, points_awarded)
        VALUES (?, ?, ?, 0, 0)
      `).run(team.id, challengeId, flag);
      return res.json({ correct: false, message: 'Wrong flag. Keep trying, agent.' });
    }

    // Calculate bonuses
    let bonus = 0;
    let bonusReasons = [];

    // First blood check
    const firstBlood = db.prepare(`
      SELECT id FROM solved_challenges WHERE challenge_id = ? LIMIT 1
    `).get(challengeId);
    if (!firstBlood) {
      bonus += parseInt(config.first_blood_bonus || 50);
      bonusReasons.push('First Blood');
    }

    // Speed bonus
    if (roundTimer) {
      const elapsed = (Date.now() - new Date(roundTimer.started_at).getTime()) / 60000;
      if (elapsed <= parseInt(config.speed_bonus_minutes || 5)) {
        bonus += parseInt(config.speed_bonus || 20);
        bonusReasons.push('Speed Bonus');
      }
    }

    const totalPoints = challenge.points + bonus;

    // Mark as solved
    db.prepare(`
      INSERT OR IGNORE INTO solved_challenges (team_id, challenge_id) VALUES (?, ?)
    `).run(team.id, challengeId);

    // Record submission
    db.prepare(`
      INSERT INTO submissions (team_id, challenge_id, flag_submitted, is_correct, points_awarded, bonus_points)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(team.id, challengeId, flag, challenge.points, bonus);

    // Update team score
    db.prepare(`
      UPDATE teams SET
        score = score + ?,
        challenges_solved = challenges_solved + 1,
        last_submission = datetime('now')
      WHERE id = ?
    `).run(totalPoints, team.id);

    // Check round completion
    const roundChallenges = db.prepare(`SELECT id FROM challenges WHERE round_number = ? AND is_active = 1`).all(challenge.round_number);
    const solvedInRound = db.prepare(`
      SELECT COUNT(*) as count FROM solved_challenges
      WHERE team_id = ? AND challenge_id IN (${roundChallenges.map(() => '?').join(',')})
    `).get(team.id, ...roundChallenges.map(c => c.id));

    let roundComplete = false;
    let roundUnlocked = false;
    let qualifyFailed = false;
    let updatedTeam = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(team.id);

    if (solvedInRound.count === roundChallenges.length) {
      roundComplete = true;

      // Check qualifying score for next round
      const qualifyKey = ['easy_qualify_score', 'medium_qualify_score'][challenge.round_number - 1];
      const qualifyScore = qualifyKey ? parseInt(config[qualifyKey] || 0) : 0;

      if (challenge.round_number < 3) {
        if (updatedTeam.score >= qualifyScore) {
          db.prepare(`UPDATE teams SET current_round = ? WHERE id = ?`).run(challenge.round_number + 1, team.id);
          roundUnlocked = true;

          // Start timer for next round
          const nextRoundKey = ['medium', 'hard'][challenge.round_number - 1];
          db.prepare(`
            INSERT OR IGNORE INTO round_timers (team_id, round_number, started_at)
            VALUES (?, ?, datetime('now'))
          `).run(team.id, challenge.round_number + 1);
        } else {
          qualifyFailed = true;
        }
      }

      // Award achievement for perfect round
      const perfectRound = db.prepare(`
        SELECT COUNT(*) as c FROM submissions WHERE team_id = ? AND is_correct = 0 AND challenge_id IN (${roundChallenges.map(() => '?').join(',')})
      `).get(team.id, ...roundChallenges.map(c => c.id));
      if (perfectRound.c === 0) {
        db.prepare(`INSERT OR IGNORE INTO achievements (team_id, badge) VALUES (?, ?)`).run(team.id, 'Perfect Round');
      }
    }

    // First blood achievement
    if (!firstBlood) {
      db.prepare(`INSERT OR IGNORE INTO achievements (team_id, badge) VALUES (?, ?)`).run(team.id, 'First Blood');
    }

    updatedTeam = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(team.id);

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('leaderboard:update');
      if (roundUnlocked) {
        req.app.get('io').to(`team_${team.id}`).emit('round:unlock', { round: challenge.round_number + 1 });
      }
      if (!firstBlood) {
        req.app.get('io').emit('first_blood', { team: team.name, challenge: challenge.title });
      }
    }

    res.json({
      correct: true,
      points: challenge.points,
      bonus,
      bonusReasons,
      totalPoints,
      newScore: updatedTeam.score,
      roundComplete,
      roundUnlocked,
      qualifyFailed,
      nextRound: roundUnlocked ? challenge.round_number + 1 : null,
      message: 'Flag captured! Well done, agent.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start round timer
router.post('/round/:round/start', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const round = parseInt(req.params.round);
    db.prepare(`
      INSERT OR IGNORE INTO round_timers (team_id, round_number, started_at)
      VALUES (?, ?, datetime('now'))
    `).run(req.team.id, round);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get round timer info
router.get('/round/:round/timer', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const round = parseInt(req.params.round);
    const timer = db.prepare(`SELECT * FROM round_timers WHERE team_id = ? AND round_number = ?`).get(req.team.id, round);
    const config = {};
    db.prepare(`SELECT key, value FROM competition_config`).all().forEach(r => config[r.key] = r.value);
    const timerKey = ['easy', 'medium', 'hard'][round - 1];
    const totalMinutes = parseInt(config[`${timerKey}_time_minutes`] || 20);

    if (!timer) return res.json({ started: false, totalMinutes });

    const elapsedMs = Date.now() - new Date(timer.started_at).getTime();
    const remainingMs = Math.max(0, totalMinutes * 60000 - elapsedMs);

    res.json({
      started: true,
      startedAt: timer.started_at,
      totalMinutes,
      remainingMs,
      expired: remainingMs === 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
