// ─────────────────────────────────────────────────────────────────────────────
// constants.js — Design tokens, config values, static data
// ─────────────────────────────────────────────────────────────────────────────

// ── Global shorthand (var so it's re-assignable across script tags) ───────────
var h = React.createElement;

// ── Theme tokens ──────────────────────────────────────────────────────────────
// Light = "Crimson Light"  (DESIGN.md)
// Dark  = "Structural Precision"  (DESIGN (1).md)
const THEMES = {
  light: {
    // Primary crimson — buttons, critical badges, focus rings
    red:    '#DC2626',
    // Functional accents
    blue:   '#1d4ed8', green:  '#15803d', orange: '#c2410c',
    yellow: '#b45309', purple: '#6d28d9', pink:   '#be185d',
    teal:   '#0e7490', indigo: '#3730a3',
    // Surfaces — tonal layers (Level 0 → Level 1 → containers)
    bg:     '#f8f9fa',  // Level 0 floor
    bg2:    '#ffffff',  // Level 1 panels & cards
    bg3:    '#f3f4f5',  // sidebars, alternating rows
    surface:'#ffffff',
    // Text
    label:  '#111827',  // primary text
    label2: '#374151',  // secondary
    label3: '#4b5563',  // muted / metadata
    label4: '#9ca3af',  // very muted / disabled
    // Structure
    sep:      '#e5e7eb', sepStrong:'#d1d5db',
    // Fills (hover states, pill backgrounds)
    fill1: 'rgba(0,0,0,0.07)',   fill2: 'rgba(0,0,0,0.04)',
    fill3: '#f3f4f5',            fill4: '#e7e8e9',
  },
  dark: {
    // Primary crimson — same #DC2626 reads clearly on obsidian
    red:    '#DC2626',
    // Functional accents (brighter for dark bg)
    blue:   '#90cdff', green:  '#4ade80', orange: '#fb923c',
    yellow: '#fbbf24', purple: '#a78bfa', pink:   '#f472b6',
    teal:   '#22d3ee', indigo: '#818cf8',
    // Surfaces — obsidian layers
    bg:     '#0e0e0e',  // Level 0 — deepest
    bg2:    '#131313',  // Level 1 — main surface
    bg3:    '#1c1b1b',  // sidebar / secondary panels
    surface:'#20201f',  // surface-container
    // Text
    label:  '#e5e2e1',  // on-surface
    label2: '#d4d4d4',
    label3: '#ac8884',  // outline
    label4: '#5c403c',  // outline-variant
    // Structure
    sep:      '#262626', sepStrong:'#404040',
    // Fills
    fill1: 'rgba(255,255,255,0.08)', fill2: 'rgba(255,255,255,0.04)',
    fill3: '#2a2a2a',                fill4: '#353535',
  },
};

// Live token object — mutated by applyTheme()
let UI = { ...THEMES.light };

// ── Severity definitions ───────────────────────────────────────────────────────
// (color values use UI object, so this is a getter function)
function getSEV() {
  return {
    conforming: { label:'Conforming', color:UI.green,  bg:'rgba(21,128,61,0.10)',  icon:'✓' },
    minor:      { label:'Minor',      color:UI.orange, bg:'rgba(194,65,12,0.10)',  icon:'!' },
    critical:   { label:'Critical',   color:UI.red,    bg:'rgba(220,38,38,0.10)',  icon:'✕' },
  };
}
// Convenience accessor (used heavily in components)
const SEV = new Proxy({}, { get(_,k) { return getSEV()[k]; } });

// ── Observation categories ─────────────────────────────────────────────────────
const CATS = [
  'Rebar / Reinforcement', 'PT Cables', 'Formwork',
  'Concrete', 'Embedments', 'General',
];

// ── Compass directions (indexed 0-8, used with rounded 45° steps) ──────────────
const DIRS = ['N','NE','E','SE','S','SW','W','NW','N'];

