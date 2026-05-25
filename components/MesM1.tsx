"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import React from "react";
import { Inter } from "next/font/google"; // V10
import type { Movimiento, Concepto, IngresoCamilo, IngresoAngie, Semana, Categoria } from "@/lib/data/types";
import ModalIngresoCamilo from "./m1/ModalIngresoCamilo";
import ModalAporteAngie from "./m1/ModalAporteAngie";
import ModalEditarConcepto from "./m1/ModalEditarConcepto";

// V10 — Inter font
const inter = Inter({ subsets: ["latin"] });

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

// V1 — "M1 · Mayo 2026"
function formatMesLabel(mes: string): string {
  const [year, monthStr] = mes.split("-");
  return `M1 · ${MESES_FULL[Number(monthStr)]} ${year}`;
}

// V4 — Tipo badges (inline styles — no Tailwind arbitrary classes en objetos JS)
const TIPO_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  fijo:         { bg: "#e8f0fe", color: "#1a73e8", label: "Fijo" },
  bolsillo:     { bg: "#e6f4ea", color: "#137333", label: "Bolsillo" },
  discrecional: { bg: "#f1f3f4", color: "#5f6368", label: "Discrecional" },
};

// V5 — Estado badges
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
  modo: "semana" | "mes"; semana: Semana;
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
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
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

  // ── Inline action panel ─────────────────────────────────────────────────────

  const renderActionPanel = (mov: Movimiento) => {
    if (!accion || accion.rowId !== mov.id) return null;

    if (accion.tipo === "menu") {
      return (
        <tr className="bg-gray-50">
          <td colSpan={7} className="border-b border-gray-100 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAccion({ rowId: mov.id, tipo: "ejecutar", monto: String(mov.montoPresupuestado), razon: "", fuenteEnMano: false, fuenteNequi: false, fuenteCamilo: false, fuenteAngie: false })}
                className="rounded bg-[#1a73e8] px-3 py-1.5 text-xs text-white hover:bg-[#1557b0]"
              >
                Ejecutar
              </button>
              <button
                type="button"
                onClick={() => setAccion({ rowId: mov.id, tipo: "posponer", modo: "semana", semana: (mov.semana as Semana) ?? "S1" })}
                className="rounded bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600"
              >
                Posponer
              </button>
              <button
                type="button"
                onClick={() => patchar(mov.id, { tipo: "no_aplica" })}
                disabled={busy}
                className="rounded bg-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50"
              >
                No aplica
              </button>
              <button
                type="button"
                onClick={() => setAccion(null)}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600"
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
        <tr className="bg-blue-50">
          <td colSpan={7} className="border-b border-blue-100 px-4 py-3">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Monto ejecutado</label>
                <input
                  type="number"
                  value={ae.monto}
                  onChange={(e) => setAccion({ ...ae, monto: e.target.value })}
                  className="w-36 rounded border border-gray-200 px-2 py-1 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {diff !== 0 && (
                  <p className={`mt-0.5 text-xs ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
                    {diff > 0 ? "+" : ""}{COP(diff)}
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500">Fuentes</p>
                <div className="flex gap-1">
                  {(["fuenteEnMano","fuenteNequi","fuenteCamilo","fuenteAngie"] as const).map((key) => {
                    const label = key === "fuenteEnMano" ? "En mano" : key === "fuenteNequi" ? "Nequi" : key === "fuenteCamilo" ? "Camilo" : "Angie";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccion({ ...ae, [key]: !ae[key] } as AccionEjecutar)}
                        className={`rounded border px-2 py-1 text-xs ${ae[key] ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-gray-200 bg-white text-gray-600"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {diff !== 0 && (
                <div className="min-w-32 flex-1">
                  <label className="mb-1 block text-xs text-gray-500">Razón (opcional)</label>
                  <input
                    type="text"
                    value={ae.razon}
                    onChange={(e) => setAccion({ ...ae, razon: e.target.value })}
                    placeholder="Razón desviación"
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patchar(ae.rowId, { tipo: "ejecutar", montoEjecutado: monto, fuenteEnMano: ae.fuenteEnMano, fuenteNequi: ae.fuenteNequi, fuenteCamilo: ae.fuenteCamilo, fuenteAngie: ae.fuenteAngie, razonDesviacion: ae.razon || null })}
                  disabled={busy || !monto || isNaN(monto)}
                  className="rounded bg-[#1a73e8] px-3 py-1.5 text-xs text-white hover:bg-[#1557b0] disabled:opacity-50"
                >
                  {busy ? "…" : "Confirmar pago"}
                </button>
                <button type="button" onClick={() => setAccion(null)} className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
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
        <tr className="bg-amber-50">
          <td colSpan={7} className="border-b border-amber-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-3">
                {(["semana","mes"] as const).map((modo) => (
                  <label key={modo} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={ap.modo === modo}
                      onChange={() => setAccion({ rowId: ap.rowId, tipo: "posponer", modo, semana: ap.semana })}
                      className="accent-amber-500"
                    />
                    {modo === "semana" ? "Cambiar semana" : "Mes siguiente"}
                  </label>
                ))}
              </div>
              {ap.modo === "semana" && (
                <div className="flex gap-1">
                  {SEMANAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAccion({ rowId: ap.rowId, tipo: "posponer", modo: ap.modo, semana: s })}
                      disabled={s === mov.semana}
                      className={`rounded border px-2 py-1 text-xs ${
                        ap.semana === s ? "border-amber-500 bg-amber-500 text-white"
                        : s === mov.semana ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                        : "border-gray-200 bg-white text-gray-600 hover:border-amber-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patchar(ap.rowId, { tipo: "posponer", ...(ap.modo === "semana" ? { nuevaSemana: ap.semana } : {}) })}
                  disabled={busy}
                  className="rounded bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy ? "…" : "Confirmar"}
                </button>
                <button type="button" onClick={() => setAccion(null)} className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
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
      <div className={`h-screen flex flex-col bg-gray-50 ${inter.className}`}>

        {/* ── Header (V1 + V2) — dark blue bar ── */}
        <header className="shrink-0 bg-[#1e3a5f] px-4 py-3">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">

            {/* V1 — Title */}
            <span className="text-sm font-semibold text-white">{formatMesLabel(mes)}</span>

            {/* V2 — Toggle pills on dark background */}
            <div className="flex rounded-full bg-white/10 p-0.5 text-xs font-medium">
              {(["planificacion","ejecucion"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`rounded-full px-4 py-1.5 transition-colors ${
                    view === v
                      ? "bg-white font-semibold text-[#1e3a5f]"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {v === "planificacion" ? "Planificación" : "Ejecución"}
                </button>
              ))}
            </div>

            {/* Header action buttons — outlined white on dark bg */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal("ingresoCamilo")}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                Ingreso Camilo
              </button>
              <button
                type="button"
                onClick={() => setModal("aporteAngie")}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                Aporte Angie
              </button>
            </div>
          </div>
        </header>

        {/* ── Content area ── */}
        {view === "planificacion" ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400">Vista de Planificación — próximos tickets</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* ── Sidebar (V3) ── */}
              <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 md:flex md:flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Semanas</p>

                  {/* V3 — Week cards */}
                  {SEMANAS.map((s) => {
                    const stat = semanaStat(s);
                    const isActive = semanaFiltro === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSemanaFiltro(isActive ? null : s)}
                        style={isActive ? { borderLeft: "3px solid #1a73e8" } : undefined}
                        className={`mb-2 w-full rounded-lg border border-gray-200 bg-white text-left transition-all ${
                          isActive ? "shadow-sm" : "hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">{s}</span>
                            <div className="flex items-center gap-1.5">
                              {stat.estadoLabel === "cerrada" ? (
                                <span className="text-xs font-semibold text-green-600">✓</span>
                              ) : (
                                <span className="text-xs text-gray-400">{stat.estadoLabel}</span>
                              )}
                              {isActive && <span className="text-sm text-blue-400">→</span>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">{dates[s]}</p>
                          {stat.total > 0 && stat.pct > 0 && stat.pct < 100 && (
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-blue-400" style={{ width: `${stat.pct}%` }} />
                            </div>
                          )}
                          {stat.estadoLabel === "cerrada" && (
                            <div className="mt-1.5 h-1 w-full rounded-full bg-green-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* V9 — Balance con semana activa dinámica */}
                <div className="shrink-0 border-t border-gray-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {semanaFiltro ? `Balance ${semanaFiltro}` : "Balance mes"}
                  </p>
                  {[
                    { label: "Planeado",  value: balance.planeado,  color: "#374151" },
                    { label: "Ejecutado", value: balance.ejecutado, color: "#137333" },
                    { label: "Resta",     value: balance.resta,     color: "#b45309" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-baseline justify-between py-0.5">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span style={{ color }} className="font-mono text-xs font-medium">{COP(value)}</span>
                    </div>
                  ))}
                </div>
              </aside>

              {/* ── Main table ── */}
              <main className="flex-1 overflow-auto">
                {error && (
                  <div className="m-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
                )}

                {/* V7 — 13px font for entire table */}
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
                          {/* V8 — Category header: gray uppercase, no colored bg, subtle separator */}
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

                          {/* Rows */}
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
                                  {/* Concepto */}
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

                                  {/* V4 — Tipo badge */}
                                  <td className="px-3 py-[8px]">
                                    {(() => {
                                      const b = TIPO_BADGE[mov.tipoSnapshot.toLowerCase()];
                                      return b ? (
                                        <span
                                          style={{ backgroundColor: b.bg, color: b.color, padding: "2px 8px", borderRadius: "12px" }}
                                          className="text-xs font-medium"
                                        >
                                          {b.label}
                                        </span>
                                      ) : (
                                        <span className="text-gray-500">{mov.tipoSnapshot}</span>
                                      );
                                    })()}
                                  </td>

                                  {/* Presup. */}
                                  <td className="px-3 py-[8px] text-right font-mono text-gray-700">{COP(mov.montoPresupuestado)}</td>

                                  {/* Ejecutado */}
                                  <td className="px-3 py-[8px] text-right font-mono text-gray-700">
                                    {mov.montoEjecutado != null ? COP(mov.montoEjecutado) : "—"}
                                  </td>

                                  {/* Desviación */}
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

                                  {/* V5 — Estado badge */}
                                  <td className="px-3 py-[8px]">
                                    {(() => {
                                      const cfg = ESTADO_CONFIG[mov.estado];
                                      return cfg ? (
                                        <span
                                          style={{ backgroundColor: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: "12px" }}
                                          className="inline-flex items-center gap-1 text-xs font-medium"
                                        >
                                          <span aria-hidden="true">{cfg.icon}</span>
                                          {cfg.label}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">{mov.estado}</span>
                                      );
                                    })()}
                                  </td>

                                  {/* V6 — Ejecutor: blue, truncated */}
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
            <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
              <div className="mx-auto flex max-w-screen-xl items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-[#137333]"><strong>{totalEjecutados}</strong> ejecutados</span>
                  <span className="text-gray-500"><strong>{totalPendientes}</strong> pendientes</span>
                  <span className="text-amber-700"><strong>{totalPospuestos}</strong> pospuestos</span>
                </div>
                <button
                  type="button"
                  disabled={totalPendientes > 0}
                  className="rounded-lg bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-40"
                  title={totalPendientes > 0 ? `${totalPendientes} conceptos pendientes` : "Cerrar M1"}
                >
                  Cerrar M1 ejecución
                </button>
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
    </>
  );
}
