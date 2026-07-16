const express = require('express');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all active challenges (score-based — all visible to all teams)
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
      ORDER BY c.points ASC, c.order_in_round ASC
    `).all(team.id);

    // Strip flags before sending to client
    const sanitized = challenges.map(c => ({
      ...c,
      flag: undefined,
      hints: JSON.parse(c.hints || '[]'),
    }));

    res.json({ challenges: sanitized, team_score: team.score });
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

    // Already solved?
    const alreadySolved = db.prepare(`
      SELECT id FROM solved_challenges WHERE team_id = ? AND challenge_id = ?
    `).get(team.id, challengeId);
    if (alreadySolved) return res.status(400).json({ error: 'Already solved', already_solved: true });

    // Check flag
    const isCorrect = flag.trim() === challenge.flag.trim() ? 1 : 0;

    if (!isCorrect) {
      db.prepare(`
        INSERT INTO submissions (team_id, challenge_id, flag_submitted, is_correct, points_awarded)
        VALUES (?, ?, ?, 0, 0)
      `).run(team.id, challengeId, flag);
      return res.json({ correct: false, message: 'Wrong flag. Keep trying, agent.' });
    }

    // Load config for bonuses
    const config = {};
    db.prepare(`SELECT key, value FROM competition_config`).all().forEach(r => config[r.key] = r.value);

    let bonus = 0;
    const bonusReasons = [];

    // First blood bonus
    const firstBlood = db.prepare(`SELECT id FROM solved_challenges WHERE challenge_id = ? LIMIT 1`).get(challengeId);
    if (!firstBlood) {
      bonus += parseInt(config.first_blood_bonus || 50);
      bonusReasons.push('First Blood +' + (config.first_blood_bonus || 50) + 'pts');
    }

    const totalPoints = challenge.points + bonus;

    // Record solve
    db.prepare(`INSERT OR IGNORE INTO solved_challenges (team_id, challenge_id) VALUES (?, ?)`).run(team.id, challengeId);
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

    // Achievements
    if (!firstBlood) {
      db.prepare(`INSERT OR IGNORE INTO achievements (team_id, badge) VALUES (?, ?)`).run(team.id, 'First Blood');
    }
    const totalSolved = db.prepare(`SELECT COUNT(*) as c FROM solved_challenges WHERE team_id = ?`).get(team.id);
    if (totalSolved.c === 1) {
      db.prepare(`INSERT OR IGNORE INTO achievements (team_id, badge) VALUES (?, ?)`).run(team.id, 'First Flag');
    }
    const allChallenges = db.prepare(`SELECT COUNT(*) as c FROM challenges WHERE is_active = 1`).get();
    if (totalSolved.c >= allChallenges.c) {
      db.prepare(`INSERT OR IGNORE INTO achievements (team_id, badge) VALUES (?, ?)`).run(team.id, 'Vault Master');
    }

    const updatedTeam = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(team.id);

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard:update');
      if (!firstBlood) {
        io.emit('first_blood', { team: team.name, challenge: challenge.title });
      }
    }

    res.json({
      correct: true,
      points: challenge.points,
      bonus,
      bonusReasons,
      totalPoints,
      newScore: updatedTeam.score,
      challengesSolved: updatedTeam.challenges_solved,
      message: 'Flag captured! Well done, agent.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
