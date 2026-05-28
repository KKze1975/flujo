"use client";

import { useState } from "react";
import type { SaldoCuenta, CuentaH4C } from "@/lib/data/types";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

const CUENTAS: { cuenta: CuentaH4C; label: string; placeholder: string }[] = [
  { cuenta: "nu_camilo", label: "NU Camilo",  placeholder: "Saldo actual" },
  { cuenta: "nu_angie",  label: "NU Angie",   placeholder: "Saldo actual" },
  { cuenta: "arq",       label: "ARQ",        placeholder: "Saldo actual" },
  { cuenta: "en_mano",   label: "En mano",    placeholder: "Saldo actual" },
];

const MESES_FULL = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function formatMes(mes: string) {
  const [year, monthStr] = mes.split("-");
  return `${MESES_FULL[Number(monthStr)]} ${year}`;
}

interface Props {
  mes: string;
  existing: SaldoCuenta[];
  onConfirmed(saldos: SaldoCuenta[]): void;
}

export default function ModalConfirmarSaldos({ mes, existing, onConfirmed }: Props) {
  const init = (cuenta: CuentaH4C) => {
    const found = existing.find((s) => s.cuenta === cuenta);
    return found ? String(found.saldoInicial) : "";
  };

  const [valores, setValores] = useState<Record<CuentaH4C, string>>({
    nu_camilo: init("nu_camilo"),
    nu_angie:  init("nu_angie"),
    arq:       init("arq"),
    en_mano:   init("en_mano"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const total = CUENTAS.reduce((s, { cuenta }) => s + (Number(valores[cuenta]) || 0), 0);

  const handleConfirmar = async () => {
    for (const { cuenta, label } of CUENTAS) {
      if (!valores[cuenta]) {
        setError(`Ingresa el saldo de ${label}.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const body = CUENTAS.map(({ cuenta }) => ({
        cuenta,
        saldoInicial: Number(valores[cuenta]) || 0,
      }));
      const res = await fetch(`/api/mes/${mes}/saldos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar saldos");
      onConfirmed(data as SaldoCuenta[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3a5f]/80">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Confirmar saldos iniciales</h2>
          <p className="text-xs text-gray-400">{formatMes(mes)} — necesario para iniciar ejecución</p>
        </div>

        {/* Inputs */}
        <div className="space-y-3 px-5 py-4">
          {CUENTAS.map(({ cuenta, label, placeholder }) => (
            <div key={cuenta} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-gray-600">{label}</span>
              <input
                type="number"
                value={valores[cuenta]}
                onChange={(e) => setValores((prev) => ({ ...prev, [cuenta]: e.target.value }))}
                placeholder={placeholder}
                className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-xs text-gray-400">Total disponible</span>
            <span className="font-mono text-sm font-semibold text-gray-700">{COP(total)}</span>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={saving}
            className="w-full rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
          >
            {saving ? "Confirmando…" : "Confirmar saldos"}
          </button>
        </div>
      </div>
    </div>
  );
}
