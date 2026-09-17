// frontend/src/App.jsx
import React, { useState } from "react";
import Sidebar, { ROUTES } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Shelters from "./components/Shelters";
import Victims from "./components/Victims";
import Requests from "./components/Requests";
import Resources from "./components/Resources";
import Inventory from "./components/Inventory";
import Distributions from "./components/Distributions";
import Views from "./components/Views";
import Login from "./components/Login";
import { ModalProvider } from "./components/Modal";
import { ToastProvider } from "./components/Toast";
import { getToken, setToken, setUnauthorizedHandler } from "./api";

const PAGES = {
  dashboard: Dashboard,
  shelters: Shelters,
  victims: Victims,
  requests: Requests,
  resources: Resources,
  inventory: Inventory,
  distributions: Distributions,
  views: Views,
};

export default function App() {
  const [route, setRoute] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  // If any request comes back 401 (missing/expired token), api.js clears
  // the stored token and calls this — drop straight back to the login form.
  React.useEffect(() => setUnauthorizedHandler(() => setLoggedIn(false)), []);

  const routeMeta = ROUTES.find((r) => r.id === route);
  const Page = PAGES[route];

  const navigate = (id) => {
    setRoute(id);
    setSidebarOpen(false);
  };

  const logout = () => {
    setToken(null);
    setLoggedIn(false);
  };

  // The CSS defines light-mode overrides as `:root[data-theme="light"]`,
  // which only matches the real <html> element — so the attribute has to
  // go there via an effect, not on a nested div.
  // (This runs on every render, even pre-login, so hook order stays fixed —
  // see the Rules of Hooks: no hook may be called after a conditional return.)
  React.useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <div className="app">
      <Sidebar current={route} onNavigate={navigate} sidebarOpen={sidebarOpen} />
      <div className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="menu-btn" onClick={() => setSidebarOpen((o) => !o)}>☰</button>
            <div>
              <div className="topbar-title">{routeMeta.label}</div>
              <div className="topbar-sub">{routeMeta.sub}</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme}>
              <span>{theme === "dark" ? "☀" : "☾"}</span>
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <span className="live-dot"></span>
            <span className="live-label">Connected to API</span>
            <button className="btn btn-outline btn-sm" onClick={logout} style={{ marginLeft: 10 }}>
              Log out
            </button>
          </div>
        </div>
        <div className="content">
          <ToastProvider>
            <ModalProvider>
              <Page />
            </ModalProvider>
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
