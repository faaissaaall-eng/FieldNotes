// ─────────────────────────────────────────────────────────────────────────────
// NewVisitSetup.js — 2-step wizard: visit details + drawing upload (PDF → JPEG)
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateNV, useRef: useRefNV } = React;

function NewVisitSetup({ proj, onBack, onComplete }) {
  const [step,           setStep]    = useStateNV(1);
  const [form,           setForm]    = useStateNV({
    engineer:  'Abdul Hassan, P.E.',
    date:      ds(),
    time:      ts(),
    weather:   '',
    contractor:'',
    purpose:   '',
    location:  '',
    permit:    '',
    notes:     '',
  });
  const [drawings,       setDrawings]       = useStateNV([]);
  const [isRendering,    setIsRendering]    = useStateNV(false);
  const [renderProgress, setRenderProgress] = useStateNV({});
  const fileRef = useRefNV(null);

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  // ── PDF rendering ─────────────────────────────────────────────────────────
  async function handleFiles(fileList) {
    const pdfs = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length === 0) return;
    setIsRendering(true);

    for (const file of pdfs) {
      const drawingId = uid();
      const arrayBuf  = await file.arrayBuffer();
      const pdfDoc    = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages  = pdfDoc.numPages;
      const baseName  = file.name.replace(/\.pdf$/i, '');
      const pages     = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setRenderProgress(p => ({
          ...p,
          [drawingId]: { current: pageNum, total: numPages, name: baseName },
        }));
        const page     = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        pages.push({
          pageNum,
          label: numPages === 1 ? baseName : `${baseName} — Sheet ${pageNum}`,
          imageDataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width:  canvas.width,
          height: canvas.height,
        });
      }

      setDrawings(prev => [...prev, { id: drawingId, name: baseName, pageCount: numPages, pages }]);
      setRenderProgress(p => { const q = { ...p }; delete q[drawingId]; return q; });
    }
    setIsRendering(false);
  }

  function removeDrawing(id) {
    setDrawings(prev => prev.filter(d => d.id !== id));
  }

  // Step 1 — Visit details form
  const step1 = () => h('div', {
    className: 'scroll fade-in',
    style: { flex:1, overflowY:'auto', padding:'28px 40px 40px' },
  },
    h('div', { style:{ maxWidth:600, margin:'0 auto' } },
      h('h2', { className:'title-2', style:{ color:UI.label, marginBottom:6 } }, 'Visit Details'),
      h('p', { style:{ fontSize:14, color:UI.label3, marginBottom:28 } },
        `${proj.name} — Enter site visit information`
      ),
      // Visit Information group
      ...[
        { k:'engineer',   label:'Engineer',   placeholder:'Name, P.E.', type:'text' },
        { k:'date',       label:'Date',       placeholder:ds(),          type:'text' },
        { k:'time',       label:'Time',       placeholder:ts(),          type:'text' },
        { k:'weather',    label:'Weather',    placeholder:'e.g. Partly Cloudy, 72°F', type:'text' },
        { k:'location',   label:'Location',   placeholder:'e.g. Grid A-C Level 2',   type:'text' },
      ].map(field => h('div', {
        key: field.k,
        style:{ display:'flex', alignItems:'center', padding:'12px 0',
          borderBottom:`0.5px solid ${UI.sep}` },
      },
        h('label', { style:{ width:140, fontSize:14, color:UI.label3, flexShrink:0 } }, field.label),
        h('input', {
          value: form[field.k], onChange: e => setField(field.k, e.target.value),
          placeholder: field.placeholder,
          style:{ flex:1, background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label },
        })
      )),
      // Project Context group
      h('div', { style:{ height:16 } }),
      ...[
        { k:'contractor', label:'Contractor', placeholder:'Contractor name' },
        { k:'permit',     label:'Permit / Job #', placeholder:'BP-2026-XXXX' },
      ].map(field => h('div', {
        key: field.k,
        style:{ display:'flex', alignItems:'center', padding:'12px 0',
          borderBottom:`0.5px solid ${UI.sep}` },
      },
        h('label', { style:{ width:140, fontSize:14, color:UI.label3, flexShrink:0 } }, field.label),
        h('input', {
          value: form[field.k], onChange: e => setField(field.k, e.target.value),
          placeholder: field.placeholder,
          style:{ flex:1, background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label },
        })
      )),
      // Purpose textarea
      h('div', { style:{ padding:'12px 0', borderBottom:`0.5px solid ${UI.sep}` } },
        h('label', { style:{ fontSize:14, color:UI.label3, display:'block', marginBottom:6 } }, 'Purpose of Visit'),
        h('textarea', {
          value: form.purpose, onChange: e => setField('purpose', e.target.value),
          rows: 3, placeholder:'Describe the purpose of this inspection…',
          style:{ width:'100%', background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label, resize:'none' },
        })
      ),
      // Notes textarea
      h('div', { style:{ padding:'12px 0' } },
        h('label', { style:{ fontSize:14, color:UI.label3, display:'block', marginBottom:6 } }, 'Additional Notes (optional)'),
        h('textarea', {
          value: form.notes, onChange: e => setField('notes', e.target.value),
          rows: 2, placeholder:'Any pre-visit notes…',
          style:{ width:'100%', background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label, resize:'none' },
        })
      ),
      // Next button
      h('div', { style:{ marginTop:28, display:'flex', justifyContent:'flex-end' } },
        h('button', {
          onClick: () => setStep(2),
          disabled: !form.engineer || !form.date,
          className: 'btn-primary pressable',
          style:{ padding:'12px 28px', fontSize:15 },
        }, 'Continue to Drawings →')
      )
    )
  );

  // Step 2 — Drawing upload
  const step2 = () => h('div', {
    className: 'scroll fade-in',
    style: { flex:1, overflowY:'auto', padding:'28px 40px 40px' },
  },
    h('div', { style:{ maxWidth:760, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 } },
      // Drop zone
      h('div', {
        onDrop: e => { e.preventDefault(); handleFiles(e.dataTransfer.files); },
        onDragOver: e => e.preventDefault(),
        onClick: () => !isRendering && fileRef.current?.click(),
        style:{
          border:`2px dashed ${isRendering ? UI.blue : UI.label4}`,
          borderRadius:16, padding:'40px 32px', textAlign:'center',
          cursor: isRendering ? 'not-allowed' : 'pointer',
          background: isRendering ? 'rgba(0,122,255,0.04)' : UI.surface,
          transition:'all 0.2s',
        },
      },
        h('input', {
          ref: fileRef, type:'file', accept:'.pdf,application/pdf', multiple:true,
          onChange: e => handleFiles(e.target.files),
          style:{ display:'none' },
        }),
        h('div', { style:{ fontSize:40, marginBottom:12 } }, isRendering ? '⏳' : '📄'),
        h('div', { style:{ fontSize:17, fontWeight:600, color:UI.label, marginBottom:6 } },
          isRendering ? 'Processing PDFs…' : 'Upload Structural Drawings'
        ),
        h('div', { style:{ fontSize:14, color:UI.label3 } },
          isRendering ? 'Converting pages to images…'
                      : 'Drag PDF files here, or tap to browse'
        ),
      ),

      // Progress bars
      ...Object.entries(renderProgress).map(([id, prog]) =>
        h('div', { key:id, className:'card', style:{ padding:'14px 16px' } },
          h('div', { style:{ fontSize:13, fontWeight:600, color:UI.label, marginBottom:8 } },
            `${prog.name} — Page ${prog.current} of ${prog.total}`
          ),
          h('div', { style:{ height:4, borderRadius:2, background:UI.fill3, overflow:'hidden' } },
            h('div', {
              style:{
                height:'100%', background:UI.blue, borderRadius:2,
                width:`${(prog.current / prog.total) * 100}%`,
                transition:'width 0.3s ease',
              },
            })
          )
        )
      ),

      // Ready drawings list
      ...drawings.map(d => h('div', { key:d.id, className:'card', style:{ padding:'12px 14px' } },
        h('div', { style:{ display:'flex', alignItems:'center', gap:12 } },
          // Thumbnail
          d.pages[0]?.imageDataUrl && h('img', {
            src: d.pages[0].imageDataUrl,
            style:{ width:48, height:48, objectFit:'cover', borderRadius:6, flexShrink:0 },
          }),
          h('div', { style:{ flex:1 } },
            h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label } }, d.name),
            h('div', { style:{ fontSize:12, color:UI.label3, marginTop:2 } },
              `${d.pageCount} page${d.pageCount !== 1 ? 's' : ''}`
            ),
          ),
          h(Chip, { label:'Ready', tone:'green' }),
          h('button', {
            onClick: () => removeDrawing(d.id),
            style:{ marginLeft:8, fontSize:18, color:UI.label4, background:'none', border:'none', cursor:'pointer' },
          }, '×')
        )
      )),

      // Action buttons
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 } },
        h('button', {
          onClick: () => onComplete({ info: form, drawings: [] }),
          style:{ fontSize:14, color:UI.label3, background:'none', border:'none', cursor:'pointer' },
        }, 'Skip drawings'),
        drawings.length > 0 && h('button', {
          onClick: () => onComplete({ info: form, drawings }),
          className: 'btn-primary pressable',
          style:{ padding:'12px 28px', fontSize:15 },
        }, 'Start Site Visit →'),
      )
    )
  );

  // Step indicator helper
  function stepCircle(n, label) {
    const active = step === n, done = step > n;
    return h('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 } },
      h('div', {
        style:{
          width:28, height:28, borderRadius:'50%',
          background: active ? UI.blue : done ? UI.green : UI.fill3,
          color: (active || done) ? 'white' : UI.label3,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700,
        },
      }, done ? '✓' : n),
      h('div', { style:{ fontSize:11, color: active ? UI.blue : UI.label4 } }, label),
    );
  }

  return h('div', { style:{ height:'100vh', background:UI.bg, display:'flex', flexDirection:'column', overflow:'hidden' } },
    // Navbar
    h('div', { className:'glass', style:{ height:52, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:`0.5px solid ${UI.sep}`, flexShrink:0 } },
      h(BackButton, { label:'Back', onClick:onBack }),
      h('div', { style:{ flex:1, textAlign:'center', fontSize:15, fontWeight:600, color:UI.label } },
        'New Site Visit'
      ),
    ),
    // Step indicator
    h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, padding:'16px', borderBottom:`0.5px solid ${UI.sep}`, flexShrink:0 } },
      stepCircle(1, 'Visit Details'),
      h('div', { style:{ width:80, height:1, background: step > 1 ? UI.green : UI.sep, margin:'0 8px', marginBottom:20 } }),
      stepCircle(2, 'Drawings'),
    ),
    // Step content
    step === 1 ? step1() : step2(),
  );
}
