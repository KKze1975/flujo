"use client";

import { useState } from "react";
import type { IngresoCamilo, CuentaDestino } from "@/lib/data/types";

const CUENTAS: { key: CuentaDestino; label: string }[] = [
  { key: "camilo", label: "Cta. Camilo" },
  { key: "angie", label: "Cta. Angie" },
  { key: "en_mano", label: "En mano" },
  { key: "nequi", label: "Nequi" },
];

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

interface Props {
  mes: string;
  existing: IngresoCamilo | null;
  onClose: () => void;
  onSave: (ingreso: IngresoCamilo) => void;
}

export default function ModalIngresoCamilo({ mes, existing, onClose, onSave }: Props) {
  const [monto, setMonto] = useState(existing ? String(existing.montoCop) : "");
  const [cuenta, setCuenta] = useState<CuentaDestino>(existing?.cuentaDestino ?? "camilo");
  const [estado, setEstado] = useState<"pendiente" | "confirmado">(existing?.estado ?? "pendiente");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoNum = Number(monto);
  const canSave = !busy && montoNum > 0 && !isNaN(montoNum);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingresos/camilo/${mes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoCop: montoNum, cuentaDestino: cuenta, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSave(data as IngresoCamilo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Ingreso Camilo — {mes}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          {/* Monto */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Monto COP</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 8500000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {montoNum > 0 && <p className="mt-1 text-xs text-gray-400">{COP(montoNum)}</p>}
          </div>

          {/* Cuenta destino */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Cuenta destino</p>
            <div className="flex flex-wrap gap-2">
              {CUENTAS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCuenta(key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    cuenta === key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Estado</p>
            <div className="flex gap-3">
              {(["pendiente", "confirmado"] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={estado === s}
                    onChange={() => setEstado(s)}
                    className="accent-blue-600"
                  />
                  {s === "pendiente" ? "Pendiente de recaudo" : "Confirmado"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
