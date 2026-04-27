const COLS = 30;
const ROWS = 25;
const TOTAL = COLS * ROWS;
const COOLDOWN_MS = 1200;

// Map<cellId, { userId, name, color, ts }>
const grid = new Map();

// Map<userId, lastClaimTs>  — server-side cooldown enforcement
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

  const cell = { userId, name, color, ts: Date.now() };
  grid.set(id, cell);
  userCooldowns.set(userId, Date.now());

  return { ok: true, cellId: id, cell };
}

function getLeaderboard(users) {
  const counts = {};
  for (const [, cell] of grid) {
    counts[cell.userId] = (counts[cell.userId] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([userId, count]) => {
      const u = users.get(userId);
      return { userId, count, name: u?.name || '?', color: u?.color || '#888' };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

module.exports = { getGrid, claimCell, getLeaderboard, COLS, ROWS, TOTAL, COOLDOWN_MS };
