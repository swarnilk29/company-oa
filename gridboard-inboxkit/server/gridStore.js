const Database = require('better-sqlite3');
const path = require('path');

const COLS = 30;
const ROWS = 25;
const TOTAL = COLS * ROWS;
const COOLDOWN_MS = 1200;

// Initialize Database
const db = new Database(path.join(__dirname, 'grid.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS cells (
    id INTEGER PRIMARY KEY,
    userId TEXT,
    name TEXT,
    color TEXT,
    ts INTEGER
  )
`);

// Prepared statements for performance
const insertCell = db.prepare('INSERT OR REPLACE INTO cells (id, userId, name, color, ts) VALUES (?, ?, ?, ?, ?)');
const getAllCells = db.prepare('SELECT * FROM cells');

// Map<cellId, { userId, name, color, ts }> — fast in-memory read cache
const grid = new Map();

// Load initial state from DB
function init() {
  const rows = getAllCells.all();
  for (const row of rows) {
    grid.set(row.id, {
      userId: row.userId,
      name: row.name,
      color: row.color,
      ts: row.ts
    });
  }
  console.log(`[DB] Loaded ${grid.size} cells from SQLite.`);
}

init();

// Map<userId, lastClaimTs> — server-side cooldown enforcement (stays in memory)
const userCooldowns = new Map();

function getGrid() {
  const out = {};
  for (const [k, v] of grid) out[k] = v;
  return out;
}

function canClaim(userId) {
  const last = userCooldowns.get(userId) || 0;
  return Date.now() - last >= COOLDOWN_MS;
}

function getRemainingCooldown(userId) {
  const last = userCooldowns.get(userId) || 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

/**
 * Attempt to claim a cell.
 * Returns { ok: true, cell } or { ok: false, reason }
 */
function claimCell(cellId, userId, name, color) {
  const id = parseInt(cellId, 10);

  if (isNaN(id) || id < 0 || id >= TOTAL) {
    return { ok: false, reason: 'Invalid cell' };
  }

  if (!canClaim(userId)) {
    return {
      ok: false,
      reason: 'Cooldown active',
      remaining: getRemainingCooldown(userId),
    };
  }

  const ts = Date.now();
  const cell = { userId, name, color, ts };

  // Persist to SQLite
  try {
    insertCell.run(id, userId, name, color, ts);
    
    // Update memory cache
    grid.set(id, cell);
    userCooldowns.set(userId, ts);

    return { ok: true, cellId: id, cell };
  } catch (err) {
    console.error('[DB Error]', err);
    return { ok: false, reason: 'Database error' };
  }
}

function getLeaderboard() {
  const userStats = {}; // userId -> { count, name, color }

  // Aggregate stats from all claimed cells
  for (const [, cell] of grid) {
    if (!userStats[cell.userId]) {
      userStats[cell.userId] = { 
        count: 0, 
        name: cell.name, 
        color: cell.color 
      };
    }
    userStats[cell.userId].count++;
    
    // Optional: Keep the name/color updated to the latest claim info 
    // (useful if a returning user changed their name)
    userStats[cell.userId].name = cell.name;
    userStats[cell.userId].color = cell.color;
  }

  return Object.entries(userStats)
    .map(([userId, stats]) => ({
      userId,
      count: stats.count,
      name: stats.name,
      color: stats.color
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

module.exports = { getGrid, claimCell, getLeaderboard, COLS, ROWS, TOTAL, COOLDOWN_MS };
