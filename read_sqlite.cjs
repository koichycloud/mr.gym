const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('dev.db', (err) => {
  if (err) {
    console.error("Error opening db:", err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.all("SELECT username, role FROM User", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log("===USERS===");
      rows.forEach(row => console.log(row.username + ": " + row.role));
    }
    db.close();
  });
});
