# GridBoard — Real-Time Persistent Grid

A production-grade, real-time collaborative grid where multiple users can claim cells simultaneously. Built with a focus on **concurrency**, **persistence**, and **smooth UX**.

---

## 🌟 Key Features

- **Real-Time Persistence**: Backed by **SQLite**. Your claims survive server restarts.
- **Optimistic UI**: Interactions feel instant. The client updates locally first, with a robust server-confirmation and rollback system.
- **Real-Time Presence**: See other users' cursors moving across the grid in real-time (The "Figma" effect).
- **Interactive Sidebar**: Live leaderboard, territory visualization, and activity feed.
- **Responsive Navigation**: Custom zoom and pan controls for navigating the 750-cell grid.
- **Session Recovery**: Uses `localStorage` to remember your identity even after refreshing the page.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                  CLIENT                      │
│   React + Vite + Tailwind                   │
│   useGridState hook (The "Brain")           │
│   Optimistic Updates + Rollback             │
└─────────────────┬───────────────────────────┘
                  │  WebSocket (Full-duplex)
                  │  wss:// (Production)
┌─────────────────▼───────────────────────────┐
│                  SERVER                      │
│   Node.js + ws library                      │
│   SQLite Persistence (better-sqlite3)       │
│   Server-side Cooldown Enforcement          │
│   Broadcasts to ALL clients on every event  │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Getting Started

### 1. Start the server
```bash
cd server
npm install
npm start
# Server running on http://localhost:3000
```

### 2. Start the client
```bash
cd client
npm install
npm run dev
# App running at http://localhost:5173
```

---

## 🔍 Database Inspection

Since the app uses **SQLite**, you can inspect the raw data directly from your terminal while the server is running.

**Option 1: Using Node (Recommended - No SQLite install needed)**
```bash
cd server
node -e "const db = require('better-sqlite3')('grid.db'); console.table(db.prepare('SELECT * FROM cells LIMIT 20').all());"
```

**Option 2: Using SQLite CLI**
```bash
cd server
npx sqlite3 grid.db "SELECT * FROM cells LIMIT 20;" -header -column
```

---

## 📊 WebSocket Protocol

| Type | Direction | Description |
|------|-----------|-------------|
| `join` | C → S | Register name/color or restore session |
| `claim` | C → S | Request to capture a cell |
| `move` | C → S | Broadcast mouse coordinates |
| `init` | S → C | Full grid + users + leaderboard on join |
| `claimed` | S → C | Confirmed claim broadcast |
| `user_moved`| S → C | Remote cursor update |
| `user_joined`| S → C | Presence notification |

---

## 🚀 Deployment

- **Frontend**: Deploy `client/` to **Vercel**.
- **Backend**: Deploy `server/` to **Render** or **Railway** (Requires Node.js + Persistent Disk).
- **Env**: Set `VITE_WS_URL` on the frontend to point to your backend.

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 4, Lucide Icons.
- **Backend**: Node.js, `ws` (WebSockets), `better-sqlite3`.
- **Infrastructure**: Native WebSockets, SQLite, UUID.

---

## 🔗 Live Demo

- **Frontend**: [https://gridboard.vercel.app/](https://gridboard.vercel.app/)
- **Backend**: [https://gridboard-server.onrender.com/](https://gridboard-server.onrender.com/)
