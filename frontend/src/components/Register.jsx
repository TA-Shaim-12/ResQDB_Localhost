// frontend/src/components/Register.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { setAuth } from "../authStore";

const ORG_TYPES = [
  "Government Agency", "NGO", "Volunteer Organization",
  "Medical Organization", "International Aid Organization",
];

export default function Register({ onSwitchToLogin }) {
  const [accountType, setAccountType] = useState("Organization");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [organizations, setOrganizations] = useState([]);
  const [orgMode, setOrgMode] = useState("existing"); // "existing" | "new"
  const [organizationId, setOrganizationId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState(ORG_TYPES[0]);

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/organizations")
      .then((rows) => {
        setOrganizations(rows);
        if (rows.length) setOrganizationId(rows[0].organization_id);
      })
      .catch(() => { /* if this fails, "new organization" still works */ });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !password || !displayName.trim()) {
      setError("Fill in your User ID, password, and name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (accountType === "Organization" && orgMode === "new" && !newOrgName.trim()) {
      setError("Enter a name for the new organization.");
      return;
    }

    const payload = {
      user_id: userId.trim(),
      password,
      account_type: accountType,
      display_name: displayName.trim(),
    };
    if (accountType === "Organization") {
      if (orgMode === "existing") {
        payload.organization_id = organizationId;
      } else {
        payload.new_organization_name = newOrgName.trim();
        payload.new_organization_type = newOrgType;
      }
    }

    setBusy(true);
    try {
      const { token, user } = await api.post("/auth/register", payload);
      setAuth(token, user);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wave"></div>
      <div className="auth-wave layer2"></div>

      <form className="auth-card" onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="auth-brand">
          <div className="auth-brand-name">ResQDB</div>
          <div className="auth-brand-sub">Flood &amp; Cyclone Relief Operations Console</div>
        </div>
        <div className="auth-title">Create an account</div>
        <div className="auth-subtitle">Register as an organization coordinator or an individual donor</div>

        {error && <div className="auth-error">⚠ {error}</div>}

        <div className="auth-type-toggle">
          <button type="button" className={`auth-type-btn${accountType === "Organization" ? " active" : ""}`} onClick={() => setAccountType("Organization")}>
            Organization
          </button>
          <button type="button" className={`auth-type-btn${accountType === "Individual" ? " active" : ""}`} onClick={() => setAccountType("Individual")}>
            Individual / Donor
          </button>
        </div>

        <div className="auth-field">
          <label>User ID (for logging in)</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. redcrescent_admin" autoFocus />
        </div>

        <div className="auth-field">
          <label>{accountType === "Organization" ? "Your name (contact person)" : "Your name"}</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Nusrat Islam" />
        </div>

        {accountType === "Organization" && (
          <>
            <div className="auth-org-existing-row">
              <button type="button" className={`auth-type-btn${orgMode === "existing" ? " active" : ""}`} style={{ flex: "none", padding: "6px 12px", fontSize: 12.5 }} onClick={() => setOrgMode("existing")}>
                Existing organization
              </button>
              <button type="button" className={`auth-type-btn${orgMode === "new" ? " active" : ""}`} style={{ flex: "none", padding: "6px 12px", fontSize: 12.5 }} onClick={() => setOrgMode("new")}>
                New organization
              </button>
            </div>

            {orgMode === "existing" ? (
              <div className="auth-field">
                <label>Organization</label>
                <select value={organizationId} onChange={(e) => setOrganizationId(Number(e.target.value))}>
                  {organizations.map((o) => (
                    <option key={o.organization_id} value={o.organization_id}>{o.org_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="auth-field">
                  <label>New organization name</label>
                  <input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="e.g. Barguna Relief Trust" />
                </div>
                <div className="auth-field">
                  <label>Organization type</label>
                  <select value={newOrgType} onChange={(e) => setNewOrgType(e.target.value)}>
                    {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        )}

        <div className="auth-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        <div className="auth-field">
          <label>Confirm password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>

        <div className="auth-switch">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin}>Sign in instead</button>
        </div>
      </form>
    </div>
  );
}
