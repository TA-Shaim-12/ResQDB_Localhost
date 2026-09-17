// backend/mock/load-seed.js
// Parses database/05_sample_data.sql into in-memory JS tables. This is ONLY
// used by mock-server.js for local preview without MySQL — the real
// backend (server.js) talks to actual MySQL and never touches this file.
const fs = require("fs");
const path = require("path");

function parseValue(raw) {
  raw = raw.trim();
  if (raw === "NULL") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

// Splits "a, 'b, c', NULL, 3.5" into ["a", "'b, c'", "NULL", "3.5"],
// respecting single-quoted strings so commas inside them aren't split on.
function splitTuple(inner) {
  const parts = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "'" && inner[i - 1] !== "\\") inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts.map(p => p.trim());
}

function loadSeed(sqlPath) {
  const text = fs.readFileSync(sqlPath, "utf8");
  const tables = {}; // tableName -> array of row objects

  const insertRe = /INSERT INTO (\w+) \(([^)]+)\) VALUES\s*\(([^;]+)\);/g;
  let m;
  while ((m = insertRe.exec(text))) {
    const [, tableName, colsRaw, valsRaw] = m;
    const cols = colsRaw.split(",").map(c => c.trim());
    const vals = splitTuple(valsRaw).map(parseValue);
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    (tables[tableName] ||= []).push(row);
  }

  // Apply the generator's post-hoc UPDATE statements (shelter occupancy
  // sync, final inventory snapshot) so in-memory state matches what the
  // real database would end up with after all triggers fire.
  const updateShelterRe = /UPDATE Shelter SET current_occupancy = (\d+), status = '(\w+)' WHERE shelter_id = (\d+);/g;
  while ((m = updateShelterRe.exec(text))) {
    const [, occ, status, id] = m;
    const row = tables.Shelter.find(r => r.shelter_id === Number(id));
    if (row) { row.current_occupancy = Number(occ); row.status = status; }
  }

  const updateInventoryRe = /UPDATE Inventory SET quantity = ([\d.]+) WHERE warehouse_id = (\d+) AND item_id = (\d+);/g;
  while ((m = updateInventoryRe.exec(text))) {
    const [, qty, wid, iid] = m;
    const row = tables.Inventory.find(r => r.warehouse_id === Number(wid) && r.item_id === Number(iid));
    if (row) row.quantity = Number(qty);
  }

  return tables;
}

module.exports = { loadSeed };
