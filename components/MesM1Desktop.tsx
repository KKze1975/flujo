"use client";

import { useState, useMemo } from "react";
import type { Movimiento, SaldoCuenta, Semana, Categoria, Actor, IngresoCamilo, CuentaDestino } from "@/lib/data/types";
import Icon from "@/components/ui/Icon";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = (n: number, opts?: { compact?: boolean }): string => {
  if (opts?.compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n}`;
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
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

const CAT_ICON: Record<Categoria, string> = {
  "Casa":                         "home",
  "Servicios Públicos":           "bolt",
  "Membresías y Suscripciones":   "receipt",
  "Educación":                    "book",
  "Salud":                        "heart",
  "Mercado y Alimentación":       "bag",
  "Compromisos Financieros":      "wallet",
  "Recreación":                   "film",
  "Transporte":                   "car",
  "Metas Familiares":             "trophy",
  "Frida":                        "paw",
};

const CUENTAS_H4C: Array<{
  cuenta: SaldoCuenta["cuenta"];
  label: string;
  persona?: "c" | "a";
  fuenteKey: "fuenteCamilo" | "fuenteAngie" | "fuenteNequi" | "fuenteEnMano";
}> = [
  { cuenta: "nu_camilo", label: "NU Camilo", persona: "c", fuenteKey: "fuenteCamilo" },
  { cuenta: "nu_angie",  label: "NU Angie",  persona: "a", fuenteKey: "fuenteAngie"  },
  { cuenta: "arq",       label: "ARQ",                     fuenteKey: "fuenteNequi"  },
  { cuenta: "en_mano",   label: "En mano",                 fuenteKey: "fuenteEnMano" },
];

// ── Ejecutar panel state ──────────────────────────────────────────────────────

type EjecutarPanel = {
  movId: string;
  monto: string;
  ejecutor: Actor;
  fuenteEnMano: boolean;
  fuenteNequi: boolean;
  fuenteCamilo: boolean;
  fuenteAngie: boolean;
};

const FUENTES: Array<{ key: keyof Omit<EjecutarPanel, "movId" | "monto" | "ejecutor">; label: string }> = [
  { key: "fuenteCamilo", label: "NU Camilo" },
  { key: "fuenteAngie",  label: "NU Angie"  },
  { key: "fuenteNequi",  label: "ARQ"       },
  { key: "fuenteEnMano", label: "En mano"   },
];

// ── Row sub-component ─────────────────────────────────────────────────────────

type TableRow =
  | { kind: "group"; semana: Semana; label: string }
  | { kind: "item";  mov: Movimiento };

function Row({
  mov, showWk, wkLabel, exec,
  panel, onOpenPanel, onPanelChange, onConfirm, onCancel, busy, blocked,
}: {
  mov: Movimiento;
  showWk: boolean;
  wkLabel: string;
  exec: boolean;
  panel: EjecutarPanel | null;
  onOpenPanel: () => void;
  onPanelChange: (p: EjecutarPanel) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  blocked: boolean;
}) {
  const colSpan = showWk ? 6 : 5;
  const isOpen = panel?.movId === mov.id;
  const monto = Number(panel?.monto ?? "");
  const diff = isOpen && !isNaN(monto) ? monto - mov.montoPresupuestado : 0;

  return (
    <>
      <tr>
        <td>
          <div className="dk-concepto">
            <span className="ic">
              <Icon name={CAT_ICON[mov.categoriaSnapshot] ?? "wallet"} size={17} />
            </span>
            <span className="nm">{mov.nombreSnapshot}</span>
            {mov.pendienteAprobacion && (
              <span className="fl-badge primary" style={{ fontSize: 9, padding: "1px 6px" }}>
                <Icon name="lock" size={9} />
              </span>
            )}
          </div>
        </td>
        <td style={{ color: "var(--ink-soft)" }}>{mov.categoriaSnapshot}</td>
        {showWk && <td><span className="dk-wk">{wkLabel}</span></td>}
        <td className="num"><span className="dk-amt">{COP(mov.montoPresupuestado)}</span></td>
        <td>
          {exec
            ? <span className="fl-badge pos"><Icon name="check" size={11} /> Ejecutado</span>
            : <span className="fl-badge warn"><span className="dot" /> Pendiente</span>}
        </td>
        <td style={{ textAlign: "right" }}>
          {exec
            ? <span className="dk-done"><Icon name="check" size={13} /> listo</span>
            : <button
                className="dk-exec-btn"
                onClick={blocked ? undefined : (isOpen ? onCancel : onOpenPanel)}
                disabled={blocked}
                style={blocked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              >{isOpen ? "Cancelar" : "Ejecutar"}</button>}
        </td>
      </tr>

      {isOpen && !exec && (
        <tr style={{ background: "var(--primary-soft)" }}>
          <td colSpan={colSpan} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 }}>Monto ejecutado</label>
                <input
                  type="number"
                  value={panel!.monto}
                  onChange={(e) => onPanelChange({ ...panel!, monto: e.target.value })}
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
                <p style={{ marginBottom: 4, fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>Fuente</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {FUENTES.map(({ key, label }) => {
                    const active = panel![key];
                    return (
                      <button key={key} type="button" onClick={() => onPanelChange({ ...panel!, [key]: !panel![key] })}
                        className="fl-chip"
                        style={{ cursor: "pointer", background: active ? "var(--primary)" : "var(--surface-2)", color: active ? "var(--on-primary)" : "var(--ink-soft)", borderColor: "transparent" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ marginBottom: 4, fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>Ejecutor</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["camilo", "angie"] as Actor[]).map((a) => (
                    <button key={a} type="button" onClick={() => onPanelChange({ ...panel!, ejecutor: a })}
                      className="fl-chip"
                      style={{ cursor: "pointer", background: panel!.ejecutor === a ? "var(--primary)" : "var(--surface-2)", color: panel!.ejecutor === a ? "var(--on-primary)" : "var(--ink-soft)", borderColor: "transparent" }}>
                      {a === "camilo" ? "C" : "A"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={onConfirm} disabled={busy || !monto || isNaN(monto)} className="fl-btn primary sm">
                  {busy ? "…" : "Confirmar pago"}
                </button>
                <button type="button" onClick={onCancel} className="fl-btn ghost sm">Cancelar</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const CUENTAS_DESTINO: { key: CuentaDestino; label: string }[] = [
  { key: "camilo",   label: "Cta. Camilo" },
  { key: "angie",    label: "Cta. Angie"  },
  { key: "en_mano",  label: "En mano"     },
  { key: "nequi",    label: "Nequi"       },
];

export default function MesM1Desktop({
  movimientos: movimientosProp,
  saldos,
  mes,
  ingresoCamilo: ingresoCamiloProp = null,
  onSwitchToMobile,
}: {
  movimientos: Movimiento[];
  saldos: SaldoCuenta[];
  mes: string;
  ingresoCamilo?: IngresoCamilo | null;
  onSwitchToMobile: () => void;
}) {
  const [movs, setMovs] = useState<Movimiento[]>(movimientosProp);
  const [saldosLocal, setSaldosLocal] = useState<SaldoCuenta[]>(saldos);
  const [wk, setWk] = useState<"todas" | Semana>("todas");
  const [saldosOk, setSaldosOk] = useState(saldos.length >= 4);
  const [ejecutarPanel, setEjecutarPanel] = useState<EjecutarPanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Ingreso Camilo modal ───────────────────────────────────────────────────
  const [ingresoCamiloLocal, setIngresoCamiloLocal] = useState<IngresoCamilo | null>(ingresoCamiloProp);
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false);
  const [ingresoMonto, setIngresoMonto] = useState(ingresoCamiloProp ? String(ingresoCamiloProp.montoCop) : "");
  const [ingresoCuenta, setIngresoCuenta] = useState<CuentaDestino>(ingresoCamiloProp?.cuentaDestino ?? "camilo");
  const [ingresoBusy, setIngresoBusy] = useState(false);
  const [ingresoError, setIngresoError] = useState<string | null>(null);

  const handleGuardarIngreso = async () => {
    const montoNum = Number(ingresoMonto);
    if (!montoNum || isNaN(montoNum)) return;
    setIngresoBusy(true);
    setIngresoError(null);
    try {
      const res = await fetch(`/api/ingresos/camilo/${mes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoCop: montoNum, cuentaDestino: ingresoCuenta, estado: "confirmado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setIngresoCamiloLocal(data as IngresoCamilo);
      setIngresoModalOpen(false);
    } catch (e: unknown) {
      setIngresoError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIngresoBusy(false);
    }
  };

  const dates = useMemo(() => semanaDates(mes), [mes]);
  const label = mesLabel(mes);

  const isExec = (mov: Movimiento) => mov.estado === "ejecutado";

  const filtrados = wk === "todas" ? movs : movs.filter((m) => m.semana === wk);

  // ── PATCH ─────────────────────────────────────────────────────────────────
  const patchar = async (id: string, body: Record<string, unknown>, onSuccess?: () => void) => {
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
      setEjecutarPanel(null);
      onSuccess?.();
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
    const panel = { ...ejecutarPanel };

    patchar(panel.movId, {
      tipo: "ejecutar",
      montoEjecutado: monto,
      ejecutor: panel.ejecutor,
      fuenteEnMano: panel.fuenteEnMano,
      fuenteNequi: panel.fuenteNequi,
      fuenteCamilo: panel.fuenteCamilo,
      fuenteAngie: panel.fuenteAngie,
    }, () => {
      // Deduct monto from active fuentes, split evenly
      const activeCuentas = CUENTAS_H4C
        .filter(({ fuenteKey }) => panel[fuenteKey])
        .map(({ cuenta }) => cuenta);
      if (activeCuentas.length > 0) {
        const perCuenta = monto / activeCuentas.length;
        setSaldosLocal((prev) => prev.map((s) =>
          activeCuentas.includes(s.cuenta)
            ? { ...s, saldoInicial: Math.max(0, s.saldoInicial - perCuenta) }
            : s
        ));
      }
    });
  };

  const ejecutarBloqueado = !ingresoCamiloLocal || ingresoCamiloLocal.montoCop === 0;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPresupuestado = movs.reduce((s, m) => s + m.montoPresupuestado, 0);
  const ejecutadoMonto     = movs.filter(isExec).reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0);
  const pendientes         = movs.filter((m) => !isExec(m)).length;
  const totalSaldos        = saldos.reduce((s, c) => s + c.saldoInicial, 0);
  const proyeccion         = totalSaldos - totalPresupuestado;
  const pctEjecutado       = totalPresupuestado > 0 ? Math.min(100, Math.round((ejecutadoMonto / totalPresupuestado) * 100)) : 0;

  const saldoC    = saldos.find((s) => s.cuenta === "nu_camilo")?.saldoInicial ?? 0;
  const saldoA    = saldos.find((s) => s.cuenta === "nu_angie")?.saldoInicial ?? 0;
  const splitTotal = saldoC + saldoA || 1;

  // ── Por categoría ─────────────────────────────────────────────────────────
  const byCat = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    for (const m of movs) map[m.categoriaSnapshot] = (map[m.categoriaSnapshot] ?? 0) + m.montoPresupuestado;
    return Object.entries(map as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [movs]);
  const catMax = byCat[0]?.[1] ?? 1;

  // ── Filas de tabla ────────────────────────────────────────────────────────
  const rows = useMemo<TableRow[]>(() => {
    if (wk !== "todas") return filtrados.map((mov) => ({ kind: "item", mov }));
    const result: TableRow[] = [];
    for (const s of SEMANAS) {
      const items = movs.filter((m) => m.semana === s);
      if (items.length === 0) continue;
      result.push({ kind: "group", semana: s, label: `${s} · ${dates[s]}` });
      items.forEach((mov) => result.push({ kind: "item", mov }));
    }
    return result;
  }, [wk, filtrados, movs, dates]);

  // ── Balance por semana ────────────────────────────────────────────────────
  const balanceSemanas = useMemo(() => SEMANAS.map((s) => {
    const items = movs.filter((m) => m.semana === s);
    const comprometido = items.reduce((sum, m) => sum + m.montoPresupuestado, 0);
    const ejecutado    = items.filter((m) => m.estado === "ejecutado").reduce((sum, m) => sum + (m.montoEjecutado ?? m.montoPresupuestado), 0);
    const pendiente    = items.filter((m) => m.estado === "pendiente").length;
    const diferencia   = ejecutado - comprometido;
    return { semana: s, comprometido, ejecutado, diferencia, pendiente };
  }), [movs]);

  // ── Saldo total reactivo (sidebar) ────────────────────────────────────────
  const totalSaldosLocal = saldosLocal.reduce((s, c) => s + c.saldoInicial, 0);

  return (
    <div className="dk dk-app">

      {/* ── SIDEBAR ── */}
      <aside className="dk-side">
        <div className="dk-brand">
          <span className="mark"><Icon name="bolt" size={18} fill /></span>
          <span className="nm">Flujo</span>
        </div>

        <nav className="dk-nav">
          <button className="dk-navitem on"><Icon name="list" size={19} /> Inicio de mes</button>
          <button className="dk-navitem"><Icon name="calendar" size={19} /> Esta semana<span className="badge">{pendientes}</span></button>
          <button className="dk-navitem"><Icon name="wallet" size={19} /> Bolsillos</button>
          <button className="dk-navitem"><Icon name="archive" size={19} /> Historial</button>
        </nav>

        <p className="dk-navlabel">Mes</p>
        <nav className="dk-nav">
          <button className="dk-navitem" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            <Icon name="calendar" size={18} /> {label}
          </button>
        </nav>

        {/* ── Saldos por cuenta (sidebar) ── */}
        <p className="dk-navlabel" style={{ marginTop: 20 }}>Saldos</p>
        <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "10px 12px", marginBottom: 4 }}>
          {CUENTAS_H4C.map(({ cuenta, label: cuentaLabel, persona }) => {
            const entry = saldosLocal.find((s) => s.cuenta === cuenta);
            return (
              <div key={cuenta} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                {persona
                  ? <span className={`fl-person ${persona}`} style={{ width: 18, height: 18, fontSize: 9 }}>{persona === "c" ? "C" : "A"}</span>
                  : <span style={{ width: 18, height: 18, borderRadius: 6, background: "var(--line)", display: "grid", placeItems: "center" }}><Icon name="wallet" size={10} /></span>}
                <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>{cuentaLabel}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                  {entry ? COP(entry.saldoInicial, { compact: true }) : "—"}
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: "var(--ink-soft)" }}>Total</span>
            <span style={{ color: "var(--ink)" }}>{COP(totalSaldosLocal, { compact: true })}</span>
          </div>
        </div>

        {/* ── Balance por semana (sidebar) ── */}
        <p className="dk-navlabel" style={{ marginTop: 16 }}>Por semana</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
          {balanceSemanas.map(({ semana, comprometido, ejecutado, diferencia, pendiente }) => (
            <div key={semana} style={{ background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>{semana}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: diferencia >= 0 ? "var(--pos)" : "var(--neg)" }}>
                  {diferencia > 0 ? "+" : ""}{COP(diferencia, { compact: true })}
                </span>
              </div>
              <div className="fl-bar" style={{ height: 5, marginBottom: 4 }}>
                <i style={{
                  width: comprometido > 0 ? `${Math.min(100, Math.round((ejecutado / comprometido) * 100))}%` : "0%",
                  background: diferencia < 0 ? "var(--warn)" : "var(--primary)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-faint)" }}>
                <span>{COP(comprometido, { compact: true })}</span>
                <span>{pendiente > 0 ? `${pendiente} pend.` : "✓"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dk-user">
          <span className="av">
            <span className="fl-person c">C</span>
            <span className="fl-person a">A</span>
          </span>
          <span className="tx">
            <p className="t">Familia Villamil</p>
            <p className="d">Camilo &amp; Angie</p>
          </span>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="dk-main">
        <header className="dk-topbar">
          <div>
            <h1 className="ttl">
              Inicio de mes{" "}
              <span className="dk-monthpill"><Icon name="calendar" size={13} /> {label}</span>
            </h1>
            <p className="sub">Planeen el mes, confirmen saldos y ejecuten los pagos fijos — juntos.</p>
          </div>
          <div className="dk-actions">
            <button className="fl-btn ghost sm" onClick={onSwitchToMobile}>
              <Icon name="phone" size={15} /> Vista móvil
            </button>
            <button
              className="fl-btn ghost sm"
              onClick={() => {
                setIngresoMonto(ingresoCamiloLocal ? String(ingresoCamiloLocal.montoCop) : "");
                setIngresoCuenta(ingresoCamiloLocal?.cuentaDestino ?? "camilo");
                setIngresoError(null);
                setIngresoModalOpen(true);
              }}
              style={ingresoCamiloLocal ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}
            >
              {ingresoCamiloLocal
                ? <><Icon name="check" size={15} /> {COP(ingresoCamiloLocal.montoCop, { compact: true })}</>
                : <><Icon name="wallet" size={15} /> Ingreso Camilo</>}
            </button>
            <button
              className="fl-btn ghost sm"
              onClick={() => setSaldosOk(true)}
              style={saldosOk ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}
            >
              {saldosOk ? <><Icon name="check" size={15} /> Saldos confirmados</> : <><Icon name="wallet" size={15} /> Confirmar saldos</>}
            </button>
            <button className="fl-btn primary sm"><Icon name="flag" size={15} /> Cerrar planificación</button>
          </div>
        </header>

        {ejecutarBloqueado && (
          <div style={{ margin: "12px 32px 0", padding: "10px 14px", background: "var(--warn-soft, #fff8e1)", color: "var(--warn, #b45309)", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="lock" size={14} /> Registra el ingreso del mes para comenzar la ejecución
          </div>
        )}

        {error && (
          <div style={{ margin: "12px 32px 0", padding: "10px 14px", background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div className="dk-content">

          {/* ── KPIs ── */}
          <div className="dk-kpis">
            <div className="dk-kpi">
              <p className="k"><Icon name="wallet" size={14} /> Saldos iniciales</p>
              <p className="v">{COP(totalSaldos)}</p>
              <div className="fl-split" style={{ marginTop: 12 }}>
                <span className="c" style={{ width: `${Math.round((saldoC / splitTotal) * 100)}%` }} />
                <span className="a" style={{ width: `${Math.round((saldoA / splitTotal) * 100)}%` }} />
              </div>
              <div className="fl-legend" style={{ marginTop: 9 }}>
                <span className="side"><span className="fl-person c">C</span><span className="vl">{COP(saldoC, { compact: true })}</span></span>
                <span className="side"><span className="vl">{COP(saldoA, { compact: true })}</span><span className="fl-person a">A</span></span>
              </div>
              {ingresoCamiloLocal
                ? <p className="h" style={{ color: "var(--pos)", marginTop: 6 }}>Ingreso: {COP(ingresoCamiloLocal.montoCop, { compact: true })}</p>
                : <p className="h" style={{ color: "var(--neg)", marginTop: 6 }}>Sin ingreso registrado</p>}
            </div>
            <div className="dk-kpi">
              <p className="k"><Icon name="list" size={14} /> Presupuestado</p>
              <p className="v">{COP(totalPresupuestado)}</p>
              <p className="h">{movs.length} conceptos</p>
            </div>
            <div className="dk-kpi">
              <p className="k"><Icon name="check" size={14} /> Ejecutado</p>
              <p className="v">{COP(ejecutadoMonto)}</p>
              <div className="fl-bar" style={{ marginTop: 12 }}><i style={{ width: `${pctEjecutado}%` }} /></div>
              <p className="h">{pctEjecutado}% · {pendientes} pendientes</p>
            </div>
            <div className="dk-kpi">
              <p className="k"><Icon name="trophy" size={14} /> Proyección superávit</p>
              <p className="v" style={{ color: proyeccion >= 0 ? "var(--pos)" : "var(--neg)" }}>
                {proyeccion >= 0 ? "+" : ""}{COP(proyeccion)}
              </p>
              <p className="h">saldos − presupuesto</p>
            </div>
          </div>

          {/* ── Split: tabla + rail ── */}
          <div className="dk-grid">

            {/* Tabla */}
            <div className="dk-panel">
              <div className="dk-panel-head">
                <h3>Conceptos fijos</h3>
                <span className="cnt">{filtrados.length} conceptos</span>
                <div className="dk-filters">
                  {(["todas", "S1", "S2", "S3", "S4"] as const).map((f) => (
                    <button key={f} className={`dk-fchip${wk === f ? " on" : ""}`} onClick={() => setWk(f)}>
                      {f === "todas" ? "Todas" : f}
                    </button>
                  ))}
                </div>
              </div>

              <table className="dk-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    {wk === "todas" && <th>Sem.</th>}
                    <th className="num">Monto</th>
                    <th>Estado</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) =>
                    r.kind === "group" ? (
                      <tr className="dk-grouprow" key={`g-${r.semana}`}>
                        <td colSpan={wk === "todas" ? 6 : 5}>{r.label}</td>
                      </tr>
                    ) : (
                      <Row
                        key={r.mov.id}
                        mov={r.mov}
                        showWk={wk === "todas"}
                        wkLabel={r.mov.semana ? dates[r.mov.semana] : ""}
                        exec={isExec(r.mov)}
                        panel={ejecutarPanel?.movId === r.mov.id ? ejecutarPanel : null}
                        onOpenPanel={() => setEjecutarPanel({
                          movId: r.mov.id,
                          monto: String(r.mov.montoPresupuestado),
                          ejecutor: "camilo",
                          fuenteEnMano: false,
                          fuenteNequi: false,
                          fuenteCamilo: false,
                          fuenteAngie: false,
                        })}
                        onPanelChange={setEjecutarPanel}
                        onConfirm={confirmarEjecucion}
                        onCancel={() => setEjecutarPanel(null)}
                        busy={busy}
                        blocked={ejecutarBloqueado}
                      />
                    )
                  )}
                </tbody>
                <tfoot>
                  <tr className="dk-foot">
                    <td className="lbl">Total{wk !== "todas" ? ` · ${wk}` : ""}</td>
                    <td />
                    {wk === "todas" && <td />}
                    <td className="num tot">{COP(filtrados.reduce((s, m) => s + m.montoPresupuestado, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rail — solo Por categoría */}
            <div className="dk-rail">
              <div className="dk-card">
                <h4><Icon name="chart" size={15} /> Por categoría</h4>
                {byCat.map(([cat, amt]) => (
                  <div className="dk-catbar" key={cat}>
                    <div className="row">
                      <span className="n">{cat}</span>
                      <span className="v">{COP(amt, { compact: true })}</span>
                    </div>
                    <div className="fl-bar"><i style={{ width: `${(amt / catMax) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal Ingreso Camilo ── */}
      {ingresoModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}
          onClick={() => setIngresoModalOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 420, borderRadius: 16, background: "var(--surface)", padding: "24px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Ingreso Camilo — {label}</h2>
              <button onClick={() => setIngresoModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--ink-soft)", lineHeight: 1 }}>&times;</button>
            </div>

            {ingresoError && (
              <div style={{ marginBottom: 14, borderRadius: 8, padding: "8px 12px", background: "var(--neg-soft)", color: "var(--neg)", fontSize: 13, fontWeight: 600 }}>
                {ingresoError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 6 }}>Monto COP</label>
                <input
                  type="number"
                  value={ingresoMonto}
                  onChange={(e) => setIngresoMonto(e.target.value)}
                  placeholder="Ej: 8500000"
                  className="fl-input"
                  style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                />
                {Number(ingresoMonto) > 0 && (
                  <p style={{ marginTop: 4, fontSize: 11, color: "var(--ink-faint)" }}>{COP(Number(ingresoMonto))}</p>
                )}
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 8 }}>Cuenta destino</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CUENTAS_DESTINO.map(({ key, label: cLabel }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIngresoCuenta(key)}
                      className="fl-chip"
                      style={{
                        cursor: "pointer",
                        background: ingresoCuenta === key ? "var(--primary)" : "var(--surface-2)",
                        color: ingresoCuenta === key ? "var(--on-primary)" : "var(--ink-soft)",
                        borderColor: "transparent",
                      }}
                    >
                      {cLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
              <button
                onClick={handleGuardarIngreso}
                disabled={ingresoBusy || !Number(ingresoMonto) || isNaN(Number(ingresoMonto))}
                className="fl-btn primary sm"
                style={{ flex: 1 }}
              >
                {ingresoBusy ? "Guardando…" : "Guardar ingreso"}
              </button>
              <button onClick={() => setIngresoModalOpen(false)} className="fl-btn ghost sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
