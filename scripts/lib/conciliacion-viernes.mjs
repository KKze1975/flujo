// SEMANAS-VIERNES-01 — lógica de CONCILIACIÓN de la semana de transición (2026-09 S5 -> 2026-10 S1).
// Módulo puro, sin credenciales ni red: lo comparten
//   scripts/migrar-semana-transicion-viernes.mjs  (lee/escribe el Sheet)
//   scripts/simular-conciliacion-viernes.ts       (simula en memoria sobre un snapshot)
//
// Decisión de Camilo (1 oct 2026): la S5 de septiembre deja de existir; sus movimientos se concilian con
// la planeación/ejecución de octubre S1. REEMPLAZAN, no duplican: por concepto queda UNA fila en
// 2026-10 S1 con el estado real; si la fila de sep S5 trae ejecución, esa ejecución prevalece.
//
// Representación: cada tab es un arreglo de filas crudas (string[][]) con encabezado en [0]; "fila" es el
// número de fila de la hoja (índice + 1). El id está siempre en la columna 0 del rango leído.
// Un plan es una lista de OPERACIONES {tab, tipo: update|delete, id, esperado:{mes,semana}, set?}; la misma
// lista se aplica en memoria (aplicarOps) y contra el Sheet (script), así lo simulado es lo que se escribe.

export const MES_ORIGEN = "2026-09", SEM_ORIGEN = "S5";
export const MES_DESTINO = "2026-10", SEM_DESTINO = "S1";
export const VENTANA_DESDE = "2026-09-28", VENTANA_HASTA = "2026-10-04";

export const CAMPOS_EJECUCION = [
  "estado", "monto_ejecutado", "desviacion", "ejecutor",
  "fuente_en_mano", "fuente_nequi", "fuente_camilo", "fuente_angie",
  "fecha_ejecucion", "razon_desviacion", "monto_ejecutado_camilo", "monto_ejecutado_angie",
];

// Estado "pendiente" limpio (idéntico al de una fila H2 sin ejecutar).
export const CAMPOS_REVERTIR = {
  estado: "pendiente", monto_ejecutado: "", desviacion: "", ejecutor: "",
  fuente_en_mano: "FALSE", fuente_nequi: "FALSE", fuente_camilo: "FALSE", fuente_angie: "FALSE",
  fecha_ejecucion: "", razon_desviacion: "", monto_ejecutado_camilo: "", monto_ejecutado_angie: "",
};

export const norm = (v) => (v ?? "").toString().trim();
const num = (v) => { const n = Number(norm(v).replace(/,/g, "")); return Number.isFinite(n) ? n : NaN; };
const mismoMonto = (a, b) => { const x = num(a), y = num(b); return Number.isNaN(x) || Number.isNaN(y) ? norm(a) === norm(b) : x === y; };

// Items de un tab: [{fila, id, get(nombre)}] (omite filas sin id).
function items(rows) {
  if (!rows || rows.length === 0) return { headers: [], lista: [] };
  const headers = rows[0];
  const idx = (n) => headers.indexOf(n);
  const lista = rows.slice(1).map((r, i) => ({
    fila: i + 2, r, id: norm(r[0]),
    get: (n) => (idx(n) === -1 ? "" : norm(r[idx(n)])),
  })).filter((x) => x.id);
  return { headers, lista };
}

const esEjecutado = (e) => e === "ejecutado";

/**
 * Calcula el plan de conciliación.
 * @param tablas {H2, H3, H4B, H5B} filas crudas con encabezado
 * @param opts {h2S2?: 'revertir'|'retirar', h4b?: 'oct'|'sep'}
 */
