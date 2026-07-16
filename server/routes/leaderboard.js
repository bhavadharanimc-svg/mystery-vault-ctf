const express = require('express');
const { getDb } = require('../db/schema');

const router = express.Router();

// Public leaderboard
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const frozen = db.prepare(`SELECT value FROM competition_config WHERE key = 'leaderboard_frozen'`).get();
    
    const teams = db.prepare(`
      SELECT
        t.id, t.name, t.score, t.challenges_solved, t.current_round, t.last_submission,
        ROW_NUMBER() OVER (ORDER BY t.score DESC, t.last_submission ASC) as rank
      FROM teams t
      WHERE t.is_admin = 0
      ORDER BY t.score DESC, t.last_submission ASC
    `).all();

    res.json({ teams, frozen: frozen?.value === '1' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
