// frontend/src/components/Dashboard.jsx
import React from "react";
import { useApi } from "../useApi";
import { StatCard, Pill, Loading, ErrorState, fmt } from "./common";

export default function Dashboard() {
  const summary = useApi("/dashboard/summary");
  const areas = useApi("/areas");

  if (summary.loading || areas.loading) return <Loading label="Loading dashboard…" />;
  if (summary.error) return <ErrorState message={summary.error} onRetry={summary.reload} />;
  if (areas.error) return <ErrorState message={areas.error} onRetry={areas.reload} />;

  const s = summary.data;

  return (
    <>
      <div className="stat-strip">
        <StatCard value={s.activeDisasters} label="Active disasters" />
        <StatCard value={fmt(s.affectedAreas)} label="Affected areas" />
        <StatCard value={fmt(s.totalPopulation)} label="Population in affected areas" />
        <StatCard value={fmt(s.totalVictims)} label="Registered victims" />
        <StatCard value={fmt(s.pendingRequests)} label="Pending requests" accent />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Affected areas</div>
          <div className="section-note">Live from the EmergencyDashboard view</div>
        </div>
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Area</th><th>Severity</th><th>Population</th><th>Victims</th>
                <th>Pending requests</th><th>Distributions received</th>
              </tr>
            </thead>
            <tbody>
              {areas.data.map((a) => (
                <tr key={a.area_id}>
                  <td>
                    <strong>{a.area_name}</strong>
                    <div className="muted" style={{ fontSize: 11.5 }}>{a.upazila_name}</div>
                  </td>
                  <td><Pill text={a.severity} tone={a.severity} /></td>
                  <td className="num">{fmt(a.population)}</td>
                  <td className="num">{a.victimCount}</td>
                  <td className="num">
                    {a.pendingRequests === 0
                      ? <span className="muted">0</span>
                      : <strong style={{ color: "var(--accent)" }}>{a.pendingRequests}</strong>}
                  </td>
                  <td className="num">{a.distributionsReceived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
