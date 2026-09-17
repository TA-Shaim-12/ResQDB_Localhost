// backend/routes/organizations.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT organization_id, org_name, org_type, contact_email, contact_phone FROM Organization ORDER BY org_name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