export function planificar(tablas, opts = {}) {
  const ops = [];
  const pendientes = []; // decisiones sin resolver (bloquean --apply)
  const informes = [];

  // ── H2 ────────────────────────────────────────────────────────────────
  const h2 = items(tablas.H2);
  const enOrigen = h2.lista.filter((x) => x.get("mes") === MES_ORIGEN && x.get("semana") === SEM_ORIGEN);
  const enDestino = h2.lista.filter((x) => x.get("mes") === MES_DESTINO && x.get("semana") === SEM_DESTINO);
  const conteoConceptoOrigen = {};
  for (const R of enOrigen) conteoConceptoOrigen[R.get("id_concepto")] = (conteoConceptoOrigen[R.get("id_concepto")] ?? 0) + 1;

  const filasH2 = [];
  for (const R of enOrigen) {
    const idc = R.get("id_concepto");
    const Ts = idc ? enDestino.filter((t) => t.get("id_concepto") === idc) : [];
    const Rinfo = { estado: R.get("estado"), monto: R.get("monto_ejecutado"), presup: R.get("monto_presupuestado"), fecha: R.get("fecha_ejecucion") };
    const fila = {
      filaR: R.fila, idR: R.id, concepto: R.get("nombre_snapshot"), R: Rinfo, T: null, nTs: Ts.length,
      codigo: "", accion: "", resultado: "", nota: "", resuelta: true,
    };
    const perdidos = ["comprobante_url", "notas"].filter((c) => R.get(c));
    const avisoPerdida = perdidos.length ? ` R tiene ${perdidos.join("/")} (se pierde; queda en el backup).` : "";
    const delR = { tab: "H2", tipo: "delete", id: R.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN } };
    const resumenT = (T, extra = {}) => {
      const e = extra.estado ?? T.get("estado");
      const m = extra.monto_ejecutado ?? T.get("monto_ejecutado");
      const f = extra.fecha_ejecucion ?? T.get("fecha_ejecucion");
      return `${MES_DESTINO} ${SEM_DESTINO} ${e}${esEjecutado(e) ? ` ejec=${m} (${f})` : ` presup=${T.get("monto_presupuestado")}`}`;
    };

    if (conteoConceptoOrigen[idc] > 1 && idc) {
      fila.codigo = "f"; fila.accion = "DECISIÓN: varias filas de sep S5 con el mismo concepto"; fila.resuelta = false;
      fila.resultado = "(sin resolver)";
      pendientes.push(`H2 fila ${R.fila}: concepto ${idc} repetido en sep S5`);
      filasH2.push(fila); continue;
    }
    if (Ts.length > 1) {
      fila.codigo = "f"; fila.accion = `DECISIÓN: ${Ts.length} filas del concepto en ${MES_DESTINO} ${SEM_DESTINO}`; fila.resuelta = false;
      fila.resultado = "(sin resolver)";
      fila.T = { fila: Ts.map((t) => t.fila).join("+"), id: Ts.map((t) => t.id).join("+"), estado: "", monto: "", presup: "", fecha: "" };
      pendientes.push(`H2 fila ${R.fila}: ${Ts.length} filas T para concepto ${idc}`);
      filasH2.push(fila); continue;
    }
    if (Ts.length === 0) {
      fila.codigo = "e"; fila.accion = `REUBICAR a ${MES_DESTINO} ${SEM_DESTINO}`;
      fila.resultado = `${MES_DESTINO} ${SEM_DESTINO} ${Rinfo.estado}${esEjecutado(Rinfo.estado) ? ` ejec=${Rinfo.monto} (${Rinfo.fecha})` : ` presup=${Rinfo.presup}`}`;
      ops.push({ tab: "H2", tipo: "update", id: R.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN }, set: { mes: MES_DESTINO, semana: SEM_DESTINO } });
      filasH2.push(fila); continue;
    }
    const T = Ts[0];
    const Tinfo = { fila: T.fila, id: T.id, estado: T.get("estado"), monto: T.get("monto_ejecutado"), presup: T.get("monto_presupuestado"), fecha: T.get("fecha_ejecucion") };
    fila.T = Tinfo;
    const presupDifiere = !mismoMonto(Rinfo.presup, Tinfo.presup);
    if (esEjecutado(Rinfo.estado)) {
      if (!esEjecutado(Tinfo.estado)) {
        // a) fusionar ejecución de R en T
        const set = {};
        for (const c of CAMPOS_EJECUCION) set[c] = R.get(c);
        let nota = "";
        if (presupDifiere) {
          const ej = num(R.get("monto_ejecutado")), pT = num(Tinfo.presup);
          if (!Number.isNaN(ej) && !Number.isNaN(pT)) set.desviacion = String(ej - pT);
          nota = ` presup R=${Rinfo.presup} vs T=${Tinfo.presup}: se conserva el de T y la desviación se recalcula.`;
        }
        fila.codigo = "a"; fila.accion = "FUSIONAR ejecución de R en T + RETIRAR R";
        fila.resultado = resumenT(T, set);
        fila.nota = (nota + avisoPerdida).trim();
        ops.push({ tab: "H2", tipo: "update", id: T.id, esperado: { mes: MES_DESTINO, semana: SEM_DESTINO }, set });
        ops.push(delR);
      } else if (mismoMonto(Rinfo.monto, Tinfo.monto)) {
        // b) ambas ejecutadas, mismo monto
        fila.codigo = "b"; fila.accion = "T sobrevive (ambas ejecutadas, mismo monto) + RETIRAR R";
        fila.resultado = resumenT(T);
        fila.nota = `ambas ejecutadas; se conserva fecha de T (${Tinfo.fecha}), R tenía ${Rinfo.fecha}; verificar que no sea gasto doble real.${avisoPerdida}`;
        ops.push(delR);
      } else {
        fila.codigo = "b"; fila.accion = "DECISIÓN: montos distintos"; fila.resuelta = false;
        fila.resultado = "(sin resolver)";
        fila.nota = `R ejec=${Rinfo.monto} vs T ejec=${Tinfo.monto}`;
        pendientes.push(`H2 fila ${R.fila}: montos ejecutados distintos (R ${Rinfo.monto} vs T ${Tinfo.monto})`);
      }
    } else {
      // c/d) R sin ejecutar: T prevalece
      let cod = "c", acc = "T sobrevive (planeación de octubre) + RETIRAR R", nota = "";
      if (Rinfo.estado === "pendiente" && Tinfo.estado === "no_aplica") { cod = "d"; acc = "T sobrevive como no_aplica + RETIRAR R"; nota = "verificar (R pendiente, T no_aplica por decisión de octubre)."; }
      else if (Rinfo.estado === "pendiente" && Tinfo.estado === "pendiente") { cod = "c"; }
      else { cod = "c"; nota = `verificar (R ${Rinfo.estado}, T ${Tinfo.estado}).`; }
      if (presupDifiere) nota = `${nota} presup R=${Rinfo.presup} vs T=${Tinfo.presup}: prevalece T.`.trim();
      fila.codigo = cod; fila.accion = acc; fila.resultado = resumenT(T); fila.nota = (nota + avisoPerdida).trim();
      ops.push(delR);
    }
    filasH2.push(fila);
  }

  // Ambiguos: filas de oct con semana distinta de S1 y ejecución en la ventana, cuyo concepto ya tiene fila en S1.
  const ambiguos = [];
  for (const x of h2.lista) {
    if (x.get("mes") !== MES_DESTINO || x.get("semana") === SEM_DESTINO) continue;
    const f = x.get("fecha_ejecucion");
    if (!f || f < VENTANA_DESDE || f > VENTANA_HASTA) continue;
    const idc = x.get("id_concepto");
    const s1 = idc ? enDestino.filter((t) => t.get("id_concepto") === idc) : [];
    if (s1.length === 0) continue;
    ambiguos.push({
      fila: x.fila, id: x.id, concepto: x.get("nombre_snapshot"), mes: x.get("mes"), semana: x.get("semana"),
      estado: x.get("estado"), monto: x.get("monto_ejecutado"), presup: x.get("monto_presupuestado"), fecha: f,
      s1: s1.map((t) => ({ fila: t.fila, id: t.id, estado: t.get("estado"), monto: t.get("monto_ejecutado"), fecha: t.get("fecha_ejecucion") })),
      finalRevertir: `${x.get("semana")} pendiente presup=${x.get("monto_presupuestado")} (sin ejecución; el plan de ${x.get("semana")} se conserva)`,
      finalRetirar: `fila borrada (el concepto queda solo en S1 y en las semanas restantes)`,
    });
  }
  if (ambiguos.length) {
    if (opts.h2S2 === "revertir") {
      for (const a of ambiguos) ops.push({ tab: "H2", tipo: "update", id: a.id, esperado: { mes: a.mes, semana: a.semana }, set: { ...CAMPOS_REVERTIR } });
    } else if (opts.h2S2 === "retirar") {
      for (const a of ambiguos) ops.push({ tab: "H2", tipo: "delete", id: a.id, esperado: { mes: a.mes, semana: a.semana } });
    } else {
      pendientes.push(`${ambiguos.length} fila(s) H2 de octubre ejecutadas en la ventana fuera de S1: falta --h2-ejecutadas-s2 revertir|retirar`);
    }
  }

  // ── H3 ────────────────────────────────────────────────────────────────
  const h3 = items(tablas.H3);
  const filasH3 = h3.lista.filter((x) => x.get("mes") === MES_ORIGEN && x.get("semana") === SEM_ORIGEN).map((x) => ({
    fila: x.fila, id: x.id, descripcion: x.get("descripcion"), monto: x.get("monto"), fecha: x.get("fecha"),
  }));
  for (const c of filasH3) ops.push({ tab: "H3", tipo: "update", id: c.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN }, set: { mes: MES_DESTINO, semana: SEM_DESTINO } });

  // ── H4B (ingreso Angie) ──────────────────────────────────────────────
  const h4 = items(tablas.H4B);
  const candH4 = h4.lista.filter((x) => x.get("mes") === MES_ORIGEN && x.get("semana") === SEM_ORIGEN)
    .map((x) => ({ fila: x.fila, id: x.id, monto: x.get("monto"), fecha: x.get("fecha") }));
  const destH4 = h4.lista.filter((x) => x.get("mes") === MES_DESTINO && x.get("semana") === SEM_DESTINO)
    .map((x) => ({ fila: x.fila, id: x.id, monto: x.get("monto"), fecha: x.get("fecha") }));
  const h4b = { candidatas: candH4, destino: destH4, opciones: {}, accion: "" };
  for (const c of candH4) {
    if (destH4.length === 0) {
      h4b.accion = `REUBICAR a ${MES_DESTINO} ${SEM_DESTINO} (no hay ingreso Angie en octubre S1)`;
      h4b.opciones = { oct: `${MES_DESTINO} S1 ingreso Angie = ${c.monto} (${c.fecha})`, sep: `${MES_DESTINO} S1 ingreso Angie = ${c.monto} (${c.fecha})` };
      ops.push({ tab: "H4B", tipo: "update", id: c.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN }, set: { mes: MES_DESTINO, semana: SEM_DESTINO } });
      continue;
    }
    if (destH4.length > 1) {
      pendientes.push(`H4B: ${destH4.length} ingresos Angie en ${MES_DESTINO} ${SEM_DESTINO} (no inequívoco)`);
      continue;
    }
    const T = destH4[0];
    h4b.accion = "DECISIÓN de Camilo: --h4b oct|sep";
    h4b.opciones = {
      oct: `T sobrevive: ingreso Angie oct S1 = ${T.monto} (${T.fecha}); se RETIRA la de sep (${c.monto}, ${c.fecha})`,
      sep: `T se actualiza a monto ${c.monto} y fecha ${c.fecha}; se RETIRA la de sep`,
    };
    if (opts.h4b === "oct") {
      ops.push({ tab: "H4B", tipo: "delete", id: c.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN } });
    } else if (opts.h4b === "sep") {
      ops.push({ tab: "H4B", tipo: "update", id: T.id, esperado: { mes: MES_DESTINO, semana: SEM_DESTINO }, set: { monto: c.monto, fecha: c.fecha } });
      ops.push({ tab: "H4B", tipo: "delete", id: c.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN } });
    } else {
      pendientes.push("H4B: falta --h4b oct|sep");
    }
  }

  // ── H5B (plan de semana) ─────────────────────────────────────────────
  const h5 = items(tablas.H5B);
  const filasH5B = h5.lista.filter((x) => x.get("mes") === MES_ORIGEN && x.get("semana") === SEM_ORIGEN)
    .map((x) => ({ fila: x.fila, id: x.id, aporte: x.get("aporte_angie_planeado"), total: x.get("total_comprometido") }));
  for (const p of filasH5B) ops.push({ tab: "H5B", tipo: "delete", id: p.id, esperado: { mes: MES_ORIGEN, semana: SEM_ORIGEN } });
  const planDestino = h5.lista.filter((x) => x.get("mes") === MES_DESTINO && x.get("semana") === SEM_DESTINO).map((x) => x.id);
  if (filasH5B.length) informes.push(`H5B: plan en ${MES_DESTINO} ${SEM_DESTINO}: ${planDestino.length ? planDestino.join(", ") : "no existe"} (informativo; el plan de sep S5 se retira y no se migra).`);

  const totalAcciones = filasH2.length + ambiguos.length + filasH3.length + candH4.length + filasH5B.length;
  return { filasH2, ambiguos, filasH3, h4b, filasH5B, ops, pendientes, informes, totalAcciones };
}

