// backend/routes/distributions.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/distributions?page=1&pageSize=25
router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  try {
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM Distribution");

    const [rows] = await pool.query(
      `SELECT d.distribution_id, d.distribution_date,
              w.location AS warehouse_location, aa.area_name, o.org_name,
              v.vehicle_type
       FROM Distribution d
       JOIN Warehouse w ON w.warehouse_id = d.warehouse_id
       JOIN AffectedArea aa ON aa.area_id = d.area_id
       JOIN Organization o ON o.organization_id = d.organization_id
       LEFT JOIN Vehicle v ON v.vehicle_id = d.vehicle_id
       ORDER BY d.distribution_id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    // Attach the line items for just this page of distributions
    if (rows.length) {
      const ids = rows.map(r => r.distribution_id);
      const [items] = await pool.query(
        `SELECT di.distribution_id, ri.item_name, di.quantity, ri.unit
         FROM DistributionItem di JOIN ReliefItem ri ON ri.item_id = di.item_id
         WHERE di.distribution_id IN (?)`,
        [ids]
      );
      const byDist = {};
      items.forEach(it => {
        (byDist[it.distribution_id] ||= []).push(it);
      });
      rows.forEach(r => { r.items = byDist[r.distribution_id] || []; });
    }

    res.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/distributions
// { warehouse_id, area_id, organization_id, vehicle_id, item_id, quantity }
// Calls sp_distribute_relief, which wraps the Distribution + DistributionItem
// inserts in a transaction. If the shipment would take inventory negative,
// the CHECK constraint fails inside the procedure and the whole thing rolls
// back automatically — nothing partial ever gets committed.
//
// Important: the procedure's OUT parameter comes back via a MySQL session
// variable (@new_id), which is scoped to a single connection. We must run
// both the CALL and the follow-up SELECT on the exact same connection —
// using pool.query() twice would risk each one landing on a different
// pooled connection and reading back nothing.
router.post("/", async (req, res) => {
  const { warehouse_id, area_id, organization_id, vehicle_id, item_id, quantity } = req.body;
  if (!warehouse_id || !area_id || !organization_id || !item_id || !quantity) {
    return res.status(400).json({ error: "VALIDATION", message: "warehouse_id, area_id, organization_id, item_id, and quantity are required." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.query(
      "CALL sp_distribute_relief(?, ?, ?, ?, ?, ?, @new_id)",
      [warehouse_id, area_id, organization_id, vehicle_id || null, item_id, quantity]
    );
    const [[row]] = await conn.query("SELECT @new_id AS distribution_id");
    res.status(201).json({ distribution_id: row.distribution_id });
  } catch (err) {
    handleDbError(err, res);
  } finally {
    conn.release();
  }
});

module.exports = router;
