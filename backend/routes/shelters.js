// backend/routes/shelters.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/shelters
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.shelter_id, s.shelter_name, s.capacity, s.current_occupancy, s.status,
             u.upazila_name
      FROM Shelter s
      JOIN Upazila u ON u.upazila_id = s.upazila_id
      ORDER BY s.shelter_id
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/shelters  { shelter_name, upazila_id, capacity }
router.post("/", async (req, res) => {
  const { shelter_name, upazila_id, capacity } = req.body;
  if (!shelter_name || !upazila_id || !capacity) {
    return res.status(400).json({ error: "VALIDATION", message: "shelter_name, upazila_id, and capacity are required." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO Shelter (shelter_name, upazila_id, capacity, current_occupancy, status) VALUES (?, ?, ?, 0, 'Available')",
      [shelter_name, upazila_id, capacity]
    );
    res.status(201).json({ shelter_id: result.insertId });
  } catch (err) {
    handleDbError(err, res);
  }
});

// PUT /api/shelters/:id  { shelter_name, upazila_id, capacity }
router.put("/:id", async (req, res) => {
  const { shelter_name, upazila_id, capacity } = req.body;
  try {
    // capacity < current_occupancy is blocked by the CHECK constraint in
    // the schema — we don't need to duplicate that logic here, MySQL
    // will reject it and handleDbError will turn it into a clean 400.
    await pool.query(
      "UPDATE Shelter SET shelter_name = ?, upazila_id = ?, capacity = ?, status = IF(current_occupancy >= ?, 'Full', 'Available') WHERE shelter_id = ?",
      [shelter_name, upazila_id, capacity, capacity, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// DELETE /api/shelters/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM Shelter WHERE shelter_id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    // If any Victim rows still point at this shelter, MySQL raises errno
    // 1451 (FK restrict) — handleDbError turns that into a friendly 409.
    handleDbError(err, res);
  }
});

// GET /api/shelters/lookup — for populating <select> dropdowns
router.get("/lookup/all", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT shelter_id, shelter_name, capacity, current_occupancy, status FROM Shelter ORDER BY shelter_name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
