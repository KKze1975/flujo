"use client";

import { useState } from "react";
import type { Concepto, Movimiento, Semana, Categoria, TipoConcepto } from "@/lib/data/types";

type CicloVida = "solo_este_mes" | "cuotas" | "permanente";

const CATEGORIAS: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
];

const TIPOS: { key: TipoConcepto; label: string }[] = [
  { key: "fijo", label: "Fijo" },
  { key: "bolsillo", label: "Bolsillo" },
  { key: "discrecional", label: "Discrecional" },
];

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const CICLOS: { key: CicloVida; label: string; desc: string }[] = [
  { key: "solo_este_mes", label: "Solo este mes", desc: "Gasto puntual. No aparece el próximo mes." },
  { key: "cuotas", label: "Cuotas", desc: "Se repite mes a mes. El monto puede variar por cuota." },
  { key: "permanente", label: "Permanente", desc: "Nuevo gasto recurrente. Queda en el presupuesto base." },
];

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

interface Props {
  mes: string;
  onClose: () => void;
  onSave: (concepto: Concepto, movimiento: Movimiento) => void;
}

export default function ModalAgregarConcepto({ mes, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Compromisos Financieros");
  const [tipo, setTipo] = useState<TipoConcepto>("fijo");
  const [monto, setMonto] = useState("");
  const [semana, setSemana] = useState<Semana>("S1");
  const [cicloVida, setCicloVida] = useState<CicloVida>("solo_este_mes");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoNum = Number(monto);
  const canSave = !busy && nombre.trim().length > 0 && montoNum > 0 && !isNaN(montoNum);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/conceptos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          categoria,
          tipo,
          monto: montoNum,
          semana,
          cicloVida,
          notas: notas.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSave(data.concepto as Concepto, data.movimiento as Movimiento);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Agregar concepto — {mes}</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cuota préstamo"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tipo + Semana en fila */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="mb-1.5 text-xs font-medium text-gray-500">Tipo</p>
              <div className="flex gap-1.5">
                {TIPOS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTipo(key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      tipo === key
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Semana</p>
              <div className="flex gap-1.5">
                {SEMANAS.map((s) => (
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
          </div>

          {/* Monto */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Monto COP</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {montoNum > 0 && <p className="mt-1 text-xs text-gray-400">{COP(montoNum)}</p>}
          </div>

          {/* Ciclo de vida */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Ciclo de vida</p>
            <div className="space-y-1.5">
              {CICLOS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    cicloVida === key
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    checked={cicloVida === key}
                    onChange={() => setCicloVida(key)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notas — siempre visible, útil para cuotas */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Notas{cicloVida === "cuotas" ? " (ej: cuota 3/12)" : " (opcional)"}
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={cicloVida === "cuotas" ? "Cuota 1 de 12" : ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Agregar concepto"}
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
