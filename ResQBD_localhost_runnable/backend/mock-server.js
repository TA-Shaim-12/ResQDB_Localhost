// backend/mock-server.js
//
// A zero-dependency stand-in for server.js, for two purposes:
//   1. Lets you preview and click through the whole frontend instantly,
//      before you've set up MySQL at all.
//   2. Used during development to test the frontend against a live API
//      without needing a real database connection.
//
// It implements the exact same route contract as the real Express+MySQL
// backend (server.js + routes/*.js), but reads/writes an in-memory copy of
// database/05_sample_data.sql instead of a real database. Business rules
// that live in MySQL triggers/procedures/CHECK constraints in the real
// backend (inventory decrementing, shelter occupancy, FK restrict, the
// insufficient-stock rollback) are re-implemented here in plain JS so the
// two behave identically from the frontend's point of view.
//
// This file is NOT part of the production path — server.js + real MySQL is
// the actual deliverable. Run this only for a dependency-free preview.

const http = require("http");
const path = require("path");
const { loadSeed } = require("./mock/load-seed");

const PORT = process.env.MOCK_PORT || 4000;
const SEED_PATH = path.join(__dirname, "..", "database", "05_sample_data.sql");

console.log("Loading seed data...");
const DB = loadSeed(SEED_PATH);
console.log("Loaded:", Object.fromEntries(Object.entries(DB).map(([k, v]) => [k, v.length])));

let nextIds = {
  Victim: Math.max(...DB.Victim.map(r => r.victim_id)) + 1,
  EmergencyRequest: Math.max(...DB.EmergencyRequest.map(r => r.request_id)) + 1,
  Shelter: Math.max(...DB.Shelter.map(r => r.shelter_id)) + 1,
  Warehouse: Math.max(...DB.Warehouse.map(r => r.warehouse_id)) + 1,
  Distribution: Math.max(...DB.Distribution.map(r => r.distribution_id)) + 1,
  RescueTeam: Math.max(...DB.RescueTeam.map(r => r.team_id)) + 1,
};

// ---------------------------------------------------------------------
// Tiny router
// ---------------------------------------------------------------------
const routes = []; // { method, regex, keys, handler }
function addRoute(method, pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    "^" + pattern.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$"
  );
  routes.push({ method, regex, keys, handler });
}
function get(p, h) { addRoute("GET", p, h); }
function post(p, h) { addRoute("POST", p, h); }
function put(p, h) { addRoute("PUT", p, h); }
function del(p, h) { addRoute("DELETE", p, h); }

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(json);
}
function apiError(res, status, error, message) {
  sendJson(res, status, { error, message });
}

// ---------------------------------------------------------------------
// Business-rule helpers (mirror the MySQL triggers/procedures/CHECKs)
// ---------------------------------------------------------------------
function findRow(table, key, value) {
  return DB[table].find(r => r[key] === value);
}

// mirrors trg_victim_after_insert / trg_victim_after_update
function adjustShelterOccupancy(shelterId, delta) {
  if (!shelterId) return;
  const s = findRow("Shelter", "shelter_id", shelterId);
  if (!s) return;
  s.current_occupancy = Math.max(0, s.current_occupancy + delta);
  s.status = s.current_occupancy >= s.capacity ? "Full" : "Available";
}

// ---------------------------------------------------------------------
// Routes — mirrors backend/routes/*.js one-for-one
// ---------------------------------------------------------------------
get("/api/health", (req, res) => sendJson(res, 200, { ok: true, service: "resqdb-mock-backend" }));

// ---- dashboard ----
get("/api/dashboard/summary", (req, res) => {
  const totalPopulation = DB.AffectedArea.reduce((a, r) => a + (r.population || 0), 0);
  sendJson(res, 200, {
    activeDisasters: DB.Disaster.length,
    affectedAreas: DB.AffectedArea.length,
    totalPopulation,
    totalVictims: DB.Victim.length,
    pendingRequests: DB.EmergencyRequest.filter(r => r.status === "Pending").length,
  });
});

