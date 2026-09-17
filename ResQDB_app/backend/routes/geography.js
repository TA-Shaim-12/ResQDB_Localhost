// backend/routes/geography.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/districts", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT district_id, district_name FROM District ORDER BY district_name");
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

router.get("/upazilas", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.upazila_id, u.upazila_name, d.district_name
      FROM Upazila u JOIN District d ON d.district_id = u.district_id
      ORDER BY d.district_name, u.upazila_name
    `);
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

module.exports = router;
