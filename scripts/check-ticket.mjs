// Verifica que un ticket esté listo para pasar a un agente de ejecución
// (Antigravity o Claude Code) antes de invocarlo manualmente. También
// puede listar el siguiente ticket disponible para un agente dado, en vez
// de que el agente razone a mano sobre INDICE.md (fuente real de un bug:
// Antigravity listó como disponible un ticket bloqueado por dependencia, y
// omitió uno que sí estaba listo — ver ESTADO.md, sesión 15 ago 2026).
//
// Uso:
//   node scripts/check-ticket.mjs <TICKET_ID>          — GO/NO-GO de un ticket puntual
//   node scripts/check-ticket.mjs --next <AGENTE>       — siguiente ticket listo para ese agente
//   node scripts/check-ticket.mjs --audit-cierres       — commits de cierre citados que no existen
//
// Origen: sesión de vault, 11 ago 2026 — Camilo activa Antigravity
// manualmente, sin que Claude Code medie como gate. Este script reemplaza
// esa lectura manual del ticket por una verificación determinística.
// Extendido 15 ago 2026 con --next tras confirmar que dejarle a un LLM la
// lectura de INDICE.md + frontmatter produce errores de dependencia reales.
// Extendido de nuevo el mismo día con --audit-cierres tras un incidente
// real: Antigravity marcó 3 tickets `completado` citando commits de cierre
// que nunca se crearon. No evita que vuelva a pasar, pero lo detecta en
// segundos en vez de depender de que un Tester lo note leyendo a mano.

import { readFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ticketsDir = join(__dir, "..", "tickets");

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fm;
}

// Columnas de tickets/INDICE.md, en orden real (ver header de la tabla):
// orden | ticket_id | estado | tier | agente_ejecucion | dependencias | commit | notas
function parseIndiceTable(md) {
  const rows = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue; // fila separadora
    const cells = line.split("|").map((c) => c.trim());
    const inner = cells.slice(1, -1); // descarta bordes vacíos del split
    if (inner.length < 7) continue;
    if (inner[0] === "orden") continue; // header
    rows.push({
      orden: inner[0],
      ticket_id: inner[1],
      estado: inner[2],
      tier: inner[3],
      agente_ejecucion: inner[4],
      dependencias: inner[5],
      commit: inner[6],
      notas: inner[7] ?? "",
    });
  }
  return rows;
}

function loadIndice() {
  const indice = parseIndiceTable(
    readFileSync(join(ticketsDir, "INDICE.md"), "utf-8")
  );
  return { indice, indiceById: new Map(indice.map((r) => [r.ticket_id, r])) };
}

// Evalúa un ticket_id contra sus propias reglas de admisión (fm.estado,
// tier B sin HALT, dependencias en INDICE.md, WIP=1, desincronización
// ticket-vs-índice). No imprime nada — eso lo hace el caller.
function evaluateTicket(ticketId, indice, indiceById) {
  const ticketPath = join(ticketsDir, `${ticketId}.md`);
  if (!existsSync(ticketPath)) {
    return { fm: null, problems: [`no existe tickets/${ticketId}.md`], warnings: [] };
  }

  const fm = parseFrontmatter(readFileSync(ticketPath, "utf-8"));
  if (!fm) {
    return { fm: null, problems: [`${ticketId}.md no tiene frontmatter válido`], warnings: [] };
  }

  const problems = [];
  const warnings = [];

  // 1. estado descartado/bloqueado — nunca se construye
  if (["descartado", "bloqueado"].includes(fm.estado)) {
    problems.push(`estado del ticket es "${fm.estado}" — no se construye.`);
  }

  // 2. Tier B sin HALT resuelto
  if (
    fm.tier === "B" &&
    !["aprobado", "diagnostico_listo", "completado", "completado_parcial"].includes(fm.estado)
  ) {
    problems.push(
      `tier B con estado "${fm.estado}" — HALT no resuelto, falta aprobación explícita de Camilo antes de construir.`
    );
  }

  // 3. Dependencias — todas deben estar completado
  const deps = (fm.dependencias || "ninguna")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d && d.toLowerCase() !== "ninguna");
  for (const dep of deps) {
    const depRow = indiceById.get(dep);
    if (!depRow) {
      warnings.push(`dependencia "${dep}" no aparece en INDICE.md — verificar a mano.`);
      continue;
    }
    if (depRow.estado !== "completado") {
      problems.push(`depende de "${dep}", que sigue en estado "${depRow.estado}" (no "completado").`);
    }
  }

  // 4. I-09 — WIP=1
  const activos = indice.filter((r) => r.estado === "activo" && r.ticket_id !== ticketId);
  if (activos.length > 0) {
    warnings.push(
      `I-09 (WIP=1): ya hay ticket(s) activo(s) — ${activos.map((r) => r.ticket_id).join(", ")}. Requiere excepción explícita de Camilo antes de abrir otro.`
    );
  }

  // 5. Ticket file vs INDICE.md desincronizados
  const indiceRow = indiceById.get(ticketId);
  if (indiceRow && indiceRow.estado !== fm.estado) {
    warnings.push(
      `estado desincronizado: tickets/${ticketId}.md dice "${fm.estado}", INDICE.md dice "${indiceRow.estado}".`
    );
  }
  // 6. agente_ejecucion desincronizado entre el ticket y el índice
  if (indiceRow && fm.agente_ejecucion && indiceRow.agente_ejecucion !== fm.agente_ejecucion) {
    warnings.push(
      `agente_ejecucion desincronizado: tickets/${ticketId}.md dice "${fm.agente_ejecucion}", INDICE.md dice "${indiceRow.agente_ejecucion}".`
    );
  }

  return { fm, problems, warnings };
}

