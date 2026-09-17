// frontend/src/components/Sidebar.jsx
import React from "react";
import { useApi } from "../useApi";
import { subscribe } from "../eventBus";
import { IconGrid, IconHome, IconUsers, IconAlert, IconBox, IconTruck, IconChart, IconShield } from "./icons";

export const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, sub: "Live status across all affected areas" },
  { id: "shelters", label: "Shelters", icon: IconHome, sub: "Occupancy and capacity by shelter" },
  { id: "victims", label: "Victims", icon: IconUsers, sub: "Registered individuals across all areas" },
  { id: "requests", label: "Emergency Requests", icon: IconAlert, sub: "Food, water, medical, rescue & evacuation requests" },
  { id: "resources", label: "Teams & Resources", icon: IconShield, sub: "Rescue teams, vehicles, volunteers, medical camps" },
  { id: "inventory", label: "Inventory", icon: IconBox, sub: "Relief stock across every warehouse" },
  { id: "distributions", label: "Distributions", icon: IconTruck, sub: "Relief shipments to affected areas" },
  { id: "views", label: "Reports & Views", icon: IconChart, sub: "The three saved views from the database" },
];

export default function Sidebar({ current, onNavigate, sidebarOpen }) {
  const counts = useApi("/requests/counts");

  React.useEffect(() => subscribe("requests-changed", counts.reload), [counts.reload]);

  return (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="brand">
        <div className="brand-name">ResQDB</div>
        <div className="brand-sub">Flood &amp; Cyclone Relief<br />Operations Console</div>
      </div>
      <nav className="nav">
        {ROUTES.map((r) => {
          const Icon = r.icon;
          const showBadge = r.id === "requests" && counts.data?.pending > 0;
          return (
            <button key={r.id} className={`nav-item${r.id === current ? " active" : ""}`} onClick={() => onNavigate(r.id)}>
              <Icon />
              {r.label}
              {showBadge && <span className="nav-count alert">{counts.data.pending}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        Connected to the ResQDB REST API — every action here reads and writes real MySQL data.
      </div>
    </aside>
  );
}
