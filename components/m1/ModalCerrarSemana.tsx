"use client";

import { useState } from "react";
import type { Semana } from "@/lib/data/types";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

const UBICACIONES = ["nu_camilo", "nu_angie", "en_mano", "nequi"] as const;
type Ubicacion = (typeof UBICACIONES)[number];
const UBICACION_LABEL: Record<Ubicacion, string> = {
  nu_camilo: "NU Camilo",
  nu_angie: "NU Angie",
  en_mano: "En mano",
  nequi: "Nequi",
};

const SEMANA_SIGUIENTE: Record<Semana, Semana | null> = {
  S1: "S2", S2: "S3", S3: "S4", S4: null,
};

interface Props {
  mes: string;
  semana: Semana;
  onClose(): void;
  onSuccess(semana: Semana): void;
}

export default function ModalCerrarSemana({ mes, semana, onClose, onSuccess }: Props) {
  const semanaSiguiente = SEMANA_SIGUIENTE[semana];

  const [remanenteAngie, setRemanenteAngie] = useState("");
  const [ubicacion, setUbicacion] = useState<Ubicacion>("nu_angie");
  const [aporteAngiePlaneado, setAporteAngiePlaneado] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remanente = Number(remanenteAngie) || 0;
  const aporte = Number(aporteAngiePlaneado) || 0;

  const handleSubmit = async () => {
    if (!remanenteAngie) { setError("Ingresa el remanente de Angie."); return; }
    if (semanaSiguiente && !aporteAngiePlaneado) { setError("Ingresa el aporte planeado de Angie para la semana siguiente."); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/cerrar-semana`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana,
          remanenteAngie: remanente,
          ubicacionRemanente: ubicacion,
          aporteAngiePlaneado: aporte,
          cerradoPor: "camilo",
          notas: notas || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cerrar semana");
      onSuccess(semana);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Cerrar {semana}</h2>
            <p className="text-xs text-gray-400">{mes} — snapshot del domingo</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">

          {/* Remanente Angie */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Remanente Angie al cierre de {semana}
            </label>
            <input
              type="number"
              value={remanenteAngie}
              onChange={(e) => setRemanenteAngie(e.target.value)}
              placeholder="0"
              className="w-full rounded border border-gray-200 px-3 py-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="mt-0.5 text-xs text-gray-400">Lo que queda en la cuenta de Angie después de esta semana</p>
          </div>

          {/* Ubicación */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">¿Dónde está ese saldo?</label>
            <div className="flex flex-wrap gap-2">
              {UBICACIONES.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUbicacion(u)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ubicacion === u
                      ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#1a73e8]"
                  }`}
                >
                  {UBICACION_LABEL[u]}
                </button>
              ))}
            </div>
          </div>

          {/* Plan semana siguiente */}
          {semanaSiguiente && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Aporte de Angie planeado para {semanaSiguiente}
              </label>
              <input
                type="number"
                value={aporteAngiePlaneado}
                onChange={(e) => setAporteAngiePlaneado(e.target.value)}
                placeholder="0"
                className="w-full rounded border border-gray-200 px-3 py-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {remanente > 0 && aporte > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  Disponible {semanaSiguiente}: {COP(remanente + aporte)} (remanente + aporte)
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Notas (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del cierre"
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
          >
            {saving ? "Cerrando…" : `Confirmar cierre ${semana}`}
          </button>
        </div>
      </div>
    </div>
  );
}
