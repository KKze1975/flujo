"use client";

import { useState, useMemo } from "react";
import type { Movimiento, SaldoCuenta, Semana, Categoria } from "@/lib/data/types";
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
}> = [
  { cuenta: "nu_camilo", label: "NU Camilo", persona: "c" },
  { cuenta: "nu_angie",  label: "NU Angie",  persona: "a" },
  { cuenta: "arq",       label: "ARQ" },
  { cuenta: "en_mano",   label: "En mano" },
];

// ── Row sub-component ─────────────────────────────────────────────────────────

type TableRow =
  | { kind: "group"; semana: Semana; label: string }
  | { kind: "item";  mov: Movimiento };

function Row({
  mov,
  showWk,
  wkLabel,
  exec,
  onExec,
}: {
  mov: Movimiento;
  showWk: boolean;
  wkLabel: string;
  exec: boolean;
  onExec: () => void;
}) {
  return (
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
      <td className="num">
        <span className="dk-amt">{COP(mov.montoPresupuestado)}</span>
      </td>
      <td>
        {exec
          ? <span className="fl-badge pos"><Icon name="check" size={11} /> Ejecutado</span>
          : <span className="fl-badge warn"><span className="dot" /> Pendiente</span>}
      </td>
      <td style={{ textAlign: "right" }}>
        {exec
          ? <span className="dk-done"><Icon name="check" size={13} /> listo</span>
          : <button className="dk-exec-btn" onClick={onExec}>Ejecutar</button>}
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MesM1Desktop({
  movimientos,
  saldos,
  mes,
  onSwitchToMobile,
}: {
  movimientos: Movimiento[];
  saldos: SaldoCuenta[];
  mes: string;
  onSwitchToMobile: () => void;
}) {
  const [wk, setWk] = useState<"todas" | Semana>("todas");
  const [saldosOk, setSaldosOk] = useState(saldos.length >= 4);
  const [doneLocal, setDoneLocal] = useState<Set<string>>(new Set());

  const dates = useMemo(() => semanaDates(mes), [mes]);
  const label = mesLabel(mes);

  const isExec = (mov: Movimiento) =>
    mov.estado === "ejecutado" || doneLocal.has(mov.id);

  const filtrados = wk === "todas"
    ? movimientos
    : movimientos.filter((m) => m.semana === wk);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPresupuestado = movimientos.reduce((s, m) => s + m.montoPresupuestado, 0);
  const ejecutadoMonto     = movimientos
    .filter(isExec)
    .reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0);
  const pendientes    = movimientos.filter((m) => !isExec(m)).length;
  const totalSaldos   = saldos.reduce((s, c) => s + c.saldoInicial, 0);
  const proyeccion    = totalSaldos - totalPresupuestado;
  const pctEjecutado  = totalPresupuestado > 0
    ? Math.min(100, Math.round((ejecutadoMonto / totalPresupuestado) * 100))
    : 0;

  // ── Por categoría ─────────────────────────────────────────────────────────
  const byCat = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    for (const m of movimientos) {
      map[m.categoriaSnapshot] = (map[m.categoriaSnapshot] ?? 0) + m.montoPresupuestado;
    }
    return Object.entries(map as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [movimientos]);
  const catMax = byCat[0]?.[1] ?? 1;

  // ── Filas de tabla ────────────────────────────────────────────────────────
  const rows = useMemo<TableRow[]>(() => {
    if (wk !== "todas") return filtrados.map((mov) => ({ kind: "item", mov }));
    const result: TableRow[] = [];
    for (const s of SEMANAS) {
      const items = movimientos.filter((m) => m.semana === s);
      if (items.length === 0) continue;
      result.push({ kind: "group", semana: s, label: `${s} · ${dates[s]}` });
      items.forEach((mov) => result.push({ kind: "item", mov }));
    }
    return result;
  }, [wk, filtrados, movimientos, dates]);

  // ── Ratio C/A para split bar ──────────────────────────────────────────────
  const saldoC = saldos.find((s) => s.cuenta === "nu_camilo")?.saldoInicial ?? 0;
  const saldoA = saldos.find((s) => s.cuenta === "nu_angie")?.saldoInicial ?? 0;
  const splitTotal = saldoC + saldoA || 1;

  return (
    <div className="dk t-calido dk-app">

      {/* ── SIDEBAR ── */}
      <aside className="dk-side">
        <div className="dk-brand">
          <span className="mark"><Icon name="bolt" size={18} fill /></span>
          <span className="nm">Flujo</span>
        </div>

        <nav className="dk-nav">
          <button className="dk-navitem on">
            <Icon name="list" size={19} /> Inicio de mes
          </button>
          <button className="dk-navitem">
            <Icon name="calendar" size={19} /> Esta semana
            <span className="badge">{pendientes}</span>
          </button>
          <button className="dk-navitem">
            <Icon name="wallet" size={19} /> Bolsillos
          </button>
          <button className="dk-navitem">
            <Icon name="archive" size={19} /> Historial
          </button>
        </nav>

        <p className="dk-navlabel">Mes</p>
        <nav className="dk-nav">
          <button
            className="dk-navitem"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            <Icon name="calendar" size={18} /> {label}
          </button>
        </nav>

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
              <span className="dk-monthpill">
                <Icon name="calendar" size={13} /> {label}
              </span>
            </h1>
            <p className="sub">
              Planeen el mes, confirmen saldos y ejecuten los pagos fijos — juntos.
            </p>
          </div>
          <div className="dk-actions">
            <button className="fl-btn ghost sm" onClick={onSwitchToMobile}>
              <Icon name="phone" size={15} /> Vista móvil
            </button>
            <button
              className="fl-btn ghost sm"
              onClick={() => setSaldosOk(true)}
              style={saldosOk ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}
            >
              {saldosOk
                ? <><Icon name="check" size={15} /> Saldos confirmados</>
                : <><Icon name="wallet" size={15} /> Confirmar saldos</>}
            </button>
            <button className="fl-btn primary sm">
              <Icon name="flag" size={15} /> Cerrar planificación
            </button>
          </div>
        </header>

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
                <span className="side">
                  <span className="fl-person c">C</span>
                  <span className="vl">{COP(saldoC, { compact: true })}</span>
                </span>
                <span className="side">
                  <span className="vl">{COP(saldoA, { compact: true })}</span>
                  <span className="fl-person a">A</span>
                </span>
              </div>
            </div>

            <div className="dk-kpi">
              <p className="k"><Icon name="list" size={14} /> Presupuestado</p>
              <p className="v">{COP(totalPresupuestado)}</p>
              <p className="h">{movimientos.length} conceptos</p>
            </div>

            <div className="dk-kpi">
              <p className="k"><Icon name="check" size={14} /> Ejecutado</p>
              <p className="v">{COP(ejecutadoMonto)}</p>
              <div className="fl-bar" style={{ marginTop: 12 }}>
                <i style={{ width: `${pctEjecutado}%` }} />
              </div>
              <p className="h">{pctEjecutado}% · {pendientes} pendientes</p>
            </div>

            <div className="dk-kpi">
              <p className="k"><Icon name="trophy" size={14} /> Proyección superávit</p>
              <p
                className="v"
                style={{ color: proyeccion >= 0 ? "var(--pos)" : "var(--neg)" }}
              >
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
                    <button
                      key={f}
                      className={`dk-fchip${wk === f ? " on" : ""}`}
                      onClick={() => setWk(f)}
                    >
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
                        <td colSpan={6}>{r.label}</td>
                      </tr>
                    ) : (
                      <Row
                        key={r.mov.id}
                        mov={r.mov}
                        showWk={wk === "todas"}
                        wkLabel={r.mov.semana ? dates[r.mov.semana] : ""}
                        exec={isExec(r.mov)}
                        onExec={() =>
                          setDoneLocal((prev) => {
                            const next = new Set(prev);
                            next.add(r.mov.id);
                            return next;
                          })
                        }
                      />
                    )
                  )}
                </tbody>
                <tfoot>
                  <tr className="dk-foot">
                    <td className="lbl">
                      Total{wk !== "todas" ? ` · ${wk}` : ""}
                    </td>
                    <td />
                    {wk === "todas" && <td />}
                    <td className="num tot">
                      {COP(filtrados.reduce((s, m) => s + m.montoPresupuestado, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rail */}
            <div className="dk-rail">

              {/* Saldos por cuenta */}
              <div className="dk-card">
                <h4><Icon name="wallet" size={16} /> Saldos por cuenta</h4>
                {CUENTAS_H4C.map(({ cuenta, label: cuentaLabel, persona }) => {
                  const entry = saldos.find((s) => s.cuenta === cuenta);
                  return (
                    <div className="dk-acct" key={cuenta}>
                      {persona ? (
                        <span className={`fl-person ${persona}`}>
                          {persona === "c" ? "C" : "A"}
                        </span>
                      ) : (
                        <span className="sq"><Icon name="wallet" size={13} /></span>
                      )}
                      <span className="nm">{cuentaLabel}</span>
                      <span className="v">
                        {entry ? COP(entry.saldoInicial) : "—"}
                      </span>
                    </div>
                  );
                })}
                <div className="dk-acct" style={{ borderTop: "2px solid var(--line)" }}>
                  <span className="nm" style={{ fontWeight: 700, color: "var(--ink)" }}>
                    Total
                  </span>
                  <span className="v" style={{ fontSize: 15 }}>{COP(totalSaldos)}</span>
                </div>
                <button
                  className={`fl-btn ${saldosOk ? "ghost" : "primary"} block sm`}
                  style={{
                    marginTop: 14,
                    ...(saldosOk
                      ? { color: "var(--pos)", borderColor: "var(--pos)" }
                      : {}),
                  }}
                  onClick={() => setSaldosOk(true)}
                >
                  {saldosOk
                    ? <><Icon name="check" size={15} /> Confirmados</>
                    : "Confirmar saldos del mes"}
                </button>
              </div>

              {/* Por categoría */}
              <div className="dk-card">
                <h4><Icon name="chart" size={15} /> Por categoría</h4>
                {byCat.map(([cat, amt]) => (
                  <div className="dk-catbar" key={cat}>
                    <div className="row">
                      <span className="n">{cat}</span>
                      <span className="v">{COP(amt, { compact: true })}</span>
                    </div>
                    <div className="fl-bar">
                      <i style={{ width: `${(amt / catMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