// ---- areas ----
get("/api/areas/lookup", (req, res) => {
  sendJson(res, 200, DB.AffectedArea.map(a => ({ area_id: a.area_id, area_name: a.area_name }))
    .sort((a, b) => a.area_name.localeCompare(b.area_name)));
});
get("/api/areas", (req, res) => {
  const rows = DB.AffectedArea.map(aa => {
    const u = findRow("Upazila", "upazila_id", aa.upazila_id);
    const d = findRow("Disaster", "disaster_id", aa.disaster_id);
    const victimCount = DB.Victim.filter(v => v.area_id === aa.area_id).length;
    const pendingRequests = DB.EmergencyRequest.filter(r => r.area_id === aa.area_id && r.status === "Pending").length;
    const distributionsReceived = DB.Distribution.filter(dd => dd.area_id === aa.area_id).length;
    return {
      area_id: aa.area_id, area_name: aa.area_name, population: aa.population, severity: aa.severity,
      upazila_name: u ? u.upazila_name : null, disaster_name: d ? d.disaster_name : null,
      victimCount, pendingRequests, distributionsReceived,
    };
  }).sort((a, b) => a.area_id - b.area_id);
  sendJson(res, 200, rows);
});

// ---- shelters ----
get("/api/shelters", (req, res) => {
  const rows = DB.Shelter.map(s => {
    const u = findRow("Upazila", "upazila_id", s.upazila_id);
    return { ...s, upazila_name: u ? u.upazila_name : null };
  }).sort((a, b) => a.shelter_id - b.shelter_id);
  sendJson(res, 200, rows);
});
get("/api/shelters/lookup/all", (req, res) => {
  sendJson(res, 200, [...DB.Shelter].sort((a, b) => a.shelter_name.localeCompare(b.shelter_name)));
});
post("/api/shelters", (req, res, params, body) => {
  const { shelter_name, upazila_id, capacity } = body;
  if (!shelter_name || !upazila_id || !capacity) return apiError(res, 400, "VALIDATION", "shelter_name, upazila_id, and capacity are required.");
  const row = { shelter_id: nextIds.Shelter++, shelter_name, upazila_id: Number(upazila_id), capacity: Number(capacity), current_occupancy: 0, status: "Available" };
  DB.Shelter.push(row);
  sendJson(res, 201, { shelter_id: row.shelter_id });
});
put("/api/shelters/:id", (req, res, params, body) => {
  const s = findRow("Shelter", "shelter_id", Number(params.id));
  if (!s) return apiError(res, 404, "NOT_FOUND", "Shelter not found.");
  const capacity = Number(body.capacity);
  if (capacity < s.current_occupancy) {
    return apiError(res, 400, "CHECK_CONSTRAINT", `This shelter currently houses ${s.current_occupancy} people — capacity can't be set below that.`);
  }
  s.shelter_name = body.shelter_name; s.upazila_id = Number(body.upazila_id); s.capacity = capacity;
  s.status = s.current_occupancy >= capacity ? "Full" : "Available";
  sendJson(res, 200, { ok: true });
});
del("/api/shelters/:id", (req, res, params) => {
  const id = Number(params.id);
  const dependents = DB.Victim.filter(v => v.shelter_id === id).length;
  if (dependents > 0) {
    return apiError(res, 409, "FOREIGN_KEY_RESTRICT", `This shelter currently houses ${dependents} victim(s). Reassign or discharge them first.`);
  }
  DB.Shelter = DB.Shelter.filter(s => s.shelter_id !== id);
  sendJson(res, 200, { ok: true });
});

// ---- victims (paginated) ----
get("/api/victims", (req, res, params, body, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 25));
  let rows = DB.Victim;
  if (query.search) {
    const s = query.search.toLowerCase();
    rows = rows.filter(v => v.victim_name.toLowerCase().includes(s));
  }
  if (query.area_id) rows = rows.filter(v => v.area_id === Number(query.area_id));
  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize).map(v => {
    const aa = findRow("AffectedArea", "area_id", v.area_id);
    const s = v.shelter_id ? findRow("Shelter", "shelter_id", v.shelter_id) : null;
    return { ...v, area_name: aa ? aa.area_name : null, shelter_name: s ? s.shelter_name : null };
  });
  sendJson(res, 200, { rows: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});
