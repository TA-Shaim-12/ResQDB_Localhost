// backend/routes/views.js
// These three endpoints do nothing but SELECT * FROM <the actual SQL VIEW>.
// They exist to demonstrate that the views defined in 02_views.sql are real,
// queryable database objects — not something reimplemented in JavaScript.
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/emergency-dashboard", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM EmergencyDashboard");
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.get("/relief-inventory-status", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM ReliefInventoryStatus");
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.get("/shelter-status", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM ShelterStatus");
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
