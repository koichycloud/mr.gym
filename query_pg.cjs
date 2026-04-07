const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83postgres@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT username, role FROM "User"');
    console.log("===USERS===");
    res.rows.forEach(row => console.log(row.username + ": " + row.role));
  } catch (e) {
    if (e.code === '42P01') {
      try {
        const res2 = await client.query('SELECT username, role FROM "users"');
        console.log("===USERS===");
        res2.rows.forEach(row => console.log(row.username + ": " + row.role));
      } catch (err2) {
         console.error("Second error: ", err2);
      }
    } else {
       console.error("First error: ", e);
    }
  } finally {
    await client.end();
  }
}

main();
