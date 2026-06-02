import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const estadoPath = join(__dir, '..', 'ESTADO.md');
const outPath = join(__dir, '..', 'public', 'kanban.html');

const md = readFileSync(estadoPath, 'utf-8');
const lines = md.split('\n');

// ── 1. Header ──────────────────────────────────────────────────────────────
let faseActual = '';
for (const line of lines) {
  const m = line.match(/^Actualizado:\s*(.+?)\s*\|\s*Fase:\s*(.+)/);
  if (m) { faseActual = m[2].trim(); break; }
}

// ── 2. Helpers ─────────────────────────────────────────────────────────────
function getSectionLines(heading) {
  const idx = lines.findIndex(l => l.startsWith(heading));
  if (idx === -1) return [];
  let end = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].match(/^## /)) { end = i; break; }
  }
  return lines.slice(idx, end);
}

function parseTableRows(sectionLines) {
  return sectionLines
    .filter(l => l.startsWith('| ') && !l.match(/^\| -+/))
    .map(l => l.split('|').map(c => c.trim()).filter(Boolean))
    .filter(r => r.length >= 2);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 3. Completado — Estado técnico (2 columnas) + QA tables ───────────────
const estadoSection = getSectionLines('## Estado técnico');
const completados = parseTableRows(estadoSection)
  .filter(r => r[0] !== 'Componente' && /Completo/i.test(r[1]))
  .map(r => ({ ticket: r[0], estado: r[1] }));

// IDs completados: extraer "Tnn(b)" para cruzar con bloqueantes QA
const completadosIds = new Set();
for (const t of completados) {
  const m = t.ticket.match(/\b(T\d+\w*)\b/);
  if (m) completadosIds.add(m[1]);
}
// También escanear tablas QA de 4 columnas donde última columna = Completo
for (const line of lines) {
  if (!line.startsWith('| T')) continue;
  const parts = line.split('|').map(c => c.trim()).filter(Boolean);
  if (parts.length >= 4 && /Completo/i.test(parts[parts.length - 1])) {
    const m = parts[0].match(/^(T\d+\w*)/);
    if (m) completadosIds.add(m[1]);
  }
}

// ── 4. Post go-live — T26, T32, T33, T34, T35 ────────────────────────────
const postGoLiveIds = new Set(['T26', 'T32', 'T33', 'T34', 'T35']);
const postGoLiveTickets = [];

for (const line of lines) {
  if (!line.startsWith('| T')) continue;
  const parts = line.split('|').map(c => c.trim()).filter(Boolean);
  if (parts.length < 2) continue;
  const id = parts[0];
  if (postGoLiveIds.has(id) && !postGoLiveTickets.find(t => t.ticket === id)) {
    postGoLiveTickets.push({
      ticket: id,
      descripcion: parts[1] || '',
      detalle: parts[parts.length - 1] !== parts[1] ? parts[parts.length - 1] : '',
    });
  }
}

// ── 5. Próximo — QA bloqueantes + T36 DevOps ─────────────────────────────
const proximo = [];

// Última sección QA Go-Live con bloqueo activo
let lastQABloqueante = null;
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].match(/^## QA Go-Live/)) continue;
  for (let j = i + 1; j < lines.length && !lines[j].match(/^## /); j++) {
    if (lines[j].match(/^### Bloqueantes/)) {
      const m = lines[j].match(/\((\w+)\)/);
      if (m) lastQABloqueante = m[1];
    }
  }
}

if (lastQABloqueante) {
  if (completadosIds.has(lastQABloqueante)) {
    proximo.push({
      ticket: 'Re-QA go-live',
      descripcion: `Verificar en producción post ${lastQABloqueante} — B1/B2 Planificación + B3 Por semana`,
      tipo: 'qa',
    });
  } else {
    proximo.push({
      ticket: lastQABloqueante,
      descripcion: 'Bloqueante QA go-live — pendiente',
      tipo: 'bloqueante',
    });
  }
}

// T36 DevOps desde deuda técnica
const deudaSection = getSectionLines('## Deuda técnica conocida');
const devopsLine = deudaSection.find(
  l => l.startsWith('- ') && /DevOps|rama.*dev|deploy preview/i.test(l)
);
if (devopsLine) {
  proximo.push({
    ticket: 'T36 DevOps',
    descripcion: devopsLine.replace(/^-\s*/, '').trim(),
    tipo: 'devops',
  });
}

// ── 6. Deuda técnica ───────────────────────────────────────────────────────
const deudaItems = deudaSection
  .filter(l => l.startsWith('- '))
  .map(l => l.replace(/^-\s*/, '').trim());

const TAG_RULES = [
  [/DevOps|rama.*dev|deploy.*Vercel|deploy preview|CI\/CD|npm.*audit|claude.*code.*update/i, 'DevOps'],
  [/visual|diseño|color|badge|token|fl-\*|render|Tailwind|inline.*style|pantalla|MesM1|thead|tbody/i, 'UI'],
  [/sheet|H[1-6]\b|columna|campo|categoría|snapshot|movimiento|índice.*columna|Bug.*escrit/i, 'Datos'],
  [/npm|depend|vulnerab|build|turbopack|tsc|bundle|webpack|audit/i, 'Infra'],
  [/navegaci|flujo|bloqueo|modal|usuario|recargar|tiempo real|reactivo|UX|buscador|correg/i, 'UX'],
];

function tagDeuda(text) {
  for (const [rx, tag] of TAG_RULES) {
    if (rx.test(text)) return tag;
  }
  return 'General';
}

const deudaCards = deudaItems.map(d => ({ texto: d, tag: tagDeuda(d) }));

// ── 7. HTML ────────────────────────────────────────────────────────────────
const generadoEn = new Date().toLocaleString('es-CO', {
  timeZone: 'America/Bogota',
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

const TAG_COLORS = {
  DevOps:  { bg: '#dbeafe', fg: '#1e40af' },
  UI:      { bg: '#fce7f3', fg: '#9d174d' },
  Datos:   { bg: '#d1fae5', fg: '#065f46' },
  Infra:   { bg: '#fef3c7', fg: '#92400e' },
  UX:      { bg: '#ede9fe', fg: '#5b21b6' },
  General: { bg: '#f1f5f9', fg: '#475569' },
};

function tagBadge(tag) {
  const c = TAG_COLORS[tag] || TAG_COLORS.General;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${c.bg};color:${c.fg}">${escHtml(tag)}</span>`;
}

function ticketCard(ticket, desc, accent) {
  return `<div style="background:#fff;border-radius:8px;padding:11px 13px;margin-bottom:8px;border-left:3px solid ${accent};box-shadow:0 1px 2px rgba(0,0,0,.07)">
      <div style="font-size:11px;font-weight:700;color:${accent};margin-bottom:3px;text-transform:uppercase;letter-spacing:.03em">${escHtml(ticket)}</div>
      <div style="font-size:12px;color:#374151;line-height:1.45">${escHtml(desc)}</div>
    </div>`;
}

const COL = `display:flex;flex-direction:column;min-width:0;background:#f8fafc;border-radius:10px;padding:16px;`;
const HEAD = (color) =>
  `font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:${color};border-radius:6px;padding:6px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;`;
const BODY = `overflow-y:auto;max-height:540px;padding-right:2px;`;

const colCompletado = `<div style="${COL}">
    <div style="${HEAD('#16a34a')}"><span>Completado</span><span style="font-size:17px;font-weight:800">${completados.length}</span></div>
    <div style="${BODY}">
      ${completados.map(t => ticketCard(t.ticket, t.estado, '#16a34a')).join('\n      ')}
    </div>
  </div>`;

const colProximo = `<div style="${COL}">
    <div style="${HEAD('#d97706')}"><span>Próximo</span><span style="font-size:17px;font-weight:800">${proximo.length}</span></div>
    <div style="${BODY}">
      ${proximo.length
        ? proximo.map(t => ticketCard(t.ticket, t.descripcion, '#d97706')).join('\n      ')
        : '<div style="color:#9ca3af;font-size:12px;padding:8px 0">Sin bloqueantes activos</div>'}
    </div>
  </div>`;

const colPostGoLive = `<div style="${COL}">
    <div style="${HEAD('#6b7280')}"><span>Post go-live</span><span style="font-size:17px;font-weight:800">${postGoLiveTickets.length}</span></div>
    <div style="${BODY}">
      ${postGoLiveTickets.map(t =>
          ticketCard(t.ticket, `${t.descripcion}${t.detalle ? ' · ' + t.detalle : ''}`, '#6b7280')
        ).join('\n      ')}
    </div>
  </div>`;

const deudaGrid = deudaCards.map(({ texto, tag }) =>
  `<div style="background:#fff;border-radius:8px;padding:12px 14px;border:1px solid #e5e7eb;display:flex;flex-direction:column;gap:6px">
      ${tagBadge(tag)}
      <div style="font-size:11.5px;color:#374151;line-height:1.45">${escHtml(texto)}</div>
    </div>`
).join('\n    ');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flujo · Kanban</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4f8; color: #111827; min-height: 100vh; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
  </style>
</head>
<body>
  <div style="max-width:1280px;margin:0 auto;padding:24px 16px 48px">

    <!-- Header -->
    <div style="background:#1e3a5f;color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
          <h1 style="font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px">Flujo · Kanban</h1>
          <span style="background:rgba(255,255,255,.15);border-radius:5px;padding:3px 10px;font-size:12.5px;opacity:.9">📍 ${escHtml(faseActual)}</span>
        </div>
        <div style="font-size:11px;opacity:.55;padding-top:4px;white-space:nowrap">Generado ${escHtml(generadoEn)}</div>
      </div>
    </div>

    <!-- Kanban 3 columnas -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px">
      ${colCompletado}
      ${colProximo}
      ${colPostGoLive}
    </div>

    <!-- Deuda técnica -->
    <div style="background:#f8fafc;border-radius:10px;padding:20px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6b7280">Deuda técnica conocida</span>
        <span style="font-size:16px;font-weight:800;color:#374151">${deudaCards.length}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px">
    ${deudaGrid}
      </div>
    </div>

  </div>
</body>
</html>`;

writeFileSync(outPath, html, 'utf-8');
const total = completados.length + proximo.length + postGoLiveTickets.length;
console.log(`kanban.html generado — ${total} tickets, ${deudaCards.length} items deuda`);
