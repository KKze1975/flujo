"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function RegistroPage() {
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
    <div className="min-h-screen bg-gray-50">
      <header
        className="flex items-center gap-3 px-4 py-4 text-white"
        style={{ background: "#1e3a5f" }}
      >
        <Link href="/" className="text-white/60 hover:text-white text-sm leading-none">←</Link>
        <h1 className="text-sm font-semibold">Registro rápido</h1>
        {mesActivo && (
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{mesActivo}</span>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {estado === "idle" && <InputRegistro onSubmit={handleSubmitInput} />}

        {estado === "procesando" && (
          <div className="flex flex-col items-center gap-3 py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#1e3a5f", borderTopColor: "transparent" }}
            />
            <p className="text-sm text-gray-500">Claude está interpretando el gasto...</p>
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
          <ConfirmacionExito resultado={resultado} onNuevoRegistro={reset} />
        )}
      </main>
    </div>
  );
}
