// frontend/src/components/Requests.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Pill, Loading, ErrorState, Banner, Pagination } from "./common";
import { useModal } from "./Modal";
import { useToast } from "./Toast";
import { publish } from "../eventBus";

function AddRequestForm({ victimAreaLookup, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [victimId, setVictimId] = useState("");
  const [type, setType] = useState("Food");
  const [priority, setPriority] = useState("Medium");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const victims = useApi(`/victims?pageSize=50${victimId === "" ? "" : ""}`);

  const submit = async () => {
    if (!victimId) { setError("Choose a victim."); return; }
    const v = victims.data.rows.find((r) => r.victim_id === Number(victimId));
    setSaving(true);
    try {
      await api.post("/requests", { victim_id: victimId, area_id: v.area_id, request_type: type, priority });
      showToast("Request logged as Pending.");
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
      {error && <Banner type="error" title="Couldn't log request">{error}</Banner>}
      <div className="form-grid">
        <div className="field span2">
          <label>Victim</label>
          {victims.loading ? <Loading /> : (
            <select value={victimId} onChange={(e) => setVictimId(e.target.value)}>
              <option value="">Choose…</option>
              {victims.data?.rows.map((v) => <option key={v.victim_id} value={v.victim_id}>{v.victim_name} ({v.area_name})</option>)}
            </select>
          )}
        </div>
        <div className="field">
          <label>Request type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["Food", "Water", "Medical", "Rescue", "Evacuation"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Logging…" : "Log request"}</button>
      </div>
    </>
  );
}

function EditRequestForm({ existing, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [type, setType] = useState(existing.request_type);
  const [priority, setPriority] = useState(existing.priority);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSaving(true);
    try {
      await api.put(`/requests/${existing.request_id}`, { request_type: type, priority });
      showToast(`Request #${existing.request_id} updated.`);
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
      {error && <Banner type="error" title="Couldn't save">{error}</Banner>}
      <div className="form-grid">
        <div className="field">
          <label>Request type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["Food", "Water", "Medical", "Rescue", "Evacuation"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </>
  );
}

function AssignTeamForm({ requestId, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const teams = useApi("/teams/available");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (teams.loading) return <Loading />;
  if (!teams.data.length) {
    return (
      <>
        <Banner type="error" title="No teams available">Every team is currently Deployed or Off Duty.</Banner>
        <div className="form-actions"><button className="btn btn-outline" onClick={closeModal}>Close</button></div>
      </>
    );
  }

  const submit = async () => {
    if (!teamId) return;
    setSaving(true);
    try {
      await api.post(`/requests/${requestId}/assign`, { team_id: teamId });
      showToast("Team assigned — request marked Assigned.");
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
      {error && <Banner type="error" title="Couldn't assign">{error}</Banner>}
      <div className="field">
        <label>Team</label>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">Choose…</option>
          {teams.data.map((t) => <option key={t.team_id} value={t.team_id}>{t.team_name} ({t.team_type})</option>)}
        </select>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !teamId}>{saving ? "Assigning…" : "Assign"}</button>
      </div>
    </>
  );
}

export default function Requests() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const query = `?page=${page}&pageSize=25&status=${status}&priority=${priority}`;
  const requests = useApi(`/requests${query}`, [page, status, priority]);
  const counts = useApi("/requests/counts");

  const refreshAll = () => {
    requests.reload();
    counts.reload();
    publish("requests-changed");
  };

  const resolve = async (id) => {
    try {
      await api.post(`/requests/${id}/resolve`);
      showToast("Request marked Resolved.");
      refreshAll();
    } catch (err) {
      openModal("Can't resolve this request", (
        <>
          <Banner type="error" title="Blocked">{err.message}</Banner>
          <div className="form-actions"><button className="btn btn-outline" onClick={closeModal}>Close</button></div>
        </>
      ));
    }
  };

  const cancel = async (id) => {
    await api.post(`/requests/${id}/cancel`);
    showToast(`Request #${id} cancelled.`);
    refreshAll();
  };

  const del = async (id) => {
    openModal("Delete request?", (
      <>
        <p style={{ fontSize: 13.5 }}>Delete request <strong>#{id}</strong>? This cannot be undone.</p>
        <div className="form-actions">
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" style={{ background: "var(--accent)" }} onClick={async () => {
            await api.del(`/requests/${id}`);
            showToast(`Request #${id} deleted.`);
            closeModal();
            refreshAll();
          }}>Delete</button>
        </div>
      </>
    ));
  };

  if (requests.loading && !requests.data) return <Loading label="Loading requests…" />;
  if (requests.error) return <ErrorState message={requests.error} onRetry={requests.reload} />;

  const d = requests.data;

  return (
    <>
      <div className="stat-strip">
        <div className="stat-card"><div className="stat-num accent">{counts.data?.pending ?? "—"}</div><div className="stat-label">Pending</div></div>
        <div className="stat-card"><div className="stat-num">{d.total}</div><div className="stat-label">Matching current filter</div></div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Emergency requests</div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal("Log an emergency request", <AddRequestForm onDone={refreshAll} />)}>
            Log new request
          </button>
        </div>
        <div className="toolbar">
          <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option><option value="Assigned">Assigned</option>
            <option value="Resolved">Resolved</option><option value="Cancelled">Cancelled</option>
          </select>
          <select className="filter-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="all">All priorities</option>
            <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
          </select>
        </div>
        <div className="panel">
          <table>
            <thead><tr><th>ID</th><th>Victim</th><th>Area</th><th>Type</th><th>Priority</th><th>Status</th><th>Team</th><th></th></tr></thead>
            <tbody>
              {d.rows.length === 0 && <tr className="empty-row"><td colSpan={8}>No requests match this filter.</td></tr>}
              {d.rows.map((r) => (
                <tr key={r.request_id}>
                  <td>#{r.request_id}</td>
                  <td><strong>{r.victim_name}</strong></td>
                  <td>{r.area_name}</td>
                  <td>{r.request_type}</td>
                  <td><Pill text={r.priority} tone={r.priority} /></td>
                  <td><Pill text={r.status} tone={r.status} /></td>
                  <td className="muted">{r.team_name || "—"}</td>
                  <td className="row-actions">
                    {r.status === "Pending" && <button className="btn-text" onClick={() => openModal("Assign a rescue team", <AssignTeamForm requestId={r.request_id} onDone={refreshAll} />)}>Assign team</button>}
                    {r.status === "Assigned" && <button className="btn-text" onClick={() => resolve(r.request_id)}>Resolve</button>}
                    {(r.status === "Pending" || r.status === "Assigned") && <button className="btn-text" onClick={() => cancel(r.request_id)}>Cancel</button>}
                    <button className="btn-text" onClick={() => openModal("Edit emergency request", <EditRequestForm existing={r} onDone={requests.reload} />)}>Edit</button>
                    <button className="btn-text danger" onClick={() => del(r.request_id)}>Delete</button>
                  </td>
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