// ── Structure type options ─────────────────────────────────────────────────────
const STRUCT_TYPES = [
  'Cast-in-Place Concrete', 'Post-Tensioned Concrete', 'Steel Frame',
  'Masonry', 'Timber', 'Precast Concrete',
];

// ── Markup tool colors ─────────────────────────────────────────────────────────
const MARKUP_COLORS = {
  cloud:     '#DC2626',  // red — revision cloud
  rect:      '#1D4ED8',  // blue — rectangle
  circle:    '#16A34A',  // green — ellipse
  dimension: '#D97706',  // amber — dimension line
};

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORE_KEY = 'fieldstruct_v3';
const THEME_KEY = 'fieldstruct_theme';
const SUPER_KEY = projId => `super_name_${projId}`;

// ── IndexedDB config ──────────────────────────────────────────────────────────
const IDB_NAME  = 'fieldstruct_photos';
const IDB_VER   = 1;
const IDB_STORE = 'photos';    // keyPath: none (manual keys)
const IDB_QUEUE = 'sync_queue'; // keyPath: 'id', autoIncrement: true

// ── OneDrive / MSAL config ────────────────────────────────────────────────────
const OD_CLIENT_ID = 'be5ac02d-4551-45f3-8a54-1fc38ed97f0b';
const OD_TENANT_ID = 'consumers';
const OD_REDIRECT  = window.location.origin + window.location.pathname;
const OD_SCOPES    = ['Files.ReadWrite', 'offline_access', 'User.Read'];
const GRAPH        = 'https://graph.microsoft.com/v1.0';

