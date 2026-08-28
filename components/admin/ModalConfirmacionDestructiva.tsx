"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

interface Props {
  title: string;
  description: string;
  confirmationTextRequired: string; // ej. "2026-06"
  placeholder: string;
  dangerLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ModalConfirmacionDestructiva({
  title,
  description,
  confirmationTextRequired,
  placeholder,
  dangerLabel = "Confirmar y ejecutar",
  onConfirm,
  onClose,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = inputText.trim() === confirmationTextRequired.trim();

  async function handleConfirm() {
    if (!isValid || loading) return;
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al ejecutar la acción.");
      setLoading(false);
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
          maxWidth: 420,
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
            <Icon name="alert" />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{title}</h3>
            <p className="fl-faint" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {description}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            Para confirmar, escribe <strong style={{ color: "var(--ink)" }}>{confirmationTextRequired}</strong> a continuación:
          </p>
          <div className="fl-field">
            <input
              className="fl-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        {error && <p className="fl-neg" style={{ fontSize: 13, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            className="fl-btn"
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
          <button
            className="fl-btn block"
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            style={{
              flex: 1,
              backgroundColor: isValid ? "var(--neg)" : "var(--surface-2)",
              color: isValid ? "#fff" : "var(--ink-faint)",
              borderColor: "transparent",
              cursor: isValid && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Ejecutando…" : dangerLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
