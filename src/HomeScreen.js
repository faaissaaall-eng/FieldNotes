// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen.js — HomeScreen (sidebar + project panel), ProjectDetail, VisitRow
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateHS } = React;

// ── VisitRow ───────────────────────────────────────────────────────────────────
// One visit entry in the project detail visit list.
function VisitRow({ visit, proj, onOpen }) {
  const [hover, setHover] = useStateHS(false);
  const hasCrit = visit.critCount > 0;
  return h('div', {
    onClick: onOpen,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      borderRadius: 12, cursor: 'pointer',
      background: hover ? UI.fill4 : 'transparent',
      transition: 'background 0.15s',
    },
  },
    // Icon
    h('div', {
      style: {
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: hasCrit ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    },
      h('svg', { width:20, height:20, viewBox:'0 0 24 24', fill:'none',
        stroke: hasCrit ? UI.red : UI.green, strokeWidth:2, strokeLinecap:'round' },
        h('rect', { x:3, y:4, width:18, height:18, rx:2 }),
        h('line', { x1:16, y1:2, x2:16, y2:6 }),
        h('line', { x1:8,  y1:2, x2:8,  y2:6 }),
        h('line', { x1:3,  y1:10, x2:21, y2:10 }),
      )
    ),
    // Details
    h('div', { style:{ flex:1, minWidth:0 } },
      h('div', { style:{ fontSize:15, fontWeight:600, color:UI.label } },
        visit.date
      ),
      h('div', { style:{ fontSize:13, color:UI.label3, marginTop:2 } },
        `${visit.weather || ''} · ${visit.obsCount} observation${visit.obsCount !== 1 ? 's' : ''}`
      ),
    ),
    // Badges
    h('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
      hasCrit && h(Chip, { label:`${visit.critCount} critical`, tone:'red' }),
      h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none',
        stroke:UI.label4, strokeWidth:2.5, strokeLinecap:'round' },
        h('polyline', { points:'9 18 15 12 9 6' })
      )
    )
  );
}

// ── ProjectDetail ──────────────────────────────────────────────────────────────
// Right-side panel showing the selected project's details and visits.
function ProjectDetail({ proj, onOpenVisit, onOpenProject }) {
  if (!proj) {
    // Empty state
    return h('div', {
      style: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: UI.label4,
      },
    },
      h('div', { style:{ fontSize:48 } }, '📋'),
      h('div', { style:{ fontSize:17, fontWeight:600 } }, 'Select a project'),
      h('div', { style:{ fontSize:14 } }, 'Choose a project from the sidebar to view details'),
    );
  }

  const visibleMembers = proj.members.slice(0, 3);
  const critCount = proj.visits.reduce((n, v) => n + (v.critCount || 0), 0);

  return h('div', {
    style: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  },
    // Header bar
    h('div', {
      className: 'glass',
      style: {
        height:52, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', borderBottom:`0.5px solid ${UI.sep}`, flexShrink:0,
      },
    },
      h('div', null,
        h('div', { style:{ fontSize:11, fontWeight:500, color:UI.label3, letterSpacing:'0.05em', textTransform:'uppercase' } }, 'Project'),
        h('div', { style:{ fontSize:15, fontWeight:600, color:UI.label } }, proj.name),
      ),
      h('div', { style:{ display:'flex', gap:8 } },
        h('button', {
          onClick: onOpenProject, className:'btn-secondary pressable',
          style:{ padding:'7px 14px', fontSize:13 },
        }, 'Manage'),
        h('button', {
          onClick: () => onOpenVisit(null), className:'btn-primary pressable',
          style:{ padding:'7px 14px', fontSize:13 },
        }, '+ New Visit'),
      )
    ),
    // Scrollable body
    h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:'28px 32px' } },
      h('div', { style:{ maxWidth:760, margin:'0 auto' } },
        // Project title block
        h('div', { style:{ marginBottom:24 } },
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:6 } }, proj.type),
          h('h1', { className:'title-1', style:{ color:UI.label, marginBottom:6 } }, proj.name),
          h('div', { style:{ fontSize:14, color:UI.label3 } },
            `${proj.client} · ${proj.location}`
          ),
        ),
        // Stats row
        h('div', { style:{ display:'flex', gap:12, marginBottom:28 } },
          ...[
            { label:'Site Visits',    value:proj.visits.length, color:UI.blue   },
            { label:'Team Members',   value:proj.members.length, color:UI.purple },
            { label:'Open Critical',  value:critCount,           color:UI.red    },
          ].map(s => h('div', {
            key: s.label, className:'card',
            style: { flex:1, padding:'14px 16px', textAlign:'center' },
          },
            h('div', { style:{ fontSize:28, fontWeight:700, color:s.color } }, s.value),
            h('div', { style:{ fontSize:12, color:UI.label3, marginTop:2 } }, s.label),
          ))
        ),
        // Team section
        h('div', { style:{ marginBottom:28 } },
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:12 } }, 'Team Members'),
          h('div', { className:'card', style:{ overflow:'hidden' } },
            visibleMembers.map((m, i) => h('div', {
              key: m.id,
              style: {
                display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                borderBottom: i < visibleMembers.length - 1 ? `0.5px solid ${UI.sep}` : 'none',
              },
            },
              h(Avatar, { name: m.name, size:36 }),
              h('div', { style:{ flex:1 } },
                h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label } }, m.name),
                h('div', { style:{ fontSize:12, color:UI.label3 } }, m.role),
              ),
              h(Chip, { label:m.access, tone: m.access === 'editor' ? 'blue' : 'neutral' })
            )),
            proj.members.length > 3 && h('div', {
              style:{ padding:'10px 16px', fontSize:13, color:UI.blue, cursor:'pointer', textAlign:'center' },
              onClick: onOpenProject,
            }, `See all ${proj.members.length} members →`)
          )
        ),
        // Visits section
        h('div', null,
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:12 } }, 'Site Visits'),
          proj.visits.length === 0
            ? h('div', { className:'card', style:{ padding:'32px', textAlign:'center', color:UI.label4 } },
                h('div', { style:{ fontSize:32, marginBottom:8 } }, '📅'),
                h('div', { style:{ fontSize:15, fontWeight:600 } }, 'No visits yet'),
                h('div', { style:{ fontSize:13, marginTop:4 } }, 'Start a new site visit to begin logging observations'),
              )
            : h('div', { className:'card', style:{ overflow:'hidden' } },
                proj.visits.map((v, i) => h('div', {
                  key: v.id,
                  style: { borderBottom: i < proj.visits.length - 1 ? `0.5px solid ${UI.sep}` : 'none' },
                },
                  h(VisitRow, { visit:v, proj, onOpen:() => onOpenVisit(v.id) })
                ))
              )
        )
      )
    )
  );
}

