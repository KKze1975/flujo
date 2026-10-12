import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { NuevoMovimiento, Semana } from "@/lib/data/types";
import { semanasDeMes } from "@/lib/utils/fecha";

const MES_REGEX = /^\d{4}-\d{2}$/;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesNombre(mes: string): string {
  const month = parseInt(mes.split("-")[1], 10);
  return MESES[month - 1] ?? "";
}

function mesPrevio(mes: string): string {
  const [yearStr, monthStr] = mes.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function conceptoActivoEnMes(concepto: {
  estado: string;
  frecuencia: string;
  mesActivoBimestral: string | null;
}, mes: string): boolean {
  if (concepto.estado !== "activo") return false;
  if (concepto.frecuencia !== "bimestral") return true;
  if (!concepto.mesActivoBimestral) return false;
  const nombre = mesNombre(mes);
  return concepto.mesActivoBimestral
    .split(",")
    .map((m) => m.trim())
    .includes(nombre);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json(
      { error: "Formato de mes inválido. Use YYYY-MM." },
      { status: 400 }
    );
  }

  const provider = getProvider();

  const [existentes, conceptos, movimientosPrevios] = await Promise.all([
    provider.getMovimientos(mes),
    provider.getConceptos(),
    provider.getMovimientos(mesPrevio(mes)),
  ]);

  // TICKET-B-GUARDIA-01 P2: si ya hay filas en el mes destino, distinguir entre
  // "el mes ya fue inicializado de verdad" (bloquear, comportamiento previo)
  // y "solo hay filas de traslado creadas por mover_mes_siguiente antes de
  // iniciar" (dejar continuar e inicializar el resto del mes sin duplicar
  // esas filas). Un concepto con estado: pospuesto_mes_siguiente en el mes
  // anterior es la única fuente legítima de una fila preexistente aquí.
  const conceptoIdsPospuestos = new Set(
    movimientosPrevios
      .filter((m) => m.estado === "pospuesto_mes_siguiente")
      .map((m) => m.conceptoId)
  );
  const soloTrasladosPrevios =
    existentes.length > 0 &&
    existentes.every((m) => conceptoIdsPospuestos.has(m.conceptoId));

  if (existentes.length > 0 && !soloTrasladosPrevios) {
    return Response.json(
      { error: "El mes ya fue inicializado.", mes },
      { status: 409 }
    );
  }

  const conceptoIdsExistentes = new Set(existentes.map((m) => m.conceptoId));

  // SEMANA5-01: incluye S5 condicionalmente (meses de 29-31 dias).
  const SEMANAS: Semana[] = semanasDeMes(mes);

  const baseFields = {
    montoEjecutado: null,
    desviacion: null,
    estado: "pendiente" as const,
    ejecutor: null,
    fuenteEnMano: false,
    fuenteNequi: false,
    fuenteCamilo: false,
    fuenteAngie: false,
    fechaEjecucion: null,
    razonDesviacion: null,
    razonPostergacion: null,
    comprobanteUrl: null,
    pendienteAprobacion: false,
    notas: null,
    montoEjecutadoCamilo: null,
    montoEjecutadoAngie: null,
    idRecargaOrigen: null,
  };

  // BALANCE-UNIFICADO-01: `semana` nunca queda vacía (I-16). Un concepto NO
  // semanal con semana_default "variable" no tiene semana inequívoca al
  // iniciar el mes: se falla en voz alta, sin escribir nada, en vez de crear
  // una fila con semana null. (Hoy ningún concepto de H1 está en ese caso.)
  const sinSemanaInequivoca = conceptos
    .filter((c) => conceptoActivoEnMes(c, mes))
    .filter((c) => c.frecuencia === "semanal" || !conceptoIdsExistentes.has(c.id))
    .filter((c) => c.frecuencia !== "semanal" && c.semanaDefault === "variable")
    .map((c) => c.nombre);
  const carryoverSinSemana = movimientosPrevios
    .filter((m) => m.estado === "pospuesto_mes_siguiente")
    .filter((m) => !conceptoIdsExistentes.has(m.conceptoId))
    .filter((m) => m.semana === null)
    .map((m) => m.nombreSnapshot);
  if (sinSemanaInequivoca.length > 0 || carryoverSinSemana.length > 0) {
    return Response.json(
      {
        error: "No se puede iniciar el mes: hay movimientos sin semana inequívoca. Asígnales semana antes de iniciar.",
        conceptosSemanaVariable: sinSemanaInequivoca,
        trasladosSinSemana: carryoverSinSemana,
      },
      { status: 400 }
    );
  }

  const desdeH1: NuevoMovimiento[] = conceptos
    .filter((c) => conceptoActivoEnMes(c, mes))
    // TICKET-B-GUARDIA-01 P2: no duplicar la fila regular de un concepto que
    // ya tiene una fila en el mes (traslado previo). Los semanales siempre
    // generan sus 4 filas — su multiplicidad es por diseño, no un traslado.
    .filter((c) => c.frecuencia === "semanal" || !conceptoIdsExistentes.has(c.id))
    .flatMap((c) => {
      const base = {
        ...baseFields,
        conceptoId: c.id,
        mes,
        nombreSnapshot: c.nombre,
        categoriaSnapshot: c.categoria,
        tipoSnapshot: c.tipo,
        montoPresupuestado: c.monto,
      };
      if (c.frecuencia === "semanal") {
        return SEMANAS.map((s) => ({ ...base, semana: s }));
      }
      return [{ ...base, semana: c.semanaDefault as Semana }];
    });

  // Conceptos pospuestos del mes anterior pasan a pendiente en este mes.
  // TICKET-B-GUARDIA-01 P2: si ya existe una fila para ese conceptoId (creada
  // por mover_mes_siguiente antes de que se corriera iniciar), se omite aquí
  // para no duplicarla — la fila existente queda intacta.
  const carryover: NuevoMovimiento[] = movimientosPrevios
    .filter((m) => m.estado === "pospuesto_mes_siguiente")
    .filter((m) => !conceptoIdsExistentes.has(m.conceptoId))
    .map((m) => ({
      ...baseFields,
      conceptoId: m.conceptoId,
      mes,
      nombreSnapshot: m.nombreSnapshot,
      categoriaSnapshot: m.categoriaSnapshot,
      tipoSnapshot: m.tipoSnapshot,
      montoPresupuestado: m.montoPresupuestado,
      semana: m.semana as Semana,
    }));

  const movimientosACrear = [...desdeH1, ...carryover];

  const movimientos = movimientosACrear.length > 0
    ? await provider.crearMovimientosMes(movimientosACrear)
    : [];

  return Response.json(
    { mes, total: movimientos.length, movimientos },
    { status: 201 }
  );
}
