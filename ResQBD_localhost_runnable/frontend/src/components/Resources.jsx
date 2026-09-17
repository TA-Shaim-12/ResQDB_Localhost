// frontend/src/components/Resources.jsx
import React, { useState } from "react";
import { useApi } from "../useApi";
import { api } from "../api";
import { Pill, Loading, ErrorState, Banner, Pagination, fmt } from "./common";
import { useModal } from "./Modal";
import { useToast } from "./Toast";

function AddTeamForm({ organizations, onDone }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState(organizations[0]?.organization_id ?? "");
  const [type, setType] = useState("Rescue");
  const [members, setMembers] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !members) { setError("Enter a team name and member count."); return; }
    setSaving(true);
    try {
      await api.post("/teams", { team_name: name, organization_id: orgId, team_type: type, member_count: Number(members) });
      showToast(`${name} added.`);
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
      {error && <Banner type="error" title="Couldn't add team">{error}</Banner>}
      <div className="form-grid">
        <div className="field span2"><label>Team name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field">
          <label>Organization</label>
          <select value={orgId} onChange={(e) => setOrgId(Number(e.target.value))}>
            {organizations.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.org_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["Rescue", "Medical", "Evacuation", "Logistics"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field span2"><label>Member count</label><input type="number" min="1" value={members} onChange={(e) => setMembers(e.target.value)} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add team"}</button>
      </div>
    </>
  );
}

const TABS = ["Rescue Teams", "Vehicles", "Volunteers", "Medical Camps"];

export default function Resources() {
  const [tab, setTab] = useState("Rescue Teams");
  const [volPage, setVolPage] = useState(1);
  const { openModal } = useModal();
  const { showToast } = useToast();

  const teams = useApi("/teams", [tab]);
  const vehicles = useApi("/reference/vehicles", [tab]);
  const volunteers = useApi(`/reference/volunteers?page=${volPage}&pageSize=25`, [tab, volPage]);
  const camps = useApi("/reference/medical-camps", [tab]);
  const organizations = useApi("/organizations");

  const deleteTeam = async (t) => {
    try {
      await api.del(`/teams/${t.team_id}`);
      showToast(`${t.team_name} removed.`);
      teams.reload();
    } catch (err) {
      alert(err.message); // simple fallback for a rare edge case
    }
  };

  return (
    <div className="section">
      <div className="tabs">
        {TABS.map((t) => <div key={t} className={`tab${t === tab ? " active" : ""}`} onClick={() => setTab(t)}>{t}</div>)}
      </div>

      {tab === "Rescue Teams" && (
        <>
          <div className="section-head">
            <div className="section-note">Teams responding to emergency requests</div>
            {!organizations.loading && (
              <button className="btn btn-primary btn-sm" onClick={() => openModal("Add rescue team", <AddTeamForm organizations={organizations.data} onDone={teams.reload} />)}>
                Add team
              </button>
            )}
          </div>
          {teams.loading && <Loading />}
          {teams.error && <ErrorState message={teams.error} onRetry={teams.reload} />}
          {teams.data && (
            <div className="panel">
              <table>
                <thead><tr><th>Team</th><th>Organization</th><th>Type</th><th>Members</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {teams.data.map((t) => (
                    <tr key={t.team_id}>
                      <td><strong>{t.team_name}</strong></td><td>{t.org_name}</td><td>{t.team_type}</td>
                      <td className="num">{t.member_count}</td><td><Pill text={t.status} tone={t.status} /></td>
                      <td className="row-actions"><button className="btn-text danger" onClick={() => deleteTeam(t)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "Vehicles" && (
        <>
          <div className="section-note" style={{ marginBottom: 12 }}>Transport fleet across all organizations</div>
          {vehicles.loading && <Loading />}
          {vehicles.error && <ErrorState message={vehicles.error} onRetry={vehicles.reload} />}
          {vehicles.data && (
            <div className="panel">
              <table>
                <thead><tr><th>Type</th><th>Capacity (tons)</th><th>Organization</th><th>Status</th></tr></thead>
                <tbody>
                  {vehicles.data.map((v) => (
                    <tr key={v.vehicle_id}><td>{v.vehicle_type}</td><td className="num">{v.capacity_tons}</td><td>{v.org_name}</td><td><Pill text={v.status} tone={v.status} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "Volunteers" && (
        <>
          <div className="section-note" style={{ marginBottom: 12 }}>Volunteer roster (paginated — large table)</div>
          {volunteers.loading && <Loading />}
          {volunteers.error && <ErrorState message={volunteers.error} onRetry={volunteers.reload} />}
          {volunteers.data && (
            <>
              <div className="panel">
                <table>
                  <thead><tr><th>Name</th><th>Age</th><th>Contact</th><th>Organization</th></tr></thead>
                  <tbody>
                    {volunteers.data.rows.map((v) => (
                      <tr key={v.volunteer_id}><td>{v.volunteer_name}</td><td className="num">{v.age}</td><td className="muted">{v.contact}</td><td>{v.org_name}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={volunteers.data.page} totalPages={volunteers.data.totalPages} total={volunteers.data.total} onChange={setVolPage} />
            </>
          )}
        </>
      )}

      {tab === "Medical Camps" && (
        <>
          <div className="section-note" style={{ marginBottom: 12 }}>Field medical camps and patients served</div>
          {camps.loading && <Loading />}
          {camps.error && <ErrorState message={camps.error} onRetry={camps.reload} />}
          {camps.data && (
            <div className="panel">
              <table>
                <thead><tr><th>Location</th><th>Upazila</th><th>Organization</th><th>Doctors</th><th>Patients served</th></tr></thead>
                <tbody>
                  {camps.data.map((c) => (
                    <tr key={c.medical_camp_id}>
                      <td>{c.location}</td><td>{c.upazila_name}</td><td>{c.org_name}</td>
                      <td className="num">{c.doctorCount}</td><td className="num">{fmt(c.patientsServed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