// ── HomeScreen ─────────────────────────────────────────────────────────────────
// Two-column layout: 300px sidebar (project list + OD widget) + detail panel.
function HomeScreen({ projects, onOpenProject, onNewProject, onOpenVisit, dark, toggleTheme, od }) {
  const [search,   setSearch]   = useStateHS('');
  const [selId,    setSelId]    = useStateHS(projects[0]?.id || null);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.client || '').toLowerCase().includes(search.toLowerCase())
  );
  const selProj = projects.find(p => p.id === selId) || null;

  return h('div', { style:{ display:'flex', height:'100vh', background:UI.bg } },

    // ── LEFT SIDEBAR ───────────────────────────────────────────────────────────
    h('div', {
      style:{
        width:300, flexShrink:0, display:'flex', flexDirection:'column',
        borderRight:`0.5px solid ${UI.sep}`, background:UI.surface, overflow:'hidden',
      },
    },
      // App header
      h('div', {
        style:{
          padding:'16px 14px 12px', display:'flex', alignItems:'center', gap:10,
          borderBottom:`0.5px solid ${UI.sep}`,
        },
      },
        // App logo
        h('img', {
          src: 'logo.png',
          alt: 'FieldNotes',
          style:{ width:36, height:36, borderRadius:8, flexShrink:0, objectFit:'cover' },
        }),
        h('div', { style:{ flex:1 } },
          h('div', { style:{ fontSize:15, fontWeight:700, color:UI.label } }, 'FieldNotes'),
          h('div', { style:{ fontSize:11, color:UI.label3 } }, 'Field Inspection'),
        ),
        // Theme toggle
        h('button', {
          onClick: toggleTheme,
          style:{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:4 },
        }, dark ? '☀️' : '🌙')
      ),

      // Search
      h('div', { style:{ padding:'10px 12px' } },
        h('div', {
          style:{
            display:'flex', alignItems:'center', gap:8,
            background:UI.fill4, borderRadius:10, padding:'8px 12px',
          },
        },
          h('svg', { width:14, height:14, viewBox:'0 0 24 24', fill:'none',
            stroke:UI.label4, strokeWidth:2.5, strokeLinecap:'round' },
            h('circle', { cx:11, cy:11, r:8 }),
            h('line', { x1:21, y1:21, x2:16.65, y2:16.65 }),
          ),
          h('input', {
            value: search,
            onChange: e => setSearch(e.target.value),
            placeholder: 'Search projects…',
            style:{ flex:1, background:'none', border:'none', outline:'none',
              fontSize:14, color:UI.label },
          })
        )
      ),

      // Project list
      h('div', {
        className: 'scroll',
        style:{ flex:1, overflowY:'auto', padding:'4px 8px' },
      },
        filtered.length === 0
          ? h('div', { style:{ padding:'24px', textAlign:'center', color:UI.label4, fontSize:13 } },
              'No projects found'
            )
          : filtered.map(p => {
            const isSelected = p.id === selId;
            const crit = p.visits.reduce((n, v) => n + (v.critCount || 0), 0);
            return h('div', {
              key: p.id,
              onClick: () => { setSelId(p.id); onOpenProject && onOpenProject(p.id); },
              onDoubleClick: () => onOpenProject && onOpenProject(p.id),
              style:{
                display:'flex', alignItems:'center', gap:10, padding:'10px 10px',
                borderRadius:10, cursor:'pointer', marginBottom:2,
                background: isSelected ? UI.blue : 'transparent',
                transition: 'background 0.15s',
              },
            },
              // Colour dot
              h('div', {
                style:{
                  width:10, height:10, borderRadius:'50%', flexShrink:0,
                  background: isSelected ? 'rgba(255,255,255,0.7)' : (p.color || UI.blue),
                },
              }),
              // Name + visits
              h('div', { style:{ flex:1, minWidth:0 } },
                h('div', {
                  style:{
                    fontSize:14, fontWeight:600, color: isSelected ? 'white' : UI.label,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  },
                }, p.name),
                h('div', { style:{ fontSize:11, color: isSelected ? 'rgba(255,255,255,0.7)' : UI.label3 } },
                  `${p.visits.length} visit${p.visits.length !== 1 ? 's' : ''}`
                ),
              ),
              crit > 0 && h('div', {
                style:{
                  fontSize:10, fontWeight:700, color: isSelected ? UI.red : 'white',
                  background: isSelected ? 'rgba(255,255,255,0.9)' : UI.red,
                  borderRadius:8, padding:'1px 6px',
                },
              }, crit)
            );
          })
      ),

      // ── Sidebar footer: OD status + New Project ──────────────────────────────
      h('div', {
        style:{
          padding:'10px 14px 14px',
          borderTop:`0.5px solid ${UI.sep}`,
          flexShrink:0,
        },
      },
        // OneDrive status widget (only when OD object is present and not loading)
        od && !od.loading && h('div', {
          style:{
            marginBottom:8, padding:'8px 10px',
            borderRadius:10, background:UI.fill4,
            display:'flex', alignItems:'center', gap:8,
          },
        },
          // Status dot
          h('div', {
            style:{
              width:7, height:7, borderRadius:'50%', flexShrink:0,
              background: od.syncing ? UI.orange
                        : !navigator.onLine ? UI.label4
                        : od.pending > 0 ? UI.orange
                        : od.signedIn ? UI.green
                        : UI.label4,
            },
          }),
          // Signed-in state
          od.signedIn
            ? h(React.Fragment, null,
                h('div', { style:{ flex:1, minWidth:0 } },
                  h('div', {
                    style:{ fontSize:11, fontWeight:600, color:UI.label,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
                  }, od.user?.name || 'OneDrive'),
                  h('div', { style:{ fontSize:10, color:UI.label3 } },
                    od.syncing ? 'Uploading…'
                    : od.pending > 0 ? `${od.pending} pending`
                    : 'Synced'
                  ),
                ),
                od.pending > 0 && !od.syncing && h('button', {
                  onClick: () => od.triggerSync(),
                  style:{ fontSize:11, color:UI.blue, background:'none', border:'none',
                    cursor:'pointer', fontWeight:600, flexShrink:0, padding:'0 2px' },
                }, '↑'),
                h('button', {
                  onClick: od.signOut,
                  style:{ fontSize:10, color:UI.label4, background:'none', border:'none',
                    cursor:'pointer', flexShrink:0, padding:'0 2px' },
                }, 'Sign out')
              )
            // Not signed in
            : h(React.Fragment, null,
                h('div', { style:{ flex:1, fontSize:11, color:UI.label3 } }, 'Connect OneDrive'),
                h('button', {
                  onClick: od.signIn, disabled: od.loading,
                  style:{
                    fontSize:11, fontWeight:600, color:'#0078D4',
                    background:'none', border:'none',
                    cursor: od.loading ? 'wait' : 'pointer',
                    flexShrink:0, padding:'0 2px',
                  },
                }, od.loading ? 'Connecting…' : 'Sign in')
              )
        ),
        // New Project button
        h('button', {
          onClick: onNewProject, className:'btn-secondary pressable',
          style:{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            gap:6, color:UI.blue, background:'transparent', padding:'10px' },
        },
          h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none',
            stroke:'currentColor', strokeWidth:2.5, strokeLinecap:'round' },
            h('path', { d:'M12 5v14M5 12h14' })
          ),
          'New Project'
        )
      )
    ),

    // ── RIGHT PANEL ────────────────────────────────────────────────────────────
    h(ProjectDetail, {
      proj: selProj,
      onOpenVisit: (visitId) => onOpenVisit(selId, visitId),
      onOpenProject: () => onOpenProject(selId),
    })
  );
}
