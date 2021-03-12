// migrate.js

var r = require("rethinkdb");

// Tables
const subTable = "subscriptions";
const userTable = "users";

r.connect(
  {
    host: process.env.RETHINKDB_HOST || "localhost",
    port: process.env.RETHINKDB_PORT || 28015,
    username: process.env.RETHINKDB_USERNAME || "admin",
    password: process.env.RETHINKDB_PASSWORD || "",
    db: process.env.RETHINKDB_NAME || "test",
  },
  async function (err, conn) {
    if (err) throw err;
    console.log("Get table list");
    let cursor = await r.tableList().run(conn);
    let tables = await cursor.toArray();

    // Check if user table exists
    if (!tables.includes(userTable)) {
      // Table missing --> create
      console.log("Creating user table");
      await r.tableCreate(userTable).run(conn);
      console.log("Creating user table -- done");
    }

    // Check if sub table exists
    if (!tables.includes(subTable)) {
      // Table missing --> create
      console.log("Creating sub table");
      await r.tableCreate(subTable).run(conn);
      console.log("Creating sub table -- done");
      // Create index
      await r.table(subTable).indexCreate("channel").run(conn);
      console.log("Creating channel secondary index -- done");
      await r
        .table(subTable)
        .indexCreate("listeners", { multi: true })
        .run(conn);
      console.log("Creating listeners secondary multi index -- done");
    }

    await conn.close();
  },
);