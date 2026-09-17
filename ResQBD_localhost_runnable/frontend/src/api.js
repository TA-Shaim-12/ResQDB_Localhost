// frontend/src/api.js
// Thin fetch wrapper. Every function returns parsed JSON and throws an
// Error with a .payload property (the API's {error, message} body) on
// non-2xx responses, so components can show the real backend message.
import { getAuth } from "./authStore";

const BASE = window.__RESQDB_API_BASE__ || "http://localhost:4000/api";

async function request(method, path, body) {
  const { token } = getAuth();
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.payload = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
};
