// ─────────────────────────────────────────────────────────────────────────────
// ObservationTool.js — The main field inspection UI:
//   DirOverlay, AddPanel, ObsTooltip, LogPanel, ODStatusBar, ObservationTool
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateOT, useRef: useRefOT,
        useEffect: useEffectOT, useCallback: useCallbackOT } = React;

// ── Voice recording helper ─────────────────────────────────────────────────────
async function startRecording(onStop) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false });
  const mimes  = [
    'audio/mp4','audio/aac','audio/mpeg',
    'audio/ogg;codecs=opus','audio/webm;codecs=opus','audio/webm',
  ];
  const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
  const mr   = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    const blob = new Blob(chunks, { type: mime || 'audio/webm' });
    const url  = URL.createObjectURL(blob);
    stream.getTracks().forEach(t => t.stop());
    onStop(url, blob);
  };
  mr.start();
  return mr;
}

// ── DirOverlay ─────────────────────────────────────────────────────────────────
// Full-screen frosted glass overlay for setting photo direction before opening camera.
function DirOverlay({ pendingDir, setPendingDir, dirOverlay, setDirOverlay, setPin, setForm, openCamera }) {
  function confirm() {
    if (setPin) setPin(dirOverlay);
    setForm(p => ({ ...p, direction: pendingDir }));
    setDirOverlay(null);
    openCamera();
  }
  function noPhoto() {
    if (setPin) setPin(dirOverlay);
    setDirOverlay(null);
  }
  function cancel() {
    setDirOverlay(null);
    if (setPin) setPin(null);
  }

  return h('div', {
    style:{
      position:'fixed', inset:0, zIndex:400,
      display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      background:'rgba(0,0,0,0.35)',
    },
  },
    h('div', {
      className:'card-elevated scale-in',
      style:{ width:380, borderRadius:22, padding:'28px 24px', textAlign:'center' },
    },
      h('div', { style:{ fontSize:17, fontWeight:700, color:UI.label, marginBottom:6 } },
        'Set Camera Direction'
      ),
      h('div', { style:{ fontSize:14, color:UI.label3, marginBottom:20 } },
        'Which direction are you photographing?'
      ),
      h(DirectionWheel, {
        value: pendingDir,
        onChange: setPendingDir,
        size: 200,
      }),
      h('div', { style:{ marginTop:20, display:'flex', flexDirection:'column', gap:10 } },
        h('button', {
          onClick: confirm,
          className: 'btn-primary pressable',
          style:{ padding:'13px', fontSize:15 },
        }, `📷 Open Camera — ${Math.round(pendingDir)}° ${dl(pendingDir)}`),
        h('div', { style:{ display:'flex', gap:8 } },
          h('button', {
            onClick: noPhoto,
            className:'btn-secondary pressable',
            style:{ flex:1, padding:'10px', fontSize:14 },
          }, 'No Photo'),
          h('button', {
            onClick: cancel,
            className:'btn-secondary pressable',
            style:{ flex:1, padding:'10px', fontSize:14 },
          }, 'Cancel'),
        )
      )
    )
  );
}

