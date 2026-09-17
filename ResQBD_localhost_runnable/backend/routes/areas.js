// backend/routes/areas.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/areas
// One row per affected area with live counts — this is the API-driven
// equivalent of querying the EmergencyDashboard view directly.
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        aa.area_id, aa.area_name, aa.population, aa.severity,
        u.upazila_name, d.disaster_name,
        COALESCE(v.victimCount, 0) AS victimCount,
        COALESCE(er.pendingRequests, 0) AS pendingRequests,
        COALESCE(dist.distributionsReceived, 0) AS distributionsReceived
      FROM AffectedArea aa
      JOIN Upazila u ON u.upazila_id = aa.upazila_id
      JOIN Disaster d ON d.disaster_id = aa.disaster_id
      LEFT JOIN (
        SELECT area_id, COUNT(*) AS victimCount
        FROM Victim
        GROUP BY area_id
      ) v ON v.area_id = aa.area_id
      LEFT JOIN (
        SELECT area_id, COUNT(*) AS pendingRequests
        FROM EmergencyRequest
        WHERE status = 'Pending'
        GROUP BY area_id
      ) er ON er.area_id = aa.area_id
      LEFT JOIN (
        SELECT area_id, COUNT(*) AS distributionsReceived
        FROM Distribution
        GROUP BY area_id
      ) dist ON dist.area_id = aa.area_id
      ORDER BY aa.area_id
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// GET /api/areas/lookup — lightweight list for populating <select> dropdowns
router.get("/lookup", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT area_id, area_name FROM AffectedArea ORDER BY area_name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