// ── Aplicación en memoria (misma lista de operaciones que se escribe en el Sheet) ──
export function aplicarOps(tablas, ops) {
  const out = {};
  for (const k of Object.keys(tablas)) out[k] = (tablas[k] ?? []).map((r) => [...r]);
  // updates primero, luego deletes (igual que el script).
  const ordenadas = [...ops.filter((o) => o.tipo === "update"), ...ops.filter((o) => o.tipo === "delete")];
  for (const o of ordenadas) {
    const rows = out[o.tab];
    const headers = rows[0];
    const idxs = rows.map((r, i) => (i > 0 && norm(r[0]) === o.id ? i : -1)).filter((i) => i > 0);
    if (idxs.length !== 1) throw new Error(`${o.tab} ${o.id}: ${idxs.length} filas con ese id`);
    const i = idxs[0];
    for (const [c, v] of Object.entries(o.esperado ?? {})) {
      if (norm(rows[i][headers.indexOf(c)]) !== v) throw new Error(`${o.tab} ${o.id}: ${c} esperado ${v} y es ${norm(rows[i][headers.indexOf(c)])}`);
    }
    if (o.tipo === "update") {
      for (const [c, v] of Object.entries(o.set)) {
        const j = headers.indexOf(c);
        if (j === -1) throw new Error(`${o.tab}: columna ${c} inexistente`);
        while (rows[i].length <= j) rows[i].push("");
        rows[i][j] = v;
      }
    } else {
      rows.splice(i, 1);
    }
  }
  return out;
}

