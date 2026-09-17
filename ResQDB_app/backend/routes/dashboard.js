// backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/dashboard/summary
// High-level stat-strip numbers for the console's home page.
router.get("/summary", async (req, res) => {
  try {
    const [[disasterRow]] = await pool.query(
      "SELECT COUNT(*) AS activeDisasters FROM Disaster"
    );
    const [[areaRow]] = await pool.query(
      "SELECT COUNT(*) AS affectedAreas, COALESCE(SUM(population),0) AS totalPopulation FROM AffectedArea"
    );
    const [[victimRow]] = await pool.query("SELECT COUNT(*) AS totalVictims FROM Victim");
    const [[pendingRow]] = await pool.query(
      "SELECT COUNT(*) AS pendingRequests FROM EmergencyRequest WHERE status = 'Pending'"
    );

    res.json({
      activeDisasters: disasterRow.activeDisasters,
      affectedAreas: areaRow.affectedAreas,
      totalPopulation: areaRow.totalPopulation,
      totalVictims: victimRow.totalVictims,
      pendingRequests: pendingRow.pendingRequests,
    });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
