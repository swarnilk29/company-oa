export const COLS = 30;
export const ROWS = 25;
export const TOTAL = COLS * ROWS;

export const USER_COLORS = [
  '#f72585', // hot pink
  '#ff4d00', // deep orange
  '#ffbe0b', // amber
  '#06d6a0', // mint
  '#00bbf9', // sky
  '#4361ee', // indigo
  '#7209b7', // purple
  '#80ed99', // sage green
  '#ef233c', // red
  '#4cc9f0', // light blue
];

export const ADJECTIVES = [
  'Swift', 'Bold', 'Keen', 'Vast', 'Rare',
  'Calm', 'Dark', 'Bright', 'Cool', 'Sage',
];

export const NOUNS = [
  'Hawk', 'Wolf', 'Tide', 'Peak', 'Cove',
  'Mist', 'Dusk', 'Veil', 'Reed', 'Flint',
];

export function randomHandle() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}
