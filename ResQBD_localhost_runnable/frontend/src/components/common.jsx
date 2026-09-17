// frontend/src/components/common.jsx
import React from "react";

export function Pill({ text, tone }) {
  const cls = tone.toLowerCase().replace(/\s+/g, "");
  return (
    <span className={`pill pill-${cls}`}>
      <span className="pill-dot"></span>
      {text}
    </span>
  );
}

export function StatCard({ value, label, accent }) {
  return (
    <div className="stat-card">
      <div className={`stat-num${accent ? " accent" : ""}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function SectionHead({ title, note, action }) {
  return (
    <div className="section-head">
      <div className="section-title">{title}</div>
      {action ? action : note ? <div className="section-note">{note}</div> : null}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="loading-state">
      <span className="spinner"></span> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div>⚠ {message}</div>
      {onRetry && (
        <button className="btn btn-outline btn-sm retry-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Banner({ type, title, children }) {
  return (
    <div className={`banner banner-${type}`}>
      <span className="banner-icon">{type === "error" ? "⚠" : "✓"}</span>
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span className="page-info">
        Page {page} of {totalPages} ({total.toLocaleString()} total)
      </span>
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}

export function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-US");
}

export function statusToTone(s) {
  return s;
}