function printVerdict(ticketId, fm, problems, warnings) {
  console.log(`\n── check-ticket: ${ticketId} ──`);
  console.log(
    `tier: ${fm.tier ?? "?"} | estado: ${fm.estado ?? "?"} | agente_ejecucion: ${fm.agente_ejecucion ?? "(no declarado)"}`
  );

  if (problems.length > 0) {
    console.log(`\n❌ NO-GO\n`);
    problems.forEach((p) => console.log(`  - ${p}`));
    if (warnings.length > 0) {
      console.log(`\n⚠️  Además:`);
      warnings.forEach((w) => console.log(`  - ${w}`));
    }
    console.log("");
    return false;
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  GO CON ADVERTENCIA — confirma antes de continuar:\n`);
    warnings.forEach((w) => console.log(`  - ${w}`));
    console.log(
      `\nSi confirmas, construir con: agente_ejecucion = ${fm.agente_ejecucion ?? "no declarado, definir antes de construir"}\n`
    );
    return true;
  }

  console.log(
    `\n✅ GO — construir con agente_ejecucion: ${fm.agente_ejecucion ?? "no declarado, definir antes de construir"}\n`
  );
  return true;
}

function runSingle(ticketId) {
  const { indice, indiceById } = loadIndice();
  const { fm, problems, warnings } = evaluateTicket(ticketId, indice, indiceById);
  if (!fm) {
    console.log(`\n❌ NO-GO — ${problems[0]}\n`);
    process.exit(1);
  }
  const ok = printVerdict(ticketId, fm, problems, warnings);
  process.exit(ok ? 0 : 1);
}

// --next <agente>: en vez de que el agente lea INDICE.md y razone sobre
// dependencias por su cuenta (falló en la práctica — ver comentario de
// cabecera), esta función hace la misma evaluación determinística de
// evaluateTicket() sobre cada candidato y devuelve el primero limpio.
function runNext(agente) {
  if (!agente) {
    console.error("Uso: node scripts/check-ticket.mjs --next <agente_ejecucion>");
    process.exit(1);
  }

  const { indice, indiceById } = loadIndice();

  const activos = indice.filter((r) => r.estado === "activo");
  if (activos.length > 0) {
    console.log(
      `\n⏸️  Hay ticket(s) activo(s) ahora mismo: ${activos.map((r) => r.ticket_id).join(", ")}.`
    );
    console.log(
      `I-09 (WIP=1): no se toma un ticket nuevo mientras otro sigue abierto, sin importar quién lo esté ejecutando. No es "no tienes nada asignado" — es que ya hay uno en curso.\n`
    );
    process.exit(0);
  }

  const candidatos = indice
    .filter((r) => r.agente_ejecucion === agente)
    .filter((r) => ["propuesto", "aprobado", "diagnostico_listo"].includes(r.estado))
    .sort((a, b) => Number(a.orden) - Number(b.orden));

  if (candidatos.length === 0) {
    console.log(
      `\nNo hay ningún ticket con agente_ejecucion: ${agente} en estado construible (propuesto/aprobado/diagnostico_listo) ahora mismo.\n`
    );
    process.exit(0);
  }

  for (const cand of candidatos) {
    const { fm, problems, warnings } = evaluateTicket(cand.ticket_id, indice, indiceById);
    if (!fm) continue;
    if (problems.length === 0) {
      console.log(`\n✅ Siguiente ticket para "${agente}": ${cand.ticket_id} (orden ${cand.orden})`);
      if (warnings.length > 0) {
        console.log(`\n⚠️  Con advertencia — confirma con Camilo antes de construir:`);
        warnings.forEach((w) => console.log(`  - ${w}`));
      }
      console.log(`\nAntes de construir: node scripts/check-ticket.mjs ${cand.ticket_id}`);
      console.log(`Luego lee tickets/${cand.ticket_id}.md completo — ese es tu Goal y tu DoD.\n`);
      process.exit(0);
    }
  }

  console.log(
    `\nHay ${candidatos.length} ticket(s) de "${agente}" en estado propuesto/aprobado, pero ninguno está listo — todos tienen dependencias pendientes o son Tier B sin HALT resuelto:\n`
  );
  for (const cand of candidatos) {
    const { fm, problems } = evaluateTicket(cand.ticket_id, indice, indiceById);
    if (!fm) continue;
    console.log(`  - ${cand.ticket_id}: ${problems.join(" / ")}`);
  }
  console.log("");
  process.exit(0);
}

function commitExists(ref) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], {
      cwd: join(__dir, ".."),
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function commitLabelExistsInLog(label) {
  try {
    const out = execFileSync(
      "git",
      ["log", "--all", "--oneline", "--grep", label, "-F"],
      { cwd: join(__dir, ".."), stdio: "pipe" }
    ).toString();
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

// Un "commit" citado en INDICE.md puede ser un hash real (`6d7a6ad`), una
// lista de hashes (`a+b`), o una etiqueta descriptiva que aparece como
// primera línea de un commit real (`UBER-01-cierre`) — no siempre es un
// ref de git válido por sí solo. Se prueban ambos caminos antes de marcar
// sospechoso.
function verifyCommitRef(raw) {
  const cleaned = raw.replace(/`/g, "").trim();
  if (!cleaned) return { ok: false, reason: "sin commit citado" };

  const candidates = cleaned.split(/[+, ]+/).filter(Boolean);
  for (const c of candidates) {
    if (/^[0-9a-f]{6,40}$/i.test(c) && commitExists(c)) continue;
    if (commitLabelExistsInLog(c)) continue;
    return { ok: false, reason: `"${c}" no aparece en git log ni como commit real` };
  }
  return { ok: true, reason: "" };
}

