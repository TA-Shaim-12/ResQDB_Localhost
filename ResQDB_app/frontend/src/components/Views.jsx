// frontend/src/components/Views.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { Pill, Loading, ErrorState, fmt } from "./common";

const TABS = [
  { id: "dashboard", label: "EmergencyDashboard", path: "/views/emergency-dashboard" },
  { id: "inventory", label: "ReliefInventoryStatus", path: "/views/relief-inventory-status" },
  { id: "shelter", label: "ShelterStatus", path: "/views/shelter-status" },
];

const SQL = {
  dashboard: `CREATE VIEW EmergencyDashboard AS
SELECT aa.area_name, aa.population, aa.severity,
       COUNT(DISTINCT CASE WHEN er.status='Pending' THEN er.request_id END) AS pending_requests,
       COUNT(DISTINCT d.distribution_id) AS relief_distributions_received
FROM AffectedArea aa
LEFT JOIN EmergencyRequest er ON er.area_id = aa.area_id
LEFT JOIN Distribution d ON d.area_id = aa.area_id
GROUP BY aa.area_id;`,
  inventory: `CREATE VIEW ReliefInventoryStatus AS
SELECT w.location AS warehouse_location, ri.item_name, ri.category,
       i.quantity AS available_quantity, ri.unit
FROM Inventory i
JOIN Warehouse w ON w.warehouse_id = i.warehouse_id
JOIN ReliefItem ri ON ri.item_id = i.item_id;`,
  shelter: `CREATE VIEW ShelterStatus AS
SELECT shelter_name, capacity, current_occupancy,
       (capacity - current_occupancy) AS available_space, status
FROM Shelter;`,
};

export default function Views() {
  const [active, setActive] = useState("dashboard");
  const tab = TABS.find((t) => t.id === active);
  const data = useApi(tab.path, [active]);

  return (
    <div className="section">
      <div className="section-note" style={{ marginBottom: 16 }}>
        Each tab queries the real MySQL view directly (<code>SELECT * FROM …</code>) — nothing here is reimplemented in JavaScript.
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab${t.id === active ? " active" : ""}`} onClick={() => setActive(t.id)}>{t.label}</div>
        ))}
      </div>
      <div className="view-sql">{SQL[active]}</div>

      {data.loading && <Loading />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.data && (
        <div className="panel">
          {active === "dashboard" && (
            <table>
              <thead><tr><th>Area</th><th>Population</th><th>Severity</th><th>Pending requests</th><th>Distributions received</th></tr></thead>
              <tbody>
                {data.data.map((r, i) => (
                  <tr key={i}>
                    <td>{r.area_name}</td><td className="num">{fmt(r.population)}</td>
                    <td><Pill text={r.severity} tone={r.severity} /></td>
                    <td className="num">{r.pending_requests}</td><td className="num">{r.relief_distributions_received}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {active === "inventory" && (
            <table>
              <thead><tr><th>Warehouse</th><th>Item</th><th>Category</th><th>Quantity</th></tr></thead>
              <tbody>
                {data.data.map((r, i) => (
                  <tr key={i}><td>{r.warehouse_location}</td><td>{r.item_name}</td><td className="muted">{r.category}</td><td className="num">{fmt(r.available_quantity)} {r.unit}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {active === "shelter" && (
            <table>
              <thead><tr><th>Shelter</th><th>Capacity</th><th>Occupancy</th><th>Available space</th><th>Status</th></tr></thead>
              <tbody>
                {data.data.map((r, i) => (
                  <tr key={i}>
                    <td>{r.shelter_name}</td><td className="num">{r.capacity}</td><td className="num">{r.current_occupancy}</td>
                    <td className="num">{r.available_space}</td><td><Pill text={r.status} tone={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
