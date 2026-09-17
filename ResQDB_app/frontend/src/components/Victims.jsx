// frontend/src/components/Victims.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Loading, ErrorState, Banner, Pagination } from "./common";
import { useModal } from "./Modal";
import { useToast } from "./Toast";

function VictimForm({ existing, areas, shelters, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [name, setName] = useState(existing?.victim_name || "");
  const [age, setAge] = useState(existing?.age ?? "");
  const [gender, setGender] = useState(existing?.gender || "Male");
  const [contact, setContact] = useState(existing?.contact || "");
  const [areaId, setAreaId] = useState(existing?.area_id || (areas[0]?.area_id ?? ""));
  const [shelterId, setShelterId] = useState(existing?.shelter_id || "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { setError("Enter a full name to continue."); return; }
    setSaving(true);
    setError(null);
    const payload = {
      victim_name: name, age: age || null, gender, contact: contact || null,
      area_id: areaId, shelter_id: shelterId || null,
    };
    try {
      if (existing) {
        await api.put(`/victims/${existing.victim_id}`, payload);
        showToast(`${name} updated.`);
      } else {
        await api.post("/victims", payload);
        showToast(`${name} registered${shelterId ? " — shelter occupancy updated automatically" : ""}.`);
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
        <div className="field span2"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Age</label><input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></div>
        <div className="field">
          <label>Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div className="field span2"><label>Contact <span className="hint">(optional)</span></label><input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
        <div className="field span2">
          <label>Affected area</label>
          <select value={areaId} onChange={(e) => setAreaId(Number(e.target.value))}>
            {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
          </select>
        </div>
        <div className="field span2">
          <label>Shelter <span className="hint">(optional)</span></label>
          <select value={shelterId} onChange={(e) => setShelterId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Not sheltered</option>
            {shelters.map((s) => {
              const disabled = s.status === "Full" && s.shelter_id !== existing?.shelter_id;
              return (
                <option key={s.shelter_id} value={s.shelter_id} disabled={disabled}>
                  {s.shelter_name} ({s.current_occupancy}/{s.capacity}){disabled ? " — Full" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : existing ? "Save changes" : "Register victim"}
        </button>
      </div>
    </>
  );
}

function DeleteVictimConfirm({ victim, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.del(`/victims/${victim.victim_id}`);
      showToast(`${victim.victim_name} removed.`);
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
        <Banner type="error" title="Can't delete this victim">{error}</Banner>
        <div className="form-actions"><button className="btn btn-outline" onClick={closeModal}>Close</button></div>
      </>
    );
  }
  return (
    <>
      <p style={{ fontSize: 13.5, color: "var(--text)", margin: "0 0 4px" }}>
        Delete <strong>{victim.victim_name}</strong>? This cannot be undone.
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

export default function Victims() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const { openModal } = useModal();

  const query = `?page=${page}&pageSize=25${search ? `&search=${encodeURIComponent(search)}` : ""}${areaFilter !== "all" ? `&area_id=${areaFilter}` : ""}`;
  const victims = useApi(`/victims${query}`, [page, search, areaFilter]);
  const areas = useApi("/areas/lookup");
  const shelters = useApi("/shelters/lookup/all");

  // Debounce search input -> search state
  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  if (areas.loading || shelters.loading) return <Loading label="Loading victims…" />;
  if (areas.error) return <ErrorState message={areas.error} onRetry={areas.reload} />;

  const openAdd = () => openModal("Register a victim", <VictimForm areas={areas.data} shelters={shelters.data} onDone={victims.reload} />);
  const openEdit = (v) => openModal("Edit victim", <VictimForm existing={v} areas={areas.data} shelters={shelters.data} onDone={victims.reload} />);
  const openDelete = (v) => openModal("Delete victim?", <DeleteVictimConfirm victim={v} onDone={victims.reload} />);

  return (
    <>
      {victims.data && (
        <div className="stat-strip">
          <div className="stat-card"><div className="stat-num">{victims.data.total.toLocaleString()}</div><div className="stat-label">Total registered</div></div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <div className="section-title">Victim registry</div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Register victim</button>
        </div>
        <div className="toolbar">
          <input className="search-input" placeholder="Search by name…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <select className="filter-select" value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}>
            <option value="all">All areas</option>
            {areas.data.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
          </select>
        </div>

        {victims.loading && <Loading />}
        {victims.error && <ErrorState message={victims.error} onRetry={victims.reload} />}
        {victims.data && (
          <>
            <div className="panel">
              <table>
                <thead>
                  <tr><th>Name</th><th>Age</th><th>Gender</th><th>Contact</th><th>Area</th><th>Shelter</th><th></th></tr>
                </thead>
                <tbody>
                  {victims.data.rows.length === 0 && (
                    <tr className="empty-row"><td colSpan={7}>No victims match this search.</td></tr>
                  )}
                  {victims.data.rows.map((v) => (
                    <tr key={v.victim_id}>
                      <td><strong>{v.victim_name}</strong></td>
                      <td className="num">{v.age ?? <span className="muted">—</span>}</td>
                      <td>{v.gender}</td>
                      <td className="muted">{v.contact || "—"}</td>
                      <td>{v.area_name}</td>
                      <td>{v.shelter_name || <span className="muted">Not sheltered</span>}</td>
                      <td className="row-actions">
                        <button className="btn-text" onClick={() => openEdit(v)}>Edit</button>
                        <button className="btn-text danger" onClick={() => openDelete(v)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={victims.data.page} totalPages={victims.data.totalPages} total={victims.data.total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
