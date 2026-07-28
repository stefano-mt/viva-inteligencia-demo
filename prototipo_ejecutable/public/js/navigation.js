import { legacyRoutes, views } from "./config.js";
import { state } from "./state.js";

export function activeView() {
  return views.find((view) => view.id === state.view) ?? views[0];
}

export function viewIcon(view) {
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2"></path></svg>',
    projects: '<svg viewBox="0 0 24 24"><path d="M4 20V8l7-4v16M11 9h9v11M7 11h1M7 15h1M14 12h2M14 16h2"></path></svg>',
    market: '<svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7M3 19h18"></path></svg>',
    compare: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M19 7l-3 3M17 17H5l3-3M5 17l3 3"></path></svg>',
    trust: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-2.9 7.8-7 10-4.1-2.2-7-5.4-7-10V6l7-3zM8.5 12l2.2 2.2 4.8-5"></path></svg>',
    assistant: '<svg viewBox="0 0 24 24"><path d="M6 5h12a3 3 0 013 3v7a3 3 0 01-3 3h-6l-4 3v-3H6a3 3 0 01-3-3V8a3 3 0 013-3zM8 11h.01M12 11h.01M16 11h.01"></path></svg>',
    activity: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"></path></svg>',
  };
  return icons[view] ?? icons.dashboard;
}

export function interfaceIcon(icon) {
  if (icon === "close") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
}

export function viewFromHash() {
  const raw = window.location.hash.replace("#", "");
  const value = legacyRoutes[raw] ?? raw;
  return views.some((view) => view.id === value) ? value : "dashboard";
}
