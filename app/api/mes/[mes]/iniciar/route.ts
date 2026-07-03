import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Movimiento, Semana } from "@/lib/data/types";

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

  const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

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

  const desdeH1: Omit<Movimiento, "id">[] = conceptos
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
      return [{ ...base, semana: c.semanaDefault === "variable" ? null : (c.semanaDefault as Semana) }];
    });

  // Conceptos pospuestos del mes anterior pasan a pendiente en este mes.
  // TICKET-B-GUARDIA-01 P2: si ya existe una fila para ese conceptoId (creada
  // por mover_mes_siguiente antes de que se corriera iniciar), se omite aquí
  // para no duplicarla — la fila existente queda intacta.
  const carryover: Omit<Movimiento, "id">[] = movimientosPrevios
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
      semana: m.semana,
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
