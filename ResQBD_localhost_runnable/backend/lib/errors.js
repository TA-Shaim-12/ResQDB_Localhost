// backend/lib/errors.js
// Translates raw MySQL errors (foreign key restricts, CHECK constraint
// failures, custom SIGNAL messages from triggers/procedures) into clean
// HTTP responses instead of leaking driver internals to the frontend.
function handleDbError(err, res) {
  // Foreign key violation (e.g. deleting a Shelter that still has Victims)
  if (err.errno === 1451) {
    return res.status(409).json({
      error: "FOREIGN_KEY_RESTRICT",
      message:
        "This record can't be deleted because other rows still reference it. Reassign or remove those first.",
    });
  }
  // Referenced row doesn't exist (bad foreign key on insert/update)
  if (err.errno === 1452) {
    return res.status(400).json({
      error: "INVALID_REFERENCE",
      message: "One of the referenced IDs (area, shelter, warehouse, etc.) doesn't exist.",
    });
  }
  // CHECK constraint failure (e.g. quantity < 0, capacity < occupancy)
  if (err.errno === 3819 || err.errno === 4025) {
    return res.status(400).json({
      error: "CHECK_CONSTRAINT",
      message: err.sqlMessage || "That value violates a database constraint.",
    });
  }
  // Custom SIGNAL raised inside a trigger or stored procedure
  if (err.sqlState === "45000") {
    return res.status(400).json({
      error: "BUSINESS_RULE",
      message: err.sqlMessage || "That operation isn't allowed.",
    });
  }
  // Duplicate unique key
  if (err.errno === 1062) {
    return res.status(409).json({
      error: "DUPLICATE",
      message: "A record with that value already exists.",
    });
  }
  console.error(err);
  return res.status(500).json({ error: "SERVER_ERROR", message: "Something went wrong." });
}

module.exports = { handleDbError };
