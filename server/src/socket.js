const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'pulse_super_secret_jwt_key_2026';

const onlineUsers = new Map();

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const payload = jwt.verify(token, JWT_SECRET);
      const db = await getDb();
      const user = await db.get(
        'SELECT id, username, displayName, email, avatarUrl, statusText, statusState FROM users WHERE id = ?',
        [payload.id]
      );

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user.id;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user:${userId}`);

    const db = await getDb();
    await db.run('UPDATE users SET statusState = "online", lastSeenAt = CURRENT_TIMESTAMP WHERE id = ?', [userId]);

    io.emit('user:presence', {
      userId,
      statusState: 'online',
      onlineUserIds: Array.from(onlineUsers.keys())
    });

    console.log(`🔌 [Socket] User connected: ${user.displayName} (${userId})`);

    socket.on('users:get_online', () => {
      socket.emit('users:online_list', Array.from(onlineUsers.keys()));
    });

    socket.on('channel:join', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('typing:start', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', {
        channelId,
        user: {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        isTyping: true
      });
    });

    socket.on('typing:stop', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', {
        channelId,
        user: {
          id: user.id,
          displayName: user.displayName
        },
        isTyping: false
      });
    });

    socket.on('message:read', async ({ channelId }) => {
      const now = new Date().toISOString();
      await db.run(
        'UPDATE channel_members SET lastReadAt = ? WHERE channelId = ? AND userId = ?',
        [now, channelId, userId]
      );

      io.to(`channel:${channelId}`).emit('channel:read_updated', {
        channelId,
        userId,
        lastReadAt: now
      });
    });

    socket.on('message:send', (messageData) => {
      io.to(`channel:${messageData.channelId}`).emit('message:new', messageData);
    });

    socket.on('message:edited', (data) => {
      io.to(`channel:${data.channelId}`).emit('message:updated', data);
    });

    socket.on('message:deleted', (data) => {
      io.to(`channel:${data.channelId}`).emit('message:deleted', data);
    });

    socket.on('message:pinned', (data) => {
      io.to(`channel:${data.channelId}`).emit('message:pin_toggled', data);
    });

    socket.on('reaction:update', (data) => {
      io.to(`channel:${data.channelId}`).emit('reaction:changed', data);
    });

    // WebRTC 1-on-1 Audio/Video Call Signaling
    socket.on('call:initiate', ({ recipientId, channelId, callType }) => {
      console.log(`📞 Call initiated from ${user.displayName} to ${recipientId} (${callType})`);
      io.to(`user:${recipientId}`).emit('call:incoming', {
        caller: {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        channelId,
        callType
      });
    });

    socket.on('call:accept', ({ callerId, channelId }) => {
      console.log(`✅ Call accepted by ${user.displayName} from ${callerId}`);
      io.to(`user:${callerId}`).emit('call:accepted', {
        callee: {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        channelId
      });
    });

    socket.on('call:reject', ({ callerId, channelId, reason }) => {
      console.log(`❌ Call rejected by ${user.displayName} from ${callerId}`);
      io.to(`user:${callerId}`).emit('call:rejected', {
        userId: user.id,
        channelId,
        reason: reason || 'Call declined'
      });
    });

    socket.on('call:signal', ({ targetUserId, signal }) => {
      io.to(`user:${targetUserId}`).emit('call:signal', {
        fromUserId: user.id,
        signal
      });
    });

    socket.on('call:end', ({ targetUserId, channelId }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:ended', { channelId, fromUserId: user.id });
      }
      if (channelId) {
        io.to(`channel:${channelId}`).emit('call:ended', { channelId, fromUserId: user.id });
      }
    });

    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const now = new Date().toISOString();
          await db.run('UPDATE users SET statusState = "offline", lastSeenAt = ? WHERE id = ?', [now, userId]);

          io.emit('user:presence', {
            userId,
            statusState: 'offline',
            lastSeenAt: now,
            onlineUserIds: Array.from(onlineUsers.keys())
          });
          console.log(`🔴 [Socket] User offline: ${user.displayName} (${userId})`);
        }
      }
    });
  });

  return io;
}

module.exports = {
  initSocket,
  getOnlineUserIds: () => Array.from(onlineUsers.keys())
};
