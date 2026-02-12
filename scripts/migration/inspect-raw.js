const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
console.log('Connecting to:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQlite database.');
});

db.serialize(() => {
    db.each("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Table found:', row.name);
    });
});

db.close();
