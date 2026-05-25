"use client";

import { useState, useMemo } from "react";
import React from "react";
import type { Concepto, Movimiento, Semana, SemanaDefault, Categoria, IngresoCamilo, IngresoAngie } from "@/lib/data/types";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];
const SEMANAS_DEFAULT: SemanaDefault[] = ["S1", "S2", "S3", "S4", "variable"];

const CATEGORIAS_ORDER: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
];

const TIPO_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  fijo:         { bg: "#e8f0fe", color: "#1a73e8", label: "Fijo" },
  bolsillo:     { bg: "#e6f4ea", color: "#137333", label: "Bolsillo" },
  discrecional: { bg: "#f1f3f4", color: "#5f6368", label: "Discrecional" },
};

interface Props {
  mes: string;
  conceptos: Concepto[];
  movimientos: Movimiento[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  onSaveIngresoCamilo(i: IngresoCamilo): void;
  onSaveIngresosAngie(list: IngresoAngie[]): void;
  onUpdateConceptos(conceptos: Concepto[]): void;
  onCerrar(updatedMovs: Movimiento[]): void;
}

export default function VistaPlanificacion({
  mes,
  conceptos: initConceptos,
  movimientos,
  ingresoCamilo,
  ingresosAngie,
  onSaveIngresoCamilo,
  onSaveIngresosAngie,
  onUpdateConceptos,
  onCerrar,
}: Props) {
  // Un solo estado de conceptos — se actualiza directamente al cambiar semana/notas.
  // dirtyIds rastrea cuáles deben persistirse al guardar borrador.
  const [conceptos, setConceptos] = useState(initConceptos);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  // Ingreso Camilo — editable
  const [montoCamilo, setMontoCamilo] = useState(String(ingresoCamilo?.montoCop ?? ""));
  const [savingIngresoCamilo, setSavingIngresoCamilo] = useState(false);

  // Aportes Angie — editables por semana
  const [aportes, setAportes] = useState<Record<Semana, string>>(() => {
    const init: Record<Semana, string> = { S1: "", S2: "", S3: "", S4: "" };
    for (const a of ingresosAngie) init[a.semana] = String(a.monto);
    return init;
  });
  const [savingAportes, setSavingAportes] = useState(false);

  const [editingNota, setEditingNota] = useState<string | null>(null);
  const [editingMonto, setEditingMonto] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<Categoria>>(new Set());

  // Panel de acciones por concepto
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Overrides locales sincronizados con H2: conceptoId → estado
  const [movOverrides, setMovOverrides] = useState<Map<string, "no_aplica" | "pospuesto_mes_siguiente">>(() => {
    const map = new Map<string, "no_aplica" | "pospuesto_mes_siguiente">();
    for (const m of movimientos) {
      if (m.estado === "no_aplica" || m.estado === "pospuesto_mes_siguiente") {
        map.set(m.conceptoId, m.estado as "no_aplica" | "pospuesto_mes_siguiente");
      }
    }
    return map;
  });

  // Estado local de movimientos — se actualiza tras PATCHes en planificación
  const [movs, setMovs] = useState<Movimiento[]>(movimientos);

  const [savingBorrador, setSavingBorrador] = useState(false);
  const [savingCierre, setSavingCierre] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Balance mes ───────────────────────────────────────────────────────────

  const MESES_ES: Record<string, string> = {
    "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
    "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
    "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
  };
  const mesNombre = MESES_ES[mes.split("-")[1]] ?? "";

  const conceptosActivosMes = useMemo(
    () =>
      conceptos.filter((c) => {
        if (c.estado !== "activo") return false;
        if (movOverrides.has(c.id)) return false;
        if (c.frecuencia === "bimestral" && c.mesActivoBimestral) {
          return c.mesActivoBimestral.split(",").map((s) => s.trim().toLowerCase()).includes(mesNombre);
        }
        return true;
      }),
    [conceptos, mesNombre, movOverrides]
  );

  const mesSiguienteNombre = useMemo(() => {
    const [, monthStr] = mes.split("-");
    const month = parseInt(monthStr, 10);
    const nextKey = String(month === 12 ? 1 : month + 1).padStart(2, "0");
    const name = MESES_ES[nextKey] ?? "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [mes]);

  const totalComprometido = useMemo(
    () => conceptosActivosMes.reduce((sum, c) => sum + (c.frecuencia === "semanal" ? c.monto * 4 : c.monto), 0),
    [conceptosActivosMes]
  );

  const ingresoCamiloNum = Number(montoCamilo) || 0;
  const aportesNum = useMemo(
    () => SEMANAS.reduce((sum, s) => sum + (Number(aportes[s]) || 0), 0),
    [aportes]
  );
  const ingresoTotal = ingresoCamiloNum + aportesNum;
  const diferenciaTotal = ingresoTotal - totalComprometido;

  // ── Balance por semana — remanentes encadenados ───────────────────────────
  // S1 arranca con el ingreso Camilo; cada semana hereda el remanente anterior.

  const balancePorSemana = useMemo(() => {
    const result: {
      semana: Semana;
      remanteAnterior: number;
      aporteAngie: number;
      disponible: number;
      comprometido: number;
      diferencia: number;
    }[] = [];
    let remanente = ingresoCamiloNum;
    for (const s of SEMANAS) {
      const aporteAngie = Number(aportes[s]) || 0;
      const comprometido = conceptosActivosMes
        .filter((c) => c.frecuencia === "semanal" || c.semanaDefault === s)
        .reduce((sum, c) => sum + c.monto, 0);
      const disponible = remanente + aporteAngie;
      const diferencia = disponible - comprometido;
      result.push({ semana: s, remanteAnterior: remanente, aporteAngie, disponible, comprometido, diferencia });
      remanente = diferencia;
    }
    return result;
  }, [conceptosActivosMes, aportes, ingresoCamiloNum]);

  // ── Grupos para tabla ─────────────────────────────────────────────────────

  const grupos = useMemo(() => {
    const map = new Map<Categoria, Concepto[]>();
    for (const cat of CATEGORIAS_ORDER) map.set(cat, []);
    for (const c of conceptos) {
      if (c.estado !== "activo") continue;
      const list = map.get(c.categoria);
      if (list) list.push(c);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [conceptos]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const setConceptoMod = (id: string, partial: Partial<Pick<Concepto, "semanaDefault" | "notas" | "monto">>) => {
    setConceptos((prev) => prev.map((c) => c.id === id ? { ...c, ...partial } : c));
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  const guardarIngresoCamilo = async () => {
    const monto = Number(montoCamilo);
    if (!monto || monto <= 0) return;
    setSavingIngresoCamilo(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingresos/camilo/${mes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoCop: monto,
          cuentaDestino: ingresoCamilo?.cuentaDestino ?? "camilo",
          estado: ingresoCamilo?.estado ?? "pendiente",
          notas: ingresoCamilo?.notas ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaveIngresoCamilo(data as IngresoCamilo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingIngresoCamilo(false);
    }
  };

  const guardarAportes = async () => {
    setSavingAportes(true);
    setError(null);
    try {
      const payload = SEMANAS.map((s) => ({ semana: s, monto: Number(aportes[s]) || 0 }));
      const res = await fetch(`/api/ingresos/angie/${mes}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aportes: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaveIngresosAngie(data as IngresoAngie[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingAportes(false);
    }
  };

  // Persiste H1 para los ids dirty. Retorna el array actualizado (o el actual si no hay cambios).
  const persistirH1 = async (): Promise<Concepto[]> => {
    if (dirtyIds.size === 0) return conceptos;
    const updated = [...conceptos];
    for (const id of dirtyIds) {
      const c = updated.find((x) => x.id === id);
      if (!c) continue;
      const res = await fetch(`/api/conceptos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semanaDefault: c.semanaDefault, notas: c.notas, monto: c.monto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar concepto");
      const idx = updated.findIndex((x) => x.id === id);
      if (idx >= 0) updated[idx] = data as Concepto;
    }
    setConceptos(updated);
    setDirtyIds(new Set());
    onUpdateConceptos(updated);
    return updated;
  };

  const guardarBorrador = async () => {
    if (dirtyIds.size === 0) return;
    setSavingBorrador(true);
    setError(null);
    try {
      await persistirH1();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingBorrador(false);
    }
  };

  const marcarNoAplica = async (conceptoId: string) => {
    setActionLoading(conceptoId);
    setError(null);
    try {
      const pendientes = movs.filter((m) => m.conceptoId === conceptoId && m.estado === "pendiente");
      const actualizados: Movimiento[] = [];
      for (const mov of pendientes) {
        const res = await fetch(`/api/mes/${mes}/movimientos/${mov.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "no_aplica" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al marcar no aplica");
        actualizados.push(data as Movimiento);
      }
      setMovs((prev) => prev.map((m) => actualizados.find((u) => u.id === m.id) ?? m));
      setMovOverrides((prev) => new Map(prev).set(conceptoId, "no_aplica"));
      setExpandedId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setActionLoading(null);
    }
  };

  const moverMesSiguiente = async (conceptoId: string) => {
    setActionLoading(conceptoId);
    setError(null);
    try {
      const pendientes = movs.filter((m) => m.conceptoId === conceptoId && m.estado === "pendiente");
      const actualizados: Movimiento[] = [];
      for (const mov of pendientes) {
        const res = await fetch(`/api/mes/${mes}/movimientos/${mov.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "mover_mes_siguiente" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al mover al mes siguiente");
        actualizados.push(data as Movimiento);
      }
      setMovs((prev) => prev.map((m) => actualizados.find((u) => u.id === m.id) ?? m));
      setMovOverrides((prev) => new Map(prev).set(conceptoId, "pospuesto_mes_siguiente"));
      setExpandedId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setActionLoading(null);
    }
  };

  const cerrarPlanificacion = async () => {
    setSavingCierre(true);
    setError(null);
    try {
      // 1. Guardar H1
      const conceptosFinales = await persistirH1();

      // 2. Sincronizar semanas en H2 — solo movimientos pendientes con semana_default fija
      const updatedMovs = [...movs];
      for (const mov of movs) {
        if (mov.estado !== "pendiente") continue;
        const concepto = conceptosFinales.find((c) => c.id === mov.conceptoId);
        if (!concepto || concepto.semanaDefault === "variable") continue;
        if (mov.semana === concepto.semanaDefault) continue;
        const res = await fetch(`/api/mes/${mes}/movimientos/${mov.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "reasignar_semana", semana: concepto.semanaDefault }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al sincronizar H2");
        const idx = updatedMovs.findIndex((m) => m.id === mov.id);
        if (idx >= 0) updatedMovs[idx] = data as Movimiento;
      }

      // 3. Notificar a MesM1 — actualiza movs y cambia a vista ejecución
      onCerrar(updatedMovs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setSavingCierre(false);
    }
  };

  const toggleCat = (cat: Categoria) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    setExpandedId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 md:flex md:flex-col">
          <div className="space-y-3 p-3">

            {/* Bloque 1: Ingreso Camilo */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ingreso Camilo</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={montoCamilo}
                  onChange={(e) => setMontoCamilo(e.target.value)}
                  placeholder="0"
                  className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="button"
                  onClick={guardarIngresoCamilo}
                  disabled={savingIngresoCamilo || !montoCamilo}
                  className="rounded bg-[#1a73e8] px-2.5 py-1.5 text-xs text-white hover:bg-[#1557b0] disabled:opacity-50"
                >
                  {savingIngresoCamilo ? "…" : "✓"}
                </button>
              </div>
              {ingresoCamilo && (
                <p className="mt-1 text-xs text-gray-400">
                  Guardado: {COP(ingresoCamilo.montoCop)}
                </p>
              )}
            </div>

            {/* Bloque 2: Aporte Angie */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Aporte Angie</p>
              {SEMANAS.map((s) => (
                <div key={s} className="mb-2 flex items-center gap-2">
                  <span className="w-5 text-xs font-semibold text-gray-500">{s}</span>
                  <input
                    type="number"
                    value={aportes[s]}
                    onChange={(e) => setAportes((prev) => ({ ...prev, [s]: e.target.value }))}
                    placeholder="0"
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={guardarAportes}
                disabled={savingAportes}
                className="mt-1 w-full rounded bg-[#1a73e8] px-2 py-1.5 text-xs text-white hover:bg-[#1557b0] disabled:opacity-50"
              >
                {savingAportes ? "Guardando…" : "Guardar aportes"}
              </button>
            </div>

            {/* Bloque 3: Balance mes */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Balance mes</p>
              {[
                { label: "Comprometido",    value: totalComprometido,  color: "#374151" },
                { label: "Ingreso Camilo",  value: ingresoCamiloNum,   color: "#374151" },
                { label: "Aportes Angie",   value: aportesNum,         color: "#374151" },
                { label: "Total disponible",value: ingresoTotal,       color: "#137333" },
                { label: "Diferencia",      value: diferenciaTotal,    color: diferenciaTotal >= 0 ? "#137333" : "#c62828" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-baseline justify-between py-0.5">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span style={{ color }} className="font-mono text-xs font-semibold">{COP(value)}</span>
                </div>
              ))}
            </div>

            {/* Bloque 4: Balance por semana */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Balance por semana</p>
              <div className="space-y-2">
                {balancePorSemana.map(({ semana, remanteAnterior, aporteAngie, disponible, comprometido, diferencia }, i) => (
                  <div key={semana} className="rounded bg-gray-50 p-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">{semana}</span>
                      <span
                        style={{ color: diferencia >= 0 ? "#137333" : "#c62828" }}
                        className="font-mono text-xs font-semibold"
                      >
                        {diferencia >= 0 ? "+" : ""}{COP(diferencia)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{i === 0 ? "Ingreso Camilo" : `Remanente ${SEMANAS[i - 1]}`}</span>
                        <span className="font-mono">{COP(remanteAnterior)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Aporte Angie</span>
                        <span className="font-mono">{COP(aporteAngie)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Disponible</span>
                        <span className="font-mono">{COP(disponible)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Comprometido</span>
                        <span className="font-mono">{COP(comprometido)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main table ── */}
        <main className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}


          <table className="w-full min-w-[700px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e7eb]">
              <tr>
                {["Concepto", "Tipo", "Monto Ref.", "Semana", "Notas"].map((col, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                      i === 2 ? "text-right" : "text-left"
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
                      <td colSpan={5} className="px-3 py-1.5">
                        <span className="mr-1.5 text-xs text-gray-400">{collapsed ? "▸" : "▾"}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">{cat}</span>
                        <span className="ml-2 font-mono text-xs text-gray-400">
                          {COP(items.reduce((s, c) => s + c.monto, 0))}
                        </span>
                      </td>
                    </tr>

                    {!collapsed && items.map((concepto) => {
                      const hasMod = dirtyIds.has(concepto.id);
                      const isEditingNota = editingNota === concepto.id;
                      const isExpanded = expandedId === concepto.id;
                      const override = movOverrides.get(concepto.id);
                      return (
                        <React.Fragment key={concepto.id}>
                        <tr
                          className={`border-b border-gray-100 ${hasMod ? "bg-blue-50" : isExpanded ? "bg-gray-50" : "hover:bg-gray-50"}`}
                        >
                          {/* Concepto — chevron + nombre + badge override */}
                          <td className="px-3 py-[8px]">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : concepto.id)}
                                className="shrink-0 text-gray-300 hover:text-gray-500 focus:outline-none"
                                title="Opciones"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </button>
                              {override === "no_aplica" ? (
                                <>
                                  <s className="text-gray-400">{concepto.nombre}</s>
                                  <span
                                    style={{ backgroundColor: "#f1f3f4", color: "#5f6368", padding: "2px 7px", borderRadius: "10px" }}
                                    className="shrink-0 text-xs font-medium"
                                  >
                                    No aplica
                                  </span>
                                </>
                              ) : override === "pospuesto_mes_siguiente" ? (
                                <>
                                  <span className="text-gray-700">{concepto.nombre}</span>
                                  <span
                                    style={{ backgroundColor: "#fff7ed", color: "#c2410c", padding: "2px 7px", borderRadius: "10px", border: "1px solid #fed7aa" }}
                                    className="shrink-0 text-xs font-medium"
                                  >
                                    → {mesSiguienteNombre}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-900">{concepto.nombre}</span>
                              )}
                            </div>
                          </td>

                          {/* Tipo badge */}
                          <td className="px-3 py-[8px]">
                            {(() => {
                              const b = TIPO_BADGE[concepto.tipo];
                              return b ? (
                                <span
                                  style={{ backgroundColor: b.bg, color: b.color, padding: "2px 8px", borderRadius: "12px" }}
                                  className="text-xs font-medium"
                                >
                                  {b.label}
                                </span>
                              ) : <span className="text-gray-400">{concepto.tipo}</span>;
                            })()}
                          </td>

                          {/* Monto Ref. — edición inline */}
                          <td className="px-3 py-[8px] text-right">
                            {editingMonto === concepto.id ? (
                              <input
                                autoFocus
                                type="number"
                                defaultValue={concepto.monto}
                                onBlur={(e) => {
                                  const v = Number(e.target.value);
                                  if (!isNaN(v) && v >= 0 && v !== concepto.monto) {
                                    setConceptoMod(concepto.id, { monto: v });
                                  }
                                  setEditingMonto(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") setEditingMonto(null);
                                }}
                                className="w-28 rounded border border-gray-200 px-2 py-0.5 text-right text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            ) : (
                              <span
                                className="cursor-pointer font-mono text-gray-700 hover:text-[#1a73e8]"
                                onClick={() => setEditingMonto(concepto.id)}
                                title="Clic para editar monto"
                              >
                                {COP(concepto.monto)}
                              </span>
                            )}
                          </td>

                          {/* Semana — botones inline */}
                          <td className="px-3 py-[8px]">
                            {concepto.frecuencia === "semanal" ? (
                              <div className="flex flex-wrap gap-1">
                                {SEMANAS.map((s) => (
                                  <span
                                    key={s}
                                    style={{ backgroundColor: "#e8f0fe", color: "#1a73e8", border: "1px solid #1a73e8" }}
                                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                            <div className="flex flex-wrap gap-1">
                              {SEMANAS_DEFAULT.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setConceptoMod(concepto.id, { semanaDefault: s })}
                                  className={`rounded border px-1.5 py-0.5 text-xs transition-colors ${
                                    concepto.semanaDefault === s
                                      ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                                      : "border-gray-200 bg-white text-gray-500 hover:border-[#1a73e8] hover:text-[#1a73e8]"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            )}
                          </td>

                          {/* Notas — edición inline */}
                          <td className="px-3 py-[8px]">
                            {isEditingNota ? (
                              <input
                                autoFocus
                                type="text"
                                defaultValue={concepto.notas ?? ""}
                                onChange={(e) => setConceptoMod(concepto.id, { notas: e.target.value || null })}
                                onBlur={() => setEditingNota(null)}
                                className="w-full rounded border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            ) : (
                              <span
                                className="block cursor-pointer text-xs text-gray-400 hover:text-gray-700"
                                onClick={() => setEditingNota(concepto.id)}
                                title="Clic para editar nota"
                              >
                                {concepto.notas ?? "—"}
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Panel de acciones expandible */}
                        {isExpanded && (
                          <tr className="border-b border-blue-100 bg-blue-50">
                            <td colSpan={5} className="px-4 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-gray-400">Acciones:</span>
                                <button
                                  type="button"
                                  disabled={!!override || actionLoading === concepto.id}
                                  onClick={() => marcarNoAplica(concepto.id)}
                                  className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {actionLoading === concepto.id ? "…" : "No aplica este mes"}
                                </button>
                                <button
                                  type="button"
                                  disabled={!!override || actionLoading === concepto.id}
                                  onClick={() => moverMesSiguiente(concepto.id)}
                                  style={{ borderColor: "#fed7aa", backgroundColor: "#fff7ed", color: "#c2410c" }}
                                  className="rounded border px-3 py-1 text-xs hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {actionLoading === concepto.id ? "…" : `Mover a ${mesSiguienteNombre}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(null)}
                                  className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-400 hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                                {override && (
                                  <span className="text-xs text-gray-400">
                                    {override === "no_aplica"
                                      ? "Ya marcado como No aplica este mes"
                                      : `Ya movido a ${mesSiguienteNombre}`}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
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
          <span className="text-xs text-gray-400">
            {dirtyIds.size > 0
              ? `${dirtyIds.size} cambio${dirtyIds.size > 1 ? "s" : ""} sin guardar en H1`
              : "Sin cambios pendientes"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarBorrador}
              disabled={savingBorrador || savingCierre || dirtyIds.size === 0}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingBorrador ? "Guardando…" : "Guardar borrador"}
            </button>
            <button
              type="button"
              onClick={cerrarPlanificacion}
              disabled={savingBorrador || savingCierre}
              className="rounded-lg bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-40"
            >
              {savingCierre ? "Sincronizando…" : "Cerrar M1 planificación"}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