// ── AddPanel ───────────────────────────────────────────────────────────────────
// Right-side panel for entering a new observation after a pin is placed.
function AddPanel({ obs, form, f, BLANK, pin, setPin, setAddMode, setForm, setDirOverlay,
                    setPendingDir, saveObs, openCamera, pendingPhoto, setPendingPhoto,
                    vnRec, vnEl, startVn, stopVn, startConv, stopConv,
                    superName, setSuperNameMode, contacts, setContacts }) {
  const [isSpeechActive, setIsSpeech] = useStateOT(false);
  const speechRef       = useRefOT(null);
  const [showAddContact, setShowAddContact] = useStateOT(false);
  const [newContact, setNewContact] = useStateOT({ name:'', title:'', company:'', phone:'' });

  function openDirOverlay() {
    const currentPin = pin;
    setPin(null);
    setPendingDir(form.direction || 0);
    setDirOverlay(currentPin);
  }

  function addPhoto() {
    if (form.photos && form.photos.length > 0) {
      // Subsequent photos — skip direction, go straight to camera
      openCamera();
    } else {
      // First photo — show direction wheel
      openDirOverlay();
    }
  }

  function toggleSpeech() {
    if (isSpeechActive) {
      speechRef.current?.stop();
      speechRef.current = null;
      setIsSpeech(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
      f('note', form.note + (form.note ? ' ' : '') + text);
    };
    rec.onend = () => setIsSpeech(false);
    rec.start();
    speechRef.current = rec;
    setIsSpeech(true);
  }

  function addContact() {
    if (!newContact.name) return;
    setContacts(prev => [...prev, { id: uid(), ...newContact }]);
    setNewContact({ name:'', title:'', company:'', phone:'' });
    setShowAddContact(false);
  }

  const obsNum = obs.length + 1;
  const photos = form.photos || [];

  return h('div', { className:'scroll', style:{ height:'100%', overflowY:'auto', padding:'18px 20px 20px' } },
    // Header
    h('div', { style:{ marginBottom:14 } },
      h('div', { className:'caption', style:{ color:UI.label3, marginBottom:3 } }, 'New Observation'),
      h('div', { style:{ fontSize:19, fontWeight:700, color:UI.label } }, `#${obsNum}`),
    ),

    // ── Photos section ──────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:16 } },
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 } },
        h('div', { className:'caption', style:{ color:UI.label3 } }, 'Photos'),
        h('button', {
          onClick: addPhoto,
          className:'btn-tinted pressable',
          style:{ padding:'4px 10px', fontSize:12 },
        }, photos.length > 0 ? '+ Add' : '+ Add Photo'),
      ),
      photos.length > 0
        ? h('div', { style:{ display:'flex', gap:8, overflowX:'auto', paddingBottom:6 } },
            photos.map((ph, idx) => h('div', {
              key: idx,
              style:{ position:'relative', flexShrink:0,
                width: photos.length === 1 ? 120 : 88, height:88,
                borderRadius:10, overflow:'hidden',
              },
            },
              ph.dataUrl && h('img', {
                src: ph.dataUrl, alt:'',
                style:{ width:'100%', height:'100%', objectFit:'cover' },
              }),
              // Direction mini-compass overlay
              h('div', { style:{ position:'absolute', bottom:4, left:4 } },
                h(MiniDir, { d: ph.direction || 0, size:18 })
              ),
              h('div', { style:{ position:'absolute', bottom:4, right:4, fontSize:9, color:'white',
                background:'rgba(0,0,0,0.5)', borderRadius:4, padding:'1px 3px' } },
                `${Math.round(ph.direction || 0)}°`
              ),
              // Remove button
              h('button', {
                onClick: () => setForm(p => ({ ...p, photos: p.photos.filter((_,i) => i !== idx) })),
                style:{ position:'absolute', top:4, right:4, width:18, height:18,
                  borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white',
                  border:'none', cursor:'pointer', fontSize:11, lineHeight:'18px', textAlign:'center' },
              }, '×')
            ))
          )
        : h('div', {
            onClick: addPhoto,
            style:{ height:72, borderRadius:10, background:UI.fill4, display:'flex',
              alignItems:'center', justifyContent:'center', cursor:'pointer',
              color:UI.label4, fontSize:13 },
          }, 'Tap to add photos'),
    ),

    // ── Severity ────────────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:14 } },
      h('div', { className:'caption', style:{ color:UI.label3, marginBottom:6 } }, 'Status'),
      h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 } },
        ['conforming','minor','critical'].map(sev => {
          const s = SEV[sev];
          const sel = form.severity === sev;
          return h('button', {
            key: sev,
            onClick: () => f('severity', sev),
            style:{
              padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer',
              background: sel ? s.bg : UI.fill4,
              color: sel ? s.color : UI.label3,
              fontWeight: sel ? 700 : 500, fontSize:13,
              transition:'all 0.15s',
            },
          }, s.label);
        })
      ),
    ),

    // ── Category ────────────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:14 } },
      h('label', { className:'caption', style:{ color:UI.label3, display:'block', marginBottom:6 } }, 'Category'),
      h('select', {
        value: form.category,
        onChange: e => f('category', e.target.value),
        className: 'sys-input', style:{ fontSize:14 },
      }, CATS.map(c => h('option', { key:c, value:c }, c))),
    ),

    // ── Notes ───────────────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:14 } },
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 } },
        h('label', { className:'caption', style:{ color:UI.label3 } }, 'Observation Notes'),
        h('button', {
          onClick: toggleSpeech,
          style:{
            fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:8,
            background: isSpeechActive ? 'rgba(255,59,48,0.12)' : UI.fill3,
            color: isSpeechActive ? UI.red : UI.label3,
            border:'none', cursor:'pointer',
          },
        }, isSpeechActive
          ? h('span', { style:{ display:'flex', alignItems:'center', gap:4 } },
              h('span', { className:'blink', style:{ width:6, height:6, borderRadius:'50%', background:UI.red, display:'inline-block' } }),
              'Stop'
            )
          : 'Dictate'
        ),
      ),
      h('textarea', {
        value: form.note,
        onChange: e => f('note', e.target.value),
        rows: 3,
        placeholder: 'Describe the observation…',
        className: 'sys-input',
        style:{
          fontSize:14, resize:'none', lineHeight:1.5,
          boxShadow: isSpeechActive ? `0 0 0 2px ${UI.red}` : undefined,
        },
      }),
    ),

    // ── Voice note ──────────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:14 } },
      h('div', { className:'caption', style:{ color:UI.label3, marginBottom:6 } }, 'Voice Note'),
      form.voiceNote
        ? h('div', { style:{ background:'rgba(175,82,222,0.08)', borderRadius:10, padding:'10px 12px' } },
            h('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              h('span', null, '🎙️'),
              h('audio', { src:form.voiceNote, controls:true, style:{ flex:1, height:28 } }),
              h('button', {
                onClick: () => f('voiceNote', null),
                style:{ color:UI.red, background:'none', border:'none', cursor:'pointer', fontSize:14 },
              }, '×'),
            )
          )
        : h('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
            h('button', {
              onClick: vnRec ? stopVn : startVn,
              style:{
                padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer',
                background: vnRec ? 'rgba(175,82,222,0.12)' : UI.fill3,
                color: vnRec ? UI.purple : UI.label3,
                fontSize:13, fontWeight:600,
                animation: vnRec ? 'pulse 1.2s ease infinite' : 'none',
              },
            }, vnRec ? `⏹ ${fmt(vnEl)}` : '🎙️ Record'),
          ),
    ),

    // ── Superintendent section ──────────────────────────────────────────────────
    h('div', { style:{ marginBottom:14 } },
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 } },
        h('label', { className:'caption', style:{ color:UI.label3 } }, 'Superintendent Response'),
        h(Toggle, { on: form.superEnabled, onToggle: () => f('superEnabled', !form.superEnabled), size:'small' }),
      ),
      form.superEnabled && h('div', null,
        !superName && h('button', {
          onClick: () => setSuperNameMode(true),
          style:{ fontSize:12, color:UI.blue, background:'none', border:'none', cursor:'pointer', marginBottom:6 },
        }, '+ Set superintendent name'),
        superName && h('div', { style:{ fontSize:12, color:UI.label3, marginBottom:6 } },
          `Recording for: ${superName}`
        ),
        h('textarea', {
          value: form.superResponse || '',
          onChange: e => f('superResponse', e.target.value),
          rows: 2, placeholder:'Superintendent verbal response…',
          className:'sys-input', style:{ fontSize:14, resize:'none' },
        }),
        // Conversation recording sub-section
        h('div', { style:{ marginTop:8 } },
          h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 } },
            h('label', { style:{ fontSize:12, color:UI.label3 } }, 'Record Conversation'),
            h(Toggle, { on: form.recordConv, onToggle: () => f('recordConv', !form.recordConv), size:'small' }),
          ),
          form.recordConv && h('div', null,
            form.convUrl
              ? h('audio', { src:form.convUrl, controls:true, style:{ width:'100%', height:28 } })
              : h('button', {
                  onClick: form.convRecording ? stopConv : startConv,
                  style:{
                    padding:'7px 14px', borderRadius:10, border:'none', cursor:'pointer',
                    background: form.convRecording ? 'rgba(175,82,222,0.12)' : UI.fill3,
                    color: form.convRecording ? UI.purple : UI.label3,
                    fontSize:12, fontWeight:600,
                  },
                }, form.convRecording ? `⏹ ${fmt(form.convElapsed)}` : '🎙️ Record Conversation'),
          )
        )
      ),
    ),

    // ── People on site ──────────────────────────────────────────────────────────
    h('div', { style:{ marginBottom:20 } },
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 } },
        h('label', { className:'caption', style:{ color:UI.label3 } }, 'People on Site'),
        h('button', {
          onClick: () => setShowAddContact(p => !p),
          style:{ fontSize:12, color:UI.blue, background:'none', border:'none', cursor:'pointer' },
        }, '+ Add'),
      ),
      contacts.length === 0
        ? h('div', { style:{ fontSize:13, color:UI.label4, fontStyle:'italic' } }, 'Log who was on site…')
        : contacts.map(c => h('div', { key:c.id, style:{ display:'flex', alignItems:'center', gap:10, padding:'6px 0' } },
            h('div', {
              style:{
                width:32, height:32, borderRadius:'50%', background:UI.blue,
                color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:700, flexShrink:0,
              },
            }, (c.name[0] || '').toUpperCase()),
            h('div', { style:{ flex:1 } },
              h('div', { style:{ fontSize:13, fontWeight:600, color:UI.label } }, c.name),
              h('div', { style:{ fontSize:11, color:UI.label3 } }, [c.title, c.company].filter(Boolean).join(' · ')),
              c.phone && h('a', { href:`tel:${c.phone}`, style:{ fontSize:11, color:UI.blue } }, c.phone),
            ),
            h('button', {
              onClick: () => setContacts(prev => prev.filter(x => x.id !== c.id)),
              style:{ color:UI.label4, background:'none', border:'none', cursor:'pointer', fontSize:16 },
            }, '×')
          )),
      showAddContact && h('div', { style:{ marginTop:8, padding:'12px', background:UI.fill4, borderRadius:10 } },
        h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 } },
          h('input', { value:newContact.name,    onChange:e=>setNewContact(p=>({...p,name:e.target.value})),    placeholder:'Name *',    className:'sys-input', style:{fontSize:13} }),
          h('input', { value:newContact.title,   onChange:e=>setNewContact(p=>({...p,title:e.target.value})),   placeholder:'Title',     className:'sys-input', style:{fontSize:13} }),
          h('input', { value:newContact.company, onChange:e=>setNewContact(p=>({...p,company:e.target.value})), placeholder:'Company',   className:'sys-input', style:{fontSize:13} }),
          h('input', { value:newContact.phone,   onChange:e=>setNewContact(p=>({...p,phone:e.target.value})),   placeholder:'Phone',     className:'sys-input', style:{fontSize:13} }),
        ),
        h('button', { onClick:addContact, className:'btn-primary pressable', style:{width:'100%',padding:'8px',fontSize:13} }, 'Add'),
      )
    ),

    // ── Cancel / Save ───────────────────────────────────────────────────────────
    h('div', { style:{ display:'flex', gap:8 } },
      h('button', {
        onClick: () => { setPin(null); setAddMode(false); setForm(BLANK); },
        className:'btn-secondary pressable',
        style:{ flex:1, padding:'11px' },
      }, 'Cancel'),
      h('button', {
        onClick: saveObs,
        disabled: !form.note,
        className:'btn-primary pressable',
        style:{ flex:2, padding:'11px' },
      }, 'Save Observation'),
    )
  );
}

