// ─────────────────────────────────────────────────────────────────────────────
// drawing.js — DirectionWheel, MiniDir, CameraCone, markup shape renderer,
//              MarkupErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
const { useRef: useRefDraw, useEffect: useEffectDraw } = React;

// ── DirectionWheel ─────────────────────────────────────────────────────────────
// Interactive SVG compass rose for picking a camera direction.
function DirectionWheel({ value = 0, onChange, size = 200 }) {
  const isDragging = useRefDraw(false);
  const svgRef     = useRefDraw(null);

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 14;

  function angleFromEvent(e) {
    const el = svgRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - cx;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top  - cy;
    return ((Math.atan2(x, -y) * 180 / Math.PI) + 360) % 360;
  }

  useEffectDraw(() => {
    const onMove = e => { if (isDragging.current) onChange(Math.round(angleFromEvent(e))); };
    const onUp   = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [onChange]);

  // Render tick marks
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const major = i % 18 === 0;
    const deg   = i * 5;
    const rad   = (deg - 90) * Math.PI / 180;
    const r1    = outerR - (major ? 10 : 5);
    const r2    = outerR;
    ticks.push(h('line', {
      key: i,
      x1: cx + r1 * Math.cos(rad), y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad), y2: cy + r2 * Math.sin(rad),
      stroke: major ? UI.label2 : UI.label4,
      strokeWidth: major ? 1.5 : 0.8,
    }));
  }

  // Cardinal labels
  const cardinals = [
    { label:'N', angle:0,   color:UI.red },
    { label:'E', angle:90,  color:UI.label2 },
    { label:'S', angle:180, color:UI.label2 },
    { label:'W', angle:270, color:UI.label2 },
  ];

  // FOV cone (30° half-angle)
  const fov = 30, valRad = (value - 90) * Math.PI / 180;
  const fov1 = (value - fov - 90) * Math.PI / 180;
  const fov2 = (value + fov - 90) * Math.PI / 180;
  const coneR = outerR * 0.62;

  // Handle position
  const hrad = (value - 90) * Math.PI / 180;
  const hx   = cx + outerR * Math.cos(hrad);
  const hy   = cy + outerR * Math.sin(hrad);

  return h('div', { style: { display:'flex', flexDirection:'column', alignItems:'center', gap:8 } },
    h('svg', {
      ref: svgRef, width: size, height: size,
      style: { cursor: 'crosshair', userSelect: 'none' },
      onMouseDown: e => { isDragging.current = true; onChange(Math.round(angleFromEvent(e))); },
      onTouchStart: e => { isDragging.current = true; onChange(Math.round(angleFromEvent(e))); },
    },
      // Background circle
      h('circle', { cx, cy, r: outerR, fill: UI.fill4, stroke: UI.sep, strokeWidth: 1 }),
      // FOV cone
      h('path', {
        d: `M${cx},${cy} L${cx + coneR * Math.cos(fov1)},${cy + coneR * Math.sin(fov1)} A${coneR},${coneR} 0 0,1 ${cx + coneR * Math.cos(fov2)},${cy + coneR * Math.sin(fov2)} Z`,
        fill: UI.blue, opacity: 0.14,
      }),
      // Tick marks
      ...ticks,
      // Cardinal labels
      ...cardinals.map(c => {
        const r = (c.angle - 90) * Math.PI / 180;
        const lr = outerR * 0.72;
        return h('text', {
          key: c.label,
          x: cx + lr * Math.cos(r), y: cy + lr * Math.sin(r),
          textAnchor: 'middle', dominantBaseline: 'middle',
          fontSize: 11, fontWeight: 700, fill: c.color,
        }, c.label);
      }),
      // Needle
      h('line', {
        x1: cx, y1: cy,
        x2: cx + coneR * Math.cos(valRad), y2: cy + coneR * Math.sin(valRad),
        stroke: UI.blue, strokeWidth: 2, strokeLinecap: 'round',
      }),
      // Drag handle
      h('circle', { cx: hx, cy: hy, r: 11, fill: 'white', stroke: UI.blue, strokeWidth: 2.5, style: { cursor:'grab' } }),
    ),
    // Readout
    h('div', { style: { textAlign:'center' } },
      h('div', { style: { fontSize:28, fontWeight:700, fontFamily:'monospace', color:UI.label } },
        `${Math.round(value)}°`
      ),
      h('div', { style: { fontSize:17, color:UI.blue, fontWeight:600 } }, dl(value))
    )
  );
}

