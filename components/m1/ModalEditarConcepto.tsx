"use client";

import { useState } from "react";
import type { Concepto, SemanaDefault } from "@/lib/data/types";

const SEMANAS_DEFAULT: SemanaDefault[] = ["S1", "S2", "S3", "S4", "variable"];

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

interface Props {
  concepto: Concepto;
  onClose: () => void;
  onSave: (updated: Concepto) => void;
}

export default function ModalEditarConcepto({ concepto, onClose, onSave }: Props) {
  const [monto, setMonto] = useState(String(concepto.monto));
  const [semana, setSemana] = useState<SemanaDefault>(concepto.semanaDefault);
  const [notas, setNotas] = useState(concepto.notas ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoNum = Number(monto);
  const canSave = !busy && montoNum >= 0 && !isNaN(montoNum);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/conceptos/${concepto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: montoNum,
          semanaDefault: semana,
          notas: notas || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSave(data as Concepto);
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
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{concepto.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <p className="mb-5 text-xs text-gray-400">Editar concepto base — H1</p>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Contexto solo lectura */}
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 px-3 py-2">
          {[
            { label: "Categoría", value: concepto.categoria },
            { label: "Tipo", value: concepto.tipo },
            { label: "Frecuencia", value: concepto.frecuencia },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xs font-medium text-gray-600">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Monto referencia */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Monto referencia COP</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {montoNum > 0 && <p className="mt-1 text-xs text-gray-400">{COP(montoNum)}</p>}
          </div>

          {/* Semana asignada */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Semana asignada</label>
            <div className="flex flex-wrap gap-2">
              {SEMANAS_DEFAULT.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemana(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    semana === s
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
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
