// ─────────────────────────────────────────────────────────────────────────────
// primitives.js — Reusable UI micro-components: Chip, Toggle, Avatar, etc.
// ─────────────────────────────────────────────────────────────────────────────
// h = React.createElement — declared globally in constants.js

// ── Chip ───────────────────────────────────────────────────────────────────────
// Small pill badge. Use `tone` for semantic colouring or `color`/`bg` for custom.
function Chip({ label, color, bg, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: UI.fill3,                    color: UI.label2 },
    blue:    { bg: 'rgba(0,122,255,0.12)',       color: UI.blue   },
    green:   { bg: 'rgba(52,199,89,0.12)',       color: UI.green  },
    orange:  { bg: 'rgba(255,149,0,0.12)',       color: UI.orange },
    red:     { bg: 'rgba(255,59,48,0.12)',       color: UI.red    },
    purple:  { bg: 'rgba(175,82,222,0.12)',      color: UI.purple },
  };
  const c = color ? { bg: bg || tones.neutral.bg, color } : tones[tone] || tones.neutral;
  return h('span', {
    style: {
      background: c.bg, color: c.color,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap', letterSpacing: -0.005,
    },
  }, label);
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
// iOS-style toggle switch.
function Toggle({ on, onToggle, size = 'default' }) {
  const big = size !== 'small';
  const W = big ? 51 : 42, H = big ? 31 : 26, K = big ? 27 : 22;
  const offset = on ? W - K - 2 : 2;
  return h('div', {
    onClick: onToggle,
    style: {
      width: W, height: H, borderRadius: H / 2,
      background: on ? UI.green : '#E9E9EA',
      position: 'relative', cursor: 'pointer',
      transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1)',
      flexShrink: 0,
    },
  }, h('div', {
    style: {
      position: 'absolute', top: 2, left: offset,
      width: K, height: K, borderRadius: K / 2,
      background: 'white',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
    },
  }));
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
// Circular avatar with initials (up to 2 chars).
function Avatar({ name = '', size = 32, bg }) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const hues = [210, 270, 150, 35, 0, 190, 330, 280];
  const hue  = hues[name.length % 8];
  const background = bg || `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${hue + 20},65%,45%))`;
  return h('div', {
    style: {
      width: size, height: size, borderRadius: '50%',
      background, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, color: 'white', flexShrink: 0,
    },
  }, initials);
}

// ── IconButton ─────────────────────────────────────────────────────────────────
// Circular icon button with press feedback.
function IconButton({ icon, onClick, label, size = 32 }) {
  return h('button', {
    onClick, 'aria-label': label, className: 'pressable',
    style: {
      width: size, height: size, borderRadius: '50%',
      background: UI.fill3, border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, cursor: 'pointer',
    },
  }, icon);
}

// ── BackButton ─────────────────────────────────────────────────────────────────
// Chevron-left + label, styled like iOS navigation back button.
function BackButton({ label, onClick }) {
  return h('button', {
    onClick,
    style: {
      display: 'flex', alignItems: 'center', gap: 2,
      color: UI.blue, fontSize: 17, fontWeight: 400,
      background: 'none', border: 'none', cursor: 'pointer',
    },
  },
    h('svg', { width: 14, height: 22, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
      h('path', { d: 'M15 18l-6-6 6-6' })
    ),
    label
  );
}
