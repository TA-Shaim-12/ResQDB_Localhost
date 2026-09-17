// frontend/src/components/Shelters.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Pill, Loading, ErrorState, Banner, fmt } from "./common";
import { useModal } from "./Modal";
import { useToast } from "./Toast";

function ShelterForm({ existing, upazilas, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [name, setName] = useState(existing?.shelter_name || "");
  const [upazilaId, setUpazilaId] = useState(existing?.upazila_id || (upazilas[0]?.upazila_id ?? ""));
  const [capacity, setCapacity] = useState(existing?.capacity || "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !capacity) {
      setError("Enter a name and a capacity of at least 1.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await api.put(`/shelters/${existing.shelter_id}`, { shelter_name: name, upazila_id: upazilaId, capacity: Number(capacity) });
        showToast(`${name} updated.`);
      } else {
        await api.post("/shelters", { shelter_name: name, upazila_id: upazilaId, capacity: Number(capacity) });
        showToast(`${name} added.`);
      }
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
        <div className="field span2">
          <label>Shelter name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Union Complex Shelter" />
        </div>
        <div className="field span2">
          <label>Upazila</label>
          <select value={upazilaId} onChange={(e) => setUpazilaId(Number(e.target.value))}>
            {upazilas.map((u) => <option key={u.upazila_id} value={u.upazila_id}>{u.upazila_name} ({u.district_name})</option>)}
          </select>
        </div>
        <div className="field">
          <label>Capacity</label>
          <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : existing ? "Save changes" : "Add shelter"}
        </button>
      </div>
    </>
  );
}

function DeleteConfirm({ shelter, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.del(`/shelters/${shelter.shelter_id}`);
      showToast(`${shelter.shelter_name} removed.`);
      closeModal();
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <Banner type="error" title="Can't delete this shelter">{error}</Banner>
        <div className="form-actions"><button className="btn btn-outline" onClick={closeModal}>Close</button></div>
      </>
    );
  }

  return (
    <>
      <p style={{ fontSize: 13.5, color: "var(--text)", margin: "0 0 4px" }}>
        Delete <strong>{shelter.shelter_name}</strong>? This cannot be undone.
      </p>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" style={{ background: "var(--accent)" }} onClick={confirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </>
  );
}

export default function Shelters() {
  const shelters = useApi("/shelters");
  const upazilas = useApi("/geography/upazilas");
  const { openModal } = useModal();

  if (shelters.loading || upazilas.loading) return <Loading label="Loading shelters…" />;
  if (shelters.error) return <ErrorState message={shelters.error} onRetry={shelters.reload} />;

  const list = shelters.data;
  const totalCapacity = list.reduce((a, s) => a + s.capacity, 0);
  const totalOccupied = list.reduce((a, s) => a + s.current_occupancy, 0);
  const fullCount = list.filter((s) => s.status === "Full").length;

  const openAdd = () => openModal("Add shelter", <ShelterForm upazilas={upazilas.data} onDone={shelters.reload} />);
  const openEdit = (s) => openModal("Edit shelter", <ShelterForm existing={s} upazilas={upazilas.data} onDone={shelters.reload} />);
  const openDelete = (s) => openModal("Delete shelter?", <DeleteConfirm shelter={s} onDone={shelters.reload} />);

  return (
    <>
      <div className="stat-strip">
        <div className="stat-card"><div className="stat-num">{list.length}</div><div className="stat-label">Total shelters</div></div>
        <div className="stat-card"><div className="stat-num">{fmt(totalCapacity)}</div><div className="stat-label">Total capacity</div></div>
        <div className="stat-card"><div className="stat-num">{fmt(totalOccupied)}</div><div className="stat-label">Currently housed</div></div>
        <div className="stat-card"><div className={`stat-num${fullCount ? " accent" : ""}`}>{fullCount}</div><div className="stat-label">At full capacity</div></div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">All shelters</div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Add shelter</button>
        </div>
        <div className="section-note" style={{ marginBottom: 12 }}>
          Occupancy updates automatically (via database triggers) when a victim is registered or edited
        </div>
        <div className="shelter-grid">
          {list.map((s) => {
            const pct = Math.min(100, Math.round((s.current_occupancy / s.capacity) * 100));
            const barClass = s.status === "Full" ? "full" : pct >= 80 ? "low" : "";
            return (
              <div className="shelter-card" key={s.shelter_id}>
                <div className="shelter-card-top">
                  <div>
                    <div className="shelter-name">{s.shelter_name}</div>
                    <div className="shelter-loc">{s.upazila_name}</div>
                  </div>
                  <Pill text={s.status} tone={s.status} />
                </div>
                <div className="bar-track"><div className={`bar-fill ${barClass}`} style={{ width: `${pct}%` }}></div></div>
                <div className="shelter-nums"><span>{s.current_occupancy} / {s.capacity} occupied</span><span>{pct}%</span></div>
                <div className="shelter-card-actions">
                  <button className="btn-text" onClick={() => openEdit(s)}>Edit</button>
                  <button className="btn-text danger" onClick={() => openDelete(s)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