// Filas normalizadas (rellenadas a la longitud del encabezado, celdas recortadas) para comparar.
export function normalizarTabla(rows) {
  if (!rows || rows.length === 0) return [];
  const n = rows[0].length;
  return rows.map((r) => Array.from({ length: n }, (_, j) => norm(r[j])));
}

// ── Presentación ──────────────────────────────────────────────────────────
function tablaTexto(cols, filas) {
  const w = cols.map((c, i) => Math.max(c.length, ...filas.map((f) => String(f[i] ?? "").length)));
  const linea = (f) => f.map((v, i) => String(v ?? "").padEnd(w[i])).join(" | ");
  return [linea(cols), w.map((n) => "-".repeat(n)).join("-+-"), ...filas.map(linea)].join("\n");
}

export function imprimirPlan(plan, log = console.log) {
  log(`\n=== H2 — conciliación fila a fila (${MES_ORIGEN} ${SEM_ORIGEN} -> ${MES_DESTINO} ${SEM_DESTINO}) ===`);
  if (plan.filasH2.length === 0) log("(sin filas de origen)");
  else {
    const cols = ["fila H2", "id_movimiento", "concepto", "R estado/monto/fecha", "T fila/id/estado/monto/fecha", "ACCIÓN", "estado final resultante"];
    const filas = plan.filasH2.map((f) => [
      f.filaR, f.idR, f.concepto,
      `${f.R.estado}/${esEjecutado(f.R.estado) ? f.R.monto : f.R.presup}/${f.R.fecha || "-"}`,
      f.T ? `${f.T.fila}/${f.T.id}/${f.T.estado}/${esEjecutado(f.T.estado) ? f.T.monto : f.T.presup}/${f.T.fecha || "-"}` : "(sin T)",
      `${f.codigo}) ${f.accion}`, f.resultado,
    ]);
    log(tablaTexto(cols, filas));
    for (const f of plan.filasH2.filter((x) => x.nota)) log(`  nota fila ${f.filaR} (${f.concepto}): ${f.nota}`);
  }
  log(`\n=== AMBIGUO — decisión de Camilo (H2 de octubre ejecutadas ${VENTANA_DESDE}..${VENTANA_HASTA} fuera de S1, concepto ya en S1) ===`);
  if (plan.ambiguos.length === 0) log("(ninguna)");
  for (const a of plan.ambiguos) {
    log(`- fila ${a.fila} id=${a.id} ${a.concepto} ${a.mes} ${a.semana} ${a.estado} ejec=${a.monto} fecha=${a.fecha}`);
    for (const s of a.s1) log(`    ya en S1: fila ${s.fila} id=${s.id} ${s.estado} ejec=${s.monto} fecha=${s.fecha}`);
    log(`    --h2-ejecutadas-s2 revertir -> ${a.finalRevertir}`);
    log(`    --h2-ejecutadas-s2 retirar  -> ${a.finalRetirar}`);
  }
  log("\n=== H3 (consumos) a reubicar ===");
  if (plan.filasH3.length === 0) log("(ninguna)");
  for (const c of plan.filasH3) log(`- fila ${c.fila} id=${c.id} "${c.descripcion}" monto=${c.monto} fecha=${c.fecha}: REUBICAR a ${MES_DESTINO} ${SEM_DESTINO}`);
  log("\n=== H4B (ingreso Angie) ===");
  if (plan.h4b.candidatas.length === 0) log("(sin candidata)");
  for (const c of plan.h4b.candidatas) log(`- sep S5 fila ${c.fila} id=${c.id} monto=${c.monto} fecha=${c.fecha}`);
  for (const d of plan.h4b.destino) log(`- oct S1 fila ${d.fila} id=${d.id} monto=${d.monto} fecha=${d.fecha}`);
  if (plan.h4b.accion) {
    log(`  ${plan.h4b.accion}`);
    log(`    --h4b oct -> ${plan.h4b.opciones.oct}`);
    log(`    --h4b sep -> ${plan.h4b.opciones.sep}`);
  }
  log("\n=== H5B (plan de semana) ===");
  if (plan.filasH5B.length === 0) log("(ninguno)");
  for (const p of plan.filasH5B) log(`- fila ${p.fila} id=${p.id} aporte_angie=${p.aporte} total_comprometido=${p.total}: RETIRAR (no se migra)`);
  for (const i of plan.informes) log(`  ${i}`);
}

export function describirOp(o) {
  return `${o.tipo === "delete" ? "BORRAR" : "ACTUALIZAR"} ${o.tab} id=${o.id}${o.set ? " " + JSON.stringify(o.set) : ""}`;
}