// ── ObsTooltip ─────────────────────────────────────────────────────────────────
// Floating or inline card showing a completed observation's details.
function ObsTooltip({ o, onClose, inline = false }) {
  const sev    = SEV[o.severity];
  const photos = o.photos?.length > 0 ? o.photos
    : o.photoDataUrl ? [{ dataUrl: o.photoDataUrl, direction: o.direction, timestamp: o.photoTimestamp }]
    : [];

  const card = h('div', {
    style: inline ? {} : {
      position:'absolute',
      left: `min(${o.x + 2}%, calc(100% - 296px))`,
      top:  `min(${o.y + 1}%, calc(100% - 260px))`,
      width:286, borderRadius:14, zIndex:50,
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      background:'rgba(255,255,255,0.92)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
    },
    className: inline ? '' : 'scale-in',
  },
    h('div', { style:{ padding:'10px 12px 0' } },
      h('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:8 } },
        h(Chip, { label:sev.label, tone: o.severity === 'critical' ? 'red' : o.severity === 'minor' ? 'orange' : 'green' }),
        h('div', { style:{ fontSize:12, color:UI.label3 } }, `#${o.id} · ${o.time}`),
        !inline && h('button', {
          onClick: onClose,
          style:{ marginLeft:'auto', color:UI.label4, background:'none', border:'none',
            cursor:'pointer', fontSize:18, lineHeight:1 },
        }, '×'),
      ),
      // Photos row
      photos.length > 0 && h('div', { style:{ display:'flex', gap:6, overflowX:'auto', marginBottom:8 } },
        photos.map((ph, i) => h('div', { key:i,
          style:{ position:'relative', flexShrink:0, width:72, height:56, borderRadius:8, overflow:'hidden' } },
          ph.dataUrl && h('img', { src:ph.dataUrl, alt:'', style:{ width:'100%', height:'100%', objectFit:'cover' } }),
          h('div', { style:{ position:'absolute', bottom:3, left:3 } },
            h(MiniDir, { d:ph.direction||0, size:16 })
          ),
        ))
      ),
      // Category
      h('div', { style:{ fontSize:12, color:UI.label3, marginBottom:4 } }, o.category),
      // Note
      h('div', { style:{ fontSize:14, color:UI.label, lineHeight:1.45, marginBottom:8 } }, o.note),
      // Voice note
      o.voiceNote && h('div', {
        style:{ background:'rgba(175,82,222,0.08)', borderRadius:8, padding:'6px 10px', marginBottom:6,
          display:'flex', alignItems:'center', gap:8 },
      },
        h('span', null, '🎙️'),
        h('audio', { src:o.voiceNote, controls:true, style:{ flex:1, height:24 } }),
      ),
      // Superintendent response
      o.superResponse && h('div', {
        style:{ background:'rgba(52,199,89,0.08)', borderRadius:8, padding:'8px 10px', marginBottom:8 },
      },
        h('div', { style:{ fontSize:11, color:UI.green, fontWeight:600, marginBottom:2 } },
          `${o.superName || 'Superintendent'} · ${o.superTime || ''}`
        ),
        h('div', { style:{ fontSize:13, color:UI.label } }, o.superResponse),
      ),
    ),
    !inline && h('div', { style:{ padding:'0 12px 10px' } },
      h('button', {
        onClick: onClose,
        className:'btn-secondary pressable',
        style:{ width:'100%', padding:'8px', fontSize:13 },
      }, 'Close')
    )
  );

  return card;
}

// ── LogPanel ───────────────────────────────────────────────────────────────────
// Scrollable list view of all observations (alternate to drawing view).
function LogPanel({ obs }) {
  return h('div', { className:'scroll fade-in', style:{ flex:1, overflowY:'auto', padding:'20px 24px' } },
    h('div', { style:{ maxWidth:760, margin:'0 auto' } },
      h('div', { style:{ fontSize:20, fontWeight:700, color:UI.label, marginBottom:16 } },
        `Observations (${obs.length})`
      ),
      obs.length === 0
        ? h('div', { style:{ textAlign:'center', color:UI.label4, padding:'40px 0' } },
            h('div', { style:{ fontSize:40, marginBottom:12 } }, '📍'),
            h('div', { style:{ fontSize:17, fontWeight:600 } }, 'No observations yet'),
            h('div', { style:{ fontSize:14, marginTop:4 } }, 'Place pins on the drawing to add observations'),
          )
        : obs.map(o => {
          const sev  = SEV[o.severity];
          const tone = o.severity === 'critical' ? 'red' : o.severity === 'minor' ? 'orange' : 'green';
          return h('div', { key:o.id, className:'card', style:{ marginBottom:10, padding:'14px 16px' } },
            h('div', { style:{ display:'flex', alignItems:'flex-start', gap:12 } },
              h('div', {
                style:{
                  width:32, height:32, borderRadius:'50%', flexShrink:0,
                  background:sev.bg, color:sev.color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700,
                },
              }, o.id),
              h('div', { style:{ flex:1 } },
                h('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:4 } },
                  h(Chip, { label:sev.label, tone }),
                  h('span', { style:{ fontSize:12, color:UI.label3 } }, `${o.category} · ${o.time}`),
                ),
                h('div', { style:{ fontSize:14, color:UI.label, lineHeight:1.5, marginBottom:6 } }, o.note),
                h('div', { style:{ display:'flex', gap:6, flexWrap:'wrap' } },
                  o.hasPhoto && h(Chip, { label:`📷 ${dl(o.direction)}`, tone:'blue' }),
                  o.voiceNote && h(Chip, { label:'🎙️ Voice', tone:'purple' }),
                ),
                o.superResponse && h('div', {
                  style:{ marginTop:8, background:'rgba(52,199,89,0.08)', borderRadius:8,
                    padding:'8px 10px', borderLeft:`3px solid ${UI.green}` },
                },
                  h('div', { style:{ fontSize:11, color:UI.green, fontWeight:600, marginBottom:2 } },
                    `${o.superName || 'Superintendent'} · ${o.superTime || ''}`
                  ),
                  h('div', { style:{ fontSize:13, color:UI.label } }, o.superResponse),
                ),
              )
            )
          );
        })
    )
  );
}

