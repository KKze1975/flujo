"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  Movimiento, Concepto, IngresoCamilo, IngresoAngie,
  SaldoCuenta, CierreSemana, Semana, Actor,
} from "@/lib/data/types";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import ModalConfirmarSaldos from "@/components/m1/ModalConfirmarSaldos";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = (n: number, opts?: { compact?: boolean }): string => {
  if (opts?.compact) {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
    return `${sign}$${abs}`;
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
};

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];
const MESES_ES = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_FULL = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function semanaDates(mes: string): Record<Semana, string> {
  const [year, monthStr] = mes.split("-");
  const month = Number(monthStr);
  const last = new Date(Number(year), month, 0).getDate();
  const m = MESES_ES[month];
  return { S1: `1–7 ${m}`, S2: `8–14 ${m}`, S3: `15–21 ${m}`, S4: `22–${last} ${m}` };
}

function mesLabel(mes: string): string {
  const [, monthStr] = mes.split("-");
  return MESES_FULL[Number(monthStr)] ?? mes;
}

function getActiveSemana(mes: string): Semana {
  const today = new Date();
  const [year, monthStr] = mes.split("-");
  if (today.getFullYear() !== Number(year) || today.getMonth() + 1 !== Number(monthStr)) return "S1";
  const d = today.getDate();
  if (d <= 7) return "S1";
  if (d <= 14) return "S2";
  if (d <= 21) return "S3";
  return "S4";
}