post("/api/victims", (req, res, params, body) => {
  const { victim_name, age, gender, contact, area_id, shelter_id } = body;
  if (!victim_name || !area_id) return apiError(res, 400, "VALIDATION", "victim_name and area_id are required.");
  const row = {
    victim_id: nextIds.Victim++, victim_name, age: age ? Number(age) : null, gender: gender || null,
    contact: contact || null, area_id: Number(area_id), shelter_id: shelter_id ? Number(shelter_id) : null,
  };
  DB.Victim.push(row);
  if (row.shelter_id) adjustShelterOccupancy(row.shelter_id, +1);
  sendJson(res, 201, { victim_id: row.victim_id });
});
put("/api/victims/:id", (req, res, params, body) => {
  const v = findRow("Victim", "victim_id", Number(params.id));
  if (!v) return apiError(res, 404, "NOT_FOUND", "Victim not found.");
  const newShelterId = body.shelter_id ? Number(body.shelter_id) : null;
  if (newShelterId !== v.shelter_id) {
    adjustShelterOccupancy(v.shelter_id, -1);
    adjustShelterOccupancy(newShelterId, +1);
  }
  v.victim_name = body.victim_name; v.age = body.age ? Number(body.age) : null; v.gender = body.gender || null;
  v.contact = body.contact || null; v.area_id = Number(body.area_id); v.shelter_id = newShelterId;
  sendJson(res, 200, { ok: true });
});
del("/api/victims/:id", (req, res, params) => {
  const id = Number(params.id);
  const dependents = DB.EmergencyRequest.filter(r => r.victim_id === id).length;
  if (dependents > 0) {
    return apiError(res, 409, "FOREIGN_KEY_RESTRICT", `This victim has ${dependents} emergency request(s) referencing them. Delete or reassign those first.`);
  }
  const v = findRow("Victim", "victim_id", id);
  if (v && v.shelter_id) adjustShelterOccupancy(v.shelter_id, -1);
  DB.Victim = DB.Victim.filter(v => v.victim_id !== id);
  sendJson(res, 200, { ok: true });
});

// ---- emergency requests (paginated) ----
get("/api/requests/counts", (req, res) => {
  sendJson(res, 200, { pending: DB.EmergencyRequest.filter(r => r.status === "Pending").length });
});
get("/api/requests", (req, res, params, body, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 25));
  let rows = [...DB.EmergencyRequest];
  if (query.status && query.status !== "all") rows = rows.filter(r => r.status === query.status);
  if (query.priority && query.priority !== "all") rows = rows.filter(r => r.priority === query.priority);
  rows.sort((a, b) => (a.request_date < b.request_date ? 1 : -1));
  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize).map(r => {
    const v = findRow("Victim", "victim_id", r.victim_id);
    const aa = findRow("AffectedArea", "area_id", r.area_id);
    const t = r.assigned_team_id ? findRow("RescueTeam", "team_id", r.assigned_team_id) : null;
    return {
      ...r, victim_name: v ? v.victim_name : null, area_name: aa ? aa.area_name : null,
      team_name: t ? t.team_name : null,
    };
  });
  sendJson(res, 200, { rows: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});
post("/api/requests", (req, res, params, body) => {
  const { victim_id, area_id, request_type, priority } = body;
  if (!victim_id || !area_id || !request_type || !priority) return apiError(res, 400, "VALIDATION", "All fields are required.");
  const row = {
    request_id: nextIds.EmergencyRequest++, victim_id: Number(victim_id), area_id: Number(area_id),
    request_type, priority, request_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    status: "Pending", assigned_team_id: null,
  };
  DB.EmergencyRequest.push(row);
  sendJson(res, 201, { request_id: row.request_id });
});
put("/api/requests/:id", (req, res, params, body) => {
  const r = findRow("EmergencyRequest", "request_id", Number(params.id));
  if (!r) return apiError(res, 404, "NOT_FOUND", "Request not found.");
  r.request_type = body.request_type; r.priority = body.priority;
  sendJson(res, 200, { ok: true });
});
post("/api/requests/:id/assign", (req, res, params, body) => {
  const r = findRow("EmergencyRequest", "request_id", Number(params.id));
  const team = findRow("RescueTeam", "team_id", Number(body.team_id));
  if (!r || !team) return apiError(res, 400, "VALIDATION", "Invalid request or team.");
  r.status = "Assigned"; r.assigned_team_id = team.team_id; team.status = "Deployed";
  sendJson(res, 200, { ok: true });
});
post("/api/requests/:id/resolve", (req, res, params) => {
  const r = findRow("EmergencyRequest", "request_id", Number(params.id));
  if (!r) return apiError(res, 404, "NOT_FOUND", "Request not found.");
  if (!r.assigned_team_id) return apiError(res, 400, "BUSINESS_RULE", "Assign a rescue team before resolving this request.");
  r.status = "Resolved";
  const team = findRow("RescueTeam", "team_id", r.assigned_team_id);
  if (team) team.status = "Available";
  sendJson(res, 200, { ok: true });
});
post("/api/requests/:id/cancel", (req, res, params) => {
  const r = findRow("EmergencyRequest", "request_id", Number(params.id));
  if (!r) return apiError(res, 404, "NOT_FOUND", "Request not found.");
  if (r.assigned_team_id) {
    const team = findRow("RescueTeam", "team_id", r.assigned_team_id);
    if (team) team.status = "Available";
  }
  r.status = "Cancelled"; r.assigned_team_id = null;
  sendJson(res, 200, { ok: true });
});
del("/api/requests/:id", (req, res, params) => {
  DB.EmergencyRequest = DB.EmergencyRequest.filter(r => r.request_id !== Number(params.id));
  sendJson(res, 200, { ok: true });
});

