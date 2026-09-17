// backend/routes/inventory.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

// GET /api/inventory/warehouses
router.get("/warehouses", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.warehouse_id, w.location, w.capacity, o.org_name
      FROM Warehouse w JOIN Organization o ON o.organization_id = w.organization_id
      ORDER BY w.warehouse_id
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/inventory/warehouses  { location, capacity, organization_id }
// Also seeds a zero-quantity Inventory row for every existing relief item,
// so the new warehouse immediately shows up fully in the stock table.
router.post("/warehouses", async (req, res) => {
  const { location, capacity, organization_id } = req.body;
  if (!location || !capacity || !organization_id) {
    return res.status(400).json({ error: "VALIDATION", message: "All fields are required." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      "INSERT INTO Warehouse (location, capacity, organization_id) VALUES (?, ?, ?)",
      [location, capacity, organization_id]
    );
    const [items] = await conn.query("SELECT item_id FROM ReliefItem");
    for (const it of items) {
      await conn.query(
        "INSERT INTO Inventory (warehouse_id, item_id, quantity) VALUES (?, ?, 0)",
        [result.insertId, it.item_id]
      );
    }
    await conn.commit();
    res.status(201).json({ warehouse_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    handleDbError(err, res);
  } finally {
    conn.release();
  }
});

// GET /api/inventory?lowStockThreshold=1000
router.get("/", async (req, res) => {
  const threshold = Number(req.query.lowStockThreshold) || 1000;
  try {
    const [rows] = await pool.query(
      `SELECT w.warehouse_id, w.location AS warehouse_location,
              ri.item_id, ri.item_name, ri.category, ri.unit,
              i.quantity, (i.quantity < ?) AS lowStock
       FROM Inventory i
       JOIN Warehouse w ON w.warehouse_id = i.warehouse_id
       JOIN ReliefItem ri ON ri.item_id = i.item_id
       ORDER BY w.warehouse_id, ri.item_name`,
      [threshold]
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// POST /api/inventory/:warehouseId/:itemId/restock  { quantity }
router.post("/:warehouseId/:itemId/restock", async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "VALIDATION", message: "quantity must be positive." });
  }
  try {
    await pool.query(
      "UPDATE Inventory SET quantity = quantity + ? WHERE warehouse_id = ? AND item_id = ?",
      [quantity, req.params.warehouseId, req.params.itemId]
    );
    res.json({ ok: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
