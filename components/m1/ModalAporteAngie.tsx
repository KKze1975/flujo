"use client";

import { useState } from "react";
import type { IngresoAngie, Semana } from "@/lib/data/types";

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const SEMANA_FECHAS: Record<Semana, (mes: string) => string> = {
  S1: (mes) => `1–7 ${mes.split("-")[1] === "05" ? "may" : mes}`,
  S2: (mes) => `8–14 ${mes.split("-")[1] === "05" ? "may" : mes}`,
  S3: (mes) => `15–21 ${mes.split("-")[1] === "05" ? "may" : mes}`,
  S4: (mes) => {
    const [year, month] = mes.split("-").map(Number);
    const last = new Date(year, month, 0).getDate();
    const mLabel = ["", "ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][month];
    return `22–${last} ${mLabel}`;
  },
};

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

interface Props {
  mes: string;
  existing: IngresoAngie[];
  onClose: () => void;
  onSave: (ingresos: IngresoAngie[]) => void;
}

export default function ModalAporteAngie({ mes, existing, onClose, onSave }: Props) {
  const init = Object.fromEntries(
    SEMANAS.map((s) => [s, String(existing.find((i) => i.semana === s)?.monto ?? "")])
  ) as Record<Semana, string>;

  const [montos, setMontos] = useState(init);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = SEMANAS.reduce((s, k) => s + (Number(montos[k]) || 0), 0);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const aportes = SEMANAS.map((s) => ({ semana: s, monto: Number(montos[s]) || 0 }));
      const res = await fetch(`/api/ingresos/angie/${mes}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aportes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSave(data as IngresoAngie[]);
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
          <h2 className="text-base font-semibold text-gray-900">Aporte Angie — {mes}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left text-xs font-medium text-gray-400">Semana</th>
              <th className="pb-2 text-left text-xs font-medium text-gray-400">Fechas</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Monto COP</th>
            </tr>
          </thead>
          <tbody>
            {SEMANAS.map((s) => (
              <tr key={s} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-700">{s}</td>
                <td className="py-2 text-gray-400 text-xs">{SEMANA_FECHAS[s](mes)}</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    value={montos[s]}
                    onChange={(e) => setMontos({ ...montos, [s]: e.target.value })}
                    placeholder="0"
                    className="w-32 rounded border border-gray-200 px-2 py-1 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
              <td className="pt-3 text-right font-mono font-semibold text-blue-700">{COP(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={busy}
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