function diasParaCerrar(mes: string, semana: Semana): number {
  const [year, monthStr] = mes.split("-");
  const month = Number(monthStr);
  const lastDay = new Date(Number(year), month, 0).getDate();
  const endDay = semana === "S1" ? 7 : semana === "S2" ? 14 : semana === "S3" ? 21 : lastDay;
  const endDate = new Date(Number(year), month - 1, endDay);
  const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

const CAT_ICON: Record<string, string> = {
  "Casa": "home", "Servicios Públicos": "bolt",
  "Membresías y Suscripciones": "receipt", "Educación": "book",
  "Salud": "heart", "Mercado y Alimentación": "bag",
  "Compromisos Financieros": "wallet", "Recreación": "film",
  "Transporte": "car", "Metas Familiares": "trophy", "Frida": "paw",
};

const CUENTAS_H4C = [
  { cuenta: "nu_camilo" as const, label: "NU Camilo", persona: "c" as const },
  { cuenta: "nu_angie"  as const, label: "NU Angie",  persona: "a" as const },
  { cuenta: "arq"       as const, label: "ARQ",       persona: undefined     },
  { cuenta: "en_mano"   as const, label: "En mano",   persona: undefined     },
];

const FUENTES = [
  { key: "fuenteCamilo" as const, label: "NU Camilo" },
  { key: "fuenteAngie"  as const, label: "NU Angie"  },
  { key: "fuenteNequi"  as const, label: "ARQ"       },
  { key: "fuenteEnMano" as const, label: "En mano"   },
];

type EjecutarPanel = {
  movId: string; monto: string; ejecutor: Actor;
  fuenteEnMano: boolean; fuenteNequi: boolean;
  fuenteCamilo: boolean; fuenteAngie: boolean;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function MesM1Mobile({
  mes,
  movimientos: movimientosProp,
  conceptos: _conceptos,
  ingresoCamilo: ingresoCamiloProp,
  ingresosAngie: ingresosAngieProp,
  cierresSemana: _cierresSemana,
  gastosSinClasificarInit: _gastos,
  saldosInit,
  onSwitchToDesktop,
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  cierresSemana: CierreSemana[];
  gastosSinClasificarInit: Record<Semana, number>;
  saldosInit: SaldoCuenta[];
  onSwitchToDesktop?: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [view, setView] = useState<"planeacion" | "ejecucion">("planeacion");
  const [movs, setMovs] = useState<Movimiento[]>(movimientosProp);
  const [saldos, setSaldos] = useState<SaldoCuenta[]>(saldosInit);
  const [wk, setWk] = useState<Semana>(() => getActiveSemana(mes));
  const [showSaldosModal, setShowSaldosModal] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [ejecutarPanel, setEjecutarPanel] = useState<EjecutarPanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => semanaDates(mes), [mes]);
  const label = mesLabel(mes);
  const activeSemana = getActiveSemana(mes);

  // ── Derived ───────────────────────────────────────────────────────────────

  const saldosConfirmados = CUENTAS_H4C.every(({ cuenta }) => saldos.some(s => s.cuenta === cuenta));

  const ingresoCamiloNum = ingresoCamiloProp?.montoCop ?? 0;
  const aportesNum = useMemo(() =>
    ingresosAngieProp.reduce((s, a) => s + a.monto, 0), [ingresosAngieProp]);
  const ingresoTotal = ingresoCamiloNum + aportesNum;

  const totalPresupuestado = useMemo(() =>
    movs.reduce((s, m) => s + m.montoPresupuestado, 0), [movs]);
  const proyeccion = ingresoTotal - totalPresupuestado;

  const ejecutadoTotal = useMemo(() =>
    movs.filter(m => m.estado === "ejecutado")
        .reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0),
    [movs]);
  const pctEjecutado = totalPresupuestado > 0
    ? Math.min(100, Math.round((ejecutadoTotal / totalPresupuestado) * 100))
    : 0;
  const porPagar = useMemo(() =>
    movs.filter(m => m.estado === "pendiente")
        .reduce((s, m) => s + m.montoPresupuestado, 0),
    [movs]);

  const movsSemana = useMemo(() => movs.filter(m => m.semana === wk), [movs, wk]);

  function semanaStat(s: Semana) {
    const items = movs.filter(m => m.semana === s);
    return { total: items.length, ejecutados: items.filter(m => m.estado === "ejecutado").length };
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────

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
      setMovs(prev => prev.map(m => m.id === id ? data as Movimiento : m));
      setExpandedPlanId(null);
      setEjecutarPanel(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  const confirmarEjecucion = () => {
    if (!ejecutarPanel) return;
    const monto = Number(ejecutarPanel.monto);
    if (!monto || isNaN(monto)) return;
    patchar(ejecutarPanel.movId, {
      tipo: "ejecutar", montoEjecutado: monto,
      ejecutor: ejecutarPanel.ejecutor,
      fuenteEnMano: ejecutarPanel.fuenteEnMano,
      fuenteNequi: ejecutarPanel.fuenteNequi,
      fuenteCamilo: ejecutarPanel.fuenteCamilo,
      fuenteAngie: ejecutarPanel.fuenteAngie,
    });
  };

  // ── Shared header ──────────────────────────────────────────────────────────

  const header = (
    <header className="fl-appbar" style={{ paddingTop: 48, paddingBottom: 18, paddingLeft: 18, paddingRight: 18 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        {onSwitchToDesktop && (
          <button type="button" onClick={onSwitchToDesktop}
            style={{ borderRadius: 999, border: "1px solid var(--appbar-hair)", padding: "5px 12px", fontSize: 12, color: "var(--appbar-ink)", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="monitor" size={13} /> Escritorio
          </button>
        )}
      </div>
      <p className="eyebrow">Inicio de mes</p>
      <h1>{label}</h1>
      <p className="sub" style={{ marginTop: 5 }}>
        {view === "planeacion" ? "Planificación de pagos del mes" : `Semana activa · ${activeSemana}`}
      </p>
      <div style={{ marginTop: 14, display: "flex", background: "var(--appbar-hair)", borderRadius: 999, padding: 2 }}>
        {(["planeacion", "ejecucion"] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            style={{
              flex: 1, borderRadius: 999, padding: "7px 0", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              background: view === v ? "var(--surface)" : "transparent",
              color: view === v ? "var(--primary)" : "var(--appbar-ink)",
              transition: "background 0.15s",
            }}>
            {v === "planeacion" ? "Planificación" : "Ejecución"}
          </button>
        ))}
      </div>
    </header>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="t-calido" style={{ minHeight: "100svh" }}>
      {header}

      <div className="fl-body">
        {error && (
          <div style={{ borderRadius: 12, background: "var(--neg-soft)", padding: "10px 14px", fontSize: 13, color: "var(--neg)", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {view === "planeacion" ? (
          <>
            {/* 3 métricas en fila */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { k: "Ingresos del mes",     v: ingresoTotal,      color: undefined },
                { k: "Presupuestado",         v: totalPresupuestado, color: undefined },
                { k: "Proy. superávit",       v: proyeccion, color: proyeccion >= 0 ? "var(--pos)" : "var(--neg)" },
              ].map(({ k, v, color }) => (
                <div key={k} className="fl-card" style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 5px", lineHeight: 1.3 }}>{k}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color ?? "var(--ink)", margin: 0, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.01em" }}>
                    {COP(v, { compact: true })}
                  </p>
                </div>
              ))}
            </div>

            {/* Saldos 2×2 + botón confirmar */}
            <div className="fl-card">
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", margin: "0 0 12px" }}>Saldos por cuenta</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {CUENTAS_H4C.map(({ cuenta, label: cLabel, persona }) => {
                  const entry = saldos.find(s => s.cuenta === cuenta);
                  return (
                    <div key={cuenta} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", borderRadius: 12, padding: "8px 10px" }}>
                      {persona
                        ? <span className={`fl-person ${persona}`} style={{ width: 20, height: 20, fontSize: 9 }}>{persona === "c" ? "C" : "A"}</span>
                        : <span style={{ width: 20, height: 20, borderRadius: 6, background: "var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="wallet" size={10} /></span>}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 10, color: "var(--ink-faint)", fontWeight: 600, margin: 0 }}>{cLabel}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: 0, fontFeatureSettings: '"tnum" 1' }}>
                          {entry ? COP(entry.saldoInicial, { compact: true }) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setShowSaldosModal(true)}
                className={`fl-btn ${saldosConfirmados ? "ghost" : "primary"} block sm`}
                style={saldosConfirmados ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}>
                {saldosConfirmados
                  ? <><Icon name="check" size={14} /> Saldos confirmados</>
                  : "Confirmar saldos del mes"}
              </button>
            </div>

            {/* Tabs S1–S4 con conteo */}
            <div className="fl-tabs">
              {SEMANAS.map(s => {
                const { total } = semanaStat(s);
                return (
                  <button key={s} type="button"
                    className={`fl-tab${wk === s ? " on" : ""}`}
                    onClick={() => { setWk(s); setExpandedPlanId(null); }}>
                    {s}
                    <span className="cnt" style={{
                      background: wk === s ? "var(--primary)" : "var(--line)",
                      color: wk === s ? "var(--on-primary)" : "var(--ink-faint)",
                    }}>{total}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de conceptos planeación */}
            {movsSemana.length === 0 ? (
              <div className="fl-emptystate">
                <div className="ic"><Icon name="list" size={24} /></div>
                <p className="t">Sin conceptos en {wk}</p>
                <p className="d">{dates[wk]}</p>
              </div>
            ) : (
              movsSemana.map(mov => {
                const isExpanded = expandedPlanId === mov.id;
                const isEjecutado = mov.estado === "ejecutado";
                const isNoAplica = mov.estado === "no_aplica";
                const isPospuesto = mov.estado === "pospuesto" || mov.estado === "pospuesto_mes_siguiente";
                const canAct = !isEjecutado && !isNoAplica && !isPospuesto;

                return (
                  <div key={mov.id} className="fl-concepto"
                    onClick={canAct && !isExpanded ? () => setExpandedPlanId(mov.id) : undefined}
                    style={{ cursor: canAct && !isExpanded ? "pointer" : "default" }}>
                    <div className="top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="name">{mov.nombreSnapshot}</p>
                        <p className="cat">{mov.categoriaSnapshot}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p className="amt">{COP(mov.montoPresupuestado)}</p>
                        <div style={{ marginTop: 4 }}>
                          {isEjecutado
                            ? <span className="fl-badge pos"><Icon name="check" size={9} /> listo</span>
                            : isNoAplica
                              ? <span className="fl-badge">no aplica</span>
                              : isPospuesto
                                ? <span className="fl-badge">pospuesto</span>
                                : <span className="fl-badge warn"><span className="dot" /> por pagar</span>}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}
                           onClick={e => e.stopPropagation()}>
                        <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 8px" }}>Cambiar semana</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {SEMANAS.map(s => (
                            <button key={s} type="button"
                              disabled={mov.semana === s || busy}
                              onClick={() => patchar(mov.id, { tipo: "reasignar_semana", semana: s })}
                              className="fl-chip"
                              style={{
                                cursor: mov.semana === s ? "not-allowed" : "pointer",
                                background: mov.semana === s ? "var(--line)" : "var(--primary-soft)",
                                color: mov.semana === s ? "var(--ink-faint)" : "var(--primary)",
                                borderColor: "transparent",
                              }}>
                              {s}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" disabled={busy}
                            onClick={() => patchar(mov.id, { tipo: "no_aplica" })}
                            className="fl-chip"
                            style={{ cursor: "pointer", background: "var(--surface-2)", color: "var(--ink-soft)", borderColor: "transparent" }}>
                            No aplica
                          </button>
                          <button type="button" disabled={busy}
                            onClick={() => patchar(mov.id, { tipo: "posponer", razonPostergacion: null })}
                            className="fl-chip"
                            style={{ cursor: "pointer", background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" }}>
                            Mes siguiente
                          </button>
                          <button type="button"
                            onClick={() => setExpandedPlanId(null)}
                            style={{ fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: "6px 4px" }}>
                            ✕ Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          /* ── Ejecución ─────────────────────────────────────────────── */
          <>
            {/* 2 métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fl-card">
                <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 6px" }}>Ejecutado del mes</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "0 0 10px", fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}>
                  {COP(ejecutadoTotal, { compact: true })}
                </p>
                <div className="fl-bar" style={{ marginBottom: 6 }}>
                  <i style={{ width: `${pctEjecutado}%` }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0 }}>{pctEjecutado}%</p>
              </div>
              <div className="fl-card">
                <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 6px" }}>Por pagar</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em",
                  color: porPagar > 0 ? "var(--warn)" : "var(--pos)" }}>
                  {COP(porPagar, { compact: true })}
                </p>
              </div>
            </div>

            {/* Selector de semana S1–S4 */}
            <div className="wk-pills">
              {SEMANAS.map(s => {
                const { ejecutados, total } = semanaStat(s);
                return (
                  <button key={s} type="button"
                    className={`wk-pill${wk === s ? " on" : ""}${s === activeSemana ? " active-wk" : ""}`}
                    onClick={() => { setWk(s); setEjecutarPanel(null); }}
                    style={s === activeSemana && wk !== s ? { border: "2px solid var(--primary)" } : undefined}>
                    {s}
                    <span className="sub">{ejecutados}/{total}</span>
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600, margin: "-4px 0 0", textAlign: "center" }}>
              Semana activa · cierra en {diasParaCerrar(mes, activeSemana)} días
            </p>

            {/* Lista de conceptos ejecución */}
            {movsSemana.length === 0 ? (
              <div className="fl-emptystate">
                <div className="ic"><Icon name="check" size={24} /></div>
                <p className="t">Sin conceptos en {wk}</p>
                <p className="d">{dates[wk]}</p>
              </div>
            ) : (
              <div className="fl-card" style={{ padding: 0, overflow: "hidden" }}>
                {movsSemana.map((mov, idx) => {
                  const isExec = mov.estado === "ejecutado";
                  const isOpen = ejecutarPanel?.movId === mov.id;
                  const panel = isOpen ? ejecutarPanel! : null;
                  const monto = panel ? Number(panel.monto) : 0;

                  return (
                    <div key={mov.id}>
                      {idx > 0 && <div style={{ height: 1, background: "var(--line)", margin: "0 15px" }} />}
                      <div className="fl-listrow" style={{ padding: "13px 15px", alignItems: "center" }}>
                        <span className="li-ic">
                          <Icon name={CAT_ICON[mov.categoriaSnapshot] ?? "wallet"} size={20} />
                        </span>
                        <div className="li-tx">
                          <p className="t">{mov.nombreSnapshot}</p>
                          <p className="d">{mov.categoriaSnapshot} · {COP(mov.montoPresupuestado, { compact: true })}</p>
                        </div>
                        {isExec
                          ? <span className="fl-badge pos"><Icon name="check" size={10} /> Ejecutado</span>
                          : <button type="button"
                              onClick={() => setEjecutarPanel(isOpen ? null : {
                                movId: mov.id,
                                monto: String(mov.montoPresupuestado),
                                ejecutor: "camilo",
                                fuenteEnMano: false, fuenteNequi: false,
                                fuenteCamilo: false, fuenteAngie: false,
                              })}
                              className="dk-exec-btn"
                              style={{ fontSize: 12, padding: "6px 12px", flexShrink: 0 }}>
                              {isOpen ? "Cancelar" : "Ejecutar"}
                            </button>}
                      </div>

                      {isOpen && !isExec && (
                        <div style={{ background: "var(--primary-soft)", padding: "12px 15px 14px", borderTop: "1px solid var(--line)" }}>
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 6px" }}>Monto ejecutado</p>
                            <input
                              type="number"
                              value={panel!.monto}
                              onChange={e => setEjecutarPanel(p => p ? { ...p, monto: e.target.value } : p)}
                              className="fl-input"
                              style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                            />
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 6px" }}>Fuente de pago</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {FUENTES.map(({ key, label: fLabel }) => {
                                const active = panel![key];
                                return (
                                  <button key={key} type="button"
                                    onClick={() => setEjecutarPanel(p => p ? { ...p, [key]: !p[key] } : p)}
                                    className="fl-chip"
                                    style={{ cursor: "pointer", borderColor: "transparent",
                                      background: active ? "var(--primary)" : "var(--surface-2)",
                                      color: active ? "var(--on-primary)" : "var(--ink-soft)" }}>
                                    {fLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <p style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, margin: "0 0 6px" }}>Ejecutor</p>
                            <div style={{ display: "flex", gap: 6 }}>
                              {(["camilo", "angie"] as Actor[]).map(a => (
                                <button key={a} type="button"
                                  onClick={() => setEjecutarPanel(p => p ? { ...p, ejecutor: a } : p)}
                                  className="fl-chip"
                                  style={{ cursor: "pointer", borderColor: "transparent",
                                    background: panel!.ejecutor === a ? "var(--primary)" : "var(--surface-2)",
                                    color: panel!.ejecutor === a ? "var(--on-primary)" : "var(--ink-soft)" }}>
                                  {a === "camilo" ? "Camilo" : "Angie"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" onClick={confirmarEjecucion}
                              disabled={busy || !monto || isNaN(monto)}
                              className="fl-btn primary sm" style={{ flex: 1, justifyContent: "center" }}>
                              {busy ? "…" : "Confirmar pago"}
                            </button>
                            <button type="button" onClick={() => setEjecutarPanel(null)}
                              className="fl-btn ghost sm">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav
        active="mes"
        semanaHref={`/mes/${mes}/semana`}
        onFabClick={() => router.push("/registro")}
      />

      {mounted && showSaldosModal && createPortal(
        <ModalConfirmarSaldos
          mes={mes}
          existing={saldos}
          onConfirmed={(s) => { setSaldos(s); setShowSaldosModal(false); }}
        />,
        document.body
      )}
    </div>
  );
}
