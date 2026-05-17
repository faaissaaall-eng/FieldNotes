// ─────────────────────────────────────────────────────────────────────────────
// ProjectView.js — ProjectView, PunchList, ShareSheet, ManageTeamSheet,
//                  NewProjectSheet
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStatePV, useRef: useRefPV } = React;

// ── PunchList ──────────────────────────────────────────────────────────────────
// Filterable action-item list derived from all non-conforming observations.
function PunchList({ proj, onUpdateProject }) {
  const [filterStatus, setFilter] = useStatePV('open');
  const [expandedKey,  setExpand] = useStatePV(null);

  const allItems = proj.visits.flatMap(v =>
    v.observations
      .filter(o => o.severity !== 'conforming')
      .map(o => ({
        key: `${v.id}::${o.id}`,
        visit: v, obs: o,
        status: (proj.punchStatus || {})[`${v.id}::${o.id}`] || 'open',
      }))
  );

  const counts = { open: 0, 'in-progress': 0, resolved: 0 };
  allItems.forEach(i => counts[i.status] = (counts[i.status] || 0) + 1);

  const visible = filterStatus === 'all' ? allItems : allItems.filter(i => i.status === filterStatus);

  function setStatus(key, status) {
    const updated = { ...proj, punchStatus: { ...(proj.punchStatus || {}), [key]: status } };
    onUpdateProject(updated);
  }

  return h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:'20px 24px' } },
    h('div', { style:{ maxWidth:760, margin:'0 auto' } },
      // Stats row
      h('div', { style:{ display:'flex', gap:10, marginBottom:20 } },
        [
          { label:'Open',        key:'open',        color:UI.red    },
          { label:'In Progress', key:'in-progress', color:UI.orange },
          { label:'Resolved',    key:'resolved',    color:UI.green  },
          { label:'All',         key:'all',         color:UI.blue   },
        ].map(s => h('div', {
          key: s.key,
          onClick: () => setFilter(s.key),
          className: 'pressable',
          style:{
            flex:1, padding:'12px', borderRadius:12, textAlign:'center', cursor:'pointer',
            background: filterStatus === s.key ? s.color : UI.fill4,
            color: filterStatus === s.key ? 'white' : UI.label,
          },
        },
          h('div', { style:{ fontSize:22, fontWeight:700 } },
            s.key === 'all' ? allItems.length : (counts[s.key] || 0)
          ),
          h('div', { style:{ fontSize:11, marginTop:2, opacity:0.85 } }, s.label),
        ))
      ),
      // Item list
      visible.length === 0
        ? h('div', { style:{ textAlign:'center', color:UI.label4, padding:'40px 0' } },
            h('div', { style:{ fontSize:32, marginBottom:8 } }, '✓'),
            h('div', { style:{ fontSize:15, fontWeight:600 } }, 'All clear'),
          )
        : visible.map(item => {
          const sev = SEV[item.obs.severity];
          const isOpen = expandedKey === item.key;
          return h('div', {
            key: item.key, className:'card',
            style:{ marginBottom:8, overflow:'hidden', borderLeft:`4px solid ${sev.color}` },
          },
            h('div', {
              onClick: () => setExpand(isOpen ? null : item.key),
              style:{ padding:'12px 14px', cursor:'pointer' },
            },
              h('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:4 } },
                h(Chip, { label: sev.label, tone: item.obs.severity === 'critical' ? 'red' : 'orange' }),
                h('span', { style:{ fontSize:12, color:UI.label3 } },
                  `${item.visit.date} · Obs #${item.obs.id}`
                ),
                h('div', { style:{ marginLeft:'auto' } },
                  h(Chip, {
                    label: item.status.replace('-',' '),
                    tone: item.status === 'resolved' ? 'green' : item.status === 'in-progress' ? 'orange' : 'neutral',
                  })
                )
              ),
              h('div', { style:{ fontSize:14, color:UI.label } }, item.obs.note),
            ),
            // Expanded status change buttons
            isOpen && h('div', {
              style:{ display:'flex', gap:0, borderTop:`0.5px solid ${UI.sep}` },
            },
              ['open','in-progress','resolved'].map(st => {
                const isCurrent = item.status === st;
                return h('button', {
                  key: st,
                  onClick: () => { setStatus(item.key, st); setExpand(null); },
                  style:{
                    flex:1, padding:'10px 4px', fontSize:12, fontWeight:600,
                    background: isCurrent ? UI.fill4 : 'none',
                    border:'none', borderRight:`0.5px solid ${UI.sep}`, cursor:'pointer',
                    color: isCurrent ? UI.blue : UI.label3,
                  },
                }, st.replace('-',' ') + (isCurrent ? ' ✓' : ''));
              })
            )
          );
        })
    )
  );
}

