"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import type { SaldoCuenta } from "@/lib/data/types";

function COP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

function COPCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "$" + (abs / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (abs >= 1000) return sign + "$" + Math.round(abs / 1000) + "k";
  return sign + "$" + abs;
}

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [year, m] = mes.split("-");
  return `${MESES_FULL[Number(m)]} ${year}`;
}

function mesSiguiente(meses: string[]): string {
  if (meses.length === 0) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const ultimo = meses[meses.length - 1];
  const [y, m] = ultimo.split("-");
  const year = Number(y), month = Number(m);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export interface ResumenMes {
  mes: string;
  totalPresupuestado: number;
  totalEjecutado: number;
  superavit: number;
  totalIngresos: number;
  ingresoCamilo: number;
  ingresoAngie: number;
  totalPendiente: number;
  totalMovimientos: number;
}

export interface MetricasMes {
  semana: string;
  disponibleSemana: number;
  totalEjecutado: number;
  totalPresupuestado: number;
  pctEjecutado: number;
  semanasCerradas: number;
  mes: string;
  recaudoSemana: number;
  ejecutadoSemana: number;
  disponibleSemanaSnapshot: number;
  saldosCuenta: SaldoCuenta[];
}

const CUENTAS_LABEL: Record<SaldoCuenta["cuenta"], string> = {
  nu_camilo: "NU Camilo",
  nu_angie:  "NU Angie",
  arq:       "ARQ",
  en_mano:   "En mano",
};

export default function PantallaMeses({
  resúmenes: init,
  metricas,
  modoHistorial = false,
}: {
  resúmenes: ResumenMes[];
  metricas: MetricasMes | null;
  modoHistorial?: boolean;
}) {
  const router = useRouter();
  const [resúmenes, setResúmenes] = useState(init);
  const [inicializando, setInicializando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesesExistentes = resúmenes.map((r) => r.mes);
  const próximo = mesSiguiente(mesesExistentes);
  const másReciente = mesesExistentes[mesesExistentes.length - 1];

  const handleInicializar = async () => {
    setInicializando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${próximo}/iniciar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al inicializar");
      const resRes = await fetch("/api/meses");
      const resData = await resRes.json();
      if (resRes.ok) setResúmenes(resData.meses);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setInicializando(false);
    }
  };

  const semanaHref = metricas ? `/mes/${metricas.mes}/semana` : "/";

  return (
    <div className="t-calido screen-anim">
      {/* App bar */}
      <div className="fl-appbar">
        <div className="fl-topnav">
          <button className="fl-back" type="button" onClick={() => router.push("/")}>
            <Icon name="back" size={17} />
          </button>
          <div style={{ flex: 1 }} />
          {!modoHistorial && (
            <button
              className="fl-btn ghost sm"
              type="button"
              onClick={handleInicializar}
              disabled={inicializando}
              style={{ background: "var(--appbar-hair)", border: "none", color: "var(--appbar-ink)" }}
            >
              {inicializando ? "…" : `+ ${formatMes(próximo)}`}
            </button>
          )}
        </div>
        <p className="eyebrow">{modoHistorial ? "Historial" : "Inicio de mes"}</p>
        <h1 style={{ fontSize: 22 }}>
          {modoHistorial ? "Meses cerrados" : "Planificación y ejecución"}
        </h1>
      </div>

      {/* Body */}
      <div className="fl-body">

        {/* Error */}
        {error && (
          <div style={{
            background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 14,
            padding: "12px 16px", fontSize: 13.5,
          }}>
            {error}
          </div>
        )}

        {/* Métricas del mes activo */}
        {metricas && !modoHistorial && (
          <>
            <p className="fl-sectlabel">{formatMes(metricas.mes)} · {metricas.semana}</p>
            <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Barra ejecutado */}
              <div>
                <div className="fl-row" style={{ marginBottom: 8 }}>
                  <span className="fl-muted">Ejecutado</span>
                  <span className="fl-num" style={{ fontSize: 14 }}>
                    {metricas.pctEjecutado}%
                  </span>
                </div>
                <div className="fl-bar">
                  <i style={{ width: `${Math.min(metricas.pctEjecutado, 100)}%` }} />
                </div>
                <p className="fl-faint" style={{ marginTop: 6 }}>
                  {COP(metricas.totalEjecutado)} de {COP(metricas.totalPresupuestado)}
                </p>
              </div>
              <div className="fl-divider" />
              {/* Mini stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <MiniStat
                  k={`Disponible ${metricas.semana}`}
                  v={COPCompact(metricas.disponibleSemana)}
                  color={metricas.disponibleSemana >= 0 ? "var(--pos)" : "var(--neg)"}
                />
                <MiniStat k="Semanas cerradas" v={`${metricas.semanasCerradas} / 4`} />
                <MiniStat k="Recaudo sem." v={COPCompact(metricas.recaudoSemana)} />
              </div>
            </div>

            {/* Saldos */}
            {metricas.saldosCuenta.length > 0 && (
              <>
                <p className="fl-sectlabel">Saldos por cuenta</p>
                <div className="fl-card">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {(["nu_camilo", "nu_angie", "arq", "en_mano"] as SaldoCuenta["cuenta"][]).map((cuenta) => {
                      const s = metricas.saldosCuenta.find((x) => x.cuenta === cuenta);
                      const isPersona = cuenta === "nu_camilo" || cuenta === "nu_angie";
                      const personaKey = cuenta === "nu_camilo" ? "c" : "a";
                      return (
                        <div key={cuenta} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          {isPersona ? (
                            <span className={`fl-person ${personaKey}`}>
                              {personaKey === "c" ? "C" : "A"}
                            </span>
                          ) : (
                            <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
                              <Icon name="wallet" size={12} style={{ color: "var(--ink-faint)" }} />
                            </span>
                          )}
                          <div>
                            <p className="fl-faint" style={{ margin: 0 }}>{CUENTAS_LABEL[cuenta]}</p>
                            <p className="fl-num" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
                              {s ? COP(s.saldoInicial) : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Lista de meses */}
        <p className="fl-sectlabel" style={{ marginTop: 4 }}>
          {modoHistorial ? "Meses registrados" : "Meses activos"}
        </p>

        {resúmenes.length === 0 ? (
          <div className="fl-emptystate">
            <div className="ic"><Icon name="archive" size={26} /></div>
            <p className="t">No hay meses aún</p>
            <p className="d">
              {modoHistorial
                ? "Cuando cierres un mes completo, aparecerá aquí."
                : "Inicializa el primer mes para comenzar."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...resúmenes].reverse().map((r) => {
              const esMásReciente = r.mes === másReciente;
              const pos = r.superavit >= 0;
              return (
                <button
                  key={r.mes}
                  type="button"
                  className="fl-card"
                  onClick={() => !modoHistorial && router.push(`/mes/${r.mes}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    textAlign: "left", cursor: modoHistorial ? "default" : "pointer",
                    padding: "16px 18px",
                    outline: esMásReciente ? "2px solid var(--primary)" : "none",
                    outlineOffset: -2,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{
                        fontFamily: "var(--font-bricolage, system-ui)",
                        fontWeight: 700, fontSize: 15.5, color: "var(--ink)", margin: 0,
                      }}>
                        {formatMes(r.mes)}
                      </p>
                      {esMásReciente && (
                        <span className="fl-badge primary">Activo</span>
                      )}
                    </div>
                    <p className="fl-faint">
                      Ejecutado {COPCompact(r.totalEjecutado)} de {COPCompact(r.totalPresupuestado)}
                      {r.totalPendiente > 0 && ` · ${r.totalPendiente} pendientes`}
                    </p>
                  </div>
                  <span className={`fl-badge ${pos ? "pos" : "neg"}`}>
                    {pos ? "+" : ""}{COPCompact(r.superavit)}
                  </span>
                  {!modoHistorial && (
                    <Icon name="arrow" size={16} style={{ color: "var(--ink-faint)", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom nav */}
      <BottomNav
        semanaHref={semanaHref}
        active={modoHistorial ? "historial" : "mes"}
      />
    </div>
  );
}

function MiniStat({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <p className="fl-faint" style={{ margin: "0 0 5px" }}>{k}</p>
      <p className="fl-num" style={{ fontSize: 16, fontWeight: 700, color: color ?? "var(--ink)", letterSpacing: "-0.02em" }}>
        {v}
      </p>
    </div>
  );
}
