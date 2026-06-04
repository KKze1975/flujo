"use client";

import { useState } from "react";
import type { Movimiento, CuentaH4C, Semana, RecargaAngie } from "@/lib/data/types";
import ModalRegistroIngresoAngie from "@/components/m1/ModalRegistroIngresoAngie";
import Icon from "@/components/ui/Icon";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

const CUENTA_LABEL: Record<CuentaH4C, string> = {
  nu_camilo: "NU Camilo",
  nu_angie: "NU Angie",
  arq: "ARQ",
  en_mano: "En mano",
};

interface CuentaDisponible {
  cuenta: CuentaH4C;
  disponible: number;
}

interface Props {
  mov: Movimiento;
  mes: string;
  semana: Semana;
  montoEjecutado: number;
  cuentaDeficit: CuentaH4C;
  todasCuentas: CuentaDisponible[];
  actor: "camilo" | "angie";
  onEjecutarConCuenta: (cuenta: CuentaH4C) => void;
  onPosponer: () => void;
  onClose: () => void;
  onRecargaRegistrada?: (r: RecargaAngie) => void;
}

export default function ModalValidacionFondos({
  mov, mes, semana, montoEjecutado, cuentaDeficit,
  todasCuentas, actor, onEjecutarConCuenta, onPosponer, onClose,
  onRecargaRegistrada,
}: Props) {
  const [showIngreso, setShowIngreso] = useState(false);
  const [cuentaElegida, setCuentaElegida] = useState<CuentaH4C | null>(null);
  // Acumulador de recargas registradas en esta sesión (suma de montos por cuenta)
  const [saldoExtra, setSaldoExtra] = useState<Partial<Record<CuentaH4C, number>>>({});

  const cuentasConSaldo: CuentaDisponible[] = todasCuentas.map(c => ({
    cuenta: c.cuenta,
    disponible: c.disponible + (saldoExtra[c.cuenta] ?? 0),
  }));

  const disponibleDeficit = cuentasConSaldo.find(c => c.cuenta === cuentaDeficit)?.disponible ?? 0;
  const otrasCuentas = cuentasConSaldo.filter(c => c.cuenta !== cuentaDeficit);
  const ningunaSuficiente = otrasCuentas.every(c => c.disponible < montoEjecutado);
  const deficitAhora = disponibleDeficit >= montoEjecutado;

  const opcion2Label = actor === "angie" ? "Registrar mi ingreso" : "Registrar aporte de Angie";

  function handleRecargaRegistrada(recarga: RecargaAngie) {
    const key = recarga.cuentaDestino as CuentaH4C;
    setSaldoExtra(prev => ({ ...prev, [key]: (prev[key] ?? 0) + recarga.monto }));
    onRecargaRegistrada?.(recarga);
    setShowIngreso(false);
  }

  if (showIngreso) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
        <ModalRegistroIngresoAngie
          mes={mes}
          semana={semana}
          actor={actor}
          onClose={() => setShowIngreso(false)}
          onRegistered={handleRecargaRegistrada}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div style={{
        position: "relative", width: "100%", maxWidth: 540, margin: "0 auto",
        background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ width: 40, height: 4, background: "var(--line)", borderRadius: 2, margin: "0 auto 4px" }} />

        {/* Encabezado */}
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            Fondos insuficientes
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
            {mov.nombreSnapshot}
          </p>
          <div style={{
            background: "var(--neg-soft)", borderRadius: 10, padding: "8px 12px",
            fontSize: 12.5, color: "var(--neg)", lineHeight: 1.5,
          }}>
            {CUENTA_LABEL[cuentaDeficit]} · Disponible {COP(disponibleDeficit)} · Necesario {COP(montoEjecutado)}
          </div>
        </div>

        {/* Opción 1 — Cambiar cuenta */}
        <div style={{ borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "var(--ink-faint)",
            padding: "8px 14px 6px", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Opción 1 — Cambiar cuenta de pago
          </p>
          {ningunaSuficiente && !deficitAhora && (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)", padding: "0 14px 10px" }}>
              Ninguna cuenta tiene saldo suficiente.
            </p>
          )}
          {otrasCuentas.map(({ cuenta, disponible }) => {
            const suficiente = disponible >= montoEjecutado;
            return (
              <button
                key={cuenta}
                type="button"
                disabled={!suficiente}
                onClick={() => setCuentaElegida(cuenta)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "9px 14px", textAlign: "left",
                  background: cuentaElegida === cuenta ? "var(--primary-soft)" : "transparent",
                  border: "none", borderTop: "1px solid var(--line)",
                  cursor: suficiente ? "pointer" : "not-allowed",
                  opacity: suficiente ? 1 : 0.4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                  {CUENTA_LABEL[cuenta]}
                </span>
                <span style={{
                  fontSize: 12, fontVariantNumeric: "tabular-nums",
                  color: suficiente ? "var(--pos)" : "var(--neg)",
                }}>
                  {COP(disponible)}
                </span>
              </button>
            );
          })}
          {deficitAhora && (
            <button
              key={cuentaDeficit + "_recargada"}
              type="button"
              onClick={() => setCuentaElegida(cuentaDeficit)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "9px 14px", textAlign: "left",
                background: cuentaElegida === cuentaDeficit ? "var(--primary-soft)" : "transparent",
                border: "none", borderTop: "1px solid var(--line)", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                {CUENTA_LABEL[cuentaDeficit]} <span style={{ fontSize: 11, color: "var(--pos)" }}>(recargada)</span>
              </span>
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--pos)" }}>
                {COP(disponibleDeficit)}
              </span>
            </button>
          )}
          {cuentaElegida && (
            <div style={{ padding: "8px 14px" }}>
              <button
                type="button"
                className="fl-btn primary block"
                onClick={() => onEjecutarConCuenta(cuentaElegida)}
              >
                <Icon name="check" size={15} /> Ejecutar con {CUENTA_LABEL[cuentaElegida]}
              </button>
            </div>
          )}
        </div>

        {/* Opción 2 — Registrar ingreso Angie */}
        <button
          type="button"
          className="fl-btn ghost block"
          onClick={() => setShowIngreso(true)}
        >
          <Icon name="plus" size={15} /> {opcion2Label}
        </button>

        {/* Opción 3 — Posponer */}
        <button
          type="button"
          className="fl-btn ghost block"
          style={{ color: "var(--ink-faint)" }}
          onClick={onPosponer}
        >
          Posponer concepto
        </button>
      </div>
    </div>
  );
}
