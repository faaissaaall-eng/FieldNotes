// ─────────────────────────────────────────────────────────────────────────────
// reports.js — PDF/DOCX generation + ReportPanel UI
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateRP } = React;

// ── Filename sanitiser ─────────────────────────────────────────────────────────
const safeName = s => (s || '').replace(/[^a-z0-9]/gi, '_');

// ── PDF Generation ─────────────────────────────────────────────────────────────
async function generatePDF(obs, visit, proj) {
  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF({ format:'letter', orientation:'portrait', unit:'mm' });

  const L = 18, W = 179.9; // left margin, usable width
  const PW = 215.9, PH = 279.4; // page width/height mm
  const COL = {
    headerBg: [10,22,40], blue:[29,78,216], green:[22,163,74],
    orange:[217,119,6], red:[220,38,38],
    gray:[107,114,128], lightGray:[249,250,251], white:[255,255,255],
  };

  function addHeaderFooter(pageNum, total) {
    // Header
    doc.setFillColor(...COL.headerBg);
    doc.rect(0, 0, PW, 14, 'F');
    doc.setFillColor(...COL.blue);
    doc.rect(0, 14, PW, 0.5, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(8); doc.setFont(undefined,'bold');
    doc.text('FIELD OBSERVATION REPORT', L, 9);
    doc.text(`Page ${pageNum} of ${total}`, PW - L, 9, { align:'right' });
    doc.setFont(undefined,'normal'); doc.setFontSize(7);
    doc.text(`${proj.name} · ${proj.client}`, L, 12.5);
    // Footer
    doc.setFillColor(...COL.lightGray);
    doc.rect(0, 269.4, PW, 10, 'F');
    doc.setTextColor(...COL.gray);
    doc.setFontSize(7); doc.setFont(undefined,'normal');
    doc.text(`${visit.engineer || ''}`, L, 275.5);
    doc.text(visit.date, PW/2, 275.5, { align:'center' });
    doc.text('Confidential', PW - L, 275.5, { align:'right' });
  }

  let pageNum = 1;
  // We'll add headers retroactively by counting pages after generation
  // For simplicity we add header/footer per page as we go

  // ── Page 1: Cover table ─────────────────────────────────────────────────────
  addHeaderFooter(pageNum, '?');

  let y = 22;
  doc.setFontSize(16); doc.setFont(undefined,'bold');
  doc.setTextColor(...COL.headerBg);
  doc.text('Field Observation Report', L, y); y += 8;

  const coverRows = [
    ['Project',       proj.name],
    ['Client',        proj.client],
    ['Location',      proj.location],
    ['Structure',     proj.type],
    ['Visit Date',    visit.date],
    ['Time',          visit.time],
    ['Engineer',      visit.engineer],
    ['Weather',       visit.weather],
    ...(visit.contractor ? [['Contractor', visit.contractor]] : []),
    ...(visit.permit     ? [['Permit / Job', visit.permit]]  : []),
    ...(visit.purpose    ? [['Purpose',    visit.purpose]]   : []),
  ];

  const COL_W = [40, W - 40];
  coverRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? COL.lightGray : COL.white;
    doc.setFillColor(...bg); doc.rect(L, y, W, 7, 'F');
    doc.setFontSize(9); doc.setFont(undefined,'bold');
    doc.setTextColor(...COL.gray); doc.text(row[0], L + 2, y + 4.5);
    doc.setFont(undefined,'normal'); doc.setTextColor(...COL.headerBg);
    doc.text(String(row[1] || ''), L + COL_W[0] + 2, y + 4.5, { maxWidth: COL_W[1] - 4 });
    y += 7;
  });
  y += 6;

  // Summary boxes
  const conforming = obs.filter(o => o.severity === 'conforming').length;
  const minor      = obs.filter(o => o.severity === 'minor').length;
  const critical   = obs.filter(o => o.severity === 'critical').length;
  const boxW = W / 3;
  [
    { label:'Conforming', count:conforming, color:COL.green  },
    { label:'Minor',      count:minor,      color:COL.orange },
    { label:'Critical',   count:critical,   color:COL.red    },
  ].forEach((b, i) => {
    const bx = L + i * boxW;
    doc.setFillColor(...b.color); doc.roundedRect(bx, y, boxW - 2, 16, 2, 2, 'F');
    doc.setTextColor(255,255,255); doc.setFont(undefined,'bold');
    doc.setFontSize(18); doc.text(String(b.count), bx + boxW/2 - 1, y + 10, { align:'center' });
    doc.setFontSize(8);  doc.text(b.label, bx + boxW/2 - 1, y + 14.5, { align:'center' });
  });

  // ── Per-observation pages ────────────────────────────────────────────────────
  obs.forEach((o, idx) => {
    doc.addPage(); pageNum++;
    addHeaderFooter(pageNum, '?');

    const sev   = SEV[o.severity];
    const sevColor = o.severity === 'critical' ? COL.red : o.severity === 'minor' ? COL.orange : COL.green;
    let oy = 22;

    // Obs header bar
    doc.setFillColor(...COL.headerBg); doc.rect(L, oy, W, 9, 'F');
    doc.setFillColor(...sevColor); doc.rect(L, oy, 3, 9, 'F');
    doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(10);
    doc.text(`OBS. ${String(idx + 1).padStart(2,'0')} — ${sev.label.toUpperCase()}`, L + 6, oy + 6);
    doc.text(o.category, L + W - 2, oy + 6, { align:'right' });
    oy += 11;

    // Photo info row
    if (o.hasPhoto) {
      doc.setFillColor(219,234,254); doc.rect(L, oy, W, 7, 'F');
      doc.setTextColor(...COL.blue); doc.setFont(undefined,'normal'); doc.setFontSize(8);
      doc.text(`📷 ${dl(o.direction)} (${o.direction}°)  ·  ${o.photoTimestamp || o.time}`, L + 2, oy + 4.5);
      oy += 9;
    }

    // Photo image
    const photoUrl = o.photos?.[0]?.dataUrl || o.photoDataUrl;
    if (photoUrl) {
      try {
        const maxH = 52;
        doc.addImage(photoUrl, 'JPEG', L, oy, W, maxH, undefined, 'MEDIUM');
        oy += maxH + 3;
      } catch {}
    }

    // Observation label
    doc.setFillColor(...COL.lightGray); doc.rect(L, oy, W, 7, 'F');
    doc.setTextColor(...COL.gray); doc.setFont(undefined,'bold'); doc.setFontSize(7);
    doc.text('OBSERVATION', L + 2, oy + 4.5);
    doc.text(`Drawing: ${o.drawing}  ·  Time: ${o.time}  ·  Direction: ${dl(o.direction)}`, L + W - 2, oy + 4.5, { align:'right' });
    oy += 9;

    // Note text
    doc.setTextColor(...COL.headerBg); doc.setFont(undefined,'normal'); doc.setFontSize(10);
    const lines = doc.splitTextToSize(o.note, W);
    doc.text(lines, L, oy + 4);
    oy += lines.length * 5 + 8;

    // Superintendent response
    if (o.superResponse) {
      doc.setFillColor(220,252,231); doc.rect(L, oy, W, Math.max(10, o.superResponse.length / 6), 'F');
      doc.setFillColor(...COL.green); doc.rect(L, oy, 3, Math.max(10, o.superResponse.length / 6), 'F');
      doc.setTextColor(...COL.green); doc.setFont(undefined,'bold'); doc.setFontSize(8);
      doc.text(`${o.superName || 'Superintendent'}  ·  ${o.superTime || ''}`, L + 5, oy + 4);
      doc.setTextColor(...COL.headerBg); doc.setFont(undefined,'normal'); doc.setFontSize(9);
      const slines = doc.splitTextToSize(o.superResponse, W - 8);
      doc.text(slines, L + 5, oy + 8);
      oy += slines.length * 4 + 12;
    }

    // Voice note indicator
    if (o.voiceNote) {
      doc.setFillColor(237,233,254); doc.rect(L, oy, W, 7, 'F');
      doc.setTextColor(109,40,217); doc.setFont(undefined,'bold'); doc.setFontSize(8);
      doc.text('🎙️ Voice note attached', L + 4, oy + 4.5);
      oy += 9;
    }
  });

  // ── Summary table ────────────────────────────────────────────────────────────
  doc.addPage(); pageNum++;
  addHeaderFooter(pageNum, '?');
  let ty = 22;
  doc.setFont(undefined,'bold'); doc.setFontSize(12); doc.setTextColor(...COL.headerBg);
  doc.text('Observation Summary', L, ty); ty += 8;

  const cols = [8,16,50,22,38,14,W-8-16-50-22-38-14];
  const headers = ['#','Drawing','Category','Status','Superintendent','Photo','Time'];
  doc.setFillColor(...COL.headerBg);
  doc.rect(L, ty, W, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(8);
  let cx = L;
  headers.forEach((h,i) => { doc.text(h, cx+1, ty+4.5); cx += cols[i]; });
  ty += 7;

  obs.forEach((o, i) => {
    const rowH = 7;
    const bg = i%2===0 ? COL.lightGray : COL.white;
    doc.setFillColor(...bg); doc.rect(L, ty, W, rowH, 'F');
    doc.setTextColor(...COL.headerBg); doc.setFont(undefined,'normal'); doc.setFontSize(8);
    cx = L;
    [
      String(o.id), o.drawing, o.category.substring(0,28),
      o.severity, (o.superName||'').substring(0,20),
      o.hasPhoto?'Yes':'No', o.time,
    ].forEach((val,j) => { doc.text(val, cx+1, ty+4.5, { maxWidth:cols[j]-2 }); cx += cols[j]; });
    ty += rowH;
  });

  // ── Required actions ─────────────────────────────────────────────────────────
  const actionItems = obs.filter(o => o.severity !== 'conforming');
  if (actionItems.length) {
    doc.addPage(); pageNum++;
    addHeaderFooter(pageNum, '?');
    let ay = 22;
    doc.setFont(undefined,'bold'); doc.setFontSize(12); doc.setTextColor(...COL.headerBg);
    doc.text('Required Actions', L, ay); ay += 8;

    actionItems.forEach(o => {
      const sevColor = o.severity === 'critical' ? COL.red : COL.orange;
      doc.setFillColor(...sevColor); doc.rect(L, ay, 3, 14, 'F');
      doc.setTextColor(...sevColor); doc.setFont(undefined,'bold'); doc.setFontSize(8);
      doc.text(SEV[o.severity].label.toUpperCase(), L+5, ay+4);
      doc.setTextColor(...COL.headerBg); doc.setFont(undefined,'normal'); doc.setFontSize(9);
      const nLines = doc.splitTextToSize(o.note, W-8);
      doc.text(nLines, L+5, ay+8);
      ay += nLines.length*4.5 + 4;
      if (o.superResponse) {
        doc.setTextColor(...COL.green); doc.setFontSize(8);
        doc.text(`Response: ${o.superResponse}`, L+5, ay);
        ay += 6;
      } else {
        doc.setTextColor(...COL.orange); doc.setFontSize(8);
        doc.text('[!] No superintendent response recorded', L+5, ay);
        ay += 6;
      }
      ay += 4;
      if (ay > 240) { doc.addPage(); pageNum++; addHeaderFooter(pageNum,'?'); ay = 22; }
    });
  }

  // ── Certification page ───────────────────────────────────────────────────────
  doc.addPage(); pageNum++;
  addHeaderFooter(pageNum, '?');
  let cy = 40;
  doc.setFont(undefined,'bold'); doc.setFontSize(12); doc.setTextColor(...COL.headerBg);
  doc.text('Engineer Certification', L, cy); cy += 10;
  doc.setFont(undefined,'normal'); doc.setFontSize(9);
  const certText = 'The observations recorded in this report are based on a site visit conducted on the date noted above. This report does not constitute a continuous or exhaustive inspection of all work and does not relieve the contractor of their responsibility for quality control and code compliance.';
  const certLines = doc.splitTextToSize(certText, W);
  doc.text(certLines, L, cy); cy += certLines.length * 5 + 16;
  // Signature line
  doc.setDrawColor(...COL.headerBg); doc.line(L, cy, L + 80, cy); cy += 6;
  doc.setFont(undefined,'bold'); doc.setFontSize(10); doc.text(visit.engineer || '', L, cy); cy += 5;
  doc.setFont(undefined,'normal'); doc.setFontSize(8); doc.setTextColor(...COL.gray);
  doc.text('Engineer of Record', L, cy); cy += 4;
  doc.text(ds(), L, cy);

  const filename = `${safeName(proj.name)}_${safeName(visit.date)}.pdf`;
  doc.save(filename);
}

