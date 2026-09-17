// frontend/src/components/icons.jsx
import React from "react";

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "nav-icon" };

export const IconGrid = () => <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconHome = () => <svg {...base}><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" /></svg>;
export const IconUsers = () => <svg {...base}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 13.2a5.2 5.2 0 016 5" /></svg>;
export const IconAlert = () => <svg {...base}><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>;
export const IconBox = () => <svg {...base}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;
export const IconTruck = () => <svg {...base}><rect x="1" y="7" width="13" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>;
export const IconChart = () => <svg {...base}><path d="M4 19V9" /><path d="M11 19V5" /><path d="M18 19v-7" /><path d="M2 19h20" /></svg>;
export const IconShield = () => <svg {...base}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>;
