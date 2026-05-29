"use client";

import { useState, useEffect } from "react";
import InputRegistro from "@/components/m4/InputRegistro";
import AclaracionBanner from "@/components/m4/AclaracionBanner";
import PropuestaCard, { type ConfirmacionPayload } from "@/components/m4/PropuestaCard";
import ConfirmacionExito from "@/components/m4/ConfirmacionExito";
import type { Movimiento } from "@/lib/data/types";
import type { InterpretacionM4 } from "@/app/api/registro/interpretar/route";

type Estado = "idle" | "procesando" | "aclaracion" | "propuesta" | "confirmando" | "exito";
type Resultado = { nombreConcepto: string | null; clasificado: boolean };
type InputPayload =
  | { tipo: "texto"; contenido: string }
  | { tipo: "imagen"; base64: string; mimeType: string };

export default function RegistroRapido({ onClose }: { onClose?: () => void }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [interpretacion, setInterpretacion] = useState<InterpretacionM4 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mesActivo, setMesActivo] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    fetch("/api/meses")
      .then((r) => r.json())
      .then((data: { meses?: { mes: string }[] }) => {
        const meses = (data.meses ?? []).map((m) => m.mes);
        if (meses.length > 0) setMesActivo(meses[meses.length - 1]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mesActivo) return;
    fetch(`/api/mes/${mesActivo}`)
      .then(async (r) => {
        const text = await r.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`HTTP ${r.status} — respuesta no-JSON: ${text.slice(0, 120)}`);
        }
        if (!r.ok) {
          const d = data as { error?: string };
          throw new Error(d.error ?? `HTTP ${r.status}`);
        }
        return data;
      })
      .then((data: unknown) => {
        if (Array.isArray(data)) setMovimientos(data as Movimiento[]);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Error de red";
        setError(`Error cargando movimientos de ${mesActivo}: ${msg}`);
      });
  }, [mesActivo]);

  async function handleSubmitInput(payload: InputPayload) {
    setEstado("procesando");
    setError(null);
    try {
      const conceptosH2 = movimientos
        .filter((m) => m.estado === "pendiente")
        .map((m) => `${m.semana} — ${m.nombreSnapshot}`);
      const res = await fetch("/api/registro/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, conceptosH2 }),
      });
      const data = await res.json() as { error?: string } & Partial<InterpretacionM4>;
      if (!res.ok) throw new Error(data.error ?? "Error interpretando el gasto.");
      const interp = data as InterpretacionM4;
      setInterpretacion(interp);
      if (interp.confianza === "baja" || interp.aclaracion_necesaria !== null) {
        setEstado("aclaracion");
      } else {
        setEstado("propuesta");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
      setEstado("idle");
    }
  }

  async function handleConfirmar(payload: ConfirmacionPayload) {
    if (!mesActivo) return;
    setEstado("confirmando");
    try {
      if (payload.movimientoId) {
        const res = await fetch(`/api/mes/${mesActivo}/movimientos/${payload.movimientoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "ejecutar",
            montoEjecutado: payload.monto,
            fuenteEnMano: payload.fuente === "en_mano",
            fuenteNequi: payload.fuente === "nequi",
            fuenteCamilo: payload.fuente === "camilo",
            fuenteAngie: payload.fuente === "angie",
            ejecutor: payload.ejecutor,
          }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? "Error al ejecutar el movimiento.");
        }
        const mov = movimientos.find((m) => m.id === payload.movimientoId);
        setResultado({ nombreConcepto: mov?.nombreSnapshot ?? null, clasificado: true });
      } else {
        const res = await fetch("/api/registro/sin-concepto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mes: mesActivo,
            semana: payload.semana,
            descripcion: payload.descripcion,
            monto: payload.monto,
            ejecutor: payload.ejecutor,
            fuente: payload.fuente,
          }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? "Error al guardar el registro.");
        }
        setResultado({ nombreConcepto: null, clasificado: false });
      }
      setEstado("exito");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
      setEstado("propuesta");
    }
  }

  function reset() {
    setEstado("idle");
    setInterpretacion(null);
    setError(null);
    setResultado(null);
  }

  return (
    <div>
      {error && (
        <div style={{
          background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 14,
          padding: "12px 16px", fontSize: 13.5, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {estado === "idle" && <InputRegistro onSubmit={handleSubmitInput} />}

      {estado === "procesando" && (
        <div style={{ padding: "44px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="ai-spin" />
          <span className="fl-ai-pill">
            Claude está interpretando…
          </span>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {[100, 72, 86].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}

      {estado === "aclaracion" && interpretacion && (
        <AclaracionBanner
          mensaje={interpretacion.aclaracion_necesaria}
          confianza={interpretacion.confianza}
          onContinuar={() => setEstado("propuesta")}
        />
      )}

      {(estado === "propuesta" || estado === "confirmando") && interpretacion && (
        <PropuestaCard
          interpretacion={interpretacion}
          movimientos={movimientos}
          cargando={estado === "confirmando"}
          onConfirmar={handleConfirmar}
          onCancelar={reset}
        />
      )}

      {estado === "exito" && resultado && (
        <ConfirmacionExito
          resultado={resultado}
          onNuevoRegistro={onClose ?? reset}
        />
      )}
    </div>
  );
}
