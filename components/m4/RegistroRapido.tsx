"use client";

import { useState, useEffect } from "react";
import InputRegistro, { type Payload } from "@/components/m4/InputRegistro";
import Icon from "@/components/ui/Icon";
import { mesActual } from "@/lib/utils/fecha";

type Estado = "idle" | "registrando" | "exito";

export default function RegistroRapido({ onClose, onSuccess }: { onClose?: () => void; onSuccess?: () => void }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (estado === "exito") onSuccess?.();
  }, [estado]);

  async function handleSubmitInput(payload: Payload) {
    const mesActivo = mesActual();
    setEstado("registrando");
    setError(null);
    try {
      const descripcion = payload.tipo === "texto" ? payload.contenido : "Imagen de recibo";
      const res = await fetch("/api/registro/sin-concepto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mes: mesActivo,
          descripcion,
          monto: payload.monto,
          ejecutor: payload.ejecutor,
          fuente: payload.fuente,
        }),
      });
      const resData = await res.json() as { id?: string; clasificado?: boolean; error?: string };
      if (!res.ok) throw new Error(resData.error ?? "Error al guardar.");

      // Fire-and-forget: clasificar en background vía Claude
      fetch(`/api/consumos/${resData.id}/clasificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion, mes: mesActivo }),
      }).catch(() => {});

      setEstado("exito");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
      setEstado("idle");
    }
  }

  function reset() {
    setEstado("idle");
    setError(null);
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

      {estado === "registrando" && (
        <div style={{ padding: "44px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="ai-spin" />
          <span className="fl-ai-pill">Guardando registro…</span>
        </div>
      )}

      {estado === "exito" && (
        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name="check" size={32} style={{ color: "var(--pos)" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--pos)" }}>Registrado</p>
          <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Claude clasifica en background</p>
          <button type="button" className="fl-btn ghost sm" onClick={reset}>
            Registrar otro
          </button>
        </div>
      )}
    </div>
  );
}
