const express = require('express');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get current team profile
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const team = db.prepare(`SELECT id, name, score, current_round, challenges_solved, last_submission FROM teams WHERE id = ?`).get(req.team.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const achievements = db.prepare(`SELECT badge, awarded_at FROM achievements WHERE team_id = ?`).all(team.id);

    // Get rank
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM teams WHERE score > ? AND is_admin = 0
    `).get(team.score);

    res.json({ ...team, achievements, rank: rank.rank });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get solved challenges for team
router.get('/me/solved', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const solved = db.prepare(`
      SELECT challenge_id, solved_at FROM solved_challenges WHERE team_id = ?
    `).all(req.team.id);
    res.json({ solved });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
