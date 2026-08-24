import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";
import { semanasDeMes } from "@/lib/utils/fecha";

const MES_REGEX = /^\d{4}-\d{2}$/;

type PatchBody =
  | {
      tipo: "ejecutar";
      montoEjecutado: number;
      fuenteEnMano: boolean;
      fuenteNequi: boolean;
      fuenteCamilo: boolean;
      fuenteAngie: boolean;
      ejecutor?: "camilo" | "angie";
      razonDesviacion?: string | null;
      semana?: Semana;
    }
  | { tipo: "posponer"; nuevaSemana?: Semana; razonPostergacion?: string | null }
  | { tipo: "no_aplica" }
  | { tipo: "reasignar_semana"; semana: Semana }
  | { tipo: "actualizar_monto"; montoPresupuestado: number }
  | { tipo: "mover_mes_siguiente"; semana?: Semana }
  | { tipo: "revertir_mes_siguiente" }
  | { tipo: "revertir_ejecucion" };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string; id: string }> }
) {
  const { mes, id } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body?.tipo || !["ejecutar", "posponer", "no_aplica", "reasignar_semana", "actualizar_monto", "mover_mes_siguiente", "revertir_mes_siguiente", "revertir_ejecucion"].includes(body.tipo)) {
    return Response.json({ error: "tipo inválido." }, { status: 400 });
  }

  const provider = getProvider();

  try {
    const movimientos = await provider.getMovimientos(mes);
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) {
      return Response.json({ error: "Movimiento no encontrado." }, { status: 404 });
    }

    const hoy = new Date().toISOString().split("T")[0];

    let patch: Parameters<typeof provider.updateMovimiento>[1];

    if (body.tipo === "ejecutar") {
      const montoEjecutado = body.montoEjecutado;
      if (typeof montoEjecutado !== "number" || montoEjecutado < 0) {
        return Response.json({ error: "montoEjecutado inválido." }, { status: 400 });
      }
      patch = {
        estado: "ejecutado",
        montoEjecutado,
        desviacion: montoEjecutado - mov.montoPresupuestado,
        ejecutor: body.ejecutor ?? "camilo",
        fuenteEnMano: body.fuenteEnMano,
        fuenteNequi: body.fuenteNequi,
        fuenteCamilo: body.fuenteCamilo,
        fuenteAngie: body.fuenteAngie,
        fechaEjecucion: hoy,
        razonDesviacion: body.razonDesviacion ?? null,
        ...(body.semana && mov.semana === null ? { semana: body.semana } : {}),
      };
    } else if (body.tipo === "posponer") {
      if (body.nuevaSemana && !semanasDeMes(mes).includes(body.nuevaSemana)) {
        return Response.json({ error: "nuevaSemana inválida." }, { status: 400 });
      }
      if (body.nuevaSemana) {
        const cierresSemana = await provider.getCierresSemana(mes);
        if (cierresSemana.some(c => c.semana === body.nuevaSemana)) {
          return Response.json(
            { error: `${body.nuevaSemana} ya tiene cierre. No se puede posponer a una semana cerrada.` },
            { status: 400 }
          );
        }
      }
      patch = {
        estado: "pospuesto",
        ...(body.nuevaSemana ? { semana: body.nuevaSemana } : {}),
        razonPostergacion: body.razonPostergacion ?? null,
      };
    } else if (body.tipo === "reasignar_semana") {
      if (!semanasDeMes(mes).includes(body.semana)) {
        return Response.json({ error: "semana inválida." }, { status: 400 });
      }
      patch = { semana: body.semana };
    } else if (body.tipo === "actualizar_monto") {
      if (typeof body.montoPresupuestado !== "number" || body.montoPresupuestado < 0) {
        return Response.json({ error: "montoPresupuestado inválido." }, { status: 400 });
      }
      patch = { montoPresupuestado: body.montoPresupuestado };
    } else if (body.tipo === "mover_mes_siguiente") {
      const [year, month] = mes.split("-").map(Number);
      const nextMes = month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, "0")}`;

      const conceptos = await provider.getConceptos();
      const concepto = conceptos.find((c) => c.id === mov.conceptoId);

      // DT-M1M4-NULL-01 / B3: un concepto de semana variable nunca puede
      // trasladarse con semana:null (M1 lo excluye de cualquier filtro
      // específico, M4 lo incluye en las 4 simultáneamente mientras esté
      // pendiente — asimetría confirmada por auditoría de código). Exigir
      // semana destino explícita en el body cuando aplica.
      if (concepto?.semanaDefault === "variable" && !body.semana) {
        return Response.json(
          { error: "Este concepto requiere semana destino explícita para trasladarlo al mes siguiente." },
          { status: 400 }
        );
      }
      if (body.semana && !semanasDeMes(nextMes).includes(body.semana)) {
        return Response.json({ error: "semana inválida." }, { status: 400 });
      }

      // TICKET-B-GUARDIA-01 P1: un concepto no semanal solo puede tener una
      // fila activa por mes en el mes destino. Si ya existe (por un traslado
      // previo o por iniciar), no se traslada de nuevo.
      if (concepto?.frecuencia !== "semanal") {
        const movsDestino = await provider.getMovimientos(nextMes);
        const yaExiste = movsDestino.some((m) => m.conceptoId === mov.conceptoId);
        if (yaExiste) {
          return Response.json(
            { error: `Ya existe un movimiento de este concepto en ${nextMes}. No se puede trasladar de nuevo.` },
            { status: 400 }
          );
        }
      }

      patch = { estado: "pospuesto_mes_siguiente" };
      // Create corresponding H2 row in the next month so it shows in planning
      await provider.crearMovimientosMes([{
        conceptoId: mov.conceptoId,
        mes: nextMes,
        nombreSnapshot: mov.nombreSnapshot,
        categoriaSnapshot: mov.categoriaSnapshot,
        tipoSnapshot: mov.tipoSnapshot,
        semana: body.semana ?? null,
        montoPresupuestado: mov.montoPresupuestado,
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
        pendienteAprobacion: mov.pendienteAprobacion,
        notas: null,
        montoEjecutadoCamilo: null,
        montoEjecutadoAngie: null,
        idRecargaOrigen: null,
      }]);
    } else if (body.tipo === "revertir_mes_siguiente") {
      patch = { estado: "pendiente", razonPostergacion: null };
    } else if (body.tipo === "revertir_ejecucion") {
      patch = {
        estado: "pendiente",
        montoEjecutado: null,
        desviacion: null,
        ejecutor: null,
        fuenteEnMano: false,
        fuenteNequi: false,
        fuenteCamilo: false,
        fuenteAngie: false,
        fechaEjecucion: null,
      };
    } else {
      patch = { estado: "no_aplica" };
    }

    const updated = await provider.updateMovimiento(id, patch);

    // Instrumentación H9 Log de Eventos (PANEL-LOG-EVENTOS-01)
    if (["ejecutar", "posponer", "mover_mes_siguiente", "revertir_mes_siguiente", "revertir_ejecucion", "reasignar_semana"].includes(body.tipo)) {
      const tipoEventoMap: Record<string, import("@/lib/data/types").TipoEventoLog> = {
        ejecutar: "movimiento_ejecutar",
        posponer: "movimiento_posponer",
        mover_mes_siguiente: "movimiento_mover_mes_siguiente",
        revertir_mes_siguiente: "movimiento_revertir_mes_siguiente",
        revertir_ejecucion: "movimiento_revertir_ejecucion",
        reasignar_semana: "movimiento_reasignar_semana",
      };
      const tipoEvento = tipoEventoMap[body.tipo];
      if (tipoEvento) {
        await provider.createEventoLog({
          timestamp: new Date().toISOString(),
          tipoEvento,
          entidadId: id,
          mes,
          detalle: JSON.stringify({
            conceptoId: mov.conceptoId,
            nombre: mov.nombreSnapshot,
            patch,
          }),
        }).catch((err) => console.error("Error silencioso registrando evento log:", err));
      }
    }

    return Response.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}

