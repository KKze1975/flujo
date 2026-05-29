"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import React from "react";
import type { Movimiento, Concepto, IngresoCamilo, IngresoAngie, SaldoCuenta, CierreSemana, Semana, Categoria } from "@/lib/data/types";
import ModalIngresoCamilo from "./m1/ModalIngresoCamilo";
import ModalAporteAngie from "./m1/ModalAporteAngie";
import ModalEditarConcepto from "./m1/ModalEditarConcepto";
import ModalCerrarSemana from "./m1/ModalCerrarSemana";
import ModalConfirmarSaldos from "./m1/ModalConfirmarSaldos";
import VistaPlanificacion from "./m1/VistaPlanificacion";

// ── Helpers ──────────────────────────────────────────────────────────────────

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const CATEGORIAS_ORDER: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
];

const MESES_ES = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_FULL = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function semanaDates(mes: string): Record<Semana, string> {
  const [year, monthStr] = mes.split("-");
  const month = Number(monthStr);
  const last = new Date(Number(year), month, 0).getDate();
  const m = MESES_ES[month];
  return { S1: `1–7 ${m}`, S2: `8–14 ${m}`, S3: `15–21 ${m}`, S4: `22–${last} ${m}` };
}

function formatMesLabel(mes: string): string {
  const [year, monthStr] = mes.split("-");
  return `M1 · ${MESES_FULL[Number(monthStr)]} ${year}`;
}

// Table badges — kept as inline hex since the table is desktop-only and pending full migration
const TIPO_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  fijo:         { bg: "#e8f0fe", color: "#1a73e8", label: "Fijo" },
  bolsillo:     { bg: "#e6f4ea", color: "#137333", label: "Bolsillo" },
  discrecional: { bg: "#f1f3f4", color: "#5f6368", label: "Discrecional" },
};

const ESTADO_CONFIG: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  ejecutado: { bg: "#e6f4ea", color: "#137333", icon: "✓", label: "Ejecutado" },
  pendiente: { bg: "#fef7e0", color: "#b05e00", icon: "○", label: "Pendiente" },
  pospuesto: { bg: "#f1f3f4", color: "#5f6368", icon: "→", label: "Pospuesto" },
  no_aplica: { bg: "#f1f3f4", color: "#9aa0a6", icon: "–", label: "No aplica" },
};

// ── Action state ──────────────────────────────────────────────────────────────

type AccionMenu = { rowId: string; tipo: "menu" };
type AccionEjecutar = {
  rowId: string; tipo: "ejecutar";
  monto: string; razon: string;
  fuenteEnMano: boolean; fuenteNequi: boolean;
  fuenteCamilo: boolean; fuenteAngie: boolean;
};
type AccionPosponer = {
  rowId: string; tipo: "posponer";
  modo: "semana" | "mes"; semana: Semana; razon: string;
};
type Accion = AccionMenu | AccionEjecutar | AccionPosponer;

type ModalId = "ingresoCamilo" | "aporteAngie" | "editarConcepto";

// ── Main component ────────────────────────────────────────────────────────────

