"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ModalConfirmacionDestructiva from "@/components/admin/ModalConfirmacionDestructiva";
import ModalRetirarConcepto from "@/components/admin/ModalRetirarConcepto";
import TarjetaIntegridadBackup from "@/components/admin/TarjetaIntegridadBackup";
import type { Concepto } from "@/lib/data/types";

type ResetResult = {
  mes: string;
  reset: {
    h2: number;
    h3b: number;
    h4a: number;
    h4b: number;
    h4c: number;
    h4d: number;
    h5a: number;
    h5b: number;
  };
};

const MES_REGEX = /^\d{4}-\d{2}$/;

export default function PanelHome() {
  const [showMesPicker, setShowMesPicker] = useState(false);
  const [mesInput, setMesInput] = useState("");
  const [mesError, setMesError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRetirarModal, setShowRetirarModal] = useState(false);
  const [retiradoNotification, setRetiradoNotification] = useState<string | null>(null);
  const [targetMes, setTargetMes] = useState("");
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);

  function handleContinuarMes() {
    const value = mesInput.trim();
    if (!MES_REGEX.test(value)) {
      setMesError("Formato inválido — usa YYYY-MM, ej. 2026-06.");
      return;
    }
    setMesError(null);
    setTargetMes(value);
    setShowMesPicker(false);
    setShowResetModal(true);
  }

  async function handleExecuteReset() {
    const res = await fetch("/api/admin/reset-mes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: targetMes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al ejecutar el reset.");
    }

    const data: ResetResult = await res.json();
    setResetResult(data);
    setShowResetModal(false);
  }

  return (
    <div className="t-calido screen-anim">
      <div className="fl-appbar">
        <div className="fl-topnav">
          <Link href="/" className="fl-back">
            <Icon name="back" size={17} />
          </Link>
        </div>
        <p className="eyebrow">Flujo · Administración</p>
        <h1 style={{ fontSize: 22 }}>Panel de administración</h1>
      </div>

      <div className="fl-body">
        <p className="fl-faint">
          Acciones de administración de Flujo.
        </p>

        {resetResult && (
          <div className="fl-card screen-anim" style={{ marginBottom: 16, borderColor: "var(--pos)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span className="ic" style={{ color: "var(--pos)" }}>
                <Icon name="check" />
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Reset completado para {resetResult.mes}
              </h3>
            </div>
            <p className="fl-faint" style={{ margin: "0 0 10px", fontSize: 13 }}>
              Filas eliminadas por hoja:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 13 }}>
              <div><strong>H2:</strong> {resetResult.reset.h2}</div>
              <div><strong>H3B:</strong> {resetResult.reset.h3b}</div>
              <div><strong>H4A:</strong> {resetResult.reset.h4a}</div>
              <div><strong>H4B:</strong> {resetResult.reset.h4b}</div>
              <div><strong>H4C:</strong> {resetResult.reset.h4c}</div>
              <div><strong>H4D:</strong> {resetResult.reset.h4d}</div>
              <div><strong>H5A:</strong> {resetResult.reset.h5a}</div>
              <div><strong>H5B:</strong> {resetResult.reset.h5b}</div>
            </div>
          </div>
        )}

        {showMesPicker && (
          <div className="fl-card screen-anim" style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              ¿Qué mes deseas resetear?
            </p>
            <div className="fl-field">
              <input
                className="fl-input"
                type="text"
                inputMode="numeric"
                value={mesInput}
                onChange={(e) => setMesInput(e.target.value)}
                placeholder="2026-06"
                autoFocus
              />
            </div>
            {mesError && <p className="fl-neg" style={{ fontSize: 13, margin: 0 }}>{mesError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="fl-btn"
                type="button"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowMesPicker(false);
                  setMesInput("");
                  setMesError(null);
                }}
              >
                Cancelar
              </button>
              <button className="fl-btn block" type="button" style={{ flex: 1 }} onClick={handleContinuarMes}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {retiradoNotification && (
          <div className="fl-card screen-anim" style={{ marginBottom: 16, borderColor: "var(--pos)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="ic" style={{ color: "var(--pos)" }}>
                <Icon name="check" />
              </span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{retiradoNotification}</p>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Tarjeta 1: PANEL-RESET-MES-01 */}
          <div
            className="fl-action"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setMesInput(targetMes || "");
              setMesError(null);
              setShowMesPicker(true);
            }}
          >
            <span className="ic" style={{ color: "var(--neg)" }}>
              <Icon name="wallet" />
            </span>
            <span className="txt">
              <p className="t">Resetear mes</p>
              <p className="d">Elimina movimientos, consumos e ingresos de un mes específico</p>
            </span>
            <span className="chev">›</span>
          </div>

          {/* Tarjeta 2: PANEL-RETIRAR-CONCEPTO-01 */}
          <div
            className="fl-action"
            style={{ cursor: "pointer" }}
            onClick={() => setShowRetirarModal(true)}
          >
            <span className="ic" style={{ color: "var(--neg)" }}>
              <Icon name="list" />
            </span>
            <span className="txt">
              <p className="t">Retirar concepto</p>
              <p className="d">Desactiva un concepto del catálogo (H1) fijando fecha de retiro</p>
            </span>
            <span className="chev">›</span>
          </div>

          {/* Tarjeta 3: PANEL-FUSIONAR-DUPLICADOS-01 · descartado */}
          <div className="fl-action" style={{ opacity: 0.4, cursor: "default" }}>
            <span className="ic"><Icon name="archive" /></span>
            <span className="txt">
              <p className="t">Fusionar duplicados</p>
              <p className="d">PANEL-FUSIONAR-DUPLICADOS-01 · descartado</p>
            </span>
          </div>

          {/* Tarjeta 4: PANEL-REVERTIR-CIERRE-01 · pendiente */}
          <div className="fl-action" style={{ opacity: 0.55, cursor: "default" }}>
            <span className="ic"><Icon name="clock" /></span>
            <span className="txt">
              <p className="t">Revertir cierre de semana</p>
              <p className="d">PANEL-REVERTIR-CIERRE-01 · pendiente</p>
            </span>
          </div>

          {/* Tarjeta 5: PANEL-LOG-EVENTOS-01 · pendiente */}
          <div className="fl-action" style={{ opacity: 0.55, cursor: "default" }}>
            <span className="ic"><Icon name="book" /></span>
            <span className="txt">
              <p className="t">Log de eventos</p>
              <p className="d">PANEL-LOG-EVENTOS-01 · pendiente</p>
            </span>
          </div>

          {/* Tarjeta 6: PANEL-BACKUP-INTEGRIDAD-01 */}
          <TarjetaIntegridadBackup />
        </div>
      </div>

      {showResetModal && (
        <ModalConfirmacionDestructiva
          title={`Resetear mes ${targetMes}`}
          description={`Esta acción eliminará de forma irreversible todas las filas de H2, H3B, H4 y H5 correspondientes a ${targetMes}.`}
          confirmationTextRequired={targetMes}
          placeholder={`Escribe ${targetMes}`}
          dangerLabel="Confirmar Reset"
          onConfirm={handleExecuteReset}
          onClose={() => setShowResetModal(false)}
        />
      )}

      {showRetirarModal && (
        <ModalRetirarConcepto
          onClose={() => setShowRetirarModal(false)}
          onSuccess={(c: Concepto) => {
            setRetiradoNotification(`Concepto "${c.nombre}" marcado como retirado exitosamente.`);
          }}
        />
      )}
    </div>
  );
}
