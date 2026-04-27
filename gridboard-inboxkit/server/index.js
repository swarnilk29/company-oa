const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const {
  getGrid,
  claimCell,
  getLeaderboard,
  COOLDOWN_MS,
} = require('./gridStore');

const PORT = process.env.PORT || 4000;
const wss = new WebSocketServer({ port: PORT });

// Map<userId, { ws, name, color, id }>
const users = new Map();

// Helpers 

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg, excludeWs = null) {
  const raw = JSON.stringify(msg);
  for (const [, user] of users) {
    if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(raw);
    }
  }
}

function broadcastAll(msg) {
  broadcast(msg, null);
}

function getOnlineUsers() {
  const out = [];
  for (const [id, u] of users) out.push({ id, name: u.name, color: u.color });
  return out;
}

// Connection handler

wss.on('connection', (ws) => {
  let userId = null;

  console.log(`[+] Client connected. Total: ${wss.clients.size}`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    // JOIN
    if (msg.type === 'join') {
      if (userId) return; // already joined

      const name = String(msg.name || 'Anonymous').slice(0, 20).trim() || 'Anonymous';
      const color = /^#[0-9a-fA-F]{6}$/.test(msg.color) ? msg.color : '#06d6a0';

      userId = uuidv4();
      users.set(userId, { ws, name, color, id: userId });

      // Send full state to the new client
      send(ws, {
        type: 'init',
        userId,
        grid: getGrid(),
        users: getOnlineUsers(),
        cooldownMs: COOLDOWN_MS,
      });

      // Tell everyone else this user joined
      broadcast(
        { type: 'user_joined', user: { id: userId, name, color } },
        ws
      );

      console.log(`  join: ${name} (${userId.slice(0, 8)})`);
      return;
    }

    // All subsequent messages require a joined user
    if (!userId || !users.has(userId)) {
      send(ws, { type: 'error', message: 'Not joined' });
      return;
    }

    const user = users.get(userId);

    // CLAIM 
    if (msg.type === 'claim') {
      const result = claimCell(msg.cellId, userId, user.name, user.color);

      if (!result.ok) {
        // Send error only to the requester
        send(ws, {
          type: 'error',
          message: result.reason,
          remaining: result.remaining,
        });
        return;
      }

      // Broadcast the claimed cell to ALL clients (including claimer)
      const payload = {
        type: 'claimed',
        cellId: result.cellId,
        userId,
        name: user.name,
        color: user.color,
        ts: result.cell.ts,
        leaderboard: getLeaderboard(users),
      };

      broadcastAll(payload);

      console.log(`  claim: cell ${result.cellId} by ${user.name}`);
      return;
    }

    // PING (keepalive) 
    if (msg.type === 'ping') {
      send(ws, { type: 'pong' });
      return;
    }

    send(ws, { type: 'error', message: `Unknown type: ${msg.type}` });
  });

  // Disconnect 
  ws.on('close', () => {
    if (userId && users.has(userId)) {
      const user = users.get(userId);
      users.delete(userId);
      broadcast({ type: 'user_left', userId });
      console.log(`[-] ${user.name} disconnected. Total: ${wss.clients.size}`);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

console.log(`GridBoard server running on ws://localhost:${PORT}`);
console.log(`Protocol: JSON over WebSocket`);
console.log(`Waiting for connections...`);
