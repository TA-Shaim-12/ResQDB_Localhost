// backend/scripts/import-any-sql.js
//
// Imports ANY .sql file (e.g. a mysqldump export from XAMPP) into whatever
// MySQL server your .env points at — using the mysql2 driver, which
// supports MySQL 8's caching_sha2_password authentication natively in
// JavaScript. This sidesteps the "Plugin caching_sha2_password could not
// be loaded" error you get from XAMPP's older mysql.exe client.
//
// Usage:
//   node scripts/import-any-sql.js "C:\path\to\resqdb.sql"
//
// Reads DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME from .env —
// point those at Railway's PUBLIC host/port before running this.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-any-sql.js "path\\to\\file.sql"');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Strips the CLI-only `DELIMITER $$ ... $$` convention some dumps include
// for triggers/procedures, turning it into plain SQL the driver can send
// as one multi-statement query.
function stripDelimiterSyntax(sql) {
  return sql
    .split("\n")
    .filter((line) => !/^\s*DELIMITER\b/i.test(line))
    .join("\n")
    .replace(/\$\$/g, ";");
}

async function main() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };

  if (!config.host || !config.user || !config.database) {
    console.error("DB_HOST, DB_USER, and DB_NAME must be set in backend/.env before running this.");
    process.exit(1);
  }

  console.log(`Connecting to ${config.host}:${config.port}, database "${config.database}"...`);
  const connection = await mysql.createConnection(config);

  console.log(`Reading ${path.basename(filePath)} (${(fs.statSync(filePath).size / 1024).toFixed(0)} KB)...`);
  const raw = fs.readFileSync(filePath, "utf8");
  const sql = stripDelimiterSyntax(raw);

  console.log("Running import — this can take a while for large files...");
  await connection.query(sql);

  console.log("Done. Import finished successfully.");
  await connection.end();
}

main().catch((err) => {
  console.error("\nImport failed:", err.message);
  process.exit(1);
});
