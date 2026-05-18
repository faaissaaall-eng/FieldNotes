// ─────────────────────────────────────────────────────────────────────────────
// tokens.js — FieldNotes design system tokens, helpers, and shared micro-components
// Light: "Crimson Light"  |  Dark: "Structural Precision"
// ─────────────────────────────────────────────────────────────────────────────

const FS_FONT_SERIF = '"Noto Serif", Georgia, serif';
const FS_FONT_UI    = '"Noto Sans", "Inter", -apple-system, system-ui, sans-serif';
const FS_FONT_MONO  = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace';

// ── Light mode: Crimson Light ─────────────────────────────────────────────────
const LIGHT_TOKENS = {
  paper:        '#f8f9fa',
  paperAlt:     '#f3f4f5',
  surface:      '#ffffff',
  ink:          '#191c1d',
  ink2:         '#374151',
  muted:        '#6b7280',
  rule:         '#E5E7EB',
  ruleHard:     '#D1D5DB',
  primary:      '#dc2626',
  primaryDark:  '#b70011',
  primarySoft:  'rgba(220,38,38,0.08)',
  red:          '#b70011',
  redSoft:      'rgba(183,0,17,0.08)',
  amber:        '#C77A0E',
  amberSoft:    'rgba(199,122,14,0.10)',
  green:        '#3F8C4A',
  greenSoft:    'rgba(63,140,74,0.10)',
  graphite:     '#111827',
  onPrimary:    '#ffffff',
};

// ── Dark mode: Structural Precision ──────────────────────────────────────────
const DARK_TOKENS = {
  paper:        '#131313',
  paperAlt:     '#1c1b1b',
  surface:      '#20201f',
  ink:          '#e5e2e1',
  ink2:         '#c6c6c7',
  muted:        '#ac8884',
  rule:         '#353535',
  ruleHard:     '#454747',
  primary:      '#dc2626',
  primaryDark:  '#ffb4ab',
  primarySoft:  'rgba(220,38,38,0.18)',
  red:          '#ffb4ab',
  redSoft:      'rgba(255,180,171,0.12)',
  amber:        '#C77A0E',
  amberSoft:    'rgba(199,122,14,0.15)',
  green:        '#4ade80',
  greenSoft:    'rgba(74,222,128,0.12)',
  graphite:     '#e5e2e1',
  onPrimary:    '#ffffff',
};

// ── Theme context ─────────────────────────────────────────────────────────────
const FNThemeContext = React.createContext({ T: LIGHT_TOKENS, isDark: false });

// ── Style factory ─────────────────────────────────────────────────────────────
function makeFNStyles(T, isDark) {
  return {
    paper: {
      background: T.paper,
      backgroundImage: isDark
        ? 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)'
        : 'linear-gradient(rgba(20,20,20,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(20,20,20,0.03) 1px,transparent 1px)',
      backgroundSize: '32px 32px',
      fontFamily: FS_FONT_UI,
      color: T.ink,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    caption: {
      fontFamily: FS_FONT_MONO,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: T.muted,
    },
    mono: { fontFamily: FS_FONT_MONO, letterSpacing: '-0.01em' },
  };
}

// ── FSLogo — structural grid mark ────────────────────────────────────────────
function FSLogo({ size = 28 }) {
  const { T } = React.useContext(FNThemeContext);
  return h('img', {
    src: 'logo.png',
    alt: 'FieldNotes',
    style: { width: size, height: size, borderRadius: 6, objectFit: 'cover', display: 'block', flexShrink: 0 },
  });
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
function StatusDot({ color, size = 8 }) {
  return h('span', {
    style: {
      display: 'inline-block', width: size, height: size,
      borderRadius: 999, background: color, flexShrink: 0,
    },
  });
}

// ── SeverityPill (sharp) ──────────────────────────────────────────────────────
function SeverityPill({ level }) {
  const { T } = React.useContext(FNThemeContext);
  const map = {
    emergent:    { label: 'EMERGENT',    bg: T.redSoft,   fg: T.red,   dot: T.red   },
    critical:    { label: 'EMERGENT',    bg: T.redSoft,   fg: T.red,   dot: T.red   },
    observation: { label: 'OBSERVATION', bg: T.amberSoft, fg: T.amber, dot: T.amber },
    note:        { label: 'NOTE',        bg: 'rgba(128,128,128,0.1)', fg: T.muted,  dot: T.muted  },
    resolved:    { label: 'RESOLVED',    bg: T.greenSoft, fg: T.green, dot: T.green },
  };
  const s = map[level] || map.note;
  return h('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px 3px 7px', borderRadius: 0,
      background: s.bg, color: s.fg,
      fontFamily: FS_FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      flexShrink: 0,
    },
  },
    h('span', { style: { width: 6, height: 6, borderRadius: 999, background: s.dot, display: 'inline-block' } }),
    s.label,
  );
}

// ── FNAvatar — circular avatar with initials + explicit color ─────────────────
// (distinct from primitives.js Avatar which derives color from name)
function FNAvatar({ initials = '', color = '#374151', size = 28 }) {
  return h('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 999,
      background: color, color: '#f8f9fa',
      fontFamily: FS_FONT_UI, fontSize: size * 0.36, fontWeight: 600,
      flexShrink: 0, userSelect: 'none',
    },
  }, initials);
}

// ── Exports to window ─────────────────────────────────────────────────────────
window.LIGHT_TOKENS   = LIGHT_TOKENS;
window.DARK_TOKENS    = DARK_TOKENS;
window.FNThemeContext = FNThemeContext;
window.makeFNStyles   = makeFNStyles;
window.FS_FONT_SERIF  = FS_FONT_SERIF;
window.FS_FONT_UI     = FS_FONT_UI;
window.FS_FONT_MONO   = FS_FONT_MONO;
window.FSLogo         = FSLogo;
window.StatusDot      = StatusDot;
window.SeverityPill   = SeverityPill;
window.FNAvatar       = FNAvatar;
