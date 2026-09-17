// frontend/src/components/Distributions.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Loading, ErrorState, Banner, Pagination, fmt } from "./common";
import { useToast } from "./Toast";

export default function Distributions() {
  const [page, setPage] = useState(1);
  const distributions = useApi(`/distributions?page=${page}&pageSize=20`, [page]);
  const warehouses = useApi("/inventory/warehouses");
  const areas = useApi("/areas/lookup");
  const organizations = useApi("/organizations");
  const items = useApi("/items");
  const { showToast } = useToast();

  const [warehouseId, setWarehouseId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refsLoading = warehouses.loading || areas.loading || organizations.loading || items.loading;

  React.useEffect(() => {
    if (!refsLoading) {
      setWarehouseId(warehouses.data[0]?.warehouse_id ?? "");
      setAreaId(areas.data[0]?.area_id ?? "");
      setOrgId(organizations.data[0]?.organization_id ?? "");
      setItemId(items.data[0]?.item_id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsLoading]);

  const submit = async () => {
    const n = Number(qty);
    if (!n || n <= 0) { setFormError("Enter a positive quantity."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await api.post("/distributions", {
        warehouse_id: warehouseId, area_id: areaId, organization_id: orgId, item_id: itemId, quantity: n,
      });
      showToast(`Distribution #${result.distribution_id} recorded — inventory updated automatically.`);
      setQty("");
      distributions.reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (distributions.loading && !distributions.data) return <Loading label="Loading distributions…" />;
  if (distributions.error) return <ErrorState message={distributions.error} onRetry={distributions.reload} />;

  const d = distributions.data;
  const areasServed = new Set(d.rows.map((r) => r.area_name)).size;

  return (
    <>
      <div className="stat-strip">
        <div className="stat-card"><div className="stat-num">{d.total.toLocaleString()}</div><div className="stat-label">Total shipments</div></div>
        <div className="stat-card"><div className="stat-num">{areasServed}</div><div className="stat-label">Areas served (this page)</div></div>
      </div>

      <div className="section">
        <div className="panel panel-pad">
          <div className="section-title" style={{ marginBottom: 4 }}>New distribution</div>
          <div className="section-note" style={{ marginBottom: 14 }}>
            Calls sp_distribute_relief — wrapped in a transaction; rolls back cleanly if stock is insufficient.
          </div>
          {formError && <Banner type="error" title="Distribution rolled back">{formError}</Banner>}
          {refsLoading ? <Loading /> : (
            <>
              <div className="form-grid">
                <div className="field">
                  <label>Warehouse</label>
                  <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))}>
                    {warehouses.data.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.location}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Affected area</label>
                  <select value={areaId} onChange={(e) => setAreaId(Number(e.target.value))}>
                    {areas.data.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Organization</label>
                  <select value={orgId} onChange={(e) => setOrgId(Number(e.target.value))}>
                    {organizations.data.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.org_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Relief item</label>
                  <select value={itemId} onChange={(e) => setItemId(Number(e.target.value))}>
                    {items.data.map((it) => <option key={it.item_id} value={it.item_id}>{it.item_name}</option>)}
                  </select>
                </div>
                <div className="field span2"><label>Quantity</label><input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 500" /></div>
              </div>
              <div className="form-actions" style={{ justifyContent: "flex-start" }}>
                <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? "Recording…" : "Record distribution"}</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><div className="section-title">Distribution log</div></div>
        <div className="panel">
          <table>
            <thead><tr><th>ID</th><th>Warehouse</th><th>Area</th><th>Organization</th><th>Date</th><th>Items</th></tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.distribution_id}>
                  <td>#{r.distribution_id}</td>
                  <td>{r.warehouse_location}</td>
                  <td>{r.area_name}</td>
                  <td>{r.org_name}</td>
                  <td className="muted">{r.distribution_date}</td>
                  <td style={{ maxWidth: 280 }}>{r.items.map((it) => `${it.item_name} (${fmt(it.quantity)} ${it.unit})`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onChange={setPage} />
      </div>
    </>
  );
}