export default function MesM1({
  mes,
  movimientos: init,
  conceptos: initConceptos,
  ingresoCamilo: initIngreso,
  ingresosAngie: initAportes,
  cierresSemana: initCierres,
  gastosSinClasificarInit,
  saldosInit,
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  cierresSemana: CierreSemana[];
  gastosSinClasificarInit: Record<Semana, number>;
  saldosInit: SaldoCuenta[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [view, setView] = useState<"planificacion" | "ejecucion">("ejecucion");
  const [movs, setMovs] = useState(init);
  const [conceptos, setConceptos] = useState(initConceptos);
  const [ingresoCamilo, setIngresoCamilo] = useState(initIngreso);
  const [ingresosAngie, setIngresosAngie] = useState(initAportes);
  const [semanaFiltro, setSemanaFiltro] = useState<Semana | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [modal, setModal] = useState<ModalId | null>(null);
  const [conceptoEditando, setConceptoEditando] = useState<Concepto | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<Categoria>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerradoM1, setCerradoM1] = useState(false);
  const [cerrandoM1, setCerrandoM1] = useState(false);
  const [cierres, setCierres] = useState<CierreSemana[]>(initCierres);
  const [gastosSinClasificar] = useState<Record<Semana, number>>(gastosSinClasificarInit);
  const [showCerrarSemana, setShowCerrarSemana] = useState(false);
  const [saldos, setSaldos] = useState<SaldoCuenta[]>(saldosInit);
  const CUENTAS_H4C: Array<{ cuenta: SaldoCuenta["cuenta"]; label: string }> = [
    { cuenta: "nu_camilo", label: "NU Camilo" },
    { cuenta: "nu_angie",  label: "NU Angie"  },
    { cuenta: "arq",       label: "ARQ"        },
    { cuenta: "en_mano",   label: "En mano"   },
  ];
  const saldosConfirmados = CUENTAS_H4C.every(({ cuenta }) => saldos.some((s) => s.cuenta === cuenta));
  const [showConfirmarSaldos, setShowConfirmarSaldos] = useState(false);

  const dates = useMemo(() => semanaDates(mes), [mes]);

  const movsVisibles = semanaFiltro
    ? movs.filter((m) => m.semana === semanaFiltro)
    : movs;

  const semanaStat = (s: Semana) => {
    const items = movs.filter((m) => m.semana === s);
    const total = items.length;
    const nEjecutados = items.filter((m) => m.estado === "ejecutado").length;
    const nPospuestos = items.filter((m) => m.estado === "pospuesto").length;
    const nNoAplica  = items.filter((m) => m.estado === "no_aplica").length;
    const resueltos  = nEjecutados + nPospuestos + nNoAplica;
    const ejecutadoMonto = items
      .filter((m) => m.estado === "ejecutado")
      .reduce((acc, m) => acc + (m.montoEjecutado ?? 0), 0);
    const pct = total > 0 ? Math.round((resueltos / total) * 100) : 0;
    const estadoLabel =
      total === 0 ? "vacía"
      : resueltos === total ? "cerrada"
      : resueltos === 0 ? "sin iniciar"
      : `${pct}%`;
    return { total, nEjecutados, nPospuestos, nNoAplica, resueltos, ejecutadoMonto, pct, estadoLabel };
  };

  const balance = useMemo(() => {
    const items = semanaFiltro ? movs.filter((m) => m.semana === semanaFiltro) : movs;
    const planeado  = items.reduce((s, m) => s + m.montoPresupuestado, 0);
    const ejecutado = items.filter((m) => m.estado === "ejecutado").reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const resta     = items.filter((m) => m.estado === "pendiente").reduce((s, m) => s + m.montoPresupuestado, 0);
    return { planeado, ejecutado, resta };
  }, [movs, semanaFiltro]);

  const totalEjecutados = movs.filter((m) => m.estado === "ejecutado").length;
  const totalPendientes = movs.filter((m) => m.estado === "pendiente").length;
  const totalPospuestos = movs.filter((m) => m.estado === "pospuesto").length;
  const pendientesS1 = movs.filter((m) => m.semana === "S1" && m.estado === "pendiente").length;

  const grupos = useMemo(() => {
    const map = new Map<Categoria, Movimiento[]>();
    for (const cat of CATEGORIAS_ORDER) map.set(cat, []);
    for (const m of movsVisibles) {
      const list = map.get(m.categoriaSnapshot);
      if (list) list.push(m);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [movsVisibles]);

  const toggleCat = (cat: Categoria) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── PATCH movimiento ────────────────────────────────────────────────────────

  const patchar = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/movimientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setMovs((prev) => prev.map((m) => (m.id === id ? (data as Movimiento) : m)));
      setAccion(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  // ── Cerrar M1 ejecución ─────────────────────────────────────────────────────

  const handleCerrarM1 = async () => {
    setCerrandoM1(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/cerrar-m1`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cerrar M1");
      setCerradoM1(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCerrandoM1(false);
    }
  };

  // ── Inline action panel ─────────────────────────────────────────────────────

  const renderActionPanel = (mov: Movimiento) => {
    if (!accion || accion.rowId !== mov.id) return null;

    if (accion.tipo === "menu") {
      return (
        <tr style={{ background: "var(--surface-2)" }}>
          <td colSpan={7} style={{ borderBottom: "1px solid var(--line)", padding: "8px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setAccion({ rowId: mov.id, tipo: "ejecutar", monto: String(mov.montoPresupuestado), razon: "", fuenteEnMano: false, fuenteNequi: false, fuenteCamilo: false, fuenteAngie: false })}
                className="fl-btn primary sm"
              >
                Ejecutar
              </button>
              <button
                type="button"
                onClick={() => setAccion({ rowId: mov.id, tipo: "posponer", modo: "semana", semana: (mov.semana as Semana) ?? "S1", razon: "" })}
                className="fl-btn warn-btn sm"
              >
                Posponer
              </button>
              <button
                type="button"
                onClick={() => patchar(mov.id, { tipo: "no_aplica" })}
                disabled={busy}
                className="fl-btn ghost sm"
              >
                No aplica
              </button>
              <button
                type="button"
                onClick={() => setAccion(null)}
                style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}
              >
                ✕ Cancelar
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (accion.tipo === "ejecutar") {
      const ae = accion;
      const monto = Number(ae.monto);
      const diff  = isNaN(monto) ? 0 : monto - mov.montoPresupuestado;
      return (
        <tr style={{ background: "var(--primary-soft)" }}>
          <td colSpan={7} style={{ borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 }}>
                  Monto ejecutado
                </label>
                <input
                  type="number"
                  value={ae.monto}
                  onChange={(e) => setAccion({ ...ae, monto: e.target.value })}
                  className="fl-input"
                  style={{ width: 144, textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                />
                {diff !== 0 && (
                  <p style={{ marginTop: 2, fontSize: 11, color: diff > 0 ? "var(--neg)" : "var(--pos)" }}>
                    {diff > 0 ? "+" : ""}{COP(diff)}
                  </p>
                )}
              </div>
              <div>
                <p style={{ marginBottom: 4, fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>Fuentes</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["fuenteEnMano","fuenteNequi","fuenteCamilo","fuenteAngie"] as const).map((key) => {
                    const label = key === "fuenteEnMano" ? "En mano" : key === "fuenteNequi" ? "Nequi" : key === "fuenteCamilo" ? "Camilo" : "Angie";
                    const active = ae[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccion({ ...ae, [key]: !ae[key] } as AccionEjecutar)}
                        className="fl-chip"
                        style={{
                          cursor: "pointer",
                          background: active ? "var(--primary)" : "var(--surface-2)",
                          color: active ? "var(--on-primary)" : "var(--ink-soft)",
                          borderColor: "transparent",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {diff !== 0 && (
                <div style={{ minWidth: 128, flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 }}>
                    Razón (opcional)
                  </label>
                  <input
                    type="text"
                    value={ae.razon}
                    onChange={(e) => setAccion({ ...ae, razon: e.target.value })}
                    placeholder="Razón desviación"
                    className="fl-input"
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => patchar(ae.rowId, { tipo: "ejecutar", montoEjecutado: monto, fuenteEnMano: ae.fuenteEnMano, fuenteNequi: ae.fuenteNequi, fuenteCamilo: ae.fuenteCamilo, fuenteAngie: ae.fuenteAngie, razonDesviacion: ae.razon || null })}
                  disabled={busy || !monto || isNaN(monto)}
                  className="fl-btn primary sm"
                >
                  {busy ? "…" : "Confirmar pago"}
                </button>
                <button type="button" onClick={() => setAccion(null)} className="fl-btn ghost sm">
                  Cancelar
                </button>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    if (accion.tipo === "posponer") {
      const ap = accion;
      return (
        <tr style={{ background: "var(--warn-soft)" }}>
          <td colSpan={7} style={{ borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                {(["semana","mes"] as const).map((modo) => (
                  <label key={modo} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}>
                    <input
                      type="radio"
                      checked={ap.modo === modo}
                      onChange={() => setAccion({ rowId: ap.rowId, tipo: "posponer", modo, semana: ap.semana, razon: ap.razon })}
                      style={{ accentColor: "var(--warn)" }}
                    />
                    {modo === "semana" ? "Cambiar semana" : "Mes siguiente"}
                  </label>
                ))}
              </div>
              {ap.modo === "semana" && (
                <div style={{ display: "flex", gap: 6 }}>
                  {SEMANAS.map((s) => {
                    const active = ap.semana === s;
                    const isCurrent = s === mov.semana;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAccion({ rowId: ap.rowId, tipo: "posponer", modo: ap.modo, semana: s, razon: ap.razon })}
                        disabled={isCurrent}
                        className="fl-chip"
                        style={{
                          cursor: isCurrent ? "not-allowed" : "pointer",
                          background: active ? "var(--warn)" : isCurrent ? "var(--surface-2)" : "var(--surface)",
                          color: active ? "white" : isCurrent ? "var(--ink-faint)" : "var(--ink-soft)",
                          borderColor: "transparent",
                          opacity: isCurrent ? 0.5 : 1,
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ minWidth: 160, flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 }}>
                  Razón (opcional)
                </label>
                <input
                  type="text"
                  value={ap.razon}
                  onChange={(e) => setAccion({ ...ap, razon: e.target.value })}
                  placeholder="¿Por qué se pospone?"
                  className="fl-input"
                  style={{ fontSize: 13 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => patchar(ap.rowId, { tipo: "posponer", ...(ap.modo === "semana" ? { nuevaSemana: ap.semana } : {}), razonPostergacion: ap.razon || null })}
                  disabled={busy}
                  className="fl-btn warn-btn sm"
                >
                  {busy ? "…" : "Confirmar"}
                </button>
                <button type="button" onClick={() => setAccion(null)} className="fl-btn ghost sm">
                  Cancelar
                </button>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="m1-shell">

        {/* ── Header ── */}
        <header style={{ flexShrink: 0, padding: "12px 16px", background: "var(--appbar-bg)", color: "var(--appbar-ink)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, maxWidth: 1280, margin: "0 auto", width: "100%" }}>

            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--appbar-ink)" }}>{formatMesLabel(mes)}</span>

            {/* Toggle pills */}
            <div style={{ display: "flex", borderRadius: 999, background: "var(--appbar-hair)", padding: 2 }}>
              {(["planificacion","ejecucion"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                    background: view === v ? "var(--surface)" : "transparent",
                    color: view === v ? "var(--primary)" : "var(--appbar-ink)",
                    transition: "background 0.15s",
                  }}
                >
                  {v === "planificacion" ? "Planificación" : "Ejecución"}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setModal("ingresoCamilo")}
                style={{ borderRadius: 999, border: "1px solid var(--appbar-hair)", padding: "6px 12px", fontSize: 12, color: "var(--appbar-ink)", background: "transparent", cursor: "pointer" }}
              >
                Ingreso Camilo
              </button>
              <button
                type="button"
                onClick={() => setModal("aporteAngie")}
                style={{ borderRadius: 999, border: "1px solid var(--appbar-hair)", padding: "6px 12px", fontSize: 12, color: "var(--appbar-ink)", background: "transparent", cursor: "pointer" }}
              >
                Aporte Angie
              </button>
            </div>
          </div>
        </header>

        {/* ── Content area ── */}
        {view === "planificacion" ? (
          <VistaPlanificacion
            mes={mes}
            conceptos={conceptos}
            movimientos={movs}
            ingresoCamilo={ingresoCamilo}
            ingresosAngie={ingresosAngie}
            onSaveIngresoCamilo={(i) => setIngresoCamilo(i)}
            onSaveIngresosAngie={(list) => setIngresosAngie(list)}
            onUpdateConceptos={(updated) => setConceptos(updated)}
            onCerrar={(updatedMovs) => { setMovs(updatedMovs); setView("ejecucion"); }}
          />
        ) : (
          <>
            {mounted && !saldosConfirmados && (
              <ModalConfirmarSaldos
                mes={mes}
                existing={saldos}
                onConfirmed={(s) => { setSaldos(s); setShowConfirmarSaldos(false); }}
              />
            )}
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

              {/* ── Sidebar ── */}
              <aside className="m1-sidebar" style={{ borderRight: "1px solid var(--line)", background: "var(--surface)" }}>
                <div className="m1-sidebar-body">
                  <p className="fl-sectlabel" style={{ marginBottom: 8 }}>Semanas</p>

                  {SEMANAS.map((s) => {
                    const stat = semanaStat(s);
                    const isActive = semanaFiltro === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSemanaFiltro(isActive ? null : s)}
                        style={{
                          display: "block", width: "100%", marginBottom: 8,
                          borderRadius: 12,
                          border: `1px solid ${isActive ? "var(--primary)" : "var(--line)"}`,
                          borderLeft: isActive ? `3px solid var(--primary)` : `1px solid var(--line)`,
                          background: "var(--surface)", textAlign: "left", cursor: "pointer",
                          boxShadow: isActive ? "var(--shadow-card)" : "none",
                        }}
                      >
                        <div style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {stat.estadoLabel === "cerrada" ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pos)" }}>✓</span>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{stat.estadoLabel}</span>
                              )}
                              {isActive && <span style={{ fontSize: 13, color: "var(--primary)" }}>→</span>}
                            </div>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: "2px 0 0" }}>{dates[s]}</p>
                          {stat.total > 0 && stat.pct > 0 && stat.pct < 100 && (
                            <div className="fl-bar" style={{ marginTop: 6 }}>
                              <i style={{ width: `${stat.pct}%` }} />
                            </div>
                          )}
                          {stat.estadoLabel === "cerrada" && (
                            <div className="fl-bar pos" style={{ marginTop: 6 }}>
                              <i style={{ width: "100%" }} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Saldos */}
                <div style={{ flexShrink: 0, borderTop: "1px solid var(--line)", background: "var(--surface)", padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <p className="fl-sectlabel">Saldos</p>
                    <button
                      type="button"
                      onClick={() => setShowConfirmarSaldos(true)}
                      style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      {saldosConfirmados ? "Editar" : "Confirmar"}
                    </button>
                  </div>
                  {saldosConfirmados ? (
                    CUENTAS_H4C.map(({ cuenta, label }) => {
                      const s = saldos.find((x) => x.cuenta === cuenta);
                      return (
                        <div key={cuenta} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "2px 0" }}>
                          <span className="fl-faint">{label}</span>
                          <span className="fl-num" style={{ fontSize: 12 }}>{s ? COP(s.saldoInicial) : "—"}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: 11, color: "var(--warn)" }}>Sin confirmar</p>
                  )}
                </div>

                {/* Balance */}
                <div style={{ flexShrink: 0, borderTop: "1px solid var(--line)", background: "var(--surface)", padding: 12 }}>
                  <p className="fl-sectlabel" style={{ marginBottom: 8 }}>
                    {semanaFiltro ? `Balance ${semanaFiltro}` : "Balance mes"}
                  </p>
                  {[
                    { label: "Planeado",  value: balance.planeado,  color: "var(--ink)"  },
                    { label: "Ejecutado", value: balance.ejecutado, color: "var(--pos)"  },
                    { label: "Resta",     value: balance.resta,     color: "var(--warn)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "2px 0" }}>
                      <span className="fl-faint">{label}</span>
                      <span className="fl-num" style={{ fontSize: 12, color }}>{COP(value)}</span>
                    </div>
                  ))}
                </div>
              </aside>

              {/* ── Main table ── */}
              {/* Table rows (thead/tbody/tr/td) retain Tailwind — pending full table migration */}
              <main style={{ flex: 1, overflow: "auto" }}>
                {error && (
                  <div style={{ margin: 16, borderRadius: 12, background: "var(--neg-soft)", padding: "10px 16px", fontSize: 13, color: "var(--neg)" }}>
                    {error}
                  </div>
                )}

                <table className="w-full min-w-[700px] border-collapse text-[13px]">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e7eb]">
                    <tr>
                      {["Concepto","Tipo","Presup.","Ejecutado","Desviación","Estado","Ejecutor"].map((col, i) => (
                        <th
                          key={i}
                          className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                            i >= 2 && i <= 4 ? "text-right" : "text-left"
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map(([cat, items]) => {
                      const collapsed = collapsedCats.has(cat);
                      return (
                        <React.Fragment key={cat}>
                          <tr
                            className="cursor-pointer select-none border-t border-b border-gray-200 hover:bg-gray-50"
                            onClick={() => toggleCat(cat)}
                          >
                            <td colSpan={7} className="px-3 py-1.5">
                              <span className="mr-1.5 text-xs text-gray-400">{collapsed ? "▸" : "▾"}</span>
                              <span className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">{cat}</span>
                              <span className="ml-2 font-mono text-xs text-gray-400">
                                {COP(items.reduce((s, m) => s + m.montoPresupuestado, 0))}
                              </span>
                            </td>
                          </tr>

                          {!collapsed && items.map((mov) => {
                            const canAct    = mov.estado === "pendiente" || mov.estado === "pospuesto";
                            const isExpanded = accion?.rowId === mov.id;
                            const concepto  = conceptos.find((c) => c.id === mov.conceptoId);
                            return (
                              <React.Fragment key={mov.id}>
                                <tr
                                  className={`border-b border-gray-100 transition-colors ${
                                    isExpanded ? "bg-gray-50"
                                    : canAct ? "cursor-pointer hover:bg-gray-50"
                                    : ""
                                  }`}
                                  onClick={canAct && !isExpanded
                                    ? () => setAccion({ rowId: mov.id, tipo: "menu" })
                                    : undefined
                                  }
                                >
                                  <td className="px-3 py-[8px]">
                                    <div className="flex items-center gap-1.5">
                                      {concepto && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setConceptoEditando(concepto); setModal("editarConcepto"); }}
                                          className="text-gray-300 transition-colors hover:text-[#1a73e8]"
                                          title="Editar concepto"
                                        >
                                          ✎
                                        </button>
                                      )}
                                      <span className="text-gray-900">{mov.nombreSnapshot}</span>
                                      {mov.semana && (
                                        <span className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-400">{mov.semana}</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-3 py-[8px]">
                                    {(() => {
                                      const b = TIPO_BADGE[mov.tipoSnapshot.toLowerCase()];
                                      return b ? (
                                        <span style={{ backgroundColor: b.bg, color: b.color, padding: "2px 8px", borderRadius: "12px" }} className="text-xs font-medium">
                                          {b.label}
                                        </span>
                                      ) : (
                                        <span className="text-gray-500">{mov.tipoSnapshot}</span>
                                      );
                                    })()}
                                  </td>

                                  <td className="px-3 py-[8px] text-right font-mono text-gray-700">{COP(mov.montoPresupuestado)}</td>

                                  <td className="px-3 py-[8px] text-right font-mono text-gray-700">
                                    {mov.montoEjecutado != null ? COP(mov.montoEjecutado) : "—"}
                                  </td>

                                  <td className={`px-3 py-[8px] text-right font-mono ${
                                    mov.desviacion == null ? "text-gray-300"
                                    : mov.desviacion > 0  ? "font-medium text-red-600"
                                    : mov.desviacion < 0  ? "text-green-600"
                                    : "text-gray-400"
                                  }`}>
                                    {mov.desviacion == null ? "—"
                                      : mov.desviacion === 0 ? "$0"
                                      : `${mov.desviacion > 0 ? "+" : ""}${COP(mov.desviacion)}`}
                                  </td>

                                  <td className="px-3 py-[8px]">
                                    {(() => {
                                      const cfg = ESTADO_CONFIG[mov.estado];
                                      return cfg ? (
                                        <span style={{ backgroundColor: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: "12px" }} className="inline-flex items-center gap-1 text-xs font-medium">
                                          <span aria-hidden="true">{cfg.icon}</span>
                                          {cfg.label}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">{mov.estado}</span>
                                      );
                                    })()}
                                  </td>

                                  <td className="max-w-[80px] px-3 py-[8px]">
                                    <span className={`block truncate text-xs ${mov.ejecutor ? "text-[#1a73e8]" : "text-gray-300"}`}>
                                      {mov.ejecutor ?? "—"}
                                    </span>
                                  </td>
                                </tr>
                                {renderActionPanel(mov)}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </main>
            </div>

            {/* ── Footer ── */}
            <footer style={{ flexShrink: 0, padding: "12px 16px", borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: "var(--pos)" }}><strong>{totalEjecutados}</strong> ejecutados</span>
                  <span style={{ color: "var(--ink-soft)" }}><strong>{totalPendientes}</strong> pendientes</span>
                  <span style={{ color: "var(--warn)" }}><strong>{totalPospuestos}</strong> pospuestos</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {semanaFiltro && (() => {
                    const yaCerrada = cierres.some((c) => c.semana === semanaFiltro);
                    const gastosBloquean = (gastosSinClasificar[semanaFiltro] ?? 0) > 0;
                    if (yaCerrada) {
                      return <span className="fl-badge pos" style={{ padding: "6px 14px" }}>{semanaFiltro} cerrada ✓</span>;
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => setShowCerrarSemana(true)}
                        disabled={gastosBloquean}
                        title={gastosBloquean ? `${gastosSinClasificar[semanaFiltro]} gastos sin clasificar` : `Cerrar ${semanaFiltro}`}
                        className="fl-btn ghost sm"
                        style={{ opacity: gastosBloquean ? 0.4 : 1 }}
                      >
                        Cerrar {semanaFiltro}
                      </button>
                    );
                  })()}
                  {cerradoM1 ? (
                    <span className="fl-badge pos" style={{ padding: "6px 14px" }}>M1 cerrado ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCerrarM1}
                      disabled={pendientesS1 > 0 || cerrandoM1}
                      className="fl-btn primary sm"
                      title={pendientesS1 > 0 ? `${pendientesS1} conceptos pendientes en S1` : "Cerrar M1"}
                    >
                      {cerrandoM1 ? "Cerrando…" : "Cerrar M1 ejecución"}
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* ── Modales via portal ── */}
      {mounted && modal === "ingresoCamilo" && createPortal(
        <ModalIngresoCamilo
          mes={mes}
          existing={ingresoCamilo}
          onClose={() => setModal(null)}
          onSave={(i) => { setIngresoCamilo(i); setModal(null); }}
        />,
        document.body
      )}
      {mounted && modal === "aporteAngie" && createPortal(
        <ModalAporteAngie
          mes={mes}
          existing={ingresosAngie}
          onClose={() => setModal(null)}
          onSave={(list) => { setIngresosAngie(list); setModal(null); }}
        />,
        document.body
      )}
      {mounted && modal === "editarConcepto" && conceptoEditando && createPortal(
        <ModalEditarConcepto
          concepto={conceptoEditando}
          onClose={() => { setModal(null); setConceptoEditando(null); }}
          onSave={(updated) => {
            setConceptos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setModal(null);
            setConceptoEditando(null);
          }}
        />,
        document.body
      )}
      {mounted && showConfirmarSaldos && createPortal(
        <ModalConfirmarSaldos
          mes={mes}
          existing={saldos}
          onConfirmed={(s) => { setSaldos(s); setShowConfirmarSaldos(false); }}
        />,
        document.body
      )}
      {mounted && showCerrarSemana && semanaFiltro && createPortal(
        <ModalCerrarSemana
          mes={mes}
          semana={semanaFiltro}
          onClose={() => setShowCerrarSemana(false)}
          onSuccess={(semana) => {
            setCierres((prev) => [...prev, { id: "", mes, semana, fechaCierre: "", totalPresupuestado: 0, totalEjecutado: 0, desviacionTotal: 0, remanenteAngie: 0, ubicacionRemanenteAngie: "", conceptosPospuestos: 0, conceptosNoAplica: 0, gastosSinClasificar: 0, cerradoPor: "camilo", notas: null }]);
            setShowCerrarSemana(false);
          }}
        />,
        document.body
      )}
    </>
  );
}
