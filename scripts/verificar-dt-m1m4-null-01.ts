// Verificación de DT-M1M4-NULL-01 (opción B3 aprobada por Camilo).
// Uso: node --experimental-strip-types scripts/verificar-dt-m1m4-null-01.ts
//
// Contra el Sheet DEV (GOOGLE_SHEET_ID en .env.local) vía el servidor dev real
// (http://localhost:3000) — nunca contra producción. Requiere `npm run dev`
// corriendo.
//
// Qué prueba:
// 1. Un concepto con semanaDefault "variable" NO puede trasladarse al mes
//    siguiente (`mover_mes_siguiente`) sin `semana` explícita en el body —
//    antes del fix, el endpoint aceptaba la request igual y escribía
//    `semana: null` en el mes destino (causa raíz de DT-M1M4-NULL-01).
// 2. Cuando sí viene `semana` explícita, el movimiento en el mes destino
//    queda escrito con esa semana real (nunca null) — antes del fix, el
//    body.semana se ignoraba por completo.
// 3. Consecuencia observable en M4 (`getMovimientosByMesYSemana`): el
//    movimiento trasladado aparece SOLO en la semana elegida, no en las 4
//    simultáneamente (síntoma que motivó el ticket).
//
// Este script deja datos de prueba en el Sheet dev (conceptos/movimientos
// TEST-DT-M1M4-NULL-01-*) — limpiar con scripts/limpiar-dt-m1m4-null-01.ts
// al cerrar el ticket.

const BASE = "http://localhost:3000";
const MES_ORIGEN = "2027-06";
const MES_DESTINO = "2027-07";

let fallos = 0;
let total = 0;

function assertEq(label: string, actual: unknown, esperado: unknown) {
  total++;
  const ok = actual === esperado;
  if (!ok) {
    fallos++;
    console.error(`FALLO  ${label}: esperado=${JSON.stringify(esperado)} actual=${JSON.stringify(actual)}`);
  } else {
    console.log(`ok     ${label} = ${JSON.stringify(actual)}`);
  }
}

function assertTrue(label: string, cond: boolean, detalle = "") {
  total++;
  if (!cond) {
    fallos++;
    console.error(`FALLO  ${label} ${detalle}`);
  } else {
    console.log(`ok     ${label}`);
  }
}

type Json = Record<string, unknown>;

async function crearConceptoDePrueba(nombre: string): Promise<{ conceptoId: string; movId: string }> {
  const res = await fetch(`${BASE}/api/mes/${MES_ORIGEN}/conceptos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre,
      categoria: "Recreación",
      tipo: "discrecional",
      monto: 10000,
      semana: "S1",
      cicloVida: "solo_este_mes",
      notas: "Datos de prueba DT-M1M4-NULL-01 — limpiar antes de cerrar el ticket.",
    }),
  });
  const data = (await res.json()) as Json;
  if (!res.ok) throw new Error(`crear concepto ${nombre} falló: ${JSON.stringify(data)}`);
  const concepto = data.concepto as Json;
  const movimiento = data.movimiento as Json;

  const patchRes = await fetch(`${BASE}/api/conceptos/${concepto.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ semanaDefault: "variable" }),
  });
  if (!patchRes.ok) throw new Error(`patch semanaDefault variable falló para ${nombre}`);

  return { conceptoId: concepto.id as string, movId: movimiento.id as string };
}

async function moverMesSiguiente(movId: string, semana?: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${BASE}/api/mes/${MES_ORIGEN}/movimientos/${movId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(semana ? { tipo: "mover_mes_siguiente", semana } : { tipo: "mover_mes_siguiente" }),
  });
  const body = (await res.json()) as Json;
  return { status: res.status, body };
}

async function getMovimientoDestino(conceptoId: string): Promise<Json | undefined> {
  const res = await fetch(`${BASE}/api/mes/${MES_DESTINO}`);
  const data = (await res.json()) as Json[];
  return data.find((m) => m.conceptoId === conceptoId);
}

async function apareceEnSemana(semana: string, movId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/mes/${MES_DESTINO}/semana/${semana}`);
  const data = (await res.json()) as Json;
  const movimientos = data.movimientos as Json[];
  return movimientos.some((m) => m.id === movId);
}

async function main() {
  console.log(`\n=== DT-M1M4-NULL-01 — verificación contra ${BASE} (Sheet dev) ===\n`);

  // ── Concepto A: guardia de validación (semana faltante debe rechazarse) ──
  console.log("--- Concepto A: mover_mes_siguiente SIN semana explícita ---");
  const a = await crearConceptoDePrueba("TEST-DT-M1M4-NULL-01-A");
  const rA = await moverMesSiguiente(a.movId);
  assertEq("A: status HTTP al mover sin semana (concepto variable)", rA.status, 400);

  if (rA.status === 200) {
    // Bug de origen reproducido: la request se aceptó y escribió semana:null.
    const destA = await getMovimientoDestino(a.conceptoId);
    assertTrue("A: (reproducción bug) movimiento destino existe", !!destA);
    if (destA) {
      assertEq("A: (reproducción bug) semana escrita en destino", destA.semana, null);
      for (const s of ["S1", "S2", "S3", "S4"]) {
        const visible = await apareceEnSemana(s, destA.id as string);
        assertTrue(`A: (reproducción bug M4) aparece en ${s} pese a semana null`, visible);
      }
    }
  }

  // ── Concepto B: semana explícita debe respetarse end-to-end ──
  console.log("\n--- Concepto B: mover_mes_siguiente CON semana='S2' explícita ---");
  const b = await crearConceptoDePrueba("TEST-DT-M1M4-NULL-01-B");
  const rB = await moverMesSiguiente(b.movId, "S2");
  assertEq("B: status HTTP al mover con semana='S2'", rB.status, 200);

  const destB = await getMovimientoDestino(b.conceptoId);
  assertTrue("B: movimiento destino existe", !!destB);
  if (destB) {
    assertEq("B: semana escrita en destino == 'S2' (nunca null)", destB.semana, "S2");

    const enS2 = await apareceEnSemana("S2", destB.id as string);
    assertTrue("B: aparece en GET .../semana/S2", enS2);

    for (const s of ["S1", "S3", "S4"]) {
      const visible = await apareceEnSemana(s, destB.id as string);
      assertTrue(`B: NO aparece en GET .../semana/${s}`, !visible, `(visible=${visible})`);
    }

    // Consecuencia en M1: el filtro `m.semana === s` (MesM1.tsx / VistaPlanificacion.tsx)
    // ahora es consistente con M4 — visible solo bajo el filtro S2.
    for (const s of ["S1", "S2", "S3", "S4"]) {
      const visibleEnM1 = destB.semana === s;
      assertEq(`B: M1 filter (m.semana === '${s}')`, visibleEnM1, s === "S2");
    }
  }

  console.log(`\n=== ${total - fallos}/${total} OK, ${fallos} FALLO(S) ===\n`);
  process.exit(fallos > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR FATAL:", e);
  process.exit(1);
});
