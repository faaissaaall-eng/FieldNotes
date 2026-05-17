// ─────────────────────────────────────────────────────────────────────────────
// NewVisitSetup.js — 2-step wizard: visit details + PDF drawing upload
// PDFs are stored as raw ArrayBuffers in IndexedDB — no image conversion.
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateNV, useRef: useRefNV } = React;

function NewVisitSetup({ proj, onBack, onComplete }) {
  const [step,      setStep]     = useStateNV(1);
  const [form,      setForm]     = useStateNV({
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
  const [drawings,  setDrawings] = useStateNV([]);
  // uploading: null | { name, pct, total, loaded }
  const [uploading, setUploading] = useStateNV(null);
  const cancelRef  = useRefNV(false);
  const fileRef    = useRefNV(null);

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  // ── PDF handling — keep as raw PDF, no image conversion ───────────────────
  async function handleFiles(fileList) {
    const pdfs = Array.from(fileList).filter(
      f => f.type === 'application/pdf' || f.name.endsWith('.pdf')
    );
    if (!pdfs.length) return;

    cancelRef.current = false;

    for (const file of pdfs) {
      if (cancelRef.current) break;

      const drawingId = uid();
      const baseName  = file.name.replace(/\.pdf$/i, '');
      const idbKey    = `pdf-${drawingId}`;

      // ── Phase 1: read file with progress (0 → 60%) ──────────────────────
      let arrayBuffer;
      try {
        arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = e => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 60);
              setUploading({ name: baseName, pct,
                loaded: e.loaded, total: e.total });
            }
          };
          reader.onload  = e  => resolve(e.target.result);
          reader.onerror = () => reject(new Error('File read error'));
          reader.readAsArrayBuffer(file);
        });
      } catch {
        setUploading(null);
        alert(`Could not read "${file.name}". Please try again.`);
        continue;
      }

      if (cancelRef.current) break;

      // ── Phase 2: open with PDF.js just to count pages (60 → 75%) ────────
      setUploading({ name: baseName, pct: 65 });
      let pdfDoc, numPages;
      try {
        if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
        // PDF.js wants a Uint8Array (not a raw ArrayBuffer) — copy so we keep the original
        const dataView = new Uint8Array(arrayBuffer.slice(0));
        // Try with worker first; fall back to no-worker if it fails
        try {
          pdfDoc = await pdfjsLib.getDocument({ data: dataView }).promise;
        } catch (workerErr) {
          console.warn('PDF.js worker parse failed, retrying without worker:', workerErr);
          const saved = pdfjsLib.GlobalWorkerOptions.workerSrc;
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          try {
            pdfDoc = await pdfjsLib.getDocument({
              data: new Uint8Array(arrayBuffer.slice(0)),
              disableWorker: true,
            }).promise;
          } finally {
            pdfjsLib.GlobalWorkerOptions.workerSrc = saved;
          }
        }
        numPages = pdfDoc.numPages;
      } catch (err) {
        console.error('PDF parse error:', err);
        setUploading(null);
        alert(`"${file.name}" could not be opened.\n\nDetails: ${err?.message || 'Unknown error'}\n\nMake sure the file is a valid, unprotected PDF.`);
        continue;
      }

      if (cancelRef.current) break;

      // ── Phase 3: render tiny first-page thumbnail (75 → 90%) ─────────────
      setUploading({ name: baseName, pct: 78 });
      let thumbnailUrl = null;
      try {
        const firstPage = await pdfDoc.getPage(1);
        // Use a reasonable minimum size so tiny pages still look OK
        const naturalVp = firstPage.getViewport({ scale: 1 });
        const scale     = Math.max(0.18, 60 / Math.max(naturalVp.width, naturalVp.height));
        const vp        = firstPage.getViewport({ scale });
        const tc        = document.createElement('canvas');
        tc.width  = Math.ceil(vp.width);
        tc.height = Math.ceil(vp.height);
        await firstPage.render({ canvasContext: tc.getContext('2d'), viewport: vp }).promise;
        thumbnailUrl = tc.toDataURL('image/jpeg', 0.65);
      } catch (e) { console.warn('Thumbnail render skipped:', e); /* thumbnail is optional */ }

      if (cancelRef.current) break;

      // ── Phase 4: save raw PDF to IndexedDB (90 → 100%) ───────────────────
      setUploading({ name: baseName, pct: 92 });
      try {
        await saveDrawingPDF(idbKey, arrayBuffer);
      } catch {
        setUploading(null);
        alert(`Failed to save "${file.name}" locally. Storage may be full.`);
        continue;
      }

      if (cancelRef.current) break;

      // Build page metadata (no imageDataUrl — rendered on demand in ObservationTool)
      const pages = Array.from({ length: numPages }, (_, i) => ({
        pageNum: i + 1,
        label: numPages === 1 ? baseName : `${baseName} — Sheet ${i + 1}`,
      }));

      setDrawings(prev => [...prev, {
        id: drawingId,
        name: baseName,
        pageCount: numPages,
        idbKey,
        thumbnailUrl,
        pages,
      }]);

      setUploading({ name: baseName, pct: 100 });
      // brief pause so the 100% flash is visible
      await new Promise(r => setTimeout(r, 300));
    }

    setUploading(null);
    // Reset file input so the same file can be re-selected after cancel
    if (fileRef.current) fileRef.current.value = '';
  }

  function cancelUpload() {
    cancelRef.current = true;
    setUploading(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeDrawing(id) {
    setDrawings(prev => prev.filter(d => d.id !== id));
  }

  // ── Step 1 — Visit details form ────────────────────────────────────────────
  const step1 = () => h('div', {
    className: 'scroll fade-in',
    style: { flex:1, overflowY:'auto', padding:'32px 24px 48px' },
  },
    h('div', { style:{ maxWidth:560, margin:'0 auto' } },
      h('h2', { className:'title-2', style:{ color:UI.label, marginBottom:6 } },
        'Visit Details'
      ),
      h('p', { style:{ fontSize:14, color:UI.label3, marginBottom:28 } },
        `${proj.name} — Enter site visit information`
      ),

      // Visit info fields
      ...[
        { k:'engineer',   label:'Engineer',        placeholder:'Name, P.E.' },
        { k:'date',       label:'Date',             placeholder:ds() },
        { k:'time',       label:'Time',             placeholder:ts() },
        { k:'weather',    label:'Weather',          placeholder:'e.g. Partly Cloudy, 72°F' },
        { k:'location',   label:'Location',         placeholder:'e.g. Grid A-C Level 2' },
      ].map(f => h('div', {
        key: f.k,
        style:{ display:'flex', alignItems:'center', padding:'12px 0',
          borderBottom:`1px solid ${UI.sep}` },
      },
        h('label', { style:{ width:130, fontSize:13, color:UI.label3,
          flexShrink:0, fontWeight:600, letterSpacing:'0.02em' } }, f.label),
        h('input', {
          value: form[f.k], onChange: e => setField(f.k, e.target.value),
          placeholder: f.placeholder,
          style:{ flex:1, background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label },
        })
      )),

      h('div', { style:{ height:20 } }),

      ...[
        { k:'contractor', label:'Contractor',       placeholder:'Contractor name' },
        { k:'permit',     label:'Permit / Job #',   placeholder:'BP-2026-XXXX' },
      ].map(f => h('div', {
        key: f.k,
        style:{ display:'flex', alignItems:'center', padding:'12px 0',
          borderBottom:`1px solid ${UI.sep}` },
      },
        h('label', { style:{ width:130, fontSize:13, color:UI.label3,
          flexShrink:0, fontWeight:600, letterSpacing:'0.02em' } }, f.label),
        h('input', {
          value: form[f.k], onChange: e => setField(f.k, e.target.value),
          placeholder: f.placeholder,
          style:{ flex:1, background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label },
        })
      )),

      // Purpose
      h('div', { style:{ padding:'12px 0', borderBottom:`1px solid ${UI.sep}` } },
        h('label', { style:{ fontSize:13, color:UI.label3, display:'block',
          marginBottom:6, fontWeight:600, letterSpacing:'0.02em' } }, 'Purpose of Visit'),
        h('textarea', {
          value: form.purpose, onChange: e => setField('purpose', e.target.value),
          rows:3, placeholder:'Describe the purpose of this inspection…',
          style:{ width:'100%', background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label, resize:'none' },
        })
      ),
      // Notes
      h('div', { style:{ padding:'12px 0' } },
        h('label', { style:{ fontSize:13, color:UI.label3, display:'block',
          marginBottom:6, fontWeight:600, letterSpacing:'0.02em' } },
          'Additional Notes (optional)'
        ),
        h('textarea', {
          value: form.notes, onChange: e => setField('notes', e.target.value),
          rows:2, placeholder:'Any pre-visit notes…',
          style:{ width:'100%', background:'none', border:'none', outline:'none',
            fontSize:14, color:UI.label, resize:'none' },
        })
      ),

      // Next
      h('div', { style:{ marginTop:32, display:'flex', justifyContent:'flex-end' } },
        h('button', {
          onClick: () => setStep(2),
          disabled: !form.engineer || !form.date,
          className: 'btn-primary pressable',
          style:{ padding:'11px 28px', fontSize:14 },
        }, 'Continue to Drawings →')
      )
    )
  );

  // ── Step 2 — PDF upload ────────────────────────────────────────────────────
  const step2 = () => h('div', {
    className: 'scroll fade-in',
    style: { flex:1, overflowY:'auto', padding:'32px 24px 48px' },
  },
    h('div', { style:{ maxWidth:560, margin:'0 auto', display:'flex',
      flexDirection:'column', gap:14 } },

      // ── Drop zone (disabled while uploading) ─────────────────────────────
      h('div', {
        onDrop: e => {
          e.preventDefault();
          if (!uploading) handleFiles(e.dataTransfer.files);
        },
        onDragOver: e => e.preventDefault(),
        onClick: () => !uploading && fileRef.current?.click(),
        style:{
          border:`2px dashed ${uploading ? UI.red : UI.label4}`,
          padding:'36px 28px', textAlign:'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(220,38,38,0.03)' : UI.surface,
          transition:'border-color 0.2s, background 0.2s',
          userSelect:'none',
        },
      },
        h('input', {
          ref: fileRef, type:'file', accept:'.pdf,application/pdf', multiple:true,
          onChange: e => { if (!uploading) handleFiles(e.target.files); },
          style:{ display:'none' },
        }),

        // Icon — PDF file symbol
        h('div', { style:{ marginBottom:10 } },
          h('svg', { width:36, height:36, viewBox:'0 0 24 24', fill:'none',
            stroke: uploading ? UI.red : UI.label4, strokeWidth:1.5, strokeLinecap:'round' },
            h('path', { d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
            h('polyline', { points:'14 2 14 8 20 8' }),
            h('line', { x1:9, y1:13, x2:15, y2:13 }),
            h('line', { x1:9, y1:17, x2:15, y2:17 }),
            h('line', { x1:9, y1:9, x2:11, y2:9 }),
          )
        ),
        h('div', { style:{ fontSize:15, fontWeight:700, color:UI.label, marginBottom:4 } },
          uploading ? `Loading ${uploading.name}…` : 'Upload Structural Drawings'
        ),
        h('div', { style:{ fontSize:13, color:UI.label3 } },
          uploading ? 'Processing PDF…' : 'Drag PDF files here, or click to browse'
        ),
      ),

      // ── Progress bar (shown while uploading) ─────────────────────────────
      uploading && h('div', { className:'card', style:{ padding:'16px 18px' } },
        // Header row with file name + cancel button
        h('div', { style:{ display:'flex', alignItems:'center',
          justifyContent:'space-between', marginBottom:10 } },
          h('div', { style:{ fontSize:13, fontWeight:700, color:UI.label,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 } },
            uploading.name
          ),
          h('button', {
            onClick: cancelUpload,
            style:{
              marginLeft:12, fontSize:12, fontWeight:700,
              color:UI.red, background:'none', border:`1px solid ${UI.red}`,
              padding:'3px 10px', cursor:'pointer', letterSpacing:'0.04em',
              textTransform:'uppercase', flexShrink:0,
            },
          }, 'Cancel'),
        ),

        // Progress bar track
        h('div', {
          style:{ height:6, background:UI.fill3, overflow:'hidden' },
        },
          h('div', {
            style:{
              height:'100%',
              width:`${uploading.pct}%`,
              background: uploading.pct === 100 ? UI.green : UI.red,
              transition:'width 0.25s ease, background 0.3s ease',
            },
          })
        ),

        // Label row
        h('div', { style:{ display:'flex', justifyContent:'space-between',
          marginTop:6, fontSize:11, color:UI.label3 } },
          h('span', null, uploading.pct < 65  ? 'Reading file…'
                        : uploading.pct < 80  ? 'Opening PDF…'
                        : uploading.pct < 93  ? 'Generating preview…'
                        : uploading.pct < 100 ? 'Saving…'
                        :                       'Done'),
          h('span', { style:{ fontWeight:700, color: uploading.pct === 100 ? UI.green : UI.label } },
            `${uploading.pct}%`
          ),
        )
      ),

      // ── Completed drawings list ────────────────────────────────────────────
      ...drawings.map(d => h('div', {
        key: d.id, className:'card',
        style:{ padding:'12px 14px' },
      },
        h('div', { style:{ display:'flex', alignItems:'center', gap:12 } },
          // Thumbnail
          h('div', {
            style:{
              width:44, height:44, flexShrink:0, overflow:'hidden',
              background:UI.fill3, display:'flex', alignItems:'center', justifyContent:'center',
            },
          },
            d.thumbnailUrl
              ? h('img', { src:d.thumbnailUrl, alt:'',
                  style:{ width:'100%', height:'100%', objectFit:'cover' } })
              : h('svg', { width:22, height:22, viewBox:'0 0 24 24', fill:'none',
                  stroke:UI.label4, strokeWidth:1.5, strokeLinecap:'round' },
                  h('path', { d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
                  h('polyline', { points:'14 2 14 8 20 8' }),
                )
          ),
          // Name + page count
          h('div', { style:{ flex:1, minWidth:0 } },
            h('div', { style:{ fontSize:14, fontWeight:600, color:UI.label,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, d.name),
            h('div', { style:{ fontSize:12, color:UI.label3, marginTop:2 } },
              `${d.pageCount} page${d.pageCount !== 1 ? 's' : ''} · PDF`
            ),
          ),
          h(Chip, { label:'Ready', tone:'green' }),
          h('button', {
            onClick: () => removeDrawing(d.id),
            style:{ marginLeft:4, fontSize:20, color:UI.label4,
              background:'none', border:'none', cursor:'pointer', lineHeight:1 },
          }, '×')
        )
      )),

      // ── Action buttons ────────────────────────────────────────────────────
      h('div', { style:{ display:'flex', alignItems:'center',
        justifyContent:'space-between', marginTop:4 } },
        h('button', {
          onClick: () => onComplete({ info: form, drawings: [] }),
          style:{ fontSize:13, color:UI.label3, background:'none',
            border:'none', cursor:'pointer' },
        }, 'Skip drawings'),

        drawings.length > 0 && h('button', {
          onClick: () => onComplete({ info: form, drawings }),
          className: 'btn-primary pressable',
          style:{ padding:'11px 28px', fontSize:14 },
        }, 'Start Site Visit →'),
      )
    )
  );

  // ── Step indicator ─────────────────────────────────────────────────────────
  function stepCircle(n, label) {
    const active = step === n, done = step > n;
    return h('div', { style:{ display:'flex', flexDirection:'column',
      alignItems:'center', gap:4 } },
      h('div', {
        style:{
          width:26, height:26,
          borderRadius:'50%',
          border: active ? `2px solid ${UI.red}` : done ? 'none' : `2px solid ${UI.sep}`,
          background: active ? UI.red : done ? UI.green : 'transparent',
          color: (active || done) ? 'white' : UI.label3,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700,
          transition:'all 0.2s',
        },
      }, done ? '✓' : n),
      h('div', { style:{ fontSize:10, fontWeight:700, letterSpacing:'0.05em',
        textTransform:'uppercase',
        color: active ? UI.red : done ? UI.green : UI.label4 } }, label),
    );
  }

  return h('div', {
    style:{ height:'100vh', background:UI.bg, display:'flex',
      flexDirection:'column', overflow:'hidden' },
  },
    // ── Navbar ───────────────────────────────────────────────────────────────
    h('div', {
      className:'glass',
      style:{ height:52, display:'flex', alignItems:'center',
        padding:'0 16px', flexShrink:0 },
    },
      h(BackButton, { label:'Back', onClick:onBack }),
      h('div', { style:{ flex:1, textAlign:'center', fontSize:15,
        fontWeight:700, color:UI.label, fontFamily:"'Noto Serif', serif" } },
        'New Site Visit'
      ),
      // Spacer to keep title truly centered (same width as BackButton)
      h('div', { style:{ width:60 } }),
    ),

    // ── Step indicator — same max-width as content ────────────────────────────
    h('div', {
      style:{ borderBottom:`1px solid ${UI.sep}`, flexShrink:0, padding:'14px 24px' },
    },
      h('div', {
        style:{ maxWidth:560, margin:'0 auto',
          display:'flex', alignItems:'center', justifyContent:'center' },
      },
        stepCircle(1, 'Visit Details'),
        h('div', { style:{ flex:1, maxWidth:100, height:1,
          background: step > 1 ? UI.green : UI.sep, margin:'0 10px', marginBottom:18 } }),
        stepCircle(2, 'Drawings'),
      )
    ),

    // ── Step content ──────────────────────────────────────────────────────────
    step === 1 ? step1() : step2(),
  );
}
