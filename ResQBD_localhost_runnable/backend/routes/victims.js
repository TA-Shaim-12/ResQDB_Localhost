// backend/routes/victims.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/victims?search=&area_id=&page=1&pageSize=25
// Paginated because the seed dataset has ~9,000 victims — returning all of
// them in one response would be slow and wasteful.
router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const areaId = req.query.area_id || null;

  try {
    const where = [];
    const params = [];
    if (search) { where.push("v.victim_name LIKE ?"); params.push(search); }
    if (areaId) { where.push("v.area_id = ?"); params.push(areaId); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM Victim v ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT v.victim_id, v.victim_name, v.age, v.gender, v.contact,
              v.area_id, aa.area_name, v.shelter_id, s.shelter_name
       FROM Victim v
       JOIN AffectedArea aa ON aa.area_id = v.area_id
       LEFT JOIN Shelter s ON s.shelter_id = v.shelter_id
       ${whereClause}
       ORDER BY v.victim_id
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/victims  { victim_name, age, gender, contact, area_id, shelter_id }
// If shelter_id is set, trg_victim_after_insert fires automatically inside
// MySQL and updates Shelter.current_occupancy — no application code needed.
router.post("/", async (req, res) => {
  const { victim_name, age, gender, contact, area_id, shelter_id } = req.body;
  if (!victim_name || !area_id) {
    return res.status(400).json({ error: "VALIDATION", message: "victim_name and area_id are required." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO Victim (victim_name, age, gender, contact, area_id, shelter_id) VALUES (?, ?, ?, ?, ?, ?)",
      [victim_name, age || null, gender || null, contact || null, area_id, shelter_id || null]
    );
    res.status(201).json({ victim_id: result.insertId });
  } catch (err) {
    handleDbError(err, res);
  }
});

// PUT /api/victims/:id
// If shelter_id changes, trg_victim_after_update fires and adjusts both
// the old and new shelter's occupancy automatically.
router.put("/:id", async (req, res) => {
  const { victim_name, age, gender, contact, area_id, shelter_id } = req.body;
  try {
    await pool.query(
      "UPDATE Victim SET victim_name=?, age=?, gender=?, contact=?, area_id=?, shelter_id=? WHERE victim_id=?",
      [victim_name, age || null, gender || null, contact || null, area_id, shelter_id || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// DELETE /api/victims/:id
// Blocked by MySQL (errno 1451) if the victim still has EmergencyRequest
// rows pointing at them — handleDbError turns that into a clean 409.
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM Victim WHERE victim_id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
