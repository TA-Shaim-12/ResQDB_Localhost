// backend/routes/requests.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/requests?status=&priority=&page=1&pageSize=25
router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  try {
    const where = [];
    const params = [];
    if (req.query.status && req.query.status !== "all") { where.push("er.status = ?"); params.push(req.query.status); }
    if (req.query.priority && req.query.priority !== "all") { where.push("er.priority = ?"); params.push(req.query.priority); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM EmergencyRequest er ${whereClause}`, params
    );

    const [rows] = await pool.query(
      `SELECT er.request_id, er.request_type, er.priority, er.status, er.request_date,
              v.victim_id, v.victim_name, aa.area_id, aa.area_name,
              rt.team_id, rt.team_name
       FROM EmergencyRequest er
       JOIN Victim v ON v.victim_id = er.victim_id
       JOIN AffectedArea aa ON aa.area_id = er.area_id
       LEFT JOIN RescueTeam rt ON rt.team_id = er.assigned_team_id
       ${whereClause}
       ORDER BY er.request_date DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    handleDbError(err, res);
  }
});

// GET /api/requests/counts — small helper for sidebar badge counts
router.get("/counts", async (req, res) => {
  try {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS pending FROM EmergencyRequest WHERE status = 'Pending'"
    );
    res.json(row);
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/requests  { victim_id, area_id, request_type, priority }
router.post("/", async (req, res) => {
  const { victim_id, area_id, request_type, priority } = req.body;
  if (!victim_id || !area_id || !request_type || !priority) {
    return res.status(400).json({ error: "VALIDATION", message: "All fields are required." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO EmergencyRequest (victim_id, area_id, request_type, priority, status) VALUES (?, ?, ?, ?, 'Pending')",
      [victim_id, area_id, request_type, priority]
    );
    res.status(201).json({ request_id: result.insertId });
  } catch (err) {
    handleDbError(err, res);
  }
});

// PUT /api/requests/:id  { request_type, priority }
router.put("/:id", async (req, res) => {
  const { request_type, priority } = req.body;
  try {
    await pool.query(
      "UPDATE EmergencyRequest SET request_type = ?, priority = ? WHERE request_id = ?",
      [request_type, priority, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/requests/:id/assign  { team_id }
router.post("/:id/assign", async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: "VALIDATION", message: "team_id is required." });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE EmergencyRequest SET status = 'Assigned', assigned_team_id = ? WHERE request_id = ?",
      [team_id, req.params.id]
    );
    await conn.query("UPDATE RescueTeam SET status = 'Deployed' WHERE team_id = ?", [team_id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    handleDbError(err, res);
  } finally {
    conn.release();
  }
});

// POST /api/requests/:id/resolve
// Uses the sp_resolve_request stored procedure, which itself blocks
// (via SIGNAL) if no team is assigned yet.
router.post("/:id/resolve", async (req, res) => {
  try {
    await pool.query("CALL sp_resolve_request(?)", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/requests/:id/cancel
router.post("/:id/cancel", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[current]] = await conn.query(
      "SELECT assigned_team_id FROM EmergencyRequest WHERE request_id = ?",
      [req.params.id]
    );
    if (current && current.assigned_team_id) {
      await conn.query("UPDATE RescueTeam SET status = 'Available' WHERE team_id = ?", [current.assigned_team_id]);
    }
    await conn.query(
      "UPDATE EmergencyRequest SET status = 'Cancelled', assigned_team_id = NULL WHERE request_id = ?",
      [req.params.id]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    handleDbError(err, res);
  } finally {
    conn.release();
  }
});

// DELETE /api/requests/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM EmergencyRequest WHERE request_id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
