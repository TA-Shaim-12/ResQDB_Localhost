// backend/scripts/import-db.js
//
// Runs the project's SQL files, in order, against whatever MySQL server
// your environment variables point to (local MySQL, or a hosted one like
// Railway). This replaces manually copy-pasting each .sql file into a GUI
// tool or having the `mysql` CLI installed.
//
// Usage:
//   node scripts/import-db.js            (schema + views + triggers + procedures, no sample data)
//   node scripts/import-db.js --with-sample-data
//
// Reads the same DB_* / MYSQL* env vars as backend/lib/db.js, but connects
// WITHOUT selecting a database first — 01_schema.sql creates and USEs the
// "resqdb" database itself. If you want the app to use that database on a
// host (like Railway) whose default database has a different name, set
// DB_NAME=resqdb in that host's environment variables afterwards.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DB_DIR = path.join(__dirname, "..", "..", "database");

const FILES = [
  "01_schema.sql",
  "02_views.sql",
  "03_triggers.sql",
  "04_procedures.sql",
];
if (process.argv.includes("--with-sample-data")) FILES.push("05_sample_data.sql");

// Turns the CLI-only `DELIMITER $$ ... $$ ... DELIMITER ;` convention into
// plain SQL the driver can send as one multi-statement query. The MySQL
// server's own parser (unlike a naive semicolon-split) understands routine
// bodies correctly, so this is safe.
function stripDelimiterSyntax(sql) {
  return sql
    .split("\n")
    .filter((line) => !/^\s*DELIMITER\b/i.test(line))
    .join("\n")
    .replace(/\$\$/g, ";");
}

async function main() {
  const useUrl = process.env.DB_URL || process.env.MYSQL_URL;
  const connectionConfig = useUrl
    ? useUrl
    : {
        host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER || "root",
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
        multipleStatements: true,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      };

  console.log(`Connecting to ${useUrl ? "(URL connection string)" : connectionConfig.host + ":" + connectionConfig.port}...`);
  const connection = useUrl
    ? await mysql.createConnection(useUrl + (useUrl.includes("?") ? "&" : "?") + "multipleStatements=true")
    : await mysql.createConnection(connectionConfig);

  for (const file of FILES) {
    const filePath = path.join(DB_DIR, file);
    console.log(`\nRunning ${file} ...`);
    const raw = fs.readFileSync(filePath, "utf8");
    const sql = stripDelimiterSyntax(raw);
    await connection.query(sql);
    console.log(`  done.`);
  }

  console.log("\nAll files executed successfully.");
  await connection.end();
}

main().catch((err) => {
  console.error("\nImport failed:", err.message);
  process.exit(1);
});
