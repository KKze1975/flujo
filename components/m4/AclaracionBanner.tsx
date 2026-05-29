"use client";

import Icon from "@/components/ui/Icon";

interface Props {
  mensaje: string | null;
  confianza: "alta" | "media" | "baja";
  onContinuar: () => void;
}

export default function AclaracionBanner({ mensaje, confianza, onContinuar }: Props) {
  const texto = mensaje ?? (
    confianza === "baja"
      ? "La descripción es un poco ambigua. Podés continuar y ajustar los campos manualmente."
      : "Hay algo que no quedó claro. Revisá los campos antes de confirmar."
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
      <div className="fl-card" style={{
        borderLeft: "3px solid var(--warn)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <span className="fl-badge warn" style={{ alignSelf: "flex-start" }}>
          <Icon name="info" size={12} /> Confianza baja
        </span>
        <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5 }}>
          {texto}
        </p>
        <p className="fl-faint">Podés continuar y ajustar los campos manualmente.</p>
      </div>
      <button type="button" className="fl-btn primary block" onClick={onContinuar}>
        Continuar y revisar
      </button>
    </div>
  );
}