// ── Seed / demo projects ──────────────────────────────────────────────────────
const SEED_PROJECTS = [
  {
    id:'proj-001', name:'KCI Narrow Body Hangar', client:'Kansas City Airport Authority',
    location:'Kansas City, MO', type:'Cast-in-Place Concrete', status:'active',
    color:'#DC2626', createdAt:'Mar 14, 2026',
    punchStatus:{},
    members:[
      { id:'m-001', name:'Abdul Hassan',  role:'Engineer of Record',  email:'a.hassan@struct.com',  access:'editor' },
      { id:'m-002', name:'Mike Flores',   role:'Superintendent',      email:'m.flores@gcorp.com',   access:'viewer' },
      { id:'m-003', name:'Sarah Chen',    role:'Project Manager',     email:'s.chen@kcia.com',      access:'viewer' },
    ],
    visits:[
      {
        id:'visit-001', date:'Apr 21, 2026', time:'8:45 AM',
        engineer:'Abdul Hassan, P.E.', weather:'Partly Cloudy, 68°F',
        contractor:'General Dynamics Construction', permit:'BP-2026-0892',
        location:'Grid A-C, Bays 1-4', purpose:'Concrete pour inspection — elevated deck Level 2',
        notes:'', status:'in-progress', obsCount:3, critCount:1,
        sharedWith:['m-002','m-003'], contacts:[], drawings:[],
        observations:[
          {
            id:1, x:32, y:45, drawing:'S-101', severity:'critical', category:'Rebar / Reinforcement',
            note:'#8 bars at 6" o.c. — spacing exceeds spec max of 4" o.c. at column cap. Requires immediate correction before pour.',
            hasPhoto:true, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:'8:52 AM', direction:135, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:'Will re-space before pour resumes.',
            superName:'Mike Flores', superTime:'9:10 AM', recordingUrl:null, time:'8:52 AM',
          },
          {
            id:2, x:58, y:30, drawing:'S-101', severity:'minor', category:'Formwork',
            note:'Formwork shoring at grid C3 showing lateral movement. Recommend additional bracing.',
            hasPhoto:false, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:null, direction:270, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'9:15 AM',
          },
          {
            id:3, x:75, y:60, drawing:'S-101', severity:'conforming', category:'Concrete',
            note:'Concrete placement and vibration per spec. Slump test 4.5" — within tolerance.',
            hasPhoto:true, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:'9:33 AM', direction:45, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'9:33 AM',
          },
        ],
      },
      {
        id:'visit-002', date:'Apr 7, 2026', time:'10:00 AM',
        engineer:'Abdul Hassan, P.E.', weather:'Clear, 72°F',
        contractor:'General Dynamics Construction', permit:'BP-2026-0892',
        location:'Foundation Grid A-D', purpose:'Foundation rebar inspection prior to pour',
        notes:'', status:'complete', obsCount:2, critCount:0,
        sharedWith:['m-002'], contacts:[], drawings:[],
        observations:[
          {
            id:1, x:40, y:50, drawing:'S-101', severity:'conforming', category:'Rebar / Reinforcement',
            note:'Mat slab rebar layout confirmed per drawings. Top and bottom mats placed correctly.',
            hasPhoto:true, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:'10:18 AM', direction:0, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'10:18 AM',
          },
          {
            id:2, x:65, y:40, drawing:'S-101', severity:'minor', category:'Embedments',
            note:'Anchor bolts at column C2 — 1/4" out of position. Acceptable per AISC tolerance.',
            hasPhoto:false, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:null, direction:90, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:'Noted, within tolerance.',
            superName:'Mike Flores', superTime:'10:45 AM', recordingUrl:null, time:'10:35 AM',
          },
        ],
      },
    ],
  },
  {
    id:'proj-002', name:'Midtown Office Tower — Podium', client:'Vantage Development',
    location:'Chicago, IL', type:'Post-Tensioned Concrete', status:'active',
    color:'#AF52DE', createdAt:'Jan 22, 2026',
    punchStatus:{},
    members:[
      { id:'m-004', name:'Abdul Hassan', role:'Engineer of Record',   email:'a.hassan@struct.com', access:'editor' },
      { id:'m-005', name:'Tom Briggs',   role:'Contractor PM',        email:'t.briggs@vantage.com', access:'editor' },
    ],
    visits:[
      {
        id:'visit-003', date:'Apr 18, 2026', time:'7:30 AM',
        engineer:'Abdul Hassan, P.E.', weather:'Overcast, 55°F',
        contractor:'Vantage Build Corp', permit:'CHI-2026-1144',
        location:'Level 3 PT Deck', purpose:'Post-tension tendon and stressing inspection',
        notes:'', status:'in-progress', obsCount:4, critCount:2,
        sharedWith:['m-005'], contacts:[], drawings:[],
        observations:[
          {
            id:1, x:25, y:35, drawing:'S-101', severity:'critical', category:'PT Cables',
            note:'PT tendon profile at span mid-point does not match drawing. Sag 2" below required drape. Reject and re-profile.',
            hasPhoto:true, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:'7:48 AM', direction:180, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:'Will reposition before pour.',
            superName:'Tom Briggs', superTime:'8:15 AM', recordingUrl:null, time:'7:48 AM',
          },
          {
            id:2, x:50, y:55, drawing:'S-101', severity:'critical', category:'PT Cables',
            note:'Missing PT anchor pocket cover at grid B4. Corrosion protection required per spec.',
            hasPhoto:false, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:null, direction:270, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'8:05 AM',
          },
          {
            id:3, x:70, y:30, drawing:'S-201', severity:'minor', category:'Rebar / Reinforcement',
            note:'Top mat bars at column strip — tie spacing inconsistent. Some ties at 24" instead of 18".',
            hasPhoto:true, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:'8:22 AM', direction:45, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'8:22 AM',
          },
          {
            id:4, x:45, y:70, drawing:'S-201', severity:'conforming', category:'Concrete',
            note:'Embedded conduit layout confirmed, adequate concrete cover maintained throughout.',
            hasPhoto:false, photos:[], photoDataUrl:null, photoIdbKey:null, photoODUrl:null,
            photoTimestamp:null, direction:0, fov:60,
            voiceNote:null, voiceDuration:null, superResponse:null,
            superName:null, superTime:null, recordingUrl:null, time:'8:45 AM',
          },
        ],
      },
    ],
  },
];
