const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/messages/search?q=keyword
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ messages: [] });

    const db = await getDb();
    const userId = req.user.id;

    const messages = await db.all(`
      SELECT 
        m.id, m.channelId, m.senderId, m.content, m.messageType, m.fileName, m.createdAt,
        c.name as channelName, c.isGroup,
        u.displayName as senderName, u.avatarUrl as senderAvatar
      FROM messages m
      JOIN channels c ON c.id = m.channelId
      JOIN channel_members cm ON cm.channelId = c.id AND cm.userId = ?
      JOIN users u ON u.id = m.senderId
      WHERE m.content LIKE ?
      ORDER BY m.createdAt DESC
      LIMIT 30
    `, [userId, `%${q.trim()}%`]);

    res.json({ messages });
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/messages/:channelId
router.get('/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;
    const db = await getDb();
    const userId = req.user.id;

    const member = await db.get(
      'SELECT role FROM channel_members WHERE channelId = ? AND userId = ?',
      [channelId, userId]
    );
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this channel' });
    }

    let query = `
      SELECT 
        m.id, m.channelId, m.senderId, m.replyToId, m.content, m.messageType, 
        m.fileUrl, m.fileName, m.fileSize, m.isEdited, m.isPinned, m.createdAt, m.updatedAt,
        u.username as senderUsername, u.displayName as senderDisplayName, u.avatarUrl as senderAvatar, u.statusState as senderStatus
      FROM messages m
      JOIN users u ON u.id = m.senderId
      WHERE m.channelId = ?
    `;
    const params = [channelId];

    if (before) {
      query += ` AND m.createdAt < ?`;
      params.push(before);
    }

    query += ` ORDER BY m.createdAt ASC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const rawMessages = await db.all(query, params);

    const messageIds = rawMessages.map(m => m.id);
    let reactionsByMessage = {};

    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      const reactions = await db.all(`
        SELECT r.id, r.messageId, r.userId, r.emoji, u.displayName as userName
        FROM reactions r
        JOIN users u ON u.id = r.userId
        WHERE r.messageId IN (${placeholders})
      `, messageIds);

      for (const r of reactions) {
        if (!reactionsByMessage[r.messageId]) {
          reactionsByMessage[r.messageId] = [];
        }
        reactionsByMessage[r.messageId].push(r);
      }
    }

    const enrichedMessages = [];
    for (const m of rawMessages) {
      let replyTo = null;
      if (m.replyToId) {
        replyTo = await db.get(`
          SELECT m.id, m.content, m.senderId, m.messageType, u.displayName as senderDisplayName
          FROM messages m
          JOIN users u ON u.id = m.senderId
          WHERE m.id = ?
        `, [m.replyToId]);
      }

      const msgReactions = reactionsByMessage[m.id] || [];
      const reactionSummary = {};
      for (const r of msgReactions) {
        if (!reactionSummary[r.emoji]) {
          reactionSummary[r.emoji] = {
            emoji: r.emoji,
            count: 0,
            users: [],
            hasReacted: false
          };
        }
        reactionSummary[r.emoji].count += 1;
        reactionSummary[r.emoji].users.push({ id: r.userId, name: r.userName });
        if (r.userId === userId) {
          reactionSummary[r.emoji].hasReacted = true;
        }
      }

      enrichedMessages.push({
        ...m,
        replyTo,
        reactions: Object.values(reactionSummary)
      });
    }

    res.json({ messages: enrichedMessages });
  } catch (err) {
    console.error('Failed to get messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { channelId, content, replyToId, messageType = 'text', fileUrl, fileName, fileSize } = req.body;
    const db = await getDb();
    const userId = req.user.id;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    if ((!content || !content.trim()) && !fileUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const member = await db.get(
      'SELECT role FROM channel_members WHERE channelId = ? AND userId = ?',
      [channelId, userId]
    );
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this channel' });
    }

    const messageId = 'msg-' + uuidv4().slice(0, 10);
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO messages (
        id, channelId, senderId, replyToId, content, messageType, 
        fileUrl, fileName, fileSize, isEdited, isPinned, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `, [
      messageId, channelId, userId, replyToId || null, content ? content.trim() : '',
      messageType, fileUrl || null, fileName || null, fileSize || null, now, now
    ]);

    await db.run(
      'UPDATE channel_members SET lastReadAt = ? WHERE channelId = ? AND userId = ?',
      [now, channelId, userId]
    );

    const createdMessage = await db.get(`
      SELECT 
        m.id, m.channelId, m.senderId, m.replyToId, m.content, m.messageType, 
        m.fileUrl, m.fileName, m.fileSize, m.isEdited, m.isPinned, m.createdAt, m.updatedAt,
        u.username as senderUsername, u.displayName as senderDisplayName, u.avatarUrl as senderAvatar, u.statusState as senderStatus
      FROM messages m
      JOIN users u ON u.id = m.senderId
      WHERE m.id = ?
    `, [messageId]);

    let replyTo = null;
    if (replyToId) {
      replyTo = await db.get(`
        SELECT m.id, m.content, m.senderId, m.messageType, u.displayName as senderDisplayName
        FROM messages m
        JOIN users u ON u.id = m.senderId
        WHERE m.id = ?
      `, [replyToId]);
    }

    const fullMessage = {
      ...createdMessage,
      replyTo,
      reactions: []
    };

    res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error('Failed to post message:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// PATCH /api/messages/:id
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.id;
    const userId = req.user.id;
    const db = await getDb();

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE messages SET content = ?, isEdited = 1, updatedAt = ? WHERE id = ?',
      [content.trim(), now, messageId]
    );

    res.json({ success: true, messageId, content: content.trim(), isEdited: 1, updatedAt: now });
  } catch (err) {
    console.error('Failed to edit message:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    const db = await getDb();

    const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const member = await db.get(
      'SELECT role FROM channel_members WHERE channelId = ? AND userId = ?',
      [message.channelId, userId]
    );

    if (message.senderId !== userId && (!member || member.role !== 'admin')) {
      return res.status(403).json({ error: 'Permission denied to delete this message' });
    }

    await db.run('DELETE FROM messages WHERE id = ?', [messageId]);
    res.json({ success: true, messageId, channelId: message.channelId });
  } catch (err) {
    console.error('Failed to delete message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/messages/:id/pin
router.post('/:id/pin', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const db = await getDb();

    const message = await db.get('SELECT id, channelId, isPinned FROM messages WHERE id = ?', [messageId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const newPinnedState = message.isPinned ? 0 : 1;
    await db.run('UPDATE messages SET isPinned = ? WHERE id = ?', [newPinnedState, messageId]);

    res.json({ success: true, messageId, isPinned: newPinnedState, channelId: message.channelId });
  } catch (err) {
    console.error('Failed to toggle pin:', err);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// POST /api/messages/:id/reaction
router.post('/:id/reaction', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.id;
    const userId = req.user.id;
    const db = await getDb();

    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const message = await db.get('SELECT channelId FROM messages WHERE id = ?', [messageId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const existing = await db.get(
      'SELECT id FROM reactions WHERE messageId = ? AND userId = ? AND emoji = ?',
      [messageId, userId, emoji]
    );

    let action = 'added';
    if (existing) {
      await db.run('DELETE FROM reactions WHERE id = ?', [existing.id]);
      action = 'removed';
    } else {
      const reactId = 'react-' + uuidv4().slice(0, 8);
      await db.run(
        'INSERT INTO reactions (id, messageId, userId, emoji) VALUES (?, ?, ?, ?)',
        [reactId, messageId, userId, emoji]
      );
    }

    const allReactions = await db.all(`
      SELECT r.id, r.messageId, r.userId, r.emoji, u.displayName as userName
      FROM reactions r
      JOIN users u ON u.id = r.userId
      WHERE r.messageId = ?
    `, [messageId]);

    const reactionSummary = {};
    for (const r of allReactions) {
      if (!reactionSummary[r.emoji]) {
        reactionSummary[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false
        };
      }
      reactionSummary[r.emoji].count += 1;
      reactionSummary[r.emoji].users.push({ id: r.userId, name: r.userName });
      if (r.userId === userId) {
        reactionSummary[r.emoji].hasReacted = true;
      }
    }

    res.json({
      success: true,
      messageId,
      channelId: message.channelId,
      action,
      reactions: Object.values(reactionSummary)
    });
  } catch (err) {
    console.error('Failed to toggle reaction:', err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

module.exports = router;
