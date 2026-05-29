"use client";

import Icon from "@/components/ui/Icon";

interface Resultado {
  nombreConcepto: string | null;
  clasificado: boolean;
}

interface Props {
  resultado: Resultado;
  onNuevoRegistro: () => void;
}

export default function ConfirmacionExito({ resultado, onNuevoRegistro }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 18, alignItems: "center", textAlign: "center" }}>
      <div className="ok-pop" style={{
        width: 76, height: 76, borderRadius: 999, background: "var(--pos)", color: "#fff",
        display: "grid", placeItems: "center",
      }}>
        <Icon name="check" size={38} />
      </div>
      <div>
        <p style={{
          fontFamily: "var(--font-bricolage, system-ui)",
          fontWeight: 700, fontSize: 19, color: "var(--ink)", margin: 0,
        }}>
          {resultado.clasificado ? "Gasto registrado" : "Gasto guardado"}
        </p>
        <p className="fl-muted" style={{ marginTop: 6 }}>
          {resultado.clasificado && resultado.nombreConcepto
            ? `"${resultado.nombreConcepto}" marcado como ejecutado`
            : "Guardado como pendiente de clasificación"}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button type="button" className="fl-btn primary block" onClick={onNuevoRegistro}>
          <Icon name="plus" size={16} /> Nuevo registro
        </button>
      </div>
    </div>
  );
}
