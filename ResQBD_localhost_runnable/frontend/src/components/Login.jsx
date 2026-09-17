// frontend/src/components/Login.jsx
import React, { useState } from "react";
import { api } from "../api";
import { setAuth } from "../authStore";

export default function Login({ onSwitchToRegister }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError("Enter your User ID and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api.post("/auth/login", { user_id: userId.trim(), password });
      setAuth(token, user);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wave"></div>
      <div className="auth-wave layer2"></div>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="auth-brand-name">ResQDB</div>
          <div className="auth-brand-sub">Flood &amp; Cyclone Relief Operations Console</div>
        </div>
        <div className="auth-title">Sign in</div>
        <div className="auth-subtitle">Log in to identify your organization or account for this session</div>

        {error && <div className="auth-error">⚠ {error}</div>}

        <div className="auth-field">
          <label>User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. redcrescent_admin"
            autoFocus
          />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="auth-switch">
          New here?{" "}
          <button type="button" onClick={onSwitchToRegister}>
            Create an organization or donor account
          </button>
        </div>
      </form>
    </div>
  );
}