// ── MiniDir ────────────────────────────────────────────────────────────────────
// Small SVG compass showing a direction + FOV cone. Used in photo thumbnails.
function MiniDir({ d = 0, fov = 60, size = 18 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  const toRad = a => (a - 90) * Math.PI / 180;
  const f1 = toRad(d - fov / 2), f2 = toRad(d + fov / 2);
  return h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
    h('circle', { cx, cy, r, fill:'none', stroke:UI.sep, strokeWidth:0.8 }),
    h('path', {
      d: `M${cx},${cy} L${cx + r * Math.cos(f1)},${cy + r * Math.sin(f1)} A${r},${r} 0 0,1 ${cx + r * Math.cos(f2)},${cy + r * Math.sin(f2)} Z`,
      fill: UI.blue, opacity: 0.35,
    }),
    h('circle', { cx, cy, r: 2, fill: UI.blue }),
  );
}

// ── CameraCone ─────────────────────────────────────────────────────────────────
// SVG group: camera pin marker + directional FOV cone overlay.
// Used in the drawing SVG layer for each placed observation.
function CameraCone({ obs, size = 24, selected = false, onClick }) {
  const sev = SEV[obs.severity] || SEV.conforming;
  const coneColor = obs.hasPhoto ? UI.blue : sev.color;
  const markerR   = size * 0.42;
  const toRad     = a => (a - 90) * Math.PI / 180;
  const fov       = (obs.fov || 60) / 2;
  const f1 = toRad(obs.direction - fov);
  const f2 = toRad(obs.direction + fov);
  const coneLen = size * 0.9;

  return h('g', { onClick, style:{ cursor:'pointer' } },
    // FOV cone
    h('path', {
      d: `M0,0 L${coneLen * Math.cos(f1)},${coneLen * Math.sin(f1)} A${coneLen},${coneLen} 0 0,1 ${coneLen * Math.cos(f2)},${coneLen * Math.sin(f2)} Z`,
      fill: coneColor, opacity: selected ? 0.4 : 0.16,
    }),
    // Marker circle
    h('circle', {
      r: markerR, fill: sev.color,
      stroke: 'white', strokeWidth: 2.5,
    }),
    // Label: camera emoji or obs number
    h('text', {
      textAnchor: 'middle', dominantBaseline: 'middle',
      fontSize: size * 0.38, fill: 'white', fontWeight: 700,
      style: { pointerEvents: 'none', userSelect: 'none' },
    }, obs.hasPhoto ? '📷' : obs.id),
    // Voice note indicator dot
    obs.voiceNote && h('circle', {
      cx: markerR * 0.8, cy: -markerR * 0.8, r: size * 0.28,
      fill: UI.purple,
    }),
  );
}