// ---- teams ----
get("/api/teams/available", (req, res) => {
  sendJson(res, 200, DB.RescueTeam.filter(t => t.status === "Available")
    .map(t => ({ team_id: t.team_id, team_name: t.team_name, team_type: t.team_type }))
    .sort((a, b) => a.team_name.localeCompare(b.team_name)));
});
get("/api/teams", (req, res) => {
  const rows = DB.RescueTeam.map(t => {
    const o = findRow("Organization", "organization_id", t.organization_id);
    return { ...t, org_name: o ? o.org_name : null };
  }).sort((a, b) => a.team_id - b.team_id);
  sendJson(res, 200, rows);
});
post("/api/teams", (req, res, params, body) => {
  const { team_name, organization_id, team_type, member_count } = body;
  if (!team_name || !organization_id || !team_type || !member_count) return apiError(res, 400, "VALIDATION", "All fields are required.");
  const row = { team_id: nextIds.RescueTeam++, team_name, organization_id: Number(organization_id), team_type, member_count: Number(member_count), status: "Available" };
  DB.RescueTeam.push(row);
  sendJson(res, 201, { team_id: row.team_id });
});
del("/api/teams/:id", (req, res, params) => {
  const id = Number(params.id);
  const dependents = DB.EmergencyRequest.filter(r => r.assigned_team_id === id).length;
  if (dependents > 0) return apiError(res, 409, "FOREIGN_KEY_RESTRICT", "This team is referenced by existing emergency requests.");
  DB.RescueTeam = DB.RescueTeam.filter(t => t.team_id !== id);
  sendJson(res, 200, { ok: true });
});

// ---- inventory & warehouses ----
get("/api/inventory/warehouses", (req, res) => {
  const rows = DB.Warehouse.map(w => {
    const o = findRow("Organization", "organization_id", w.organization_id);
    return { ...w, org_name: o ? o.org_name : null };
  }).sort((a, b) => a.warehouse_id - b.warehouse_id);
  sendJson(res, 200, rows);
});
post("/api/inventory/warehouses", (req, res, params, body) => {
  const { location, capacity, organization_id } = body;
  if (!location || !capacity || !organization_id) return apiError(res, 400, "VALIDATION", "All fields are required.");
  const row = { warehouse_id: nextIds.Warehouse++, location, capacity: Number(capacity), organization_id: Number(organization_id) };
  DB.Warehouse.push(row);
  DB.ReliefItem.forEach(it => DB.Inventory.push({ warehouse_id: row.warehouse_id, item_id: it.item_id, quantity: 0 }));
  sendJson(res, 201, { warehouse_id: row.warehouse_id });
});
get("/api/inventory", (req, res, params, body, query) => {
  const threshold = Number(query.lowStockThreshold) || 1000;
  const rows = DB.Inventory.map(i => {
    const w = findRow("Warehouse", "warehouse_id", i.warehouse_id);
    const it = findRow("ReliefItem", "item_id", i.item_id);
    return {
      warehouse_id: i.warehouse_id, warehouse_location: w ? w.location : null,
      item_id: i.item_id, item_name: it ? it.item_name : null, category: it ? it.category : null, unit: it ? it.unit : null,
      quantity: i.quantity, lowStock: i.quantity < threshold ? 1 : 0,
    };
  }).sort((a, b) => a.warehouse_id - b.warehouse_id || a.item_name.localeCompare(b.item_name));
  sendJson(res, 200, rows);
});
post("/api/inventory/:warehouseId/:itemId/restock", (req, res, params, body) => {
  const qty = Number(body.quantity);
  if (!qty || qty <= 0) return apiError(res, 400, "VALIDATION", "quantity must be positive.");
  const inv = DB.Inventory.find(i => i.warehouse_id === Number(params.warehouseId) && i.item_id === Number(params.itemId));
  if (!inv) return apiError(res, 404, "NOT_FOUND", "Inventory row not found.");
  inv.quantity += qty;
  sendJson(res, 200, { ok: true });
});