// ── DOCX Generation ────────────────────────────────────────────────────────────
async function generateDOCX(obs, visit, proj) {
  if (!window.docx) { alert('DOCX library not loaded.'); return; }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, HeadingLevel, AlignmentType, BorderStyle,
          ImageRun, PageBreak, HorizontalPositionAlign } = window.docx;

  const W = 'EA0029', B = '1F2023', G = '595959';

  function para(text, opts = {}) {
    return new Paragraph({
      children: [new TextRun({ text: String(text || ''), font:'Calibri', ...opts })],
      spacing: { after: 100 },
    });
  }

  const sections = [];

  // Title
  sections.push(para('Field Observation Report', { size:28, bold:true, color:B }));
  sections.push(para(''));

  // Header table
  const headerData = [
    ['Report #',          '001'],
    ['Observation Date',  `${visit.date} · ${visit.time}`],
    ['Project',           proj.name],
    ['Client',            proj.client],
    ['Engineer',          visit.engineer],
    ['Weather',           visit.weather],
    ...(visit.contractor ? [['Contractor', visit.contractor]] : []),
    ...(visit.purpose    ? [['Purpose',    visit.purpose]]   : []),
  ];

  sections.push(new Table({
    width: { size:100, type:WidthType.PERCENTAGE },
    rows: headerData.map(([label, value]) => new TableRow({
      children: [
        new TableCell({ children:[para(label, { bold:true, size:18, color:G })], width:{size:2400,type:WidthType.DXA} }),
        new TableCell({ children:[para(value, { size:18, color:B })], width:{size:7840,type:WidthType.DXA} }),
      ],
    })),
  }));

  sections.push(para(''));
  sections.push(new Paragraph({ children:[new PageBreak()] }));

  // Observations
  sections.push(para('Observations / Comments', { size:24, bold:true, color:W }));
  sections.push(para(''));

  for (const o of obs) {
    const sev = SEV[o.severity];
    sections.push(para(`${o.id}. ${o.note}`, { size:20, color:B }));
    sections.push(para(`  [${sev.label.toUpperCase()}]`, { size:18, bold:true,
      color: o.severity==='critical'?W : o.severity==='minor'?'D97706':'16A34A' }));
    sections.push(para(`  Drawing: ${o.drawing}  ·  Time: ${o.time}  ·  Direction: ${dl(o.direction)}`,
      { size:16, color:G, italics:true }));
    if (o.superResponse) {
      sections.push(para(`  Superintendent (${o.superName||''}): ${o.superResponse}`, { size:17, color:'16A34A', italics:true }));
    }
    // Photo
    const photoUrl = o.photos?.[0]?.dataUrl || o.photoDataUrl;
    if (photoUrl) {
      try {
        const res  = await fetch(photoUrl);
        const buf  = await res.arrayBuffer();
        sections.push(new Paragraph({
          children:[new ImageRun({ data:buf, transformation:{ width:460, height:307 } })],
          spacing:{ after:200 },
        }));
      } catch {}
    }
    sections.push(para(''));
  }

  sections.push(new Paragraph({ children:[new PageBreak()] }));

  // Summary table
  sections.push(para('Observation Summary', { size:24, bold:true, color:W }));
  sections.push(para(''));

  const headers = ['#','Drawing','Category','Status','Superintendent','Photo','Time'];
  const colW    = [400,800,2000,1300,2000,900,1240];
  sections.push(new Table({
    width:{ size:100, type:WidthType.PERCENTAGE },
    rows:[
      new TableRow({
        children: headers.map((h,i)=>new TableCell({
          children:[para(h, { bold:true, size:16, color:'ffffff' })],
          width:{size:colW[i], type:WidthType.DXA},
          shading:{ fill:'1A2E4A' },
        })),
      }),
      ...obs.map((o,ri)=>new TableRow({
        children: [
          String(o.id), o.drawing, o.category, o.severity, o.superName||'—',
          o.hasPhoto?'Yes':'No', o.time,
        ].map((val,ci)=>new TableCell({
          children:[para(val, { size:16, color:B })],
          width:{size:colW[ci], type:WidthType.DXA},
          shading:{ fill: ri%2===0?'FFFFFF':'F9F9F9' },
        })),
      })),
    ],
  }));

  sections.push(new Paragraph({ children:[new PageBreak()] }));

  // Required actions
  const actions = obs.filter(o=>o.severity!=='conforming');
  if (actions.length) {
    sections.push(para('Required Actions', { size:24, bold:true, color:W }));
    sections.push(para(''));
    actions.forEach(o => {
      sections.push(para(SEV[o.severity].label, { size:18, bold:true,
        color:o.severity==='critical'?W:'D97706' }));
      sections.push(para(o.note, { size:18, color:B }));
      sections.push(para(o.superResponse||'No superintendent response recorded',
        { size:16, italics:true, color:o.superResponse?'16A34A':G }));
      sections.push(para(''));
    });
    sections.push(new Paragraph({ children:[new PageBreak()] }));
  }

  // Certification
  sections.push(para('Engineer Certification', { size:24, bold:true, color:B }));
  sections.push(para('The observations recorded in this report are based on a site visit conducted on the date noted above. This report does not constitute a continuous or exhaustive inspection.', { size:18, color:B }));
  sections.push(para(''));
  sections.push(para('_'.repeat(60)));
  sections.push(para(visit.engineer||'', { size:20, bold:true, color:B }));
  sections.push(para('Engineer of Record', { size:16, color:G }));
  sections.push(para(ds(), { size:16, color:G }));

  const doc = new Document({ sections:[{ children:sections }] });
  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${safeName(proj.name)}_${safeName(visit.date)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── ReportPanel ────────────────────────────────────────────────────────────────
// Report summary UI with PDF and DOCX export buttons.
function ReportPanel({ obs, visit, proj, reportDone, setReportDone }) {
  const [pdfStatus,  setPdfStatus]  = useStateRP('idle');
  const [docxStatus, setDocxStatus] = useStateRP('idle');

  async function handlePDF() {
    setPdfStatus('generating');
    try {
      await generatePDF(obs, visit, proj);
      setPdfStatus('done');
    } catch(e) {
      console.error('PDF error', e);
      setPdfStatus('idle');
    }
  }

  async function handleDOCX() {
    setDocxStatus('generating');
    try {
      await generateDOCX(obs, visit, proj);
      setDocxStatus('done');
    } catch(e) {
      console.error('DOCX error', e);
      setDocxStatus('idle');
    }
  }

  const conforming = obs.filter(o=>o.severity==='conforming').length;
  const minor      = obs.filter(o=>o.severity==='minor').length;
  const critical   = obs.filter(o=>o.severity==='critical').length;

  function exportBtn(status, label, icon, onClick) {
    return h('div', { className:'card', style:{ padding:'20px', textAlign:'center' } },
      h('div', { style:{ fontSize:32, marginBottom:10 } }, icon),
      h('div', { style:{ fontSize:15, fontWeight:700, color:UI.label, marginBottom:8 } }, label),
      h('button', {
        onClick,
        disabled: status === 'generating',
        className:'btn-primary pressable',
        style:{ width:'100%', padding:'11px', fontSize:14 },
      },
        status === 'generating' ? h('span', { style:{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 } },
          h('span', { style:{ animation:'spin 1s linear infinite', display:'inline-block' } }, '◌'),
          'Generating…'
        ) : status === 'done' ? '✓ Downloaded'
          : `Export ${label}`
      )
    );
  }

  return h('div', {
    className: 'scroll fade-in',
    style:{ flex:1, overflowY:'auto', padding:'24px' },
  },
    h('div', { style:{ maxWidth:760, margin:'0 auto' } },
      // Summary card
      h('div', { className:'card', style:{ padding:'20px', marginBottom:16 } },
        h('div', { style:{ fontSize:17, fontWeight:700, color:UI.label, marginBottom:4 } }, proj.name),
        h('div', { style:{ fontSize:13, color:UI.label3, marginBottom:16 } },
          `${visit.date} · ${visit.engineer} · ${visit.weather || ''}`
        ),
        h('div', { style:{ display:'flex', gap:12 } },
          [
            { label:'Conforming', count:conforming, tone:'green'  },
            { label:'Minor',      count:minor,      tone:'orange' },
            { label:'Critical',   count:critical,   tone:'red'    },
          ].map(s => h('div', { key:s.label, className:'card',
            style:{ flex:1, padding:'12px', textAlign:'center' } },
            h('div', { style:{ fontSize:24, fontWeight:700, color:UI[s.tone] } }, s.count),
            h('div', { style:{ fontSize:11, color:UI.label3, marginTop:2 } }, s.label),
          ))
        )
      ),
      // Export buttons
      h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 } },
        exportBtn(pdfStatus,  'PDF',  '📄', handlePDF),
        exportBtn(docxStatus, 'Word', '📝', handleDOCX),
      ),
      // Checklist
      h('div', { className:'card', style:{ padding:'16px' } },
        h('div', { style:{ fontSize:13, fontWeight:600, color:UI.label, marginBottom:10 } }, 'Included in Both Formats'),
        [
          'Project & visit information',
          'All observations with photos',
          'Engineer certifications',
          'Superintendent responses',
          'Voice note indicators',
          'Observation summary table',
          'Required actions section',
        ].map(item => h('div', { key:item,
          style:{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' } },
          h('span', { style:{ color:UI.green, fontSize:15 } }, '✓'),
          h('span', { style:{ fontSize:13, color:UI.label3 } }, item),
        ))
      )
    )
  );
}
