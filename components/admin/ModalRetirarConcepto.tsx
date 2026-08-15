"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import type { Concepto } from "@/lib/data/types";

interface Props {
  onClose: () => void;
  onSuccess: (concepto: Concepto) => void;
}

export default function ModalRetirarConcepto({ onClose, onSuccess }: Props) {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConceptos() {
      try {
        const res = await fetch("/api/conceptos");
        if (res.ok) {
          const data: Concepto[] = await res.json();
          setConceptos(data.filter((c) => c.estado === "activo"));
        } else {
          setError("Error al cargar conceptos.");
        }
      } catch {
        setError("Error de red al cargar conceptos.");
      } finally {
        setLoading(false);
      }
    }
    fetchConceptos();
  }, []);

  const selectedConcepto = conceptos.find((c) => c.id === selectedId);

  async function handleRetirar() {
    if (!selectedId || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conceptos/${selectedId}/retirar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retirar" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al retirar el concepto.");
      }

      const updated: Concepto = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        className="fl-card screen-anim"
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          backgroundColor: "var(--surface)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span
            className="ic"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flex: "none",
              display: "grid",
              placeItems: "center",
              background: "var(--neg-soft)",
              color: "var(--neg)",
            }}
          >
            <Icon name="list" />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              Retirar concepto del catálogo
            </h3>
            <p className="fl-faint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Selecciona un concepto activo para marcarlo como retirado.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="fl-faint" style={{ fontSize: 14 }}>Cargando conceptos activos…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              Concepto activo
            </label>
            <select
              className="fl-input"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError(null);
              }}
              style={{ width: "100%", padding: "10px 12px" }}
            >
              <option value="">-- Seleccionar concepto --</option>
              {conceptos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.categoria}) — ${c.monto.toLocaleString("es-CO")}
                </option>
              ))}
            </select>

            {selectedConcepto && (
              <div
                style={{
                  padding: 10,
                  borderRadius: "var(--radius-inner)",
                  background: "var(--surface-2)",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span><strong>ID:</strong> {selectedConcepto.id}</span>
                <span><strong>Categoría:</strong> {selectedConcepto.categoria}</span>
                <span><strong>Tipo:</strong> {selectedConcepto.tipo}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: "var(--radius-inner)",
              background: "var(--neg-soft)",
              color: "var(--neg)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="fl-btn" type="button" onClick={onClose} disabled={submitting} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="fl-btn block"
            type="button"
            onClick={handleRetirar}
            disabled={!selectedId || submitting}
            style={{
              flex: 1,
              backgroundColor: selectedId ? "var(--neg)" : "var(--surface-2)",
              color: selectedId ? "#fff" : "var(--ink-faint)",
              borderColor: "transparent",
              cursor: selectedId && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Retirando…" : "Retirar concepto"}
          </button>
        </div>
      </div>
    </div>
  );
}
