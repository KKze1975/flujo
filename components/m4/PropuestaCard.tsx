"use client";

import { useState } from "react";
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
  { value: "nequi", label: "Nequi" },
  { value: "camilo", label: "Cuenta Camilo" },
  { value: "angie", label: "Cuenta Angie" },
];

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const CONFIANZA_COLORS: Record<string, string> = {
  alta: "#16a34a",
  media: "#d97706",
  baja: "#dc2626",
};

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

export default function PropuestaCard({ interpretacion, movimientos, cargando, onConfirmar, onCancelar }: Props) {
  const movimientosPendientes = movimientos
    .filter((m) => m.estado === "pendiente")
    .sort((a, b) => (a.semana ?? "").localeCompare(b.semana ?? "") || a.nombreSnapshot.localeCompare(b.nombreSnapshot));

  // Match bidireccional: el nombre de H2 contiene la sugerencia, o la sugerencia contiene el nombre
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

  function handleConfirmar() {
    if (monto <= 0) return;
    onConfirmar({ movimientoId, descripcion, monto, semana, fuente, ejecutor });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Propuesta de Claude</p>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            color: CONFIANZA_COLORS[interpretacion.confianza],
            background: `${CONFIANZA_COLORS[interpretacion.confianza]}18`,
          }}
        >
          Confianza {interpretacion.confianza}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Concepto */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Concepto en H2
            {!movSeleccionado && (
              <span className="ml-2 text-gray-400 font-normal">
                (Claude sugiere: <em>{interpretacion.concepto_sugerido}</em>)
              </span>
            )}
          </label>
          <select
            value={movimientoId ?? ""}
            onChange={(e) => setMovimientoId(e.target.value || null)}
            className="w-full rounded-lg border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 bg-white"
            style={{ borderColor: movimientoId === null ? "#f59e0b" : "#e5e7eb" }}
          >
            <option value="">— Sin concepto vinculado (guarda en H3) —</option>
            {movimientosPendientes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.semana} — {m.nombreSnapshot} ({formatMonto(m.montoPresupuestado)})
              </option>
            ))}
          </select>
          {movimientoId === null && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠ Sin concepto seleccionado — el gasto se guardará como pendiente de clasificación en H3.
            </p>
          )}
        </div>

        {/* Categoria (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
          <span
            className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#e8f0fe", color: "#1e3a5f" }}
          >
            {categoriaLabel}
          </span>
        </div>

        {/* Descripcion */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Monto (COP)</label>
          <input
            type="number"
            value={monto}
            min={0}
            onChange={(e) => setMonto(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
          />
          {movSeleccionado && (
            <p className="mt-0.5 text-xs text-gray-400">
              Presupuestado: {formatMonto(movSeleccionado.montoPresupuestado)}
              {monto !== movSeleccionado.montoPresupuestado && (
                <span className="ml-1" style={{ color: monto > movSeleccionado.montoPresupuestado ? "#dc2626" : "#16a34a" }}>
                  ({monto > movSeleccionado.montoPresupuestado ? "+" : ""}{formatMonto(monto - movSeleccionado.montoPresupuestado)})
                </span>
              )}
            </p>
          )}
        </div>

        {/* Semana + Fuente */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semana</label>
            <select
              value={semana}
              onChange={(e) => setSemana(e.target.value as Semana)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none bg-white"
            >
              {SEMANAS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fuente</label>
            <select
              value={fuente}
              onChange={(e) => setFuente(e.target.value as FuentePago)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none bg-white"
            >
              {FUENTES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ejecutor */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">¿Quién pagó?</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["camilo", "angie"] as Actor[]).map((a) => (
              <button
                key={a}
                onClick={() => setEjecutor(a)}
                className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
                style={{
                  background: ejecutor === a ? "#1e3a5f" : "white",
                  color: ejecutor === a ? "white" : "#6b7280",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando || monto <= 0}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity"
            style={{ background: "#1e3a5f", opacity: cargando || monto <= 0 ? 0.5 : 1 }}
          >
            {cargando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
