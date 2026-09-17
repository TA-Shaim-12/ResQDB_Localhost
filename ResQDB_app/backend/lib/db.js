// backend/lib/db.js
// Single shared connection pool used by every route. Using a pool (rather
// than one connection) lets multiple API requests run concurrently without
// waiting on each other.
require("dotenv").config();
const mysql = require("mysql2/promise");

// Railway's MySQL plugin injects its own MYSQL* variables (and a single
// MYSQL_URL / MYSQL_PUBLIC_URL). Support both that and the project's own
// DB_* names so the same code runs unchanged locally and on Railway —
// whichever set is present wins, DB_* takes priority if both exist.
const config = process.env.MYSQL_URL || process.env.DB_URL
  ? { uri: process.env.DB_URL || process.env.MYSQL_URL }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || "root",
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || "resqdb",
    };

const pool = config.uri
  ? mysql.createPool(config.uri + "?dateStrings=true")
  : mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true, // return DATE/DATETIME as plain strings, not JS Date objects
      // Some managed MySQL providers require TLS. Set DB_SSL=true to enable
      // it; Railway's own MySQL plugin does not require this.
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });

module.exports = pool;