// ── Markup shape renderer ──────────────────────────────────────────────────────
// Renders a single annotation shape (cloud, rect, circle, or dimension line).
// `areaW` / `areaH` are the current pixel dimensions of the drawing canvas.
function renderMarkupShape(shape, areaW, areaH, isPreview = false) {
  const x1 = shape.x1 / 100 * areaW, y1 = shape.y1 / 100 * areaH;
  const x2 = shape.x2 / 100 * areaW, y2 = shape.y2 / 100 * areaH;
  const w = x2 - x1, ht = y2 - y1;
  const col = shape.color;
  const dash = isPreview ? '6,4' : undefined;

  if (shape.type === 'rect') {
    return h('rect', {
      key: shape.id, x: Math.min(x1,x2), y: Math.min(y1,y2),
      width: Math.abs(w), height: Math.abs(ht),
      stroke: col, strokeWidth: 2, fill: col, fillOpacity: 0.07,
      strokeDasharray: dash,
    });
  }

  if (shape.type === 'circle') {
    return h('ellipse', {
      key: shape.id,
      cx: (x1 + x2) / 2, cy: (y1 + y2) / 2,
      rx: Math.abs(w) / 2, ry: Math.abs(ht) / 2,
      stroke: col, strokeWidth: 2, fill: col, fillOpacity: 0.07,
      strokeDasharray: dash,
    });
  }

  if (shape.type === 'cloud') {
    // Revision cloud: series of arcs along the perimeter of the bounding box
    const bumpR = Math.max(5, Math.min(Math.abs(w) / 7, Math.abs(ht) / 3.5, 16));
    const lx = Math.min(x1,x2), ly = Math.min(y1,y2);
    const rx = Math.max(x1,x2), ry = Math.max(y1,y2);
    const W = rx - lx, H = ry - ly;
    const cols = Math.max(2, Math.round(W / (bumpR * 2)));
    const rows = Math.max(2, Math.round(H / (bumpR * 2)));
    const bw = W / cols, bh = H / rows;
    let d = `M${lx},${ly}`;
    // Top edge → right
    for (let i = 0; i < cols; i++) {
      const mx = lx + i * bw + bw / 2, my = ly - bumpR * 0.5;
      d += ` Q${mx},${my} ${lx + (i+1)*bw},${ly}`;
    }
    // Right edge → bottom
    for (let i = 0; i < rows; i++) {
      const mx = rx + bumpR * 0.5, my = ly + i * bh + bh / 2;
      d += ` Q${mx},${my} ${rx},${ly + (i+1)*bh}`;
    }
    // Bottom edge → left
    for (let i = cols; i > 0; i--) {
      const mx = lx + i * bw - bw / 2, my = ry + bumpR * 0.5;
      d += ` Q${mx},${my} ${lx + (i-1)*bw},${ry}`;
    }
    // Left edge → top
    for (let i = rows; i > 0; i--) {
      const mx = lx - bumpR * 0.5, my = ly + i * bh - bh / 2;
      d += ` Q${mx},${my} ${lx},${ly + (i-1)*bh}`;
    }
    d += 'Z';
    return h('path', {
      key: shape.id, d, stroke: col, strokeWidth: 2,
      fill: col, fillOpacity: 0.07, strokeDasharray: dash,
    });
  }

  if (shape.type === 'dimension') {
    // Dimension line with end ticks and a label in a white box
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const len = Math.sqrt(w*w + ht*ht);
    const nx = -ht / len, ny = w / len; // normal vector
    const tickL = 8;
    return h(React.Fragment, { key: shape.id },
      h('line', { x1, y1, x2, y2, stroke: col, strokeWidth: 2 }),
      h('line', { x1: x1 + nx*tickL, y1: y1 + ny*tickL, x2: x1 - nx*tickL, y2: y1 - ny*tickL, stroke: col, strokeWidth: 2 }),
      h('line', { x1: x2 + nx*tickL, y1: y2 + ny*tickL, x2: x2 - nx*tickL, y2: y2 - ny*tickL, stroke: col, strokeWidth: 2 }),
      shape.text && h(React.Fragment, null,
        h('rect', { x: mx-24, y: my-10, width:48, height:20, fill:'white', rx:3 }),
        h('text', { x: mx, y: my+1, textAnchor:'middle', dominantBaseline:'middle', fontSize:11, fontWeight:600, fill:col }, shape.text),
      ),
    );
  }

  return null;
}

// ── MarkupErrorBoundary ────────────────────────────────────────────────────────
// Wraps the markup SVG layer — silently swallows render errors so a drawing
// crash never takes down the whole app.
class MarkupErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(err) {
    console.warn('Markup render error (suppressed):', err);
    setTimeout(() => this.setState({ error: false }), 100);
  }
  render() { return this.state.error ? null : this.props.children; }
}