// ── ODStatusBar ────────────────────────────────────────────────────────────────
// Fixed bottom-left OneDrive status indicator (used in ObservationTool).
function ODStatusBar({ od }) {
  const [expanded, setExpanded] = useStateOT(false);
  if (!od) return null;

  if (!od.signedIn) {
    return h('div', { style:{ position:'fixed', bottom:24, left:24, zIndex:200 } },
      !expanded
        ? h('button', {
            onClick: () => setExpanded(true),
            style:{
              display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
              background: UI.blue, color:'white', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600, boxShadow:'0 4px 16px rgba(0,122,255,0.3)',
            },
          }, '☁ OneDrive')
        : h('div', { className:'card-elevated scale-in', style:{ padding:'16px', width:220, borderRadius:16 } },
            h('div', { style:{ fontSize:14, fontWeight:700, color:UI.label, marginBottom:8 } }, 'Connect OneDrive'),
            od.error && h('div', { style:{ fontSize:12, color:UI.red, marginBottom:8 } }, od.error),
            h('button', {
              onClick: () => { setExpanded(false); od.signIn(); },
              disabled: od.loading,
              className:'btn-primary pressable',
              style:{ width:'100%', padding:'9px', fontSize:13 },
            }, od.loading ? 'Connecting…' : 'Sign in with Microsoft'),
            h('button', {
              onClick: () => setExpanded(false),
              style:{ width:'100%', marginTop:6, padding:'6px', fontSize:12,
                color:UI.label4, background:'none', border:'none', cursor:'pointer' },
            }, 'Dismiss'),
          )
    );
  }

  const dotColor = od.syncing ? UI.orange
    : !navigator.onLine ? UI.label4
    : od.pending > 0 ? UI.orange
    : UI.green;

  return h('div', {
    style:{
      position:'fixed', bottom:24, left:24, zIndex:200,
      display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
      borderRadius:14, minWidth:190,
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      background:'rgba(255,255,255,0.85)',
      boxShadow:'0 2px 12px rgba(0,0,0,0.1)',
    },
  },
    h('div', { style:{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 } }),
    h('div', { style:{ flex:1, minWidth:0 } },
      h('div', { style:{ fontSize:12, fontWeight:600, color:UI.label,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
        od.user?.name || od.user?.username || 'OneDrive'
      ),
      h('div', { style:{ fontSize:10, color:UI.label3 } },
        od.syncing ? 'Uploading…'
        : !navigator.onLine ? `Offline · ${od.pending} queued`
        : od.pending > 0 ? `${od.pending} pending`
        : `Synced`
      ),
    ),
    od.pending > 0 && !od.syncing && h('button', {
      onClick: od.triggerSync,
      style:{ fontSize:12, color:UI.blue, background:'none', border:'none',
        cursor:'pointer', fontWeight:700, flexShrink:0 },
    }, '↑ Upload'),
    h('button', {
      onClick: od.signOut,
      style:{ fontSize:10, color:UI.label4, background:'none', border:'none',
        cursor:'pointer', flexShrink:0 },
    }, 'Sign out'),
  );
}

// ── ObservationTool ─────────────────────────────────────────────────────────────
// The main visit inspection screen.
function ObservationTool({ proj, visit, onBack, onSaveVisit, dark, toggleTheme, od }) {
  // Drawing pages — from uploaded PDFs, or placeholder sheets
  const rawPages = visit?.drawings ? visit.drawings.flatMap(d =>
    d.pages.map(p => ({
      ...p,
      idbKey:       d.idbKey || null,
      thumbnailUrl: p.pageNum === 1 ? (d.thumbnailUrl || null) : null,
    }))
  ) : [];
  const hasRealDrawings = rawPages.length > 0;
  const pages = hasRealDrawings
    ? rawPages.map(p => ({
        id:           `pg-${p.pageNum}-${p.label}`,
        label:        p.label,
        imageDataUrl: p.imageDataUrl || null,   // backward-compat with old visits
        idbKey:       p.idbKey       || null,
        pageNum:      p.pageNum,
        thumbnailUrl: p.thumbnailUrl || null,
      }))
    : [
        { id:'S-101', label:'S-101 — Foundation Plan',  imageDataUrl:null, idbKey:null, pageNum:null, thumbnailUrl:null },
        { id:'S-201', label:'S-201 — Framing Plan L1',  imageDataUrl:null, idbKey:null, pageNum:null, thumbnailUrl:null },
        { id:'S-301', label:'S-301 — Sections A–D',     imageDataUrl:null, idbKey:null, pageNum:null, thumbnailUrl:null },
      ];

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentSheetId, setCurrentSheetId] = useStateOT(pages[0]?.id || 'S-101');
  const [observations,   setObservations]   = useStateOT(visit ? [...visit.observations] : []);
  const [selectedObs,    setSelectedObs]    = useStateOT(null);
  const [addMode,        setAddMode]        = useStateOT(false);
  const [pendingPin,     setPendingPin]     = useStateOT(null);
  const [activeView,     setActiveView]     = useStateOT('drawing');
  const [dirOverlay,     setDirOverlay]     = useStateOT(null);
  const [pendingDir,     setPendingDir]     = useStateOT(0);
  const [showSidePanel,  setShowSidePanel]  = useStateOT(true);
  const [saveFlash,      setSaveFlash]      = useStateOT(false);
  const [sidePanelTab,   setSidePanelTab]   = useStateOT('pages');
  const [bookmarks,      setBookmarks]      = useStateOT([]);
  const [pencilMode,     setPencilMode]     = useStateOT(false);
  const [pencilColor,    setPencilColor]    = useStateOT('#FF3B30');
  const [pencilStrokes,  setPencilStrokes]  = useStateOT(visit?.pencilStrokes || {});
  const [liveStroke,     setLiveStroke]     = useStateOT(null);
  const [markupTool,     setMarkupTool]     = useStateOT(null);
  const [markupShapes,   setMarkupShapes]   = useStateOT([]);
  const [dimInputShape,  setDimInputShape]  = useStateOT(null);
  const [dimLabel,       setDimLabel]       = useStateOT('');
  const [zoomLevel,      setZoomLevel]      = useStateOT(1);
  const [areaSize,       setAreaSize]       = useStateOT({ w:800, h:533 });
  const [contacts,       setContacts]       = useStateOT(visit?.contacts || []);
  const [pendingPhoto,   setPendingPhoto]   = useStateOT(null);
  const [reportDone,     setReportDone]     = useStateOT(false);

  // On-demand PDF page rendering
  const [renderedPageUrl, setRenderedPageUrl] = useStateOT(null);
  const renderCacheRef = useRefOT({});

  // Voice note state
  const [vnRec,   setVnRec]   = useStateOT(false);
  const [vnEl,    setVnEl]    = useStateOT(0);
  const vnMrRef   = useRefOT(null);
  const vnTimRef  = useRefOT(null);
  const [convMr,  setConvMr]  = useStateOT(null);
  const [convEl,  setConvEl]  = useStateOT(0);
  const convTimRef = useRefOT(null);

  // Superintendent name
  const superKey = SUPER_KEY(proj.id);
  const [superName, setSuperName] = useStateOT(() => {
    try { return localStorage.getItem(superKey) || ''; } catch { return ''; }
  });
  const [showSuperInput, setShowSuperInput] = useStateOT(!superName);

  const drawingAreaRef = useRefOT(null);
  const fileInputRef   = useRefOT(null);

  // Blank observation form
  const BLANK = {
    severity:'conforming', category:'General', note:'', hasPhoto:false,
    direction:0, photoDataUrl:null, photoTimestamp:null, photoIdbKey:null, photoODUrl:null,
    photos:[], voiceNote:null, voiceDuration:null,
    superEnabled:false, superResponse:'', recordConv:false,
    convRecording:false, convUrl:null, convElapsed:0,
  };
  const [form, setForm] = useStateOT({ ...BLANK });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Resize observer for drawing area
  useEffectOT(() => {
    if (!drawingAreaRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setAreaSize({ w: width, h: height });
    });
    ro.observe(drawingAreaRef.current);
    return () => ro.disconnect();
  }, []);

  // Listen for OD photo upload events
  useEffectOT(() => {
    const handler = e => {
      const { obsId, url } = e.detail;
      setObservations(prev =>
        prev.map(o => o.photoIdbKey === obsId ? { ...o, photoODUrl: url } : o)
      );
    };
    window.addEventListener('od-photo-uploaded', handler);
    return () => window.removeEventListener('od-photo-uploaded', handler);
  }, []);

  // Upload legacy drawing pages (imageDataUrl) to OneDrive when signed in
  useEffectOT(() => {
    if (!od?.signedIn || !pages || pages.length === 0) return;
    const san = s => s.replace(/[/\\?%*:|"<>]/g, '-').trim();
    pages.forEach(pg => {
      if (!pg.imageDataUrl) return; // new PDF format has no per-page imageDataUrl
      const remotePath = `FieldStruct/${san(proj.name)}/${san(visit.date)}/Drawings/${san(pg.label)}.jpg`;
      fetch(pg.imageDataUrl).then(r => r.blob()).then(blob => uploadToOD(blob, remotePath)).catch(() => {});
    });
  }, [od?.signedIn]);

  // ── Camera / photo flow ────────────────────────────────────────────────────
  function openCamera() {
    fileInputRef.current?.click();
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const dataUrl = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res(ev.target.result);
      reader.readAsDataURL(file);
    });
    const key  = `${visit.id}-${uid()}-${Date.now()}`;
    const blob = await (await fetch(dataUrl)).blob();
    await savePhotoLocally(key, blob);
    const newPhoto = {
      idbKey: key, dataUrl, odUrl: null,
      timestamp: ts(), direction: form.direction,
    };
    setForm(p => ({ ...p, photos: [...(p.photos || []), newPhoto], hasPhoto: true }));
    // Queue for OneDrive
    if (od?.signedIn) {
      queuePhotoUpload({ obsId: key, projName: proj.name, visitDate: visit.date, blob });
    }
  }

  // ── Voice recording ────────────────────────────────────────────────────────
  async function startVn() {
    try {
      const mr = await startRecording((url) => {
        f('voiceNote', url);
        setVnRec(false);
        clearInterval(vnTimRef.current);
        setVnEl(0);
      });
      vnMrRef.current = mr;
      setVnRec(true);
      setVnEl(0);
      vnTimRef.current = setInterval(() => setVnEl(p => p + 1), 1000);
    } catch {}
  }
  function stopVn() { vnMrRef.current?.stop(); }

  async function startConv() {
    try {
      const mr = await startRecording((url) => {
        f('convUrl', url);
        f('convRecording', false);
        clearInterval(convTimRef.current);
        setConvEl(0);
      });
      setConvMr(mr);
      f('convRecording', true);
      setConvEl(0);
      convTimRef.current = setInterval(() => setConvEl(p => p + 1), 1000);
    } catch {}
  }
  function stopConv() { convMr?.stop(); }

  // ── Save observation ───────────────────────────────────────────────────────
  async function saveObs() {
    if (!pendingPin || !form.note) return;
    const obsId = `${visit.id}-obs-${observations.length + 1}`;
    const newObs = {
      id: observations.length + 1,
      x: pendingPin.x, y: pendingPin.y,
      drawing: currentSheetId,
      ...form,
      superName: form.superEnabled ? (superName || null) : null,
      superTime: form.superEnabled && form.superResponse ? ts() : null,
      time: ts(),
      contacts: [...contacts],
    };
    setObservations(prev => [...prev, newObs]);
    setPendingPin(null);
    setAddMode(false);
    setForm({ ...BLANK });
  }

  // ── Save visit ─────────────────────────────────────────────────────────────
  function saveVisit() {
    const updated = {
      ...visit,
      observations,
      contacts,
      pencilStrokes,
      obsCount:  observations.length,
      critCount: observations.filter(o => o.severity === 'critical').length,
    };
    onSaveVisit(updated);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1800);
  }

  // ── Pin placement ──────────────────────────────────────────────────────────
  function handleDrawingClick(e) {
    if (!addMode) return;
    if (markupTool || pencilMode) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setPendingDir(0);
    setDirOverlay({ x, y });
  }

  // ── Markup drawing ─────────────────────────────────────────────────────────
  const [drawStart, setDrawStart] = useStateOT(null);
  const [liveShape, setLiveShape] = useStateOT(null);

  function handleMarkupDown(e) {
    if (!markupTool) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setDrawStart({ x, y });
  }
  function handleMarkupMove(e) {
    if (!markupTool || !drawStart) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setLiveShape({ id:'live', type:markupTool, sheetId:currentSheetId,
      x1:drawStart.x, y1:drawStart.y, x2:x, y2:y, color:MARKUP_COLORS[markupTool], text:'' });
  }
  function handleMarkupUp(e) {
    if (!markupTool || !drawStart) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    const newShape = { id:uid(), type:markupTool, sheetId:currentSheetId,
      x1:drawStart.x, y1:drawStart.y, x2:x, y2:y, color:MARKUP_COLORS[markupTool], text:'' };
    if (markupTool === 'dimension') {
      setDimInputShape(newShape);
    } else {
      setMarkupShapes(prev => [...prev, newShape]);
    }
    setDrawStart(null);
    setLiveShape(null);
  }

  // ── Pencil drawing ─────────────────────────────────────────────────────────
  function handlePenDown(e) {
    if (!pencilMode || e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    const w = e.pressure ? Math.max(1, e.pressure * 5) : 2.5;
    setLiveStroke({ points:[{ x, y }], color:pencilColor, width:w });
  }
  function handlePenMove(e) {
    if (!pencilMode || !liveStroke) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setLiveStroke(prev => ({ ...prev, points:[...prev.points, { x, y }] }));
  }
  function handlePenUp() {
    if (!liveStroke) return;
    setPencilStrokes(prev => ({
      ...prev,
      [currentSheetId]: [...(prev[currentSheetId] || []), liveStroke],
    }));
    setLiveStroke(null);
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const currentPage     = pages.find(p => p.id === currentSheetId) || pages[0];
  const currentShapes   = markupShapes.filter(s => s.sheetId === currentSheetId);
  const currentStrokes  = pencilStrokes[currentSheetId] || [];
  const currentObs      = observations.filter(o => o.drawing === currentSheetId);

  // Render the current PDF page on-demand from IndexedDB
  // (placed after currentPage is computed so the dependency values are available)
  useEffectOT(() => {
    if (!currentPage?.idbKey) {
      setRenderedPageUrl(null);
      return;
    }
    const cacheKey = `${currentPage.idbKey}:${currentPage.pageNum}`;
    if (renderCacheRef.current[cacheKey]) {
      setRenderedPageUrl(renderCacheRef.current[cacheKey]);
      return;
    }
    let cancelled = false;
    setRenderedPageUrl(null);
    (async () => {
      try {
        const buf = await getDrawingPDF(currentPage.idbKey);
        if (cancelled || !buf) return;
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf instanceof ArrayBuffer ? buf : buf) }).promise;
        if (cancelled) return;
        const page = await doc.getPage(currentPage.pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (cancelled) return;
        const url = canvas.toDataURL('image/jpeg', 0.9);
        renderCacheRef.current[cacheKey] = url;
        setRenderedPageUrl(url);
      } catch (e) {
        console.warn('PDF render error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage?.idbKey, currentPage?.pageNum]);

  // Blueprint SVG placeholder (when no drawing image)
  function blueprintSVG() {
    return h('svg', { width:'100%', height:'100%', style:{ position:'absolute', inset:0 },
      xmlns:'http://www.w3.org/2000/svg' },
      h('rect', { width:'100%', height:'100%', fill:'#0a2040' }),
      // Grid pattern
      h('defs', null,
        h('pattern', { id:'smallGrid', width:30, height:30, patternUnits:'userSpaceOnUse' },
          h('path', { d:'M 30 0 L 0 0 0 30', fill:'none', stroke:'rgba(255,255,255,0.06)', strokeWidth:0.5 })
        ),
        h('pattern', { id:'grid', width:120, height:120, patternUnits:'userSpaceOnUse' },
          h('rect', { width:120, height:120, fill:'url(#smallGrid)' }),
          h('path', { d:'M 120 0 L 0 0 0 120', fill:'none', stroke:'rgba(255,255,255,0.12)', strokeWidth:1 })
        ),
      ),
      h('rect', { width:'100%', height:'100%', fill:'url(#grid)' }),
      h('rect', { x:20, y:20, width:'calc(100% - 40px)', height:'calc(100% - 40px)',
        fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 }),
      // Sheet label
      h('text', { x:'50%', y:'94%', textAnchor:'middle', fill:'rgba(255,255,255,0.25)',
        fontSize:12, fontFamily:'monospace' }, currentPage?.label || 'No Drawing'),
    );
  }

  const showDrawingView = activeView === 'drawing';
  const showRightPanel  = pendingPin || selectedObs;

  return h('div', { style:{ height:'100vh', background:UI.bg, display:'flex', flexDirection:'column', overflow:'hidden' } },

    // ── Navbar ─────────────────────────────────────────────────────────────────
    h('div', { className:'glass', style:{ height:52, display:'flex', alignItems:'center', padding:'0 12px', gap:10, borderBottom:`0.5px solid ${UI.sep}`, flexShrink:0 } },
      h(BackButton, { label:'Back', onClick:onBack }),
      h('div', { style:{ width:1, height:20, background:UI.sep } }),
      h('div', { style:{ flex:1, fontSize:14, fontWeight:600, color:UI.label,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
        currentPage?.label || 'Drawing'
      ),
      // Obs badges
      h('div', { style:{ display:'flex', gap:6 } },
        h('div', { style:{ fontSize:12, color:UI.label3 } },
          `${observations.length} obs`
        ),
        observations.filter(o => o.severity === 'critical').length > 0 && h(Chip, {
          label:`${observations.filter(o => o.severity === 'critical').length} critical`, tone:'red',
        }),
      ),
      // View switcher
      h('div', { className:'seg' },
        [
          { key:'drawing', label:'Drawing' },
          { key:'log',     label:'Log'     },
          { key:'report',  label:'Report'  },
        ].map(v => h('button', {
          key: v.key,
          onClick: () => setActiveView(v.key),
          className: `seg-item${activeView === v.key ? ' active' : ''}`,
        }, v.label))
      ),
      // Theme toggle
      h('button', {
        onClick: toggleTheme,
        style:{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:4 },
      }, dark ? '☀️' : '🌙'),
      // Save button
      h('button', {
        onClick: saveVisit,
        className: 'pressable',
        style:{
          padding:'7px 16px', borderRadius:8, fontSize:14, fontWeight:600,
          background: saveFlash ? 'rgba(52,199,89,0.12)' : UI.blue,
          color: saveFlash ? UI.green : 'white', border: saveFlash ? `1px solid rgba(52,199,89,0.3)` : 'none',
          transition:'all 0.3s',
        },
      }, saveFlash ? '✓ Saved' : 'Save'),
    ),

    // ── Main content area ──────────────────────────────────────────────────────
    h('div', { style:{ flex:1, display:'flex', overflow:'hidden' } },

      // Left tool sidebar (44px)
      showDrawingView && h('div', {
        style:{
          width:44, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center',
          paddingTop:8, gap:4, borderRight:`0.5px solid ${UI.sep}`, background:UI.surface,
        },
      },
        // Pages button
        h('button', {
          onClick: () => { setShowSidePanel(p => !p); setSidePanelTab('pages'); },
          title:'Pages',
          style:{
            width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:14,
            background: showSidePanel && sidePanelTab === 'pages' ? UI.blue : 'none',
            color:      showSidePanel && sidePanelTab === 'pages' ? 'white' : UI.label3,
          },
        }, '⊞'),
        // Bookmarks button
        h('button', {
          onClick: () => { setShowSidePanel(p => !p); setSidePanelTab('bookmarks'); },
          title:'Bookmarks',
          style:{
            width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:14,
            background: showSidePanel && sidePanelTab === 'bookmarks' ? UI.blue : 'none',
            color:      showSidePanel && sidePanelTab === 'bookmarks' ? 'white' : UI.label3,
          },
        }, '🔖'),
        h('div', { style:{ width:24, height:1, background:UI.sep, margin:'4px 0' } }),
        // Markup tools
        ...['cloud','rect','circle','dimension'].map(tool =>
          h('button', {
            key: tool,
            onClick: () => { setMarkupTool(markupTool === tool ? null : tool); setPencilMode(false); },
            title: tool.charAt(0).toUpperCase() + tool.slice(1),
            style:{
              width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              background: markupTool === tool ? MARKUP_COLORS[tool] : 'none',
              color: markupTool === tool ? 'white' : UI.label3,
            },
          }, tool === 'cloud' ? '☁' : tool === 'rect' ? '▭' : tool === 'circle' ? '⬭' : '↔')
        ),
        h('div', { style:{ width:24, height:1, background:UI.sep, margin:'4px 0' } }),
        // Pencil tool
        h('button', {
          onClick: () => { setPencilMode(p => !p); setMarkupTool(null); },
          title:'Pencil', style:{
            width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:14,
            background: pencilMode ? pencilColor : 'none',
            color: pencilMode ? 'white' : UI.label3,
          },
        }, '✏️'),
        // Pencil color pickers
        pencilMode && ['#FF3B30','#007AFF','#1C1C1E'].map(c =>
          h('button', {
            key:c, onClick:()=>setPencilColor(c),
            style:{
              width:22, height:22, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
              boxShadow: pencilColor===c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
              margin:'2px auto', display:'block',
            },
          })
        ),
        // Pencil undo
        pencilMode && (currentStrokes.length > 0) && h('button', {
          onClick:()=>setPencilStrokes(prev=>({...prev,[currentSheetId]:prev[currentSheetId].slice(0,-1)})),
          title:'Undo', style:{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer',
            fontSize:12, background:'rgba(255,59,48,0.08)', color:UI.red },
        }, '↩'),
        // Clear markups
        currentShapes.length > 0 && h('button', {
          onClick:()=>setMarkupShapes(prev=>prev.filter(s=>s.sheetId!==currentSheetId)),
          title:'Clear markups', style:{ width:32, height:32, borderRadius:8, border:'none',
            cursor:'pointer', fontSize:14, color:UI.label4 },
        }, '🗑'),
      ),

      // Pages / Bookmarks panel (260px)
      showDrawingView && showSidePanel && h('div', {
        style:{
          width:260, flexShrink:0, borderRight:`0.5px solid ${UI.sep}`,
          background:UI.bg3, display:'flex', flexDirection:'column', overflow:'hidden',
        },
      },
        sidePanelTab === 'pages'
          ? h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:12 } },
              h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } },
                pages.map((pg, i) => {
                  const sel = pg.id === currentSheetId;
                  const cnt = observations.filter(o => o.drawing === pg.id).length;
                  return h('div', {
                    key: pg.id,
                    onClick: () => setCurrentSheetId(pg.id),
                    style:{
                      cursor:'pointer', borderRadius:10, overflow:'hidden',
                      aspectRatio:'1/1.41',
                      border: sel ? `2px solid ${UI.blue}` : `1.5px solid ${UI.sep}`,
                      position:'relative', background:UI.surface,
                      boxShadow: sel ? `0 0 0 3px rgba(0,122,255,0.2)` : 'none',
                    },
                  },
                    (pg.imageDataUrl || pg.thumbnailUrl)
                      ? h('img', { src:pg.imageDataUrl || pg.thumbnailUrl, alt:'', style:{ width:'100%', height:'100%', objectFit:'cover' } })
                      : h('div', { style:{ width:'100%', height:'100%', background:'#0a2040',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 } }, '📐'),
                    h('div', { style:{ position:'absolute', bottom:0, left:0, right:0,
                      background:'rgba(0,0,0,0.5)', padding:'3px 5px' } },
                      h('div', { style:{ fontSize:9, color:'white',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, pg.label)
                    ),
                    cnt > 0 && h('div', {
                      style:{
                        position:'absolute', top:4, right:4,
                        width:18, height:18, borderRadius:'50%',
                        background:UI.blue, color:'white',
                        fontSize:10, fontWeight:700,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      },
                    }, cnt),
                  );
                })
              )
            )
          : h('div', { className:'scroll', style:{ flex:1, overflowY:'auto', padding:12 } },
              bookmarks.length === 0
                ? h('div', { style:{ textAlign:'center', color:UI.label4, padding:'24px 0', fontSize:13 } }, 'No bookmarks')
                : bookmarks.map(b => h('div', {
                    key: b.id,
                    onClick: () => setCurrentSheetId(b.sheetId),
                    style:{ padding:'8px 10px', borderRadius:8, cursor:'pointer',
                      background: currentSheetId === b.sheetId ? UI.fill3 : 'none',
                      fontSize:13, color:UI.label, marginBottom:2 },
                  }, b.label)),
              h('button', {
                onClick: () => {
                  const pg = pages.find(p => p.id === currentSheetId);
                  if (pg) setBookmarks(prev => [...prev, { id:uid(), sheetId:pg.id, label:pg.label }]);
                },
                style:{ width:'100%', marginTop:8, padding:'8px', fontSize:12,
                  color:UI.blue, background:'none', border:'none', cursor:'pointer' },
              }, '+ Bookmark current sheet'),
            )
      ),

      // ── Main area ─────────────────────────────────────────────────────────────
      showDrawingView && h('div', { style:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' } },
        // Markup tool active banner
        markupTool && h('div', {
          style:{
            position:'absolute', top:0, left:0, right:0, zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'6px 12px', background:MARKUP_COLORS[markupTool],
            color:'white', fontSize:13, fontWeight:600,
          },
        },
          `${markupTool.charAt(0).toUpperCase() + markupTool.slice(1)} tool active — drag to draw`,
          h('button', {
            onClick:()=>setMarkupTool(null),
            style:{ color:'white', background:'rgba(255,255,255,0.2)', border:'none',
              borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, fontWeight:600 },
          }, 'Done'),
        ),

        // Add-mode hint
        addMode && !pendingPin && !markupTool && h('div', {
          style:{
            position:'absolute', bottom:70, left:'50%', transform:'translateX(-50%)', zIndex:10,
            background:'rgba(0,0,0,0.7)', color:'white', borderRadius:10,
            padding:'8px 16px', fontSize:14, fontWeight:500, pointerEvents:'none',
          },
        }, 'Tap the drawing to place a pin'),

        // Drawing canvas
        h('div', {
          ref: drawingAreaRef,
          onMouseDown:  markupTool ? handleMarkupDown : handleDrawingClick,
          onMouseMove:  markupTool ? handleMarkupMove : undefined,
          onMouseUp:    markupTool ? handleMarkupUp   : undefined,
          onPointerDown: pencilMode ? handlePenDown  : undefined,
          onPointerMove: pencilMode ? handlePenMove  : undefined,
          onPointerUp:   pencilMode ? handlePenUp    : undefined,
          style:{
            flex:1, position:'relative', overflow:'hidden',
            cursor: addMode && !markupTool ? 'crosshair' : markupTool ? 'crosshair' : pencilMode ? 'crosshair' : 'default',
          },
        },
          // Background: rendered PDF page, legacy imageDataUrl, loading state, or blueprint placeholder
          (() => {
            const bgUrl = renderedPageUrl || currentPage?.imageDataUrl;
            if (bgUrl) {
              return h('img', { src:bgUrl, alt:'', style:{ width:'100%', height:'100%', objectFit:'contain', display:'block' } });
            }
            if (currentPage?.idbKey && !renderedPageUrl) {
              // PDF is stored in IDB but not yet rendered — show loading overlay on top of blueprint
              return h('div', { style:{ position:'absolute', inset:0 } },
                blueprintSVG(),
                h('div', {
                  style:{
                    position:'absolute', inset:0, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:10,
                    background:'rgba(10,32,64,0.75)',
                  },
                },
                  h('div', {
                    style:{
                      width:28, height:28, border:'3px solid rgba(255,255,255,0.2)',
                      borderTopColor:'white', borderRadius:'50%',
                      animation:'spin 0.8s linear infinite',
                    },
                  }),
                  h('div', { style:{ color:'rgba(255,255,255,0.5)', fontSize:13 } }, 'Loading drawing…'),
                )
              );
            }
            return blueprintSVG();
          })(),

          // SVG overlay layer
          h('svg', {
            width:'100%', height:'100%',
            style:{ position:'absolute', inset:0, overflow:'visible' },
            viewBox:`0 0 ${areaSize.w} ${areaSize.h}`,
          },
            // Markup shapes for current sheet
            h(MarkupErrorBoundary, null,
              currentShapes.map(s => renderMarkupShape(s, areaSize.w, areaSize.h)),
              liveShape && renderMarkupShape(liveShape, areaSize.w, areaSize.h, true),
            ),
            // Pencil strokes
            ...currentStrokes.map((stroke, si) => {
              const pts = stroke.points;
              const d = pts.reduce((acc, pt, i) =>
                i === 0 ? `M ${pt.x/100*areaSize.w} ${pt.y/100*areaSize.h}`
                        : `${acc} L ${pt.x/100*areaSize.w} ${pt.y/100*areaSize.h}`
              , '');
              return h('path', { key:'ps'+si, d, fill:'none',
                stroke:stroke.color, strokeWidth:stroke.width||2.5, strokeLinecap:'round', strokeLinejoin:'round' });
            }),
            // Live pencil stroke
            liveStroke && (() => {
              const pts = liveStroke.points;
              const d = pts.reduce((acc, pt, i) =>
                i === 0 ? `M ${pt.x/100*areaSize.w} ${pt.y/100*areaSize.h}`
                        : `${acc} L ${pt.x/100*areaSize.w} ${pt.y/100*areaSize.h}`
              , '');
              return h('path', { key:'ls', d, fill:'none',
                stroke:liveStroke.color, strokeWidth:liveStroke.width||2.5, strokeLinecap:'round', strokeLinejoin:'round' });
            })(),
            // Observation pins
            ...currentObs.map(o =>
              h('g', {
                key: o.id,
                transform:`translate(${o.x/100*areaSize.w},${o.y/100*areaSize.h})`,
              },
                h(CameraCone, {
                  obs: o, size:24,
                  selected: selectedObs?.id === o.id,
                  onClick: () => setSelectedObs(selectedObs?.id === o.id ? null : o),
                })
              )
            ),
            // Pending pin preview
            pendingPin && h('g', {
              transform:`translate(${pendingPin.x/100*areaSize.w},${pendingPin.y/100*areaSize.h})`,
            },
              h('circle', { r:16, fill:`${UI.blue}22`, stroke:UI.blue, strokeWidth:2, strokeDasharray:'4 2' }),
            ),
          ),

          // Compass mini (bottom-right of drawing area)
          h('div', {
            style:{
              position:'absolute', bottom:12, right:showRightPanel ? 12 : 12,
              width:36, height:36, borderRadius:18,
              background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
            },
          },
            h('svg', { width:24, height:24, viewBox:'0 0 24 24' },
              h('circle', { cx:12, cy:12, r:11, fill:'none', stroke:UI.sep, strokeWidth:1 }),
              h('text', { x:12, y:9, textAnchor:'middle', fontSize:8, fontWeight:700, fill:UI.red }, 'N'),
              h('circle', { cx:12, cy:12, r:2, fill:UI.label4 }),
            )
          ),

          // Zoom controls
          h('div', {
            style:{
              position:'absolute', bottom:12, right:56,
              display:'flex', alignItems:'center', gap:4,
              background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)',
              borderRadius:10, padding:'4px 6px',
              boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
            },
          },
            h('button', {
              onClick:()=>setZoomLevel(p=>Math.max(0.25,p-0.25)),
              style:{width:22,height:22,borderRadius:6,border:'none',cursor:'pointer',
                background:UI.fill3,fontSize:14,fontWeight:700,color:UI.label},
            },'-'),
            h('div', { style:{ fontSize:11, fontWeight:600, color:UI.label3, minWidth:36, textAlign:'center' } },
              `${Math.round(zoomLevel*100)}%`
            ),
            h('button', {
              onClick:()=>setZoomLevel(p=>Math.min(4,p+0.25)),
              style:{width:22,height:22,borderRadius:6,border:'none',cursor:'pointer',
                background:UI.fill3,fontSize:14,fontWeight:700,color:UI.label},
            },'+'),
          ),

          // ObsTooltip (floating)
          selectedObs && !pendingPin && h(ObsTooltip, {
            o: selectedObs,
            onClose: () => setSelectedObs(null),
          }),
        ),

        // Bottom bar
        h('div', {
          style:{
            height:56, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0 16px', borderTop:`0.5px solid ${UI.sep}`,
            background:UI.surface, flexShrink:0,
          },
        },
          addMode
            ? h(React.Fragment, null,
                h('button', {
                  onClick:()=>{ setAddMode(false); setPendingPin(null); },
                  className:'btn-secondary pressable', style:{ padding:'9px 18px' },
                }, 'Cancel'),
                h('div', { style:{ fontSize:13, color:UI.label3 } }, 'Tap drawing to place pin'),
              )
            : h('button', {
                onClick:()=>setAddMode(true),
                className:'btn-primary pressable',
                style:{ padding:'9px 24px', fontSize:15 },
              }, '+ Add Observation'),
        ),
      ),

      // Right detail panel (360px)
      showDrawingView && showRightPanel && h('div', {
        style:{
          width:360, flexShrink:0, borderLeft:`0.5px solid ${UI.sep}`,
          background:UI.surface, overflow:'hidden',
        },
      },
        pendingPin
          ? h(AddPanel, {
              obs: observations, form, f, BLANK, pin: pendingPin,
              setPin: setPendingPin, setAddMode, setForm,
              setDirOverlay, setPendingDir,
              saveObs, openCamera,
              pendingPhoto, setPendingPhoto,
              vnRec, vnEl, startVn, stopVn,
              startConv, stopConv,
              superName, setSuperNameMode: setShowSuperInput,
              contacts, setContacts,
            })
          : selectedObs && h(ObsTooltip, { o: selectedObs, onClose:()=>setSelectedObs(null), inline:true }),
      ),

      // Log and Report views
      activeView === 'log'    && h(LogPanel, { obs: observations }),
      activeView === 'report' && h(ReportPanel, { obs: observations, visit, proj, reportDone, setReportDone }),
    ),

    // Hidden file input for camera
    h('input', {
      ref: fileInputRef, type:'file', accept:'image/*', capture:'environment',
      onChange: handlePhoto, style:{ display:'none' },
    }),

    // ── Overlays ───────────────────────────────────────────────────────────────
    dirOverlay && h(DirOverlay, {
      pendingDir, setPendingDir,
      dirOverlay, setDirOverlay,
      setPin: setPendingPin,
      setForm, openCamera,
    }),

    // Dimension label input
    dimInputShape && h('div', {
      style:{ position:'fixed', inset:0, zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,0.4)' },
    },
      h('div', { className:'card-elevated scale-in', style:{ padding:'24px', width:320 } },
        h('div', { style:{ fontSize:15, fontWeight:700, color:UI.label, marginBottom:12 } }, 'Dimension Label'),
        h('input', {
          value:dimLabel, onChange:e=>setDimLabel(e.target.value),
          placeholder:'e.g. 6\'-0"', className:'sys-input', style:{ fontSize:15, marginBottom:16 },
          autoFocus:true,
        }),
        h('div', { style:{ display:'flex', gap:8 } },
          h('button', { onClick:()=>{ setDimInputShape(null); setDimLabel(''); },
            className:'btn-secondary pressable', style:{ flex:1, padding:'9px' } }, 'Cancel'),
          h('button', {
            onClick:()=>{
              setMarkupShapes(prev=>[...prev,{...dimInputShape,text:dimLabel}]);
              setDimInputShape(null); setDimLabel('');
            },
            className:'btn-primary pressable', style:{ flex:1, padding:'9px' },
          }, 'Add'),
        )
      )
    ),

    // Superintendent name input
    showSuperInput && h('div', {
      style:{ position:'fixed', inset:0, zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,0.4)' },
    },
      h('div', { className:'card-elevated scale-in', style:{ padding:'24px', width:320 } },
        h('div', { style:{ fontSize:15, fontWeight:700, color:UI.label, marginBottom:8 } }, 'Superintendent Name'),
        h('div', { style:{ fontSize:13, color:UI.label3, marginBottom:12 } },
          'Enter the superintendent\'s name for response tracking'
        ),
        h('input', {
          value: superName, onChange: e => setSuperName(e.target.value),
          placeholder:'e.g. Mike Flores', className:'sys-input', style:{ fontSize:15, marginBottom:16 },
          autoFocus:true,
        }),
        h('button', {
          onClick:()=>{
            try { localStorage.setItem(superKey, superName); } catch {}
            setShowSuperInput(false);
          },
          className:'btn-primary pressable',
          style:{ width:'100%', padding:'11px', fontSize:14 },
        }, 'Save'),
      )
    ),

    // OD status bar
    h(ODStatusBar, { od }),
  );
}
