const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// File upload config — path set by index.js (supports Railway volume)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.app.get('uploadPath') || path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ===== TEAMS =====

router.get('/teams', adminMiddleware, (req, res) => {
  const db = getDb();
  const teams = db.prepare(`SELECT id, name, score, current_round, challenges_solved, last_submission, is_admin, created_at FROM teams WHERE is_admin = 0 ORDER BY score DESC`).all();
  res.json({ teams });
});

router.post('/teams', adminMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });
    if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be 4 digits' });
    const hash = bcrypt.hashSync(String(pin), 10);
    const result = db.prepare(`INSERT INTO teams (name, pin_hash) VALUES (?, ?)`).run(name.trim(), hash);
    res.json({ id: result.lastInsertRowid, name, message: 'Team created' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Team name already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/teams/:id', adminMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { name, pin, score, current_round } = req.body;
    const team = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (pin) {
      const hash = bcrypt.hashSync(String(pin), 10);
      db.prepare(`UPDATE teams SET pin_hash = ? WHERE id = ?`).run(hash, req.params.id);
    }
    if (name) db.prepare(`UPDATE teams SET name = ? WHERE id = ?`).run(name, req.params.id);
    if (score !== undefined) db.prepare(`UPDATE teams SET score = ? WHERE id = ?`).run(score, req.params.id);
    if (current_round !== undefined) db.prepare(`UPDATE teams SET current_round = ? WHERE id = ?`).run(current_round, req.params.id);

    res.json({ message: 'Team updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/teams/:id', adminMiddleware, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM submissions WHERE team_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM solved_challenges WHERE team_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM achievements WHERE team_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM round_timers WHERE team_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM teams WHERE id = ? AND is_admin = 0`).run(req.params.id);
  res.json({ message: 'Team deleted' });
});

// ===== CHALLENGES =====

router.get('/challenges', adminMiddleware, (req, res) => {
  const db = getDb();
  const challenges = db.prepare(`SELECT * FROM challenges ORDER BY round_number, order_in_round`).all();
  res.json({ challenges: challenges.map(c => ({ ...c, hints: JSON.parse(c.hints || '[]') })) });
});

router.post('/challenges', adminMiddleware, upload.single('attachment'), (req, res) => {
  try {
    const db = getDb();
    const { title, description, story, hints, flag, points, difficulty, category, round_number, order_in_round } = req.body;
    if (!title || !flag || !difficulty || !round_number) return res.status(400).json({ error: 'Missing required fields' });

    const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;
    const attachment_name = req.file ? req.file.originalname : null;

    let hintsArr = hints;
    if (typeof hints === 'string') {
      try { hintsArr = JSON.parse(hints); } catch { hintsArr = hints.split('\n').filter(Boolean); }
    }

    const result = db.prepare(`
      INSERT INTO challenges (title, description, story, hints, flag, points, difficulty, category, attachment_url, attachment_name, round_number, order_in_round)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', story || '', JSON.stringify(hintsArr || []), flag, parseInt(points) || 50, difficulty, category || 'misc', attachment_url, attachment_name, parseInt(round_number), parseInt(order_in_round) || 1);

    res.json({ id: result.lastInsertRowid, message: 'Challenge created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/challenges/:id', adminMiddleware, upload.single('attachment'), (req, res) => {
  try {
    const db = getDb();
    const { title, description, story, hints, flag, points, difficulty, category, round_number, order_in_round, is_active } = req.body;

    let hintsArr = hints;
    if (typeof hints === 'string') {
      try { hintsArr = JSON.parse(hints); } catch { hintsArr = hints.split('\n').filter(Boolean); }
    }

    const attachment_url = req.file ? `/uploads/${req.file.filename}` : undefined;
    const attachment_name = req.file ? req.file.originalname : undefined;

    db.prepare(`
      UPDATE challenges SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        story = COALESCE(?, story),
        hints = COALESCE(?, hints),
        flag = COALESCE(?, flag),
        points = COALESCE(?, points),
        difficulty = COALESCE(?, difficulty),
        category = COALESCE(?, category),
        round_number = COALESCE(?, round_number),
        order_in_round = COALESCE(?, order_in_round),
        is_active = COALESCE(?, is_active),
        ${attachment_url ? 'attachment_url = ?, attachment_name = ?,' : ''}
        id = id
      WHERE id = ?
    `).run(
      ...(attachment_url
        ? [title, description, story, hints ? JSON.stringify(hintsArr) : null, flag, points ? parseInt(points) : null, difficulty, category, round_number ? parseInt(round_number) : null, order_in_round ? parseInt(order_in_round) : null, is_active !== undefined ? parseInt(is_active) : null, attachment_url, attachment_name, req.params.id]
        : [title, description, story, hints ? JSON.stringify(hintsArr) : null, flag, points ? parseInt(points) : null, difficulty, category, round_number ? parseInt(round_number) : null, order_in_round ? parseInt(order_in_round) : null, is_active !== undefined ? parseInt(is_active) : null, req.params.id])
    );

    res.json({ message: 'Challenge updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/challenges/:id', adminMiddleware, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM challenges WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Challenge deleted' });
});

// ===== CONFIG =====

router.get('/config', adminMiddleware, (req, res) => {
  const db = getDb();
  const config = {};
  db.prepare(`SELECT key, value FROM competition_config`).all().forEach(r => config[r.key] = r.value);
  res.json({ config });
});

router.put('/config', adminMiddleware, (req, res) => {
  const db = getDb();
  const updates = req.body;
  const update = db.prepare(`INSERT OR REPLACE INTO competition_config (key, value) VALUES (?, ?)`);
  for (const [k, v] of Object.entries(updates)) update.run(k, String(v));
  if (req.app.get('io')) req.app.get('io').emit('config:update');
  res.json({ message: 'Config updated' });
});

// Freeze leaderboard
router.post('/freeze', adminMiddleware, (req, res) => {
  const db = getDb();
  const current = db.prepare(`SELECT value FROM competition_config WHERE key = 'leaderboard_frozen'`).get();
  const newVal = current?.value === '1' ? '0' : '1';
  db.prepare(`UPDATE competition_config SET value = ? WHERE key = 'leaderboard_frozen'`).run(newVal);
  if (req.app.get('io')) req.app.get('io').emit('leaderboard:update');
  res.json({ frozen: newVal === '1' });
});

// Reset competition
router.post('/reset', adminMiddleware, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM submissions`).run();
  db.prepare(`DELETE FROM solved_challenges`).run();
  db.prepare(`DELETE FROM achievements`).run();
  db.prepare(`DELETE FROM round_timers`).run();
  db.prepare(`UPDATE teams SET score = 0, current_round = 1, challenges_solved = 0, last_submission = NULL WHERE is_admin = 0`).run();
  if (req.app.get('io')) req.app.get('io').emit('leaderboard:update');
  res.json({ message: 'Competition reset' });
});

// Export CSV
router.get('/export', adminMiddleware, (req, res) => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT t.name, t.score, t.challenges_solved, t.current_round, t.last_submission,
      ROW_NUMBER() OVER (ORDER BY t.score DESC, t.last_submission ASC) as rank
    FROM teams t WHERE t.is_admin = 0 ORDER BY t.score DESC
  `).all();

  let csv = 'Rank,Team Name,Score,Challenges Solved,Current Round,Last Submission\n';
  teams.forEach(t => {
    csv += `${t.rank},"${t.name}",${t.score},${t.challenges_solved},${t.current_round},"${t.last_submission || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=ctf_results.csv');
  res.send(csv);
});

// Admin stats
router.get('/stats', adminMiddleware, (req, res) => {
  const db = getDb();
  const totalTeams = db.prepare(`SELECT COUNT(*) as c FROM teams WHERE is_admin = 0`).get().c;
  const totalSubmissions = db.prepare(`SELECT COUNT(*) as c FROM submissions`).get().c;
  const correctSubmissions = db.prepare(`SELECT COUNT(*) as c FROM submissions WHERE is_correct = 1`).get().c;
  const activeChallenges = db.prepare(`SELECT COUNT(*) as c FROM challenges WHERE is_active = 1`).get().c;
  res.json({ totalTeams, totalSubmissions, correctSubmissions, activeChallenges });
});

module.exports = router;