// ---- distributions ----
get("/api/distributions", (req, res, params, body, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 25));
  const sorted = [...DB.Distribution].sort((a, b) => b.distribution_id - a.distribution_id);
  const total = sorted.length;
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize).map(d => {
    const w = findRow("Warehouse", "warehouse_id", d.warehouse_id);
    const aa = findRow("AffectedArea", "area_id", d.area_id);
    const o = findRow("Organization", "organization_id", d.organization_id);
    const veh = d.vehicle_id ? findRow("Vehicle", "vehicle_id", d.vehicle_id) : null;
    const items = DB.DistributionItem.filter(di => di.distribution_id === d.distribution_id).map(di => {
      const it = findRow("ReliefItem", "item_id", di.item_id);
      return { item_name: it ? it.item_name : null, quantity: di.quantity, unit: it ? it.unit : null };
    });
    return {
      distribution_id: d.distribution_id, distribution_date: d.distribution_date,
      warehouse_location: w ? w.location : null, area_name: aa ? aa.area_name : null,
      org_name: o ? o.org_name : null, vehicle_type: veh ? veh.vehicle_type : null, items,
    };
  });
  sendJson(res, 200, { rows: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});
post("/api/distributions", (req, res, params, body) => {
  const { warehouse_id, area_id, organization_id, vehicle_id, item_id, quantity } = body;
  if (!warehouse_id || !area_id || !organization_id || !item_id || !quantity) {
    return apiError(res, 400, "VALIDATION", "warehouse_id, area_id, organization_id, item_id, and quantity are required.");
  }
  const inv = DB.Inventory.find(i => i.warehouse_id === Number(warehouse_id) && i.item_id === Number(item_id));
  // Mirrors sp_distribute_relief: if this would take inventory negative,
  // the whole operation is rejected — nothing partial gets created.
  if (!inv || inv.quantity < Number(quantity)) {
    return apiError(res, 400, "BUSINESS_RULE",
      `Insufficient inventory for this distribution (only ${inv ? inv.quantity : 0} available). Transaction rolled back — no Distribution record was created.`);
  }
  const dist = {
    distribution_id: nextIds.Distribution++, warehouse_id: Number(warehouse_id), area_id: Number(area_id),
    organization_id: Number(organization_id), vehicle_id: vehicle_id ? Number(vehicle_id) : null,
    distribution_date: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  DB.Distribution.push(dist);
  DB.DistributionItem.push({ distribution_id: dist.distribution_id, item_id: Number(item_id), quantity: Number(quantity) });
  inv.quantity -= Number(quantity); // mirrors trg_distributionitem_after_insert
  sendJson(res, 201, { distribution_id: dist.distribution_id });
});

// ---- organizations / items ----
get("/api/organizations", (req, res) => {
  sendJson(res, 200, [...DB.Organization].sort((a, b) => a.org_name.localeCompare(b.org_name)));
});
get("/api/items", (req, res) => {
  sendJson(res, 200, [...DB.ReliefItem].sort((a, b) => a.item_name.localeCompare(b.item_name)));
});

// ---- views ----
get("/api/views/emergency-dashboard", (req, res) => {
  const rows = DB.AffectedArea.map(aa => ({
    area_name: aa.area_name, population: aa.population, severity: aa.severity,
    pending_requests: DB.EmergencyRequest.filter(r => r.area_id === aa.area_id && r.status === "Pending").length,
    relief_distributions_received: DB.Distribution.filter(d => d.area_id === aa.area_id).length,
  }));
  sendJson(res, 200, rows);
});
get("/api/views/relief-inventory-status", (req, res) => {
  const rows = DB.Inventory.map(i => {
    const w = findRow("Warehouse", "warehouse_id", i.warehouse_id);
    const it = findRow("ReliefItem", "item_id", i.item_id);
    return { warehouse_location: w ? w.location : null, item_name: it ? it.item_name : null, category: it ? it.category : null, available_quantity: i.quantity, unit: it ? it.unit : null };
  });
  sendJson(res, 200, rows);
});
get("/api/views/shelter-status", (req, res) => {
  sendJson(res, 200, DB.Shelter.map(s => ({
    shelter_name: s.shelter_name, capacity: s.capacity, current_occupancy: s.current_occupancy,
    available_space: s.capacity - s.current_occupancy, status: s.status,
  })));
});

// ---- reference data ----
get("/api/reference/vehicles", (req, res) => {
  sendJson(res, 200, DB.Vehicle.map(v => {
    const o = findRow("Organization", "organization_id", v.organization_id);
    return { ...v, org_name: o ? o.org_name : null };
  }));
});
get("/api/reference/drivers", (req, res) => sendJson(res, 200, DB.Driver));
get("/api/reference/volunteers", (req, res, params, body, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 25));
  const total = DB.Volunteer.length;
  const paged = DB.Volunteer.slice((page - 1) * pageSize, page * pageSize).map(v => {
    const o = findRow("Organization", "organization_id", v.organization_id);
    return { ...v, org_name: o ? o.org_name : null };
  });
  sendJson(res, 200, { rows: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});
get("/api/reference/medical-camps", (req, res) => {
  const rows = DB.MedicalCamp.map(mc => {
    const u = findRow("Upazila", "upazila_id", mc.upazila_id);
    const o = findRow("Organization", "organization_id", mc.organization_id);
    const assignments = DB.MedicalCampAssignment.filter(a => a.medical_camp_id === mc.medical_camp_id);
    return {
      medical_camp_id: mc.medical_camp_id, location: mc.location,
      upazila_name: u ? u.upazila_name : null, org_name: o ? o.org_name : null,
      doctorCount: assignments.length,
      patientsServed: assignments.reduce((a, r) => a + (r.patients_served || 0), 0),
    };
  });
  sendJson(res, 200, rows);
});
get("/api/reference/doctors", (req, res) => sendJson(res, 200, DB.Doctor));

// ---- geography ----
get("/api/geography/districts", (req, res) => sendJson(res, 200, [...DB.District].sort((a, b) => a.district_name.localeCompare(b.district_name))));
get("/api/geography/upazilas", (req, res) => {
  const rows = DB.Upazila.map(u => {
    const d = findRow("District", "district_id", u.district_id);
    return { ...u, district_name: d ? d.district_name : null };
  }).sort((a, b) => a.district_name.localeCompare(b.district_name) || a.upazila_name.localeCompare(b.upazila_name));
  sendJson(res, 200, rows);
});

// ---------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const query = Object.fromEntries(url.searchParams);
  const matched = routes.find(r => r.method === req.method && r.regex.test(url.pathname));

  if (!matched) return apiError(res, 404, "NOT_FOUND", "No such endpoint.");

  const values = matched.regex.exec(url.pathname).slice(1);
  const params = Object.fromEntries(matched.keys.map((k, i) => [k, values[i]]));

  if (req.method === "GET" || req.method === "DELETE") {
    try {
      matched.handler(req, res, params, {}, query);
    } catch (err) {
      console.error(err);
      apiError(res, 500, "SERVER_ERROR", "Unexpected error.");
    }
    return;
  }

  let raw = "";
  req.on("data", chunk => { raw += chunk; });
  req.on("end", () => {
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { /* ignore malformed body */ }
    try {
      matched.handler(req, res, params, body, query);
    } catch (err) {
      console.error(err);
      apiError(res, 500, "SERVER_ERROR", "Unexpected error.");
    }
  });
});

server.listen(PORT, () => {
  console.log(`ResQDB MOCK backend (no MySQL required) listening on http://localhost:${PORT}`);
});
