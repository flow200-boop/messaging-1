const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const db = await getDb();

    let query = 'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt, createdAt FROM users WHERE id != ?';
    let params = [req.user.id];

    if (q) {
      query += ' AND (displayName LIKE ? OR username LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    query += ' ORDER BY displayName ASC';
    const users = await db.all(query, params);
    res.json({ users });
  } catch (err) {
    console.error('Failed to get users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt, createdAt FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Failed to get user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, avatarUrl, statusText, statusState } = req.body;
    const db = await getDb();

    const updates = [];
    const params = [];

    if (displayName !== undefined) {
      updates.push('displayName = ?');
      params.push(displayName.trim() || req.user.displayName);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatarUrl = ?');
      params.push(avatarUrl);
    }
    if (statusText !== undefined) {
      updates.push('statusText = ?');
      params.push(statusText);
    }
    if (statusState !== undefined) {
      updates.push('statusState = ?');
      params.push(statusState);
    }

    if (updates.length === 0) {
      return res.json({ user: req.user });
    }

    params.push(req.user.id);
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedUser = await db.get(
      'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt, createdAt FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Profile update failed:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
