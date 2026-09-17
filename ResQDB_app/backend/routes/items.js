// backend/routes/items.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT item_id, item_name, category, unit FROM ReliefItem ORDER BY item_name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
