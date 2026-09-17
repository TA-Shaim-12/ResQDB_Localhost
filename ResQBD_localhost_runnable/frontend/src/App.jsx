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
import { ModalProvider } from "./components/Modal";
import { ToastProvider } from "./components/Toast";
import Login from "./components/Login";
import Register from "./components/Register";
import { getAuth, clearAuth } from "./authStore";
import { subscribe } from "./eventBus";

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

  // --- Login gate (added for the login feature) ---
  const [auth, setAuthState] = useState(getAuth());
  const [authView, setAuthView] = useState("login"); // "login" | "register"

  React.useEffect(() => subscribe("auth-changed", () => setAuthState(getAuth())), []);
  // ---------------------------------------------------

  const routeMeta = ROUTES.find((r) => r.id === route);
  const Page = PAGES[route];

  const navigate = (id) => {
    setRoute(id);
    setSidebarOpen(false);
  };

  // The CSS defines light-mode overrides as `:root[data-theme="light"]`,
  // which only matches the real <html> element — so the attribute has to
  // go there via an effect, not on a nested div.
  React.useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // All hooks above this line run on every render, logged in or not —
  // React requires that; only the JSX returned below is conditional.
  if (!auth.user) {
    return authView === "login"
      ? <Login onSwitchToRegister={() => setAuthView("register")} />
      : <Register onSwitchToLogin={() => setAuthView("login")} />;
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
            {/* Added for the login feature — who's logged in + logout */}
            <span className="live-label" title={auth.user.account_type}>
              {auth.user.display_name}
            </span>
            <button className="theme-toggle" onClick={() => { clearAuth(); setAuthView("login"); }}>Log out</button>
            <span className="live-dot"></span>
            <span className="live-label">Connected to API</span>
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
