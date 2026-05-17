// ─────────────────────────────────────────────────────────────────────────────
// utils.js — Utility functions: theme, formatting, persistence
// ─────────────────────────────────────────────────────────────────────────────

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme(isDark) {
  const t = isDark ? THEMES.dark : THEMES.light;
  Object.assign(UI, t);
  const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (meta) meta.content = isDark ? 'black-translucent' : 'default';
  document.documentElement.style.background = UI.bg;
  try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch {}
}

// Apply saved theme immediately on load (before React mounts)
;(function() {
  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') applyTheme(true);
  } catch {}
})();

// ── ID generation ──────────────────────────────────────────────────────────────
/** Returns a 7-character random alphanumeric string */
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Direction label ────────────────────────────────────────────────────────────
/** Converts 0–360° to compass abbreviation (N, NE, E, …) */
function dl(degrees) {
  return DIRS[Math.round(((degrees % 360) + 360) % 360 / 45)];
}

// ── Time / date formatters ─────────────────────────────────────────────────────
/** Elapsed seconds → "M:SS" */
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Current time → "8:45 AM" */
const ts = () => new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });

/** Current date → "April 21, 2026" */
const ds = () => new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

// ── Local storage persistence ──────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(projects) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch {}
}
