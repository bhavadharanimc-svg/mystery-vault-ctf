const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/schema');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Team Login
router.post('/login', (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Team name and PIN required' });

    const db = getDb();
    const team = db.prepare(`SELECT * FROM teams WHERE name = ?`).get(name.trim());
    if (!team) return res.status(401).json({ error: 'Team not found' });

    const valid = bcrypt.compareSync(String(pin), team.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    if (team.is_admin) return res.status(403).json({ error: 'Use admin login for admin accounts' });

    const token = jwt.sign(
      { id: team.id, name: team.name, is_admin: false },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      team: {
        id: team.id,
        name: team.name,
        score: team.score,
        current_round: team.current_round,
        challenges_solved: team.challenges_solved,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Login
router.post('/admin', (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

    const db = getDb();
    const team = db.prepare(`SELECT * FROM teams WHERE name = ? AND is_admin = 1`).get(name.trim());
    if (!team) return res.status(401).json({ error: 'Admin not found' });

    const valid = bcrypt.compareSync(String(pin), team.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const token = jwt.sign(
      { id: team.id, name: team.name, is_admin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { id: team.id, name: team.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, data: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// Team Self-Registration
router.post('/register', (req, res) => {
  try {
    const { name, pin } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ error: 'Team name and PIN required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return res.status(400).json({ error: 'Team name must be 2–30 characters' });
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const db = getDb();

    // Check registration is allowed
    const regConfig = db.prepare(`SELECT value FROM competition_config WHERE key = 'registration_open'`).get();
    if (regConfig && regConfig.value === '0') {
      return res.status(403).json({ error: 'Team registration is currently closed by the admin' });
    }

    // Check duplicate name
    const existing = db.prepare(`SELECT id FROM teams WHERE name = ?`).get(trimmedName);
    if (existing) {
      return res.status(409).json({ error: 'Team name already taken. Choose another.' });
    }

    const hash = bcrypt.hashSync(String(pin), 10);
    const result = db.prepare(
      `INSERT INTO teams (name, pin_hash) VALUES (?, ?)`
    ).run(trimmedName, hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, name: trimmedName, is_admin: false },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      team: {
        id: result.lastInsertRowid,
        name: trimmedName,
        score: 0,
        current_round: 1,
        challenges_solved: 0,
      },
      message: 'Team registered successfully!'
    });
  } catch (err) {
    console.error(err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Team name already taken. Choose another.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
