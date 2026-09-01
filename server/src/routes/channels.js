const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/channels
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // Get all channels that current user is a member of
    const channels = await db.all(`
      SELECT 
        c.id, c.name, c.isGroup, c.isPrivate, c.description, c.avatarUrl, c.createdBy, c.createdAt,
        cm.role as userRole, cm.lastReadAt
      FROM channels c
      JOIN channel_members cm ON cm.channelId = c.id
      WHERE cm.userId = ?
      ORDER BY c.isGroup DESC, c.name ASC
    `, [userId]);

    const results = [];
    for (const ch of channels) {
      const lastMessage = await db.get(`
        SELECT m.id, m.content, m.messageType, m.fileName, m.createdAt, m.senderId, u.displayName as senderName
        FROM messages m
        JOIN users u ON u.id = m.senderId
        WHERE m.channelId = ?
        ORDER BY m.createdAt DESC
        LIMIT 1
      `, [ch.id]);

      const unread = await db.get(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE channelId = ? AND createdAt > ? AND senderId != ?
      `, [ch.id, ch.lastReadAt || '1970-01-01', userId]);

      let dmRecipient = null;
      if (!ch.isGroup) {
        dmRecipient = await db.get(`
          SELECT u.id, u.username, u.displayName, u.avatarUrl, u.statusText, u.statusState, u.lastSeenAt
          FROM channel_members cm
          JOIN users u ON u.id = cm.userId
          WHERE cm.channelId = ? AND cm.userId != ?
        `, [ch.id, userId]);
      }

      const memberCountRes = await db.get(`
        SELECT COUNT(*) as count FROM channel_members WHERE channelId = ?
      `, [ch.id]);

      results.push({
        ...ch,
        unreadCount: unread ? unread.count : 0,
        lastMessage: lastMessage || null,
        dmRecipient: dmRecipient || null,
        memberCount: memberCountRes ? memberCountRes.count : 0
      });
    }

    res.json({ channels: results });
  } catch (err) {
    console.error('Failed to get channels:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// GET /api/channels/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const channelId = req.params.id;

    const membership = await db.get(
      'SELECT role, lastReadAt FROM channel_members WHERE channelId = ? AND userId = ?',
      [channelId, userId]
    );

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this channel' });
    }

    const channel = await db.get(
      'SELECT id, name, isGroup, isPrivate, description, avatarUrl, createdBy, createdAt FROM channels WHERE id = ?',
      [channelId]
    );

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const members = await db.all(`
      SELECT u.id, u.username, u.displayName, u.avatarUrl, u.statusText, u.statusState, u.lastSeenAt, cm.role
      FROM channel_members cm
      JOIN users u ON u.id = cm.userId
      WHERE cm.channelId = ?
      ORDER BY (cm.role = 'admin') DESC, u.displayName ASC
    `, [channelId]);

    const pinnedMessages = await db.all(`
      SELECT m.*, u.displayName as senderName, u.avatarUrl as senderAvatar
      FROM messages m
      JOIN users u ON u.id = m.senderId
      WHERE m.channelId = ? AND m.isPinned = 1
      ORDER BY m.createdAt DESC
    `, [channelId]);

    let dmRecipient = null;
    if (!channel.isGroup) {
      dmRecipient = members.find(m => m.id !== userId) || null;
    }

    res.json({
      channel: {
        ...channel,
        role: membership.role,
        lastReadAt: membership.lastReadAt,
        members,
        pinnedMessages,
        dmRecipient
      }
    });
  } catch (err) {
    console.error('Failed to get channel details:', err);
    res.status(500).json({ error: 'Failed to fetch channel details' });
  }
});

// POST /api/channels
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, isGroup = true, isPrivate = false, description, memberIds = [], recipientId } = req.body;
    const db = await getDb();
    const userId = req.user.id;

    if (!isGroup) {
      if (!recipientId) return res.status(400).json({ error: 'Recipient is required for DM' });
      if (recipientId === userId) return res.status(400).json({ error: 'Cannot start DM with yourself' });

      const existingDm = await db.get(`
        SELECT cm1.channelId
        FROM channel_members cm1
        JOIN channel_members cm2 ON cm1.channelId = cm2.channelId
        JOIN channels c ON c.id = cm1.channelId
        WHERE c.isGroup = 0 AND cm1.userId = ? AND cm2.userId = ?
      `, [userId, recipientId]);

      if (existingDm) {
        return res.json({ channelId: existingDm.channelId, isExisting: true });
      }

      const dmId = 'dm-' + uuidv4().slice(0, 8);
      const recipient = await db.get('SELECT displayName FROM users WHERE id = ?', [recipientId]);
      const dmName = `${req.user.displayName} & ${recipient ? recipient.displayName : 'User'}`;

      await db.run(
        `INSERT INTO channels (id, name, isGroup, isPrivate, description, createdBy) VALUES (?, ?, 0, 1, 'Direct Message', ?)`,
        [dmId, dmName, userId]
      );
      await db.run(`INSERT INTO channel_members (channelId, userId, role) VALUES (?, ?, 'member'), (?, ?, 'member')`, [
        dmId, userId,
        dmId, recipientId
      ]);

      return res.status(201).json({ channelId: dmId, isExisting: false });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const channelId = 'channel-' + name.toLowerCase().replace(/[^a-z0-9-_]/g, '-') + '-' + uuidv4().slice(0, 4);
    await db.run(
      `INSERT INTO channels (id, name, isGroup, isPrivate, description, createdBy) VALUES (?, ?, 1, ?, ?, ?)`,
      [channelId, name.trim().toLowerCase().replace(/\s+/g, '-'), isPrivate ? 1 : 0, description || '', userId]
    );

    await db.run(`INSERT INTO channel_members (channelId, userId, role) VALUES (?, ?, 'admin')`, [channelId, userId]);

    const allMembers = Array.from(new Set([...memberIds, userId]));
    for (const mid of allMembers) {
      if (mid !== userId) {
        await db.run(`INSERT OR IGNORE INTO channel_members (channelId, userId, role) VALUES (?, ?, 'member')`, [channelId, mid]);
      }
    }

    res.status(201).json({ channelId });
  } catch (err) {
    console.error('Failed to create channel:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// POST /api/channels/:id/read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE channel_members SET lastReadAt = ? WHERE channelId = ? AND userId = ?`,
      [now, req.params.id, req.user.id]
    );
    res.json({ success: true, lastReadAt: now });
  } catch (err) {
    console.error('Failed to mark read:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/channels/:id/members
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.body;
    const channelId = req.params.id;
    const db = await getDb();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    for (const uid of userIds) {
      await db.run(
        `INSERT OR IGNORE INTO channel_members (channelId, userId, role) VALUES (?, ?, 'member')`,
        [channelId, uid]
      );
    }

    res.json({ success: true, count: userIds.length });
  } catch (err) {
    console.error('Failed to add members:', err);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

module.exports = router;
