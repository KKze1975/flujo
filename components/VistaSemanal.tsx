"use client";

import { useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import RegistroRapido from "@/components/m4/RegistroRapido";
import type { Movimiento, CierreSemana, Semana, Actor } from "@/lib/data/types";

const inter = Inter({ subsets: ["latin"] });

type Fuente = "en_mano" | "nequi" | "camilo" | "angie";

type ActivePanel =
  | { tipo: "ok"; id: string; fuente: Fuente | null; ejecutor: Actor }
  | { tipo: "editar"; id: string; monto: string; fuente: Fuente | null; ejecutor: Actor }
  | { tipo: "recibo"; id: string };

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const FUENTES: Fuente[] = ["en_mano", "nequi", "camilo", "angie"];

const FUENTE_LABELS: Record<Fuente, string> = {
  en_mano: "En mano",
  nequi: "Nequi",
  camilo: "Camilo",
  angie: "Angie",
};

const ESTADO_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  ejecutado:              { bg: "#e6f4ea", color: "#137333", label: "Ejecutado" },
  pendiente:              { bg: "#fef7e0", color: "#b05e00", label: "Pendiente" },
  pospuesto:              { bg: "#f1f3f4", color: "#5f6368", label: "Pospuesto" },
  no_aplica:              { bg: "#f1f3f4", color: "#9aa0a6", label: "No aplica" },
  pospuesto_mes_siguiente:{ bg: "#f1f3f4", color: "#9aa0a6", label: "→ Mes siguiente" },
};

