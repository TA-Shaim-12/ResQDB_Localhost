// backend/lib/db.js
// Single shared connection pool used by every route. Using a pool (rather
// than one connection) lets multiple API requests run concurrently without
// waiting on each other.
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resqdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as plain strings, not JS Date objects
});

module.exports = pool;
