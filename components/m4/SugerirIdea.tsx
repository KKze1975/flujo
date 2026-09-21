"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

type Estado = "idle" | "enviando" | "exito";
type Actor = "camilo" | "angie";

export default function SugerirIdea({ onClose, onSuccess }: { onClose?: () => void; onSuccess?: () => void }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);

  const [propuestaPor, setPropuestaPor] = useState<Actor>("camilo");
  const [descripcion, setDescripcion] = useState("");
  const [casoDeUso, setCasoDeUso] = useState("");
  const [motivoImportancia, setMotivoImportancia] = useState("");

  const puedeEnviar =
    descripcion.trim().length > 0 &&
    casoDeUso.trim().length > 0 &&
    motivoImportancia.trim().length > 0;

  async function handleSubmit() {
    if (!puedeEnviar) return;
    setEstado("enviando");
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propuestaPor,
          descripcion: descripcion.trim(),
          casoDeUso: casoDeUso.trim(),
          motivoImportancia: motivoImportancia.trim(),
        }),
      });
      const resData = await res.json() as { idea?: unknown; error?: string };
      if (!res.ok) throw new Error(resData.error ?? "Error al guardar.");
      setEstado("exito");
      onSuccess?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
      setEstado("idle");
    }
  }

  function reset() {
    setEstado("idle");
    setError(null);
    setDescripcion("");
    setCasoDeUso("");
    setMotivoImportancia("");
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

      {estado === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ¿Quién la propone? */}
          <div className="fl-field">
            <label>¿Quién la propone?</label>
            <div className="fl-tabs">
              {(["camilo", "angie"] as Actor[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`fl-tab${propuestaPor === a ? " on" : ""}`}
                  onClick={() => setPropuestaPor(a)}
                >
                  <span className={`fl-person ${a === "camilo" ? "c" : "a"}`}>
                    {a === "camilo" ? "C" : "A"}
                  </span>
                  {a === "camilo" ? "Camilo" : "Angie"}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div style={{
            background: "var(--surface)", borderRadius: "var(--radius-inner)",
            border: "1px solid var(--line)", padding: 14,
          }}>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la idea…"
              rows={2}
              style={{
                border: "none", resize: "none", outline: "none", background: "transparent",
                fontFamily: "inherit", fontSize: 15, color: "var(--ink)", lineHeight: 1.45,
                width: "100%",
              }}
            />
          </div>

          {/* Caso de uso concreto */}
          <div className="fl-field">
            <label>¿En qué momento concreto la usarías?</label>
            <textarea
              value={casoDeUso}
              onChange={(e) => setCasoDeUso(e.target.value)}
              placeholder="Ej. cuando registro un gasto compartido…"
              rows={2}
              className="fl-input"
              style={{ resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Motivo de importancia */}
          <div className="fl-field">
            <label>¿Por qué te parece importante?</label>
            <textarea
              value={motivoImportancia}
              onChange={(e) => setMotivoImportancia(e.target.value)}
              placeholder="Ej. nos ahorraría tiempo cada semana…"
              rows={2}
              className="fl-input"
              style={{ resize: "none", fontFamily: "inherit" }}
            />
          </div>

          <button
            type="button"
            className="fl-btn primary block"
            onClick={handleSubmit}
            disabled={!puedeEnviar}
          >
            <Icon name="send" size={14} /> Enviar idea
          </button>
        </div>
      )}

      {estado === "enviando" && (
        <div style={{ padding: "44px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="ai-spin" />
          <span className="fl-ai-pill">Guardando idea…</span>
        </div>
      )}

      {estado === "exito" && (
        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name="check" size={32} style={{ color: "var(--pos)" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--pos)" }}>Idea registrada</p>
          <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Gracias por la sugerencia</p>
          <button type="button" className="fl-btn ghost sm" onClick={reset}>
            Sugerir otra
          </button>
        </div>
      )}
    </div>
  );
}
