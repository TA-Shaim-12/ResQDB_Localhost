// frontend/src/authStore.js
// Minimal auth state, following the same lightweight module pattern as
// eventBus.js elsewhere in this app. Persists to localStorage so a page
// refresh doesn't log the user out — this is a real standalone app (not
// a claude.ai artifact), so that's the right call here.
import { publish } from "./eventBus";

const STORAGE_KEY = "resqdb_auth";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

let state = load();

export function getAuth() {
  return state;
}

export function setAuth(token, user) {
  state = { token, user };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  publish("auth-changed");
}

export function clearAuth() {
  state = { token: null, user: null };
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  publish("auth-changed");
}
