"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import RegistroRapido from "@/components/m4/RegistroRapido";

function COP(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1_000_000) {
    return "$" + (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }
  if (compact && Math.abs(n) >= 1000) {
    const v = n / 1000;
    return "$" + (Number.isInteger(v) ? v : v.toFixed(0)) + "k";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [year, m] = mes.split("-");
  return `${MESES_FULL[Number(m)]} ${year}`;
}

function diasRestantes(semana: string): number {
  const day = new Date().getDate();
  if (semana === "S1") return Math.max(7 - day, 0);
  if (semana === "S2") return Math.max(14 - day, 0);
  if (semana === "S3") return Math.max(21 - day, 0);
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  return Math.max(lastDay - day, 0);
}

export interface HubMetricas {
  totalEjecutado: number;
  totalPresupuestado: number;
  pctEjecutado: number;
  semanasCerradas: number;
  disponibleSemana: number;
  aporteCamilo: number;
  aporteAngie: number;
}

export default function HomeHub({
  mesActivo,
  semanaActiva,
  metricas,
}: {
  mesActivo: string | null;
  semanaActiva: string;
  metricas: HubMetricas | null;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const destSemana = mesActivo ? `/mes/${mesActivo}/semana` : "/meses";
  const dias = diasRestantes(semanaActiva);
  const disponible = metricas?.disponibleSemana ?? 0;

  return (
    <div className="t-calido screen-anim">

      <div className="fl-appbar">
        <p className="eyebrow">Flujo · Salud financiera familiar</p>
        <h1>{mesActivo ? formatMes(mesActivo) : "Sin mes activo"}</h1>
        <p className="sub">
          Semana activa: <b>{semanaActiva}</b>{dias > 0 && ` · faltan ${dias} días`}
        </p>
        {metricas && (
          <div style={{ marginTop: 18 }}>
            <p className="balance-label">Disponible esta semana</p>
            <p className={`balance${disponible < 0 ? " neg" : ""}`}>
              {COP(Math.abs(disponible))}
            </p>
          </div>
        )}
      </div>

      <div className="fl-body">

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="fl-action" type="button" onClick={() => router.push(destSemana)}>
            <span className="ic"><Icon name="calendar" /></span>
            <span className="txt">
              <p className="t">Esta semana</p>
              <p className="d">{semanaActiva} · Gastos y registro diario</p>
            </span>
            <Icon name="arrow" size={18} style={{ color: "var(--ink-faint)" }} />
          </button>

          <button className="fl-action" type="button" onClick={() => router.push(mesActivo ? `/mes/${mesActivo}` : "/meses")}>
            <span className="ic"><Icon name="list" /></span>
            <span className="txt">
              <p className="t">Inicio de mes</p>
              <p className="d">Planificación · Ejecución de fijos</p>
            </span>
            <Icon name="arrow" size={18} style={{ color: "var(--ink-faint)" }} />
          </button>
        </div>

        {metricas && (
          <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="fl-row" style={{ marginBottom: 8 }}>
                <span className="fl-muted">Ejecutado</span>
                <span className="fl-num" style={{ fontSize: 14 }}>
                  {metricas.pctEjecutado}% · {COP(metricas.totalEjecutado)}
                </span>
              </div>
              <div className="fl-bar">
                <i style={{ width: `${Math.min(metricas.pctEjecutado, 100)}%` }} />
              </div>
              <p className="fl-faint" style={{ marginTop: 6 }}>
                de {COP(metricas.totalPresupuestado)} presupuestado
              </p>
            </div>
            <div className="fl-divider" />
            <div className="fl-row">
              <span className="fl-muted">Semanas cerradas</span>
              <span className="fl-num" style={{ fontSize: 14, color: "var(--ink)" }}>
                {metricas.semanasCerradas === 0 ? "ninguna aún" : `${metricas.semanasCerradas} / 4`}
              </span>
            </div>
          </div>
        )}

        {metricas && (metricas.aporteCamilo > 0 || metricas.aporteAngie > 0) && (
          <AporteCard aporteCamilo={metricas.aporteCamilo} aporteAngie={metricas.aporteAngie} />
        )}

        <button
          className="fl-btn primary block"
          type="button"
          style={{ marginTop: 4 }}
          onClick={() => setSheetOpen(true)}
        >
          <Icon name="bolt" size={17} fill /> Registrar un gasto
        </button>

      </div>

      <BottomNav onFabClick={() => setSheetOpen(true)} semanaHref={destSemana} active="home" />

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sheet-head">
              <h2>Registro rápido</h2>
              <button className="icon-btn" type="button" onClick={() => setSheetOpen(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="sheet-body">
              <RegistroRapido onClose={() => setSheetOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AporteCard({ aporteCamilo, aporteAngie }: { aporteCamilo: number; aporteAngie: number }) {
  const total = aporteCamilo + aporteAngie;
  const pctC = total > 0 ? (aporteCamilo / total) * 100 : 50;
  const pctA = 100 - pctC;

  return (
    <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="fl-row">
        <span className="fl-muted">Aporte del mes</span>
        <span className="fl-num" style={{ fontSize: 14 }}>{COP(total)}</span>
      </div>
      <div className="fl-split">
        <span className="c" style={{ width: `${pctC}%` }} />
        <span className="a" style={{ width: `${pctA}%` }} />
      </div>
      <div className="fl-legend">
        <div className="side">
          <span className="fl-person c">C</span>
          <span className="nm">Camilo</span>
          <span className="vl">{COP(aporteCamilo)}</span>
        </div>
        <div className="side">
          <span className="fl-person a">A</span>
          <span className="nm">Angie</span>
          <span className="vl">{COP(aporteAngie)}</span>
        </div>
      </div>
    </div>
  );
}
