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

  const existentes = await provider.getMovimientos(mes);
  if (existentes.length > 0) {
    return Response.json(
      { error: "El mes ya fue inicializado.", mes },
      { status: 409 }
    );
  }

  const conceptos = await provider.getConceptos();

  const base = Date.now();
  const movimientosACrear: Omit<Movimiento, "id">[] = conceptos
    .filter((c) => conceptoActivoEnMes(c, mes))
    .map((c) => ({
      conceptoId: c.id,
      mes,
      nombreSnapshot: c.nombre,
      categoriaSnapshot: c.categoria,
      tipoSnapshot: c.tipo,
      semana: c.semanaDefault === "variable" ? null : (c.semanaDefault as Semana),
      montoPresupuestado: c.monto,
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
    }));

  const movimientos = await provider.crearMovimientosMes(movimientosACrear);

  return Response.json(
    { mes, total: movimientos.length, movimientos },
    { status: 201 }
  );
}
