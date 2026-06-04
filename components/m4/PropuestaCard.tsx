"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { Movimiento } from "@/lib/data/types";
import type { InterpretacionM4, FuentePago } from "@/app/api/registro/interpretar/route";

type Actor = "camilo" | "angie";
type Semana = "S1" | "S2" | "S3" | "S4";

export interface ConfirmacionPayload {
  movimientoId: string | null;
  descripcion: string;
  monto: number;
  semana: Semana;
  fuente: FuentePago;
  ejecutor: Actor;
}

interface Props {
  interpretacion: InterpretacionM4;
  movimientos: Movimiento[];
  cargando: boolean;
  onConfirmar: (payload: ConfirmacionPayload) => void;
  onCancelar: () => void;
}

const FUENTES: { value: FuentePago; label: string }[] = [
  { value: "en_mano", label: "En mano" },
  { value: "nequi",   label: "Nequi"   },
  { value: "camilo",  label: "NU Camilo" },
  { value: "angie",   label: "NU Angie"  },
];

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const CONF_CLASS: Record<string, string> = {
  alta: "pos", media: "warn", baja: "neg",
};

function COP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

export default function PropuestaCard({ interpretacion, movimientos, cargando, onConfirmar, onCancelar }: Props) {
  const movimientosPendientes = movimientos
    .filter((m) => m.estado === "pendiente" || m.tipoSnapshot === "pago_fraccionado")
    .sort((a, b) => (a.semana ?? "").localeCompare(b.semana ?? "") || a.nombreSnapshot.localeCompare(b.nombreSnapshot));

  const sugerencia = interpretacion.concepto_sugerido.toLowerCase();
  const sugerido =
    movimientosPendientes.find((m) => m.nombreSnapshot.toLowerCase().includes(sugerencia)) ??
    movimientosPendientes.find((m) => sugerencia.includes(m.nombreSnapshot.toLowerCase())) ??
    null;

  const [movimientoId, setMovimientoId] = useState<string | null>(sugerido?.id ?? null);
  const [descripcion, setDescripcion] = useState(interpretacion.descripcion);
  const [monto, setMonto] = useState(interpretacion.monto);
  const [semana, setSemana] = useState<Semana>(interpretacion.semana);
  const [fuente, setFuente] = useState<FuentePago>(interpretacion.fuente);
  const [ejecutor, setEjecutor] = useState<Actor>("camilo");

  const movSeleccionado = movimientosPendientes.find((m) => m.id === movimientoId) ?? null;
  const categoriaLabel = movSeleccionado?.categoriaSnapshot ?? interpretacion.categoria;
  const confClass = CONF_CLASS[interpretacion.confianza] ?? "";

  function handleConfirmar() {
    if (monto <= 0) return;
    onConfirmar({ movimientoId, descripcion, monto, semana, fuente, ejecutor });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="fl-ai-pill"><Icon name="sparkle" size={14} fill /> Claude interpretó tu gasto</span>
        <span className={`fl-badge ${confClass}`}>
          <span className="dot" />Confianza {interpretacion.confianza}
        </span>
      </div>

      <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 17 }}>

        {/* Vinculación al concepto */}
        {movimientoId ? (
          <div style={{
            background: "var(--pos-soft)", borderRadius: 12, padding: "10px 13px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <Icon name="check" size={15} style={{ color: "var(--pos)" }} />
            <span style={{ fontSize: 13, color: "var(--pos)", fontWeight: 600 }}>
              Vinculado a "{movSeleccionado?.nombreSnapshot}"
            </span>
          </div>
        ) : (
          <div style={{
            background: "var(--warn-soft)", borderRadius: 12, padding: "10px 13px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <Icon name="info" size={15} style={{ color: "var(--warn)" }} />
            <span style={{ fontSize: 12.5, color: "var(--warn)", fontWeight: 600 }}>
              Sin concepto fijo · se guarda como gasto variable
            </span>
          </div>
        )}

        {/* Concepto selector */}
        <div className="fl-field">
          <label>Concepto en H2</label>
          <select
            value={movimientoId ?? ""}
            onChange={(e) => setMovimientoId(e.target.value || null)}
            className="fl-input"
            style={{ appearance: "auto" }}
          >
            <option value="">— Sin concepto (gasto variable) —</option>
            {movimientosPendientes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.semana} — {m.nombreSnapshot} ({COP(m.montoPresupuestado)})
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div className="fl-field">
          <label>Descripción</label>
          <div className="fl-input">{descripcion}</div>
        </div>

        {/* Monto + Categoría */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fl-field">
            <label>Monto</label>
            <input
              type="number"
              value={monto}
              min={0}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="fl-input"
              style={{ fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
            />
          </div>
          <div className="fl-field">
            <label>Categoría</label>
            <div style={{ display: "flex", alignItems: "center", height: 41 }}>
              <span className="fl-chip" style={{ fontSize: 12 }}>{categoriaLabel}</span>
            </div>
          </div>
        </div>

        {/* Semana + Fuente */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fl-field">
            <label>Semana</label>
            <select
              value={semana}
              onChange={(e) => setSemana(e.target.value as Semana)}
              className="fl-input"
              style={{ appearance: "auto" }}
            >
              {SEMANAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fl-field">
            <label>Fuente</label>
            <select
              value={fuente}
              onChange={(e) => setFuente(e.target.value as FuentePago)}
              className="fl-input"
              style={{ appearance: "auto" }}
            >
              {FUENTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* ¿Quién pagó? */}
        <div className="fl-field">
          <label>¿Quién pagó?</label>
          <div className="fl-tabs">
            {(["camilo", "angie"] as Actor[]).map((a) => (
              <button
                key={a}
                type="button"
                className={`fl-tab${ejecutor === a ? " on" : ""}`}
                onClick={() => setEjecutor(a)}
              >
                <span className={`fl-person ${a === "camilo" ? "c" : "a"}`}>
                  {a === "camilo" ? "C" : "A"}
                </span>
                {a === "camilo" ? "Camilo" : "Angie"}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
          <button type="button" className="fl-btn ghost" onClick={onCancelar}>
            <Icon name="pencil" size={15} />
          </button>
          <button
            type="button"
            className="fl-btn primary block"
            onClick={handleConfirmar}
            disabled={cargando || monto <= 0}
          >
            {cargando ? "Guardando…" : <><Icon name="check" size={16} /> Confirmar gasto</>}
          </button>
        </div>
      </div>
    </div>
  );
}
