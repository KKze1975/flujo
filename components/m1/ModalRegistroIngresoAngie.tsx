"use client";

import { useState, useEffect } from "react";
import type { Semana, RecargaAngie, CuentaDestinoAngie } from "@/lib/data/types";
import Icon from "@/components/ui/Icon";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const SEMANA_NUM: Record<Semana, number> = { S1: 1, S2: 2, S3: 3, S4: 4 };

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CUENTAS: { value: CuentaDestinoAngie; label: string }[] = [
  { value: "nu_angie", label: "NU Angie" },
  { value: "en_mano",  label: "En mano"  },
];

interface Props {
  mes: string;
  semana: Semana;
  onClose: () => void;
  onRegistered: () => void;
}

export default function ModalRegistroIngresoAngie({ mes, semana, onClose, onRegistered }: Props) {
  const [monto, setMonto] = useState("");
  const [cuentaDestino, setCuentaDestino] = useState<CuentaDestinoAngie>("nu_angie");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recargas, setRecargas] = useState<RecargaAngie[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingRecargas, setLoadingRecargas] = useState(true);

  const mesLabel = (() => {
    const [, m] = mes.split("-");
    return MESES_FULL[Number(m)] ?? mes;
  })();

  useEffect(() => {
    setLoadingRecargas(true);
    fetch(`/api/ingresos/angie/${mes}/recargas/${semana}`)
      .then(r => r.json())
      .then((data: { recargas: RecargaAngie[]; total: number }) => {
        setRecargas(data.recargas ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoadingRecargas(false));
  }, [mes, semana]);

  async function handleRegistrar() {
    const montoNum = Number(String(monto).replace(/\D/g, ""));
    if (!montoNum || montoNum <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingresos/angie/${mes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana,
          monto: montoNum,
          cuentaDestino,
          notas: notas.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      const nueva = data as RecargaAngie;
      setRecargas(prev => [nueva, ...prev]);
      setTotal(prev => prev + nueva.monto);
      setMonto("");
      setNotas("");
      onRegistered();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  const historial = [...recargas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 6);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        {/* Encabezado */}
        <div className="sheet-head">
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 2 }}>
              Semana {SEMANA_NUM[semana]} · {mesLabel}
            </h2>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
              Registrado:{" "}
              <strong>{loadingRecargas ? "…" : COP(total)}</strong>
            </p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="sheet-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Monto + Registrar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              inputMode="numeric"
              className="fl-input"
              placeholder="Monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRegistrar(); }}
              style={{ flex: 1, fontSize: 18, fontWeight: 700, textAlign: "right" }}
              autoFocus
            />
            <button
              className="fl-btn primary"
              onClick={handleRegistrar}
              disabled={busy || !monto}
              type="button"
              style={{ whiteSpace: "nowrap" }}
            >
              {busy ? "…" : "Registrar"}
            </button>
          </div>

          {/* Cuenta destino */}
          <div style={{ display: "flex", gap: 8 }}>
            {CUENTAS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`fl-btn${cuentaDestino === value ? " primary" : " ghost"} sm`}
                onClick={() => setCuentaDestino(value)}
                style={{ flex: 1 }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Notas */}
          <input
            type="text"
            className="fl-input"
            placeholder="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ fontSize: 13 }}
          />

          {error && (
            <p style={{ fontSize: 12, color: "var(--neg)", margin: 0 }}>{error}</p>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Historial semana {SEMANA_NUM[semana]}
              </p>
              <div style={{ overflowY: "auto", maxHeight: 180 }}>
                {historial.map((r) => (
                  <div
                    key={r.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}
                  >
                    <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                      {r.fecha.slice(5).replace("-", "/")}
                      {r.notas ? ` · ${r.notas}` : ""}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {COP(r.monto)}
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: "var(--ink-faint)" }}>
                        {r.cuentaDestino === "nu_angie" ? "NU Angie" : "En mano"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
