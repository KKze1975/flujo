import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Concepto, Movimiento, Semana, Categoria, TipoConcepto } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS_VALIDAS: Semana[] = ["S1", "S2", "S3", "S4"];
const CATEGORIAS_VALIDAS: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
];
const TIPOS_VALIDOS: TipoConcepto[] = ["fijo", "pago_fraccionado", "discrecional"];
const CICLOS_VALIDOS = ["solo_este_mes", "cuotas", "permanente"] as const;
type CicloVida = (typeof CICLOS_VALIDOS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: {
    nombre: string;
    categoria: Categoria;
    tipo: TipoConcepto;
    monto: number;
    semana: Semana;
    cicloVida: CicloVida;
    notas?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const { nombre, categoria, tipo, monto, semana, cicloVida, notas } = body;

  if (!nombre?.trim()) return Response.json({ error: "nombre requerido." }, { status: 400 });
  if (!CATEGORIAS_VALIDAS.includes(categoria)) return Response.json({ error: "categoria inválida." }, { status: 400 });
  if (!TIPOS_VALIDOS.includes(tipo)) return Response.json({ error: "tipo inválido." }, { status: 400 });
  if (typeof monto !== "number" || monto <= 0) return Response.json({ error: "monto inválido." }, { status: 400 });
  if (!SEMANAS_VALIDAS.includes(semana)) return Response.json({ error: "semana inválida." }, { status: 400 });
  if (!CICLOS_VALIDOS.includes(cicloVida)) return Response.json({ error: "cicloVida inválido." }, { status: 400 });

  const provider = getProvider();
  const today = new Date().toISOString().slice(0, 10);
  const esSoloEsteMes = cicloVida === "solo_este_mes";

  try {
    const conceptoData: Omit<Concepto, "id"> = {
      nombre: nombre.trim(),
      categoria,
      tipo,
      frecuencia: "mensual",
      mesActivoBimestral: null,
      monto,
      semanaDefault: semana,
      requiereAprobacion: false,
      estado: esSoloEsteMes ? "retirado" : "activo",
      fechaRetiro: esSoloEsteMes ? today : null,
      notas: notas?.trim() || null,
    };
    const concepto = await provider.createConcepto(conceptoData);

    const movData: Omit<Movimiento, "id"> = {
      conceptoId: concepto.id,
      mes,
      nombreSnapshot: concepto.nombre,
      categoriaSnapshot: concepto.categoria,
      tipoSnapshot: concepto.tipo,
      semana,
      montoPresupuestado: monto,
      montoEjecutado: null,
      desviacion: null,
      estado: "pendiente",
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
    const [movimiento] = await provider.crearMovimientosMes([movData]);

    return Response.json({ concepto, movimiento }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