export default function VistaSemanal({
  mes,
  mesLabel,
  semanaActiva,
  movimientosInit,
  cierreSemana,
}: {
  mes: string;
  mesLabel: string;
  semanaActiva: Semana;
  movimientosInit: Movimiento[];
  cierreSemana: CierreSemana | null;
}) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosInit);
  const [panel, setPanel] = useState<ActivePanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "ejecutados">("pendientes");
  const [modalRegistro, setModalRegistro] = useState(false);

  const bolsillos = movimientos.filter((m) => m.tipoSnapshot === "bolsillo");
  const conceptos  = movimientos.filter((m) => m.tipoSnapshot !== "bolsillo");
  const pendientes = conceptos.filter((m) => m.estado === "pendiente");
  const ejecutados = conceptos.filter((m) => m.estado !== "pendiente");

  const totalPresupuestado = movimientos.reduce((s, m) => s + m.montoPresupuestado, 0);
  const totalEjecutado = movimientos
    .filter((m) => m.estado === "ejecutado")
    .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
  const pct = totalPresupuestado > 0
    ? Math.round((totalEjecutado / totalPresupuestado) * 100)
    : 0;

  async function patchar(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/movimientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string } & Partial<Movimiento>;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const updated = data as Movimiento;
      setMovimientos((prev) => prev.map((m) => m.id === id ? updated : m));
      setPanel(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  function toggleOK(id: string) {
    if (panel?.tipo === "ok" && panel.id === id) {
      setPanel(null);
    } else {
      setPanel({ tipo: "ok", id, fuente: null, ejecutor: "camilo" });
    }
  }

  function toggleEditar(id: string) {
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) return;
    if (panel?.tipo === "editar" && panel.id === id) {
      setPanel(null);
    } else {
      setPanel({ tipo: "editar", id, monto: String(mov.montoPresupuestado), fuente: null, ejecutor: "camilo" });
    }
  }

  async function confirmarOK() {
    if (panel?.tipo !== "ok" || !panel.fuente) return;
    const mov = movimientos.find((m) => m.id === panel.id);
    if (!mov) return;
    await patchar(panel.id, {
      tipo: "ejecutar",
      montoEjecutado: mov.montoPresupuestado,
      fuenteEnMano:  panel.fuente === "en_mano",
      fuenteNequi:   panel.fuente === "nequi",
      fuenteCamilo:  panel.fuente === "camilo",
      fuenteAngie:   panel.fuente === "angie",
      ejecutor: panel.ejecutor,
    });
  }

  async function confirmarEditar() {
    if (panel?.tipo !== "editar" || !panel.fuente) return;
    const monto = Number(panel.monto);
    if (isNaN(monto) || monto <= 0) { setError("Monto inválido"); return; }
    await patchar(panel.id, {
      tipo: "ejecutar",
      montoEjecutado: monto,
      fuenteEnMano:  panel.fuente === "en_mano",
      fuenteNequi:   panel.fuente === "nequi",
      fuenteCamilo:  panel.fuente === "camilo",
      fuenteAngie:   panel.fuente === "angie",
      ejecutor: panel.ejecutor,
    });
  }

  const listaActiva = tab === "pendientes" ? pendientes : ejecutados;

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${inter.className}`}>

      {/* ── Header ── */}
      <header className="px-4 pt-12 pb-5 text-white" style={{ background: "#1e3a5f" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-white/50 hover:text-white text-lg leading-none">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">{mesLabel}</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              Semana activa: <span className="font-medium text-white">{semanaActiva}</span>
              {cierreSemana && (
                <span className="ml-2" style={{ color: "#86efac" }}>✓ Cerrada</span>
              )}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Ejecutado</span>
            <span className="text-xs font-semibold text-white">{pct}% · {COP(totalEjecutado)}</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%`, background: "#4ade80" }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            de {COP(totalPresupuestado)} presupuestado
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-4 pt-5 pb-28 space-y-5 max-w-lg mx-auto w-full">

        {/* Error banner */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between"
            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── Bolsillos ── */}
        {bolsillos.length > 0 && (
          <section>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#9ca3af" }}
            >
              Bolsillos
            </p>
            <div className="space-y-2">
              {bolsillos.map((b) => {
                const gastado = b.montoEjecutado ?? 0;
                const techo   = b.montoPresupuestado;
                const pctB    = techo > 0 ? Math.min(Math.round((gastado / techo) * 100), 100) : 0;
                const over    = gastado > techo;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white shadow-sm px-4 py-3"
                    style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <p className="text-sm font-semibold text-gray-800">{b.nombreSnapshot}</p>
                      <p
                        className="text-xs font-mono shrink-0"
                        style={{ color: over ? "#c5221f" : "#137333" }}
                      >
                        {COP(gastado)} / {COP(techo)}
                      </p>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: "#e5e7eb" }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${pctB}%`,
                          background: over ? "#c5221f" : "#1e3a5f",
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                      {pctB}% del techo
                      {b.estado === "ejecutado" && (
                        <span className="ml-2" style={{ color: "#137333" }}>✓</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Tabs Pendientes / Ejecutados ── */}
        <section>
          <div
            className="flex rounded-xl p-1 mb-4"
            style={{ background: "#e5e7eb" }}
          >
            {(["pendientes", "ejecutados"] as const).map((t) => {
              const count = t === "pendientes" ? pendientes.length : ejecutados.length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {t === "pendientes" ? "Pendientes" : "Ejecutados"}
                  {count > 0 && (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                      style={{
                        background: tab === t ? "#1e3a5f" : "#9ca3af",
                        color: "white",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {listaActiva.length === 0 ? (
            <div
              className="rounded-2xl bg-white px-5 py-10 text-center"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm text-gray-400">
                {tab === "pendientes"
                  ? "No hay conceptos pendientes esta semana"
                  : "No hay conceptos ejecutados aún"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {listaActiva.map((mov) => {
                const estadoCfg = ESTADO_CONFIG[mov.estado] ?? ESTADO_CONFIG.pendiente;
                const panelActivo = panel !== null && panel.id === mov.id;

                return (
                  <div
                    key={mov.id}
                    className="rounded-2xl bg-white shadow-sm overflow-hidden"
                    style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    {/* Fila del concepto */}
                    <div className="px-4 py-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {mov.nombreSnapshot}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                            {mov.categoriaSnapshot}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-semibold text-gray-700">
                            {COP(mov.montoEjecutado ?? mov.montoPresupuestado)}
                          </p>
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5"
                            style={{ background: estadoCfg.bg, color: estadoCfg.color }}
                          >
                            {estadoCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Acciones — solo conceptos pendientes */}
                      {mov.estado === "pendiente" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => toggleOK(mov.id)}
                            className="flex-1 rounded-lg py-2 text-xs font-semibold text-white transition-colors active:scale-95"
                            style={{
                              background: panelActivo && panel?.tipo === "ok"
                                ? "#137333"
                                : "#1e3a5f",
                            }}
                          >
                            ✓ OK
                          </button>
                          <button
                            type="button"
                            disabled
                            className="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 border border-gray-200 cursor-not-allowed"
                          >
                            Recibo
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEditar(mov.id)}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                            style={{
                              border: panelActivo && panel?.tipo === "editar"
                                ? "1px solid #1e3a5f"
                                : "1px solid #e5e7eb",
                              color: panelActivo && panel?.tipo === "editar"
                                ? "#1e3a5f"
                                : "#6b7280",
                            }}
                          >
                            Editar
                          </button>
                        </div>
                      )}

                      {/* Metadatos si ya ejecutado */}
                      {mov.estado === "ejecutado" && (mov.ejecutor || mov.fechaEjecucion) && (
                        <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
                          {[mov.ejecutor, mov.fechaEjecucion].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Panel de acción expandible */}
                    {panel !== null && panel.id === mov.id && (
                      <ConceptoPanel
                        panel={panel}
                        mov={mov}
                        busy={busy}
                        onChange={setPanel}
                        onConfirmarOK={confirmarOK}
                        onConfirmarEditar={confirmarEditar}
                        onClose={() => setPanel(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── FAB relámpago ── */}
      <button
        type="button"
        onClick={() => setModalRegistro(true)}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl text-white active:scale-95 transition-transform z-40"
        style={{ background: "#1e3a5f" }}
        aria-label="Registro rápido"
      >
        ⚡
      </button>

      {/* ── Modal RegistroRapido ── */}
      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div className="flex-1" onClick={() => setModalRegistro(false)} />
          <div className="bg-white rounded-t-3xl overflow-y-auto max-h-[92vh]">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #f3f4f6" }}
            >
              <h2 className="font-semibold text-gray-800">Registro rápido</h2>
              <button
                type="button"
                onClick={() => setModalRegistro(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600"
                style={{ background: "#f3f4f6" }}
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-5">
              <RegistroRapido onClose={() => setModalRegistro(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel inline por concepto ────────────────────────────────────────────────

function ConceptoPanel({
  panel,
  mov,
  busy,
  onChange,
  onConfirmarOK,
  onConfirmarEditar,
  onClose,
}: {
  panel: ActivePanel;
  mov: Movimiento;
  busy: boolean;
  onChange: (p: ActivePanel) => void;
  onConfirmarOK: () => void;
  onConfirmarEditar: () => void;
  onClose: () => void;
}) {
  if (panel.tipo === "recibo") {
    return (
      <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 text-center">
        <p className="text-sm text-gray-400">Adjuntar recibo — Próximamente</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs underline"
          style={{ color: "#9ca3af" }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (panel.tipo === "ok") {
    return (
      <div className="border-t border-green-100 px-4 py-4" style={{ background: "#f0fdf4" }}>
        <p className="text-xs font-semibold text-gray-600 mb-3">
          Ejecutar {COP(mov.montoPresupuestado)} — ¿Desde dónde salió?
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {FUENTES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ ...panel, fuente: panel.fuente === f ? null : f })}
              className="rounded-lg py-2.5 text-xs font-medium transition-colors"
              style={{
                background: panel.fuente === f ? "#1e3a5f" : "white",
                color:      panel.fuente === f ? "white"   : "#4b5563",
                border:     panel.fuente === f ? "1px solid #1e3a5f" : "1px solid #e5e7eb",
              }}
            >
              {FUENTE_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirmarOK}
            disabled={busy || !panel.fuente}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "#137333" }}
          >
            {busy ? "…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm border border-gray-200 text-gray-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // panel.tipo === "editar"
  const monto = Number(panel.monto);
  const diff  = isNaN(monto) ? 0 : monto - mov.montoPresupuestado;

  return (
    <div className="border-t border-blue-100 px-4 py-4" style={{ background: "#eff6ff" }}>
      <div className="space-y-3 mb-4">

        {/* Monto */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Monto ejecutado
          </label>
          <input
            type="number"
            value={panel.monto}
            onChange={(e) => onChange({ ...panel, monto: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {diff !== 0 && !isNaN(monto) && (
            <p
              className="text-xs mt-1"
              style={{ color: diff > 0 ? "#c5221f" : "#137333" }}
            >
              {diff > 0 ? "+" : ""}{COP(diff)} respecto al presupuesto
            </p>
          )}
        </div>

        {/* Fuente */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Fuente</p>
          <div className="grid grid-cols-2 gap-2">
            {FUENTES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ ...panel, fuente: f })}
                className="rounded-lg py-2 text-xs font-medium transition-colors"
                style={{
                  background: panel.fuente === f ? "#1e3a5f" : "white",
                  color:      panel.fuente === f ? "white"   : "#4b5563",
                  border:     panel.fuente === f ? "1px solid #1e3a5f" : "1px solid #e5e7eb",
                }}
              >
                {FUENTE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Ejecutor */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Ejecutor</p>
          <div className="flex gap-2">
            {(["camilo", "angie"] as Actor[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange({ ...panel, ejecutor: a })}
                className="flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  background: panel.ejecutor === a ? "#1e3a5f" : "white",
                  color:      panel.ejecutor === a ? "white"   : "#4b5563",
                  border:     panel.ejecutor === a ? "1px solid #1e3a5f" : "1px solid #e5e7eb",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirmarEditar}
          disabled={busy || !panel.fuente || isNaN(monto) || monto <= 0}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#1e3a5f" }}
        >
          {busy ? "…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2.5 text-sm border border-gray-200 text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
