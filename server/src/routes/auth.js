const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'pulse_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Middleware to authenticate JWT
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt, createdAt FROM users WHERE id = ?',
      [payload.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/auth/demo-users
router.get('/demo-users', async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all(
      'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt FROM users ORDER BY createdAt ASC'
    );
    res.json({ users });
  } catch (err) {
    console.error('Failed to get demo users:', err);
    res.status(500).json({ error: 'Failed to fetch demo users' });
  }
});

// POST /api/auth/switch-user (demo quick switch)
router.post('/switch-user', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, displayName, email, avatarUrl, statusText, statusState, lastSeenAt, createdAt FROM users WHERE id = ?',
      [userId]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('Failed to switch user:', err);
    res.status(500).json({ error: 'Failed to switch user' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password, avatarUrl } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const db = await getDb();

    // Check existing
    const existing = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.toLowerCase(), email.toLowerCase()]
    );
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const id = 'user-' + uuidv4().slice(0, 8);
    const passwordHash = await bcrypt.hash(password, 10);
    const finalDisplayName = displayName || username;
    const finalAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    await db.run(
      `INSERT INTO users (id, username, displayName, email, passwordHash, avatarUrl, statusText, statusState)
       VALUES (?, ?, ?, ?, ?, ?, 'Available', 'online')`,
      [id, username.toLowerCase(), finalDisplayName, email.toLowerCase(), passwordHash, finalAvatar]
    );

    // Auto-add new user to public group channels
    const publicChannels = await db.all('SELECT id FROM channels WHERE isGroup = 1 AND isPrivate = 0');
    for (const c of publicChannels) {
      await db.run(
        `INSERT OR IGNORE INTO channel_members (channelId, userId, role) VALUES (?, ?, 'member')`,
        [c.id, id]
      );
    }

    const newUser = {
      id,
      username: username.toLowerCase(),
      displayName: finalDisplayName,
      email: email.toLowerCase(),
      avatarUrl: finalAvatar,
      statusText: 'Available',
      statusState: 'online',
      createdAt: new Date().toISOString()
    };

    const token = generateToken(newUser);
    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { credential, password } = req.body; // username or email

    if (!credential || !password) {
      return res.status(400).json({ error: 'Credentials and password required' });
    }

    const db = await getDb();
    const user = await db.get(
      `SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
      [credential, credential]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { passwordHash, ...safeUser } = user;
    const token = generateToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = {
  router,
  authenticateToken
};
