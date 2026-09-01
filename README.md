# Pulse Chat - Real-Time Collaboration & Messaging Platform

Pulse Chat is a modern, ultra-responsive full-stack messaging application built with React, Node.js, Express, WebSockets (Socket.io), SQLite, and WebRTC audio/video calling.

---

## ✨ Features

- 💬 **Real-Time Messaging**: Instant message delivery with Socket.io web sockets.
- ⚡ **Multi-Channel & DMs**: Public & private channels, threaded conversations, and direct 1-on-1 messaging.
- 🎤 **Interactive Voice Notes**: In-browser audio recording with live waveform frequency visualizer and playback speed controls.
- 📞 **Audio & Video Calling**: Built-in 1-on-1 WebRTC calling simulation with call controls (mute, camera, screen share).
- 😊 **Rich Message Reactions & Pinning**: Interactive emoji reactions, message pinning drawer, and inline formatting (code blocks & bold markdown).
- 🖼️ **Media & File Attachments**: Image viewer lightbox, document sharing with preview and download.
- 🌗 **Multiple Themes**: Modern Dark, Midnight Blue, Emerald Forest, and Clean Light themes.
- 👥 **Instant User Persona Switcher**: Seamless multi-persona switching to test real-time collaboration across multiple tabs.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Audio API
- **Backend**: Node.js, Express, Socket.io, SQLite3, Multer, JWT, BcryptJS

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 2. Start the Development Servers

**Run Server**:
```bash
cd server
npm run dev
# Starts backend server on http://localhost:4000
```

**Run Client**:
```bash
cd client
npm run dev
# Starts Vite frontend on http://localhost:5173
```

---

## 📁 Repository Structure

```
messaging 1/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Chat, Modals, and Sidebar UI components
│   │   ├── context/        # React Context providers (Auth, Chat, Socket, Call, Theme)
│   │   ├── types/          # TypeScript interfaces & types
│   │   ├── utils/          # Web Audio synthesizer utilities
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                 # Express & Socket.io backend
│   ├── src/
│   │   ├── routes/         # REST API routes (auth, channels, messages, users, upload)
│   │   ├── db.js           # SQLite database initialization & schema
│   │   ├── index.js        # Express HTTP server entrypoint
│   │   └── socket.js       # Socket.io real-time event handlers
│   ├── package.json
│   └── uploads/            # Static uploaded files directory
└── package.json            # Root configuration
```
