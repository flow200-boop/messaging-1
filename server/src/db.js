const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(__dirname, '..', 'pulse.db');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await dbInstance.exec(`PRAGMA foreign_keys = ON;`);
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      avatarUrl TEXT,
      statusText TEXT DEFAULT 'Hey there! I am using Pulse Chat.',
      statusState TEXT DEFAULT 'online',
      lastSeenAt TEXT DEFAULT CURRENT_TIMESTAMP,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isGroup INTEGER DEFAULT 1,
      isPrivate INTEGER DEFAULT 0,
      description TEXT,
      avatarUrl TEXT,
      createdBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_members (
      channelId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      lastReadAt TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channelId, userId),
      FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      replyToId TEXT,
      content TEXT,
      messageType TEXT DEFAULT 'text',
      fileUrl TEXT,
      fileName TEXT,
      fileSize INTEGER,
      isEdited INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      userId TEXT NOT NULL,
      emoji TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(messageId, userId, emoji),
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channelId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_channel_members ON channel_members(userId, channelId);
  `);

  await seedData(db);
}

async function seedData(db) {
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return; // Already seeded
  }

  console.log('🌱 Seeding initial demo users and channels...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const demoUsers = [
    {
      id: 'user-alex',
      username: 'alex',
      displayName: 'Alex Chen',
      email: 'alex@pulse.dev',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      statusText: '⚡ Building the future with Pulse Chat',
      statusState: 'online'
    },
    {
      id: 'user-sarah',
      username: 'sarah',
      displayName: 'Sarah Connor',
      email: 'sarah@pulse.dev',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      statusText: '🎯 Leading Product & Strategy',
      statusState: 'online'
    },
    {
      id: 'user-elena',
      username: 'elena',
      displayName: 'Dr. Elena Vance',
      email: 'elena@pulse.dev',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      statusText: '🔬 Researching Real-time WebRTC & AI',
      statusState: 'away'
    },
    {
      id: 'user-marcus',
      username: 'marcus',
      displayName: 'Marcus Brody',
      email: 'marcus@pulse.dev',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      statusText: '🎨 Crafting pixel-perfect UI/UX',
      statusState: 'busy'
    }
  ];

  for (const u of demoUsers) {
    await db.run(
      `INSERT INTO users (id, username, displayName, email, passwordHash, avatarUrl, statusText, statusState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.username, u.displayName, u.email, passwordHash, u.avatarUrl, u.statusText, u.statusState]
    );
  }

  // Channels
  const channels = [
    {
      id: 'channel-general',
      name: 'general',
      isGroup: 1,
      isPrivate: 0,
      description: 'Company-wide discussions, announcements, and high fives 👋',
      avatarUrl: null,
      createdBy: 'user-alex'
    },
    {
      id: 'channel-engineering',
      name: 'engineering',
      isGroup: 1,
      isPrivate: 0,
      description: 'System architecture, code reviews, and deploy status 🚀',
      avatarUrl: null,
      createdBy: 'user-alex'
    },
    {
      id: 'channel-design-hq',
      name: 'design-hq',
      isGroup: 1,
      isPrivate: 0,
      description: 'Design sprints, wireframes, prototypes & typography ✨',
      avatarUrl: null,
      createdBy: 'user-marcus'
    },
    {
      id: 'channel-random',
      name: 'random-chatter',
      isGroup: 1,
      isPrivate: 0,
      description: 'Coffee talks, music, memes, and weekend plans ☕🍕',
      avatarUrl: null,
      createdBy: 'user-sarah'
    }
  ];

  for (const c of channels) {
    await db.run(
      `INSERT INTO channels (id, name, isGroup, isPrivate, description, avatarUrl, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.isGroup, c.isPrivate, c.description, c.avatarUrl, c.createdBy]
    );

    for (const u of demoUsers) {
      await db.run(
        `INSERT INTO channel_members (channelId, userId, role) VALUES (?, ?, ?)`,
        [c.id, u.id, u.id === c.createdBy ? 'admin' : 'member']
      );
    }
  }

  // DM Channel
  const dmChannelId = 'dm-alex-sarah';
  await db.run(
    `INSERT INTO channels (id, name, isGroup, isPrivate, description, createdBy)
     VALUES (?, ?, 0, 1, 'Direct Message', 'user-alex')`,
    [dmChannelId, 'Alex & Sarah']
  );
  await db.run(`INSERT INTO channel_members (channelId, userId) VALUES (?, ?), (?, ?)`, [
    dmChannelId, 'user-alex',
    dmChannelId, 'user-sarah'
  ]);

  const now = Date.now();
  const seedMessages = [
    {
      id: 'msg-1',
      channelId: 'channel-general',
      senderId: 'user-alex',
      content: 'Welcome everyone to **Pulse Chat**! 🎉 We now have full real-time messaging, voice notes, media sharing, and video calling enabled.',
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      isPinned: 1
    },
    {
      id: 'msg-2',
      channelId: 'channel-general',
      senderId: 'user-sarah',
      content: 'This looks super clean! Love the lightning-fast socket updates and voice messages. 🚀',
      createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      isPinned: 0
    },
    {
      id: 'msg-3',
      channelId: 'channel-general',
      senderId: 'user-marcus',
      content: 'The dark theme and glassmorphism styling turned out fantastic. Great work team! ✨',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      isPinned: 0
    },
    {
      id: 'msg-4',
      channelId: 'channel-general',
      senderId: 'user-elena',
      content: 'Here is a quick code snippet for WebRTC signaling handler:\n```javascript\nsocket.on("call:signal", (data) => {\n  peerConnection.setRemoteDescription(new RTCSessionDescription(data));\n});\n```',
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
      isPinned: 0
    },
    {
      id: 'msg-5',
      channelId: 'dm-alex-sarah',
      senderId: 'user-sarah',
      content: 'Hey Alex! Are we good to present the Pulse Chat demo today?',
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      isPinned: 0
    },
    {
      id: 'msg-6',
      channelId: 'dm-alex-sarah',
      senderId: 'user-alex',
      content: 'Absolutely Sarah, all features (reactions, voice notes, calling, file uploads) are ready to go! 🚀',
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      isPinned: 0
    }
  ];

  for (const m of seedMessages) {
    await db.run(
      `INSERT INTO messages (id, channelId, senderId, content, messageType, isPinned, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'text', ?, ?, ?)`,
      [m.id, m.channelId, m.senderId, m.content, m.isPinned, m.createdAt, m.createdAt]
    );
  }

  await db.run(
    `INSERT INTO reactions (id, messageId, userId, emoji) VALUES
     ('react-1', 'msg-1', 'user-sarah', '🔥'),
     ('react-2', 'msg-1', 'user-marcus', '❤️'),
     ('react-3', 'msg-1', 'user-elena', '🚀'),
     ('react-4', 'msg-2', 'user-alex', '👍')`
  );

  console.log('✅ Seeding completed successfully!');
}

module.exports = {
  getDb
};
