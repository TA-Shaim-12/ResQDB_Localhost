// frontend/src/components/Login.jsx
import React, { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { username, password });
      setToken(data.token);
      onSuccess();
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
      <form
        onSubmit={submit}
        style={{
          width: 340,
          maxWidth: "90vw",
          background: "var(--card, #fff)",
          border: "1px solid var(--border, #e2e2e2)",
          borderRadius: 12,
          padding: 28,
        }}
      >
        <div className="brand" style={{ marginBottom: 20 }}>
          <div className="brand-name">ResQDB</div>
          <div className="brand-sub">Flood &amp; Cyclone Relief<br />Operations Console</div>
        </div>

        {error && (
          <div className="banner banner-error" style={{ marginBottom: 14 }}>
            <span className="banner-icon">⚠</span>
            <div>{error}</div>
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Username</label>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