function runAuditCierres() {
  const { indice } = loadIndice();
  const completados = indice.filter((r) => r.estado === "completado");

  const sospechosos = [];
  for (const row of completados) {
    const { ok, reason } = verifyCommitRef(row.commit || "");
    if (!ok) sospechosos.push({ ...row, reason });
  }

  console.log(
    `\n── audit-cierres: ${completados.length} ticket(s) completado(s), ${sospechosos.length} sospechoso(s) ──\n`
  );

  if (sospechosos.length === 0) {
    console.log("✅ Todos los commits de cierre citados existen en git.\n");
    process.exit(0);
  }

  for (const s of sospechosos) {
    console.log(`  ⚠️  ${s.ticket_id} (orden ${s.orden}) — ${s.reason}`);
  }
  console.log(
    "\nEsto no prueba que el trabajo esté mal — prueba que el commit de\ncierre citado no existe. Verificar manualmente antes de confiar en el\nestado \"completado\".\n"
  );
  process.exit(1);
}

function main() {
  const [a, b] = process.argv.slice(2);
  if (a === "--next") {
    runNext(b);
    return;
  }
  if (a === "--audit-cierres") {
    runAuditCierres();
    return;
  }
  if (!a) {
    console.error(
      "Uso:\n  node scripts/check-ticket.mjs <TICKET_ID>\n  node scripts/check-ticket.mjs --next <agente_ejecucion>\n  node scripts/check-ticket.mjs --audit-cierres"
    );
    process.exit(1);
  }
  runSingle(a);
}

main();