// ── ShareSheet ─────────────────────────────────────────────────────────────────
// Modal for sharing a visit with team members and generating a share link.
function ShareSheet({ visit, proj, onClose, onUpdate }) {
  const [sharedWith,  setShared]  = useStatePV([...(visit.sharedWith || [])]);
  const [inviteEmail, setEmail]   = useStatePV('');
  const [inviteRole,  setRole]    = useStatePV('viewer');
  const [copied,      setCopied]  = useStatePV(false);

  const shareUrl = `fieldstruct.app/v/${visit.id}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function done() {
    onUpdate({ ...visit, sharedWith });
    onClose();
  }

  function toggleMember(id) {
    setShared(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return h('div', {
    style:{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.4)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
    },
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    h('div', {
      className:'card-elevated scale-in',
      style:{ width:480, maxHeight:'80vh', display:'flex', flexDirection:'column', borderRadius:16 },
    },
      // Header
      h('div', {
        style:{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`0.5px solid ${UI.sep}` },
      },
        h('button', { onClick:onClose, style:{ fontSize:14, color:UI.blue, background:'none', border:'none', cursor:'pointer' } }, 'Cancel'),
        h('div', { style:{ fontWeight:700, fontSize:16, color:UI.label } },
          `Share — ${visit.date}`
        ),
        h('button', { onClick:done, style:{ fontSize:14, color:UI.blue, fontWeight:600, background:'none', border:'none', cursor:'pointer' } }, 'Done'),
      ),
      // Body
      h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:'20px' } },
        // Share link
        h('div', { style:{ marginBottom:24 } },
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:8 } }, 'Share Link'),
          h('div', {
            style:{ display:'flex', alignItems:'center', gap:8,
              background:UI.fill4, borderRadius:10, padding:'10px 12px' },
          },
            h('div', { style:{ flex:1, fontSize:13, color:UI.label, fontFamily:'monospace' } }, shareUrl),
            h('button', {
              onClick: copyLink,
              className:'btn-tinted pressable',
              style:{ padding:'5px 12px', fontSize:12, flexShrink:0 },
            }, copied ? '✓ Copied' : 'Copy')
          )
        ),
        // People with access
        h('div', null,
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:8 } }, 'People with Access'),
          proj.members.map(m => h('div', {
            key: m.id,
            style:{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
              borderBottom:`0.5px solid ${UI.sep}` },
          },
            h(Avatar, { name:m.name, size:36 }),
            h('div', { style:{ flex:1 } },
              h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label } }, m.name),
              h('div', { style:{ fontSize:12, color:UI.label3 } }, m.role),
            ),
            h(Toggle, { on: sharedWith.includes(m.id), onToggle: () => toggleMember(m.id) })
          ))
        ),
        // Invite
        h('div', { style:{ marginTop:20 } },
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:8 } }, 'Invite by Email'),
          h('div', { style:{ display:'flex', gap:8 } },
            h('input', {
              value:inviteEmail, onChange:e=>setEmail(e.target.value),
              placeholder:'email@example.com', className:'sys-input',
              style:{ flex:1, fontSize:14 },
            }),
            h('select', {
              value:inviteRole, onChange:e=>setRole(e.target.value), className:'sys-input',
              style:{ width:'auto', fontSize:14 },
            },
              h('option', { value:'viewer' }, 'Viewer'),
              h('option', { value:'editor' }, 'Editor'),
            ),
            h('button', { className:'btn-primary pressable', style:{ padding:'0 14px', fontSize:13 } }, 'Send'),
          )
        )
      )
    )
  );
}

// ── ManageTeamSheet ────────────────────────────────────────────────────────────
// Modal for adding/removing team members on a project.
function ManageTeamSheet({ proj, onClose, onUpdate }) {
  const [members,   setMembers]  = useStatePV([...proj.members]);
  const [newMember, setNewMember] = useStatePV({ name:'', role:'', email:'', access:'viewer' });

  function addMember() {
    if (!newMember.name || !newMember.email) return;
    setMembers(prev => [...prev, { id: uid(), ...newMember }]);
    setNewMember({ name:'', role:'', email:'', access:'viewer' });
  }

  return h('div', {
    style:{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.4)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
    },
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    h('div', {
      className:'card-elevated scale-in',
      style:{ width:520, maxHeight:'80vh', display:'flex', flexDirection:'column', borderRadius:16 },
    },
      // Header
      h('div', {
        style:{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`0.5px solid ${UI.sep}` },
      },
        h('button', { onClick:onClose, style:{ fontSize:14, color:UI.blue, background:'none', border:'none', cursor:'pointer' } }, 'Cancel'),
        h('div', { style:{ fontWeight:700, fontSize:16, color:UI.label } }, 'Team Members'),
        h('button', {
          onClick:() => { onUpdate({ ...proj, members }); onClose(); },
          style:{ fontSize:14, color:UI.blue, fontWeight:600, background:'none', border:'none', cursor:'pointer' },
        }, 'Done'),
      ),
      // Body
      h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:'16px 20px' } },
        // Existing members
        members.map((m, i) => h('div', {
          key: m.id,
          style:{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
            borderBottom:`0.5px solid ${UI.sep}` },
        },
          h(Avatar, { name:m.name, size:36 }),
          h('div', { style:{ flex:1 } },
            h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label } }, m.name),
            h('div', { style:{ fontSize:12, color:UI.label3 } }, `${m.role} · ${m.email}`),
          ),
          h(Chip, { label:m.access, tone:m.access==='editor'?'blue':'neutral' }),
          h('button', {
            onClick:() => setMembers(prev => prev.filter((_,j) => j !== i)),
            style:{ marginLeft:4, fontSize:16, color:UI.red, background:'none', border:'none', cursor:'pointer' },
          }, '×')
        )),
        // Add member form
        h('div', { style:{ marginTop:20, padding:'16px', background:UI.fill4, borderRadius:12 } },
          h('div', { className:'caption', style:{ color:UI.label3, marginBottom:12 } }, 'Add Member'),
          h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 } },
            h('input', { value:newMember.name,    onChange:e=>setNewMember(p=>({...p,name:e.target.value})),    placeholder:'Name *',    className:'sys-input', style:{fontSize:14} }),
            h('input', { value:newMember.role,    onChange:e=>setNewMember(p=>({...p,role:e.target.value})),    placeholder:'Role',      className:'sys-input', style:{fontSize:14} }),
            h('input', { value:newMember.email,   onChange:e=>setNewMember(p=>({...p,email:e.target.value})),   placeholder:'Email *',   className:'sys-input', style:{fontSize:14} }),
            h('select',{ value:newMember.access,  onChange:e=>setNewMember(p=>({...p,access:e.target.value})),  className:'sys-input',   style:{fontSize:14} },
              h('option',{value:'viewer'},'Viewer'),
              h('option',{value:'editor'},'Editor'),
            )
          ),
          h('button', {
            onClick: addMember,
            className: 'btn-primary pressable',
            style:{ width:'100%', padding:'10px', fontSize:14 },
          }, '+ Add to Project')
        )
      )
    )
  );
}

// ── NewProjectSheet ────────────────────────────────────────────────────────────
// Modal sheet for creating a new project.
function NewProjectSheet({ onClose, onCreate }) {
  const colorOptions = [UI.blue, UI.purple, UI.green, UI.orange, UI.red, UI.teal, UI.pink, UI.indigo];
  const [form, setForm] = useStatePV({
    name:'', client:'', location:'',
    type: STRUCT_TYPES[0],
    color: UI.blue,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function create() {
    if (!form.name) return;
    onCreate({
      id: uid(), ...form,
      status:'active', createdAt: ds(),
      visits:[], punchStatus:{},
      members:[{
        id: uid(), name:'Abdul Hassan', role:'Engineer of Record',
        email:'a.hassan@struct.com', access:'editor',
      }],
    });
    onClose();
  }

  return h('div', {
    style:{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.4)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
    },
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    h('div', {
      className:'card-elevated sheet-up',
      style:{ width:480, borderRadius:20, overflow:'hidden' },
    },
      // Header
      h('div', {
        style:{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`0.5px solid ${UI.sep}` },
      },
        h('button', { onClick:onClose, style:{ fontSize:14, color:UI.blue, background:'none', border:'none', cursor:'pointer' } }, 'Cancel'),
        h('div', { style:{ fontWeight:700, fontSize:16, color:UI.label } }, 'New Project'),
        h('button', {
          onClick: create, disabled: !form.name,
          style:{ fontSize:14, fontWeight:600, color: form.name ? UI.blue : UI.label4,
            background:'none', border:'none', cursor: form.name ? 'pointer' : 'default' },
        }, 'Create'),
      ),
      // Form
      h('div', { style:{ padding:'20px' } },
        ...[
          { key:'name',     label:'Project Name',   placeholder:'e.g. KCI Hangar Level 2' },
          { key:'client',   label:'Client / Owner', placeholder:'e.g. Kansas City Airport Authority' },
          { key:'location', label:'Location',       placeholder:'e.g. Kansas City, MO' },
        ].map(field => h('div', { key:field.key, style:{ marginBottom:14 } },
          h('label', { style:{ fontSize:12, color:UI.label3, display:'block', marginBottom:4 } }, field.label),
          h('input', {
            value: form[field.key],
            onChange: e => set(field.key, e.target.value),
            placeholder: field.placeholder,
            className: 'sys-input', style:{ fontSize:14 },
          })
        )),
        // Structure type
        h('div', { style:{ marginBottom:14 } },
          h('label', { style:{ fontSize:12, color:UI.label3, display:'block', marginBottom:4 } }, 'Structure Type'),
          h('select', {
            value: form.type, onChange: e => set('type', e.target.value),
            className:'sys-input', style:{ fontSize:14 },
          }, STRUCT_TYPES.map(t => h('option', { key:t, value:t }, t)))
        ),
        // Colour picker
        h('div', null,
          h('label', { style:{ fontSize:12, color:UI.label3, display:'block', marginBottom:8 } }, 'Colour'),
          h('div', { style:{ display:'flex', gap:8 } },
            colorOptions.map(c => h('button', {
              key: c,
              onClick: () => set('color', c),
              style:{
                width:28, height:28, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
                boxShadow: form.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                transition:'box-shadow 0.15s',
              },
            }))
          )
        )
      )
    )
  );
}

// ── ProjectView ────────────────────────────────────────────────────────────────
// Full-screen project management: visits list, team, punch list.
function ProjectView({ proj, onBack, onOpenVisit, onNewVisit, onUpdateProject, dark, toggleTheme }) {
  const [shareVisitId,  setShareVisit]  = useStatePV(null);
  const [showManage,    setShowManage]  = useStatePV(false);
  const [activeTab,     setActiveTab]   = useStatePV('visits');

  const shareVisit = shareVisitId ? proj.visits.find(v => v.id === shareVisitId) : null;
  const openCrit = proj.visits.reduce((n, v) => n + (v.critCount || 0), 0);

  return h('div', { style:{ height:'100vh', background:UI.bg, display:'flex', flexDirection:'column', overflow:'hidden' } },
    // Navbar
    h('div', { className:'glass', style:{ height:52, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:`0.5px solid ${UI.sep}`, flexShrink:0, gap:12 } },
      h(BackButton, { label:'Projects', onClick:onBack }),
      h('div', { style:{ flex:1, textAlign:'center', fontSize:15, fontWeight:600, color:UI.label } },
        `Manage / ${proj.name}`
      ),
      h('button', {
        onClick: onNewVisit, className:'btn-primary pressable',
        style:{ padding:'7px 14px', fontSize:13 },
      }, '+ New Visit'),
    ),
    // Tab bar
    h('div', {
      style:{ display:'flex', borderBottom:`0.5px solid ${UI.sep}`, background:UI.surface, flexShrink:0 },
    },
      [
        { key:'visits',    label:'Site Visits' },
        { key:'punchlist', label:'Punch List', badge: openCrit || null },
      ].map(tab => h('button', {
        key: tab.key,
        onClick: () => setActiveTab(tab.key),
        style:{
          flex:1, padding:'12px', fontSize:14, fontWeight:600,
          border:'none', background:'none', cursor:'pointer',
          color: activeTab === tab.key ? UI.blue : UI.label3,
          borderBottom: activeTab === tab.key ? `2px solid ${UI.blue}` : '2px solid transparent',
        },
      },
        tab.label,
        tab.badge && h('span', {
          style:{
            marginLeft:6, background:UI.red, color:'white',
            borderRadius:10, padding:'1px 6px', fontSize:11,
          },
        }, tab.badge)
      ))
    ),
    // Tab content
    activeTab === 'visits'
      ? h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:'20px 24px' } },
          h('div', { style:{ maxWidth:760, margin:'0 auto' } },
            // Team section
            h('div', { style:{ marginBottom:24 } },
              h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 } },
                h('div', { className:'caption', style:{ color:UI.label3 } }, 'Team Members'),
                h('button', {
                  onClick:()=>setShowManage(true),
                  style:{ fontSize:13, color:UI.blue, background:'none', border:'none', cursor:'pointer' },
                }, 'Add Member'),
              ),
              h('div', { className:'card', style:{ overflow:'hidden' } },
                proj.members.map((m, i) => h('div', {
                  key: m.id,
                  style:{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                    borderBottom: i < proj.members.length-1 ? `0.5px solid ${UI.sep}` : 'none' },
                },
                  h(Avatar, { name:m.name, size:38 }),
                  h('div', { style:{ flex:1 } },
                    h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label } }, m.name),
                    h('div', { style:{ fontSize:12, color:UI.label3 } }, `${m.role} · ${m.email}`),
                  ),
                  h(Chip, { label:m.access, tone:m.access==='editor'?'blue':'neutral' })
                ))
              )
            ),
            // Visits section
            h('div', null,
              h('div', { className:'caption', style:{ color:UI.label3, marginBottom:12 } }, 'Site Visits'),
              proj.visits.length === 0
                ? h('div', { className:'card', style:{ padding:'32px', textAlign:'center', color:UI.label4 } },
                    h('div', { style:{ fontSize:32, marginBottom:8 } }, '📅'),
                    h('div', { style:{ fontSize:15, fontWeight:600 } }, 'No visits yet'),
                  )
                : proj.visits.map(v => {
                  const sharedMembers = proj.members.filter(m => (v.sharedWith || []).includes(m.id));
                  return h('div', { key:v.id, className:'card', style:{ marginBottom:10 } },
                    h('div', { style:{ padding:'14px 16px' } },
                      h('div', { style:{ display:'flex', alignItems:'flex-start', gap:12 } },
                        h('div', {
                          style:{
                            width:44, height:44, borderRadius:12, flexShrink:0,
                            background:v.critCount?'rgba(255,59,48,0.12)':'rgba(52,199,89,0.12)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          },
                        },
                          h('svg', { width:20, height:20, viewBox:'0 0 24 24', fill:'none',
                            stroke:v.critCount?UI.red:UI.green, strokeWidth:2, strokeLinecap:'round' },
                            h('rect',{x:3,y:4,width:18,height:18,rx:2}),
                            h('line',{x1:16,y1:2,x2:16,y2:6}),
                            h('line',{x1:8,y1:2,x2:8,y2:6}),
                            h('line',{x1:3,y1:10,x2:21,y2:10}),
                          )
                        ),
                        h('div', { style:{ flex:1 } },
                          h('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
                            h('div', { style:{ fontSize:15, fontWeight:600, color:UI.label } }, v.date),
                            v.critCount > 0 && h(Chip, { label:`${v.critCount} critical`, tone:'red' }),
                          ),
                          h('div', { style:{ fontSize:13, color:UI.label3, marginTop:2 } },
                            `${v.weather || ''} · ${v.obsCount} obs`
                          ),
                          // Shared-with row
                          sharedMembers.length > 0 && h('div', { style:{ display:'flex', alignItems:'center', gap:6, marginTop:8 } },
                            h('div', { style:{ display:'flex', gap:-4 } },
                              sharedMembers.slice(0,3).map(m => h('div', { key:m.id, style:{ marginRight:-6 } },
                                h(Avatar, { name:m.name, size:22 })
                              ))
                            ),
                            h('button', {
                              onClick:()=>setShareVisit(v.id),
                              style:{ fontSize:12, color:UI.blue, background:'none', border:'none', cursor:'pointer' },
                            }, 'Manage'),
                          ),
                        ),
                        h('button', {
                          onClick:()=>onOpenVisit(v.id), className:'btn-primary pressable',
                          style:{ padding:'7px 14px', fontSize:13, flexShrink:0 },
                        }, 'Open'),
                      )
                    )
                  );
                })
            )
          )
        )
      : h(PunchList, { proj, onUpdateProject }),

    // Modals
    shareVisit && h(ShareSheet, {
      visit: shareVisit, proj,
      onClose: () => setShareVisit(null),
      onUpdate: updated => onUpdateProject({
        ...proj,
        visits: proj.visits.map(v => v.id === updated.id ? updated : v),
      }),
    }),
    showManage && h(ManageTeamSheet, {
      proj, onClose: () => setShowManage(false),
      onUpdate: updated => onUpdateProject(updated),
    }),
  );
}
