// frontend/src/components/Inventory.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Pill, Loading, ErrorState, Banner, fmt } from "./common";
import { useModal } from "./Modal";
import { useToast } from "./Toast";

function RestockForm({ row, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [qty, setQty] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(qty);
    if (!n || n <= 0) { setError("Enter a positive quantity."); return; }
    setSaving(true);
    try {
      await api.post(`/inventory/${row.warehouse_id}/${row.item_id}/restock`, { quantity: n });
      showToast(`Added ${fmt(n)} ${row.unit} of ${row.item_name} to ${row.warehouse_location}.`);
      closeModal();
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {error && <Banner type="error" title="Couldn't restock">{error}</Banner>}
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
        {row.warehouse_location} — currently {fmt(row.quantity)} {row.unit}
      </p>
      <div className="field"><label>Quantity to add</label><input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 1000" /></div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add stock"}</button>
      </div>
    </>
  );
}

function AddWarehouseForm({ organizations, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [orgId, setOrgId] = useState(organizations[0]?.organization_id ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!location.trim() || !capacity) { setError("Enter a location and capacity."); return; }
    setSaving(true);
    try {
      await api.post("/inventory/warehouses", { location, capacity: Number(capacity), organization_id: orgId });
      showToast(`${location} added with all item types stocked at 0 — use Restock to fill them.`);
      closeModal();
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {error && <Banner type="error" title="Couldn't add warehouse">{error}</Banner>}
      <div className="form-grid">
        <div className="field span2"><label>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Barguna Central Warehouse" /></div>
        <div className="field"><label>Capacity</label><input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
        <div className="field">
          <label>Organization</label>
          <select value={orgId} onChange={(e) => setOrgId(Number(e.target.value))}>
            {organizations.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.org_name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add warehouse"}</button>
      </div>
    </>
  );
}

export default function Inventory() {
  const inventory = useApi("/inventory?lowStockThreshold=1000");
  const warehouses = useApi("/inventory/warehouses");
  const organizations = useApi("/organizations");
  const { openModal } = useModal();

  if (inventory.loading || warehouses.loading) return <Loading label="Loading inventory…" />;
  if (inventory.error) return <ErrorState message={inventory.error} onRetry={inventory.reload} />;

  const rows = inventory.data;
  const lowCount = rows.filter((r) => r.lowStock).length;
  const reload = () => { inventory.reload(); warehouses.reload(); };

  return (
    <>
      <div className="stat-strip">
        <div className="stat-card"><div className="stat-num">{warehouses.data.length}</div><div className="stat-label">Warehouses</div></div>
        <div className="stat-card"><div className="stat-num">{new Set(rows.map((r) => r.item_id)).size}</div><div className="stat-label">Relief item types</div></div>
        <div className="stat-card"><div className={`stat-num${lowCount ? " accent" : ""}`}>{lowCount}</div><div className="stat-label">Low-stock rows (&lt; 1,000 units)</div></div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Warehouses</div>
          {!organizations.loading && (
            <button className="btn btn-primary btn-sm" onClick={() => openModal("Add warehouse", <AddWarehouseForm organizations={organizations.data} onDone={reload} />)}>
              Add warehouse
            </button>
          )}
        </div>
        <div className="chip-row">
          {warehouses.data.map((w) => <span className="chip" key={w.warehouse_id}>{w.location}</span>)}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><div className="section-title">Warehouse inventory</div><div className="section-note">Live from the ReliefInventoryStatus view</div></div>
        <div className="panel">
          <table>
            <thead><tr><th>Warehouse</th><th>Item</th><th>Category</th><th>Quantity</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.warehouse_id}-${r.item_id}`}>
                  <td>{r.warehouse_location}</td>
                  <td>{r.item_name}</td>
                  <td className="muted">{r.category}</td>
                  <td className="num" style={r.lowStock ? { color: "var(--accent)", fontWeight: 700 } : undefined}>{fmt(r.quantity)} {r.unit}</td>
                  <td>{r.lowStock ? <Pill text="Low stock" tone="High" /> : <Pill text="Sufficient" tone="Available" />}</td>
                  <td className="row-actions"><button className="btn-text" onClick={() => openModal(`Restock ${r.item_name}`, <RestockForm row={r} onDone={reload} />)}>Restock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
