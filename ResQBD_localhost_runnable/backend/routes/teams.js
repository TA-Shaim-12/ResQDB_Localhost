// backend/routes/teams.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rt.team_id, rt.team_name, rt.team_type, rt.member_count, rt.status,
             o.org_name
      FROM RescueTeam rt
      JOIN Organization o ON o.organization_id = rt.organization_id
      ORDER BY rt.team_id
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// GET /api/teams/available — only teams free to be assigned to a new request
router.get("/available", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT team_id, team_name, team_type FROM RescueTeam WHERE status = 'Available' ORDER BY team_name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { team_name, organization_id, team_type, member_count } = req.body;
  if (!team_name || !organization_id || !team_type || !member_count) {
    return res.status(400).json({ error: "VALIDATION", message: "All fields are required." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO RescueTeam (team_name, organization_id, team_type, member_count, status) VALUES (?, ?, ?, ?, 'Available')",
      [team_name, organization_id, team_type, member_count]
    );
    res.status(201).json({ team_id: result.insertId });
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM RescueTeam WHERE team_id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res); // blocked (1451) if EmergencyRequest rows reference this team
  }
});

module.exports = router;
