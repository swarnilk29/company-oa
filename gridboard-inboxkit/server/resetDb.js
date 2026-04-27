// node resetDB.js

const Database = require('better-sqlite3');
const db = new Database('grid.db');

const info = db.prepare('DELETE FROM cells').run();
console.log(`Successfully cleared ${info.changes} cells.`);
