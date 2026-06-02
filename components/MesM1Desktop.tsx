"use client";

import { useState, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import type {
  Movimiento, Concepto, SaldoCuenta, Semana, Categoria,
  Actor, IngresoCamilo, IngresoAngie, RecargaAngie, CuentaDestino,
} from "@/lib/data/types";
import Icon from "@/components/ui/Icon";
import ConceptoBoard from "@/components/m1/ConceptoBoard";
import ModalAgregarConcepto from "@/components/m1/ModalAgregarConcepto";
import ModalConfirmarSaldos from "@/components/m1/ModalConfirmarSaldos";
import ModalCerrarSemana from "@/components/m1/ModalCerrarSemana";
import ModalAporteAngie from "@/components/m1/ModalAporteAngie";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = (n: number, opts?: { compact?: boolean }): string => {
  if (opts?.compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n}`;
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
};

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const MESES_ES = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_FULL = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_ES_MAP: Record<string, string> = {
  "01":"enero","02":"febrero","03":"marzo","04":"abril","05":"mayo","06":"junio",
  "07":"julio","08":"agosto","09":"septiembre","10":"octubre","11":"noviembre","12":"diciembre",
};

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

const CATEGORIAS_ORDER: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
  "Hijos", "Servicio Domestico",
];

const CAT_ICON: Record<Categoria, string> = {
  "Casa": "home", "Servicios Públicos": "bolt",
  "Membresías y Suscripciones": "receipt", "Educación": "book",
  "Salud": "heart", "Mercado y Alimentación": "bag",
  "Compromisos Financieros": "wallet", "Recreación": "film",
  "Transporte": "car", "Metas Familiares": "trophy", "Frida": "paw",
  "Hijos": "heart", "Servicio Domestico": "home",
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

const CUENTAS_DESTINO: { key: CuentaDestino; label: string }[] = [
  { key: "camilo",  label: "Cta. Camilo" },
  { key: "angie",   label: "Cta. Angie"  },
  { key: "en_mano", label: "En mano"     },
  { key: "nequi",   label: "Nequi"       },
];

// ── Ejecución types & row ─────────────────────────────────────────────────────

type EjecutarPanel = {
  movId: string; monto: string; ejecutor: Actor;
  fuenteEnMano: boolean; fuenteNequi: boolean;
  fuenteCamilo: boolean; fuenteAngie: boolean;
};

const FUENTES: Array<{ key: keyof Omit<EjecutarPanel, "movId" | "monto" | "ejecutor">; label: string }> = [
  { key: "fuenteCamilo", label: "NU Camilo" },
  { key: "fuenteAngie",  label: "NU Angie"  },
  { key: "fuenteNequi",  label: "ARQ"       },
  { key: "fuenteEnMano", label: "En mano"   },
];

type TableRow =
  | { kind: "group"; semana: Semana; label: string }
  | { kind: "item";  mov: Movimiento };

function EjecucionRow({
  mov, showWk, wkLabel, exec,
  panel, onOpenPanel, onPanelChange, onConfirm, onCancel, busy, blocked,
}: {
  mov: Movimiento; showWk: boolean; wkLabel: string; exec: boolean;
  panel: EjecutarPanel | null; onOpenPanel: () => void;
  onPanelChange: (p: EjecutarPanel) => void; onConfirm: () => void;
  onCancel: () => void; busy: boolean; blocked: boolean;
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
                <label style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 }}>
                  Monto ejecutado
                </label>
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
                      <button key={key} type="button"
                        onClick={() => onPanelChange({ ...panel!, [key]: !panel![key] })}
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
                    <button key={a} type="button"
                      onClick={() => onPanelChange({ ...panel!, ejecutor: a })}
                      className="fl-chip"
                      style={{ cursor: "pointer", background: panel!.ejecutor === a ? "var(--primary)" : "var(--surface-2)", color: panel!.ejecutor === a ? "var(--on-primary)" : "var(--ink-soft)", borderColor: "transparent" }}>
                      {a === "camilo" ? "C" : "A"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={onConfirm}
                  disabled={busy || !monto || isNaN(monto)} className="fl-btn primary sm">
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

// ── Planificación row ─────────────────────────────────────────────────────────

function PlanRow({
  concepto, movs, onSemanaChange, saving,
}: {
  concepto: Concepto;
  movs: Movimiento[];
  onSemanaChange: (conceptoId: string, semana: Semana) => void;
  saving: boolean;
}) {
  const movsC = movs.filter(m => m.conceptoId === concepto.id && m.estado === "pendiente");
  const currentSemana = movsC[0]?.semana as Semana | undefined;

  return (
    <tr>
      <td>
        <div className="dk-concepto">
          <span className="ic">
            <Icon name={CAT_ICON[concepto.categoria] ?? "wallet"} size={17} />
          </span>
          <span className="nm">{concepto.nombre}</span>
        </div>
      </td>
      <td style={{ color: "var(--ink-soft)" }}>{concepto.categoria}</td>
      <td className="num"><span className="dk-amt">{COP(concepto.monto)}</span></td>
      <td>
        {concepto.frecuencia === "semanal" ? (
          <div style={{ display: "flex", gap: 4 }}>
            {SEMANAS.map(s => (
              <span key={s} className="dk-wk">{s}</span>
            ))}
          </div>
        ) : (
          <div className="dk-filters" style={{ marginLeft: 0 }}>
            {SEMANAS.map(s => (
              <button key={s}
                className={`dk-fchip${currentSemana === s ? " on" : ""}`}
                onClick={() => onSemanaChange(concepto.id, s)}
                disabled={saving}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MesM1Desktop({
  movimientos: movimientosProp,
  conceptos: conceptosProp,
  saldos,
  mes,
  ingresoCamilo: ingresoCamiloProp = null,
  ingresosAngie: ingresosAngieProp = [],
  recargasAngie: recargasAngieProp = [],
  cierresSemana: cierresSemanaProps = [],
  gastosSinClasificar = { S1: 0, S2: 0, S3: 0, S4: 0 },
  onSwitchToMobile,
}: {
  movimientos: Movimiento[];
  conceptos: Concepto[];
  saldos: SaldoCuenta[];
  mes: string;
  ingresoCamilo?: IngresoCamilo | null;
  ingresosAngie?: IngresoAngie[];
  recargasAngie?: RecargaAngie[];
  cierresSemana?: import("@/lib/data/types").CierreSemana[];
  gastosSinClasificar?: Record<Semana, number>;
  onSwitchToMobile: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<"planificacion" | "ejecucion">("planificacion");
  const [showConfirmarSaldos, setShowConfirmarSaldos] = useState(false);
  const [showCerrarSemana, setShowCerrarSemana] = useState(false);
  const [showAporteAngie, setShowAporteAngie] = useState(false);

  // Shared state
  const [movs, setMovs] = useState<Movimiento[]>(movimientosProp);
  const [conceptosLocal, setConceptosLocal] = useState<Concepto[]>(conceptosProp);
  const [showAgregarConcepto, setShowAgregarConcepto] = useState(false);
  const [saldosLocal, setSaldosLocal] = useState<SaldoCuenta[]>(saldos);
  const [ingresoCamiloLocal, setIngresoCamiloLocal] = useState<IngresoCamilo | null>(ingresoCamiloProp);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ejecución state
  const [wk, setWk] = useState<"todas" | Semana>(() => getActiveSemana(mes));
  const [saldosOk, setSaldosOk] = useState(saldos.length >= 4);
  const [ejecutarPanel, setEjecutarPanel] = useState<EjecutarPanel | null>(null);

  // Ingreso Camilo (sidebar en planificación, modal en ejecución)
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false);
  const [ingresoMonto, setIngresoMonto] = useState(ingresoCamiloProp ? String(ingresoCamiloProp.montoCop) : "");
  const [ingresoCuenta, setIngresoCuenta] = useState<CuentaDestino>(ingresoCamiloProp?.cuentaDestino ?? "camilo");
  const [ingresoBusy, setIngresoBusy] = useState(false);
  const [ingresoError, setIngresoError] = useState<string | null>(null);

  // Planificación state
  const [wkPlan, setWkPlan] = useState<"todas" | Semana>(() => getActiveSemana(mes));
  const [aportes, setAportes] = useState<Record<Semana, string>>(() => {
    const init: Record<Semana, string> = { S1: "", S2: "", S3: "", S4: "" };
    for (const a of ingresosAngieProp) {
      init[a.semana] = String((Number(init[a.semana]) || 0) + a.monto);
    }
    return init;
  });
  const [savingAportes, setSavingAportes] = useState(false);
  const [savingSemanaConcept, setSavingSemanaConcept] = useState<string | null>(null);

  const dates = useMemo(() => semanaDates(mes), [mes]);
  const label = mesLabel(mes);
  const mesNombre = MESES_ES_MAP[mes.split("-")[1]] ?? "";
  const activeSemana = getActiveSemana(mes);

  // ── Ejecución derivations ─────────────────────────────────────────────────

  const isExec = (mov: Movimiento) => mov.estado === "ejecutado";
  const filtrados = wk === "todas" ? movs : movs.filter(m => m.semana === wk);
  const pendientes = movs.filter(m => !isExec(m)).length;
  const totalPresupuestado = movs.reduce((s, m) => s + m.montoPresupuestado, 0);
  const ejecutadoMonto = movs.filter(isExec).reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0);
  const totalSaldos = saldos.reduce((s, c) => s + c.saldoInicial, 0);
  const proyeccion = totalSaldos - totalPresupuestado;
  const pctEjecutado = totalPresupuestado > 0 ? Math.min(100, Math.round((ejecutadoMonto / totalPresupuestado) * 100)) : 0;
  const saldoC = saldos.find(s => s.cuenta === "nu_camilo")?.saldoInicial ?? 0;
  const saldoA = saldos.find(s => s.cuenta === "nu_angie")?.saldoInicial ?? 0;
  const splitTotal = saldoC + saldoA || 1;
  const totalSaldosLocal = saldosLocal.reduce((s, c) => s + c.saldoInicial, 0);
  const ejecutarBloqueado = !ingresoCamiloLocal || ingresoCamiloLocal.montoCop === 0;

  const rows = useMemo<TableRow[]>(() => {
    if (wk !== "todas") return filtrados.map(mov => ({ kind: "item", mov }));
    const result: TableRow[] = [];
    for (const s of SEMANAS) {
      const items = movs.filter(m => m.semana === s);
      if (items.length === 0) continue;
      result.push({ kind: "group", semana: s, label: `${s} · ${dates[s]}` });
      items.forEach(mov => result.push({ kind: "item", mov }));
    }
    return result;
  }, [wk, filtrados, movs, dates]);

  // T27 · Remanente Angie por semana — movido antes de balanceSemanas (dep)
  // B5: depende de `aportes` (reactivo) en lugar de ingresosAngieProp (SSR congelado)
  const remanenteAngiePerSemana = useMemo(() => {
    const result: Record<import("@/lib/data/types").Semana, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
    for (const s of SEMANAS) {
      const cierre = cierresSemanaProps.find(c => c.semana === s);
      if (cierre) {
        result[s] = cierre.remanenteAngie;
      } else {
        result[s] = recargasAngieProp.filter(r => r.semana === s).reduce((sum, r) => sum + r.monto, 0);
      }
    }
    return result;
  }, [cierresSemanaProps, recargasAngieProp]);

  const balanceSemanas = useMemo(() => {
    let remanente = ingresoCamiloLocal?.montoCop ?? 0;
    return SEMANAS.map((s) => {
      const items = movs.filter((m) => m.semana === s);
      const comprometido = items.reduce((sum, m) => sum + m.montoPresupuestado, 0);
      const ejecutado = items
        .filter((m) => m.estado === "ejecutado")
        .reduce((sum, m) => sum + (m.montoEjecutado ?? m.montoPresupuestado), 0);
      const pendiente = items.filter((m) => m.estado === "pendiente").length;
      const aporteAngie = remanenteAngiePerSemana[s] ?? 0;
      const disponible = remanente + aporteAngie;
      const diferencia = disponible - ejecutado;
      // F3: semana cerrada = ingreso Angie confirmado; sin cierre = planeado
      const isConfirmado = cierresSemanaProps.some((c) => c.semana === s);
      remanente = diferencia;
      return { semana: s, remanente: disponible, aporteAngie, comprometido, ejecutado, diferencia, pendiente, isConfirmado };
    });
  }, [movs, ingresoCamiloLocal, remanenteAngiePerSemana, cierresSemanaProps]);


  // ── Planificación derivations ─────────────────────────────────────────────

  const ingresoCamiloNum = Number(ingresoMonto) || 0;
  const aportesNum = useMemo(() => SEMANAS.reduce((s, sem) => s + (Number(aportes[sem]) || 0), 0), [aportes]);
  const ingresoTotal = ingresoCamiloNum + aportesNum;

  const conceptosActivosMes = useMemo(() => {
    return conceptosLocal.filter(c => {
      if (c.estado !== "activo") return false;
      const movsC = movs.filter(m => m.conceptoId === c.id);
      if (movsC.length > 0 && movsC.every(m => m.estado === "no_aplica" || m.estado === "pospuesto_mes_siguiente")) return false;
      if (c.frecuencia === "bimestral" && c.mesActivoBimestral) {
        return c.mesActivoBimestral.split(",").map(s => s.trim().toLowerCase()).includes(mesNombre);
      }
      return true;
    });
  }, [conceptosLocal, movs, mesNombre]);

  const totalComprometido = useMemo(() =>
    conceptosActivosMes.reduce((sum, c) => sum + (c.frecuencia === "semanal" ? c.monto * 4 : c.monto), 0),
    [conceptosActivosMes]
  );

  const diferenciaTotal = ingresoTotal - totalComprometido;

  const balancePlanificacion = useMemo(() => {
    const result = [];
    let remanente = ingresoCamiloNum;
    for (let i = 0; i < SEMANAS.length; i++) {
      const s = SEMANAS[i];
      const aporteAngie = Number(aportes[s]) || 0;
      const comprometido = conceptosActivosMes.reduce((sum, c) => {
        if (c.frecuencia === "semanal") return sum + c.monto;
        const mov = movs.find(m => m.conceptoId === c.id && m.estado !== "no_aplica" && m.estado !== "pospuesto_mes_siguiente");
        return mov?.semana === s ? sum + c.monto : sum;
      }, 0);
      const disponible = remanente + aporteAngie;
      const diferencia = disponible - comprometido;
      result.push({ semana: s, remanente, aporteAngie, disponible, comprometido, diferencia });
      remanente = diferencia;
    }
    return result;
  }, [conceptosActivosMes, movs, aportes, ingresoCamiloNum]);

  const gruposPlan = useMemo(() => {
    const filtered = wkPlan === "todas"
      ? conceptosActivosMes
      : conceptosActivosMes.filter(c => {
          if (c.frecuencia === "semanal") return true;
          const mov = movs.find(m => m.conceptoId === c.id);
          return mov?.semana === wkPlan;
        });
    const map = new Map<Categoria, Concepto[]>();
    for (const cat of CATEGORIAS_ORDER) map.set(cat, []);
    for (const c of filtered) {
      const list = map.get(c.categoria);
      if (list) list.push(c);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [conceptosActivosMes, movs, wkPlan]);

  const filteredPlanCount = gruposPlan.reduce((s, [, items]) => s + items.length, 0);

  // ── Board callback ────────────────────────────────────────────────────────

  const handleMovUpdate = (updated: Movimiento) => {
    // Actualiza el movimiento editado; también sincroniza montoPresupuestado en
    // todos los del mismo concepto — simétrico con el B2 fix de ConceptoBoard
    setMovs(prev => prev.map(m =>
      m.id === updated.id
        ? updated
        : m.conceptoId === updated.conceptoId
          ? { ...m, montoPresupuestado: updated.montoPresupuestado }
          : m
    ));
    setConceptosLocal(prev => prev.map(c =>
      c.id === updated.conceptoId ? { ...c, monto: updated.montoPresupuestado } : c
    ));
  };

  const handleSwitchToEjecucion = () => {
    if (!saldosOk) {
      setShowConfirmarSaldos(true);
    } else {
      setView("ejecucion");
    }
  };

  const semanaParaCerrar: Semana = wk !== "todas" ? wk : activeSemana;
  const gastosPendientesClasificar = gastosSinClasificar[semanaParaCerrar] ?? 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  const handleGuardarAportes = async () => {
    setSavingAportes(true);
    setError(null);
    try {
      const payload = SEMANAS.map(s => ({ semana: s, monto: Number(aportes[s]) || 0 }));
      const res = await fetch(`/api/ingresos/angie/${mes}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aportes: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      const newAportes: Record<Semana, string> = { S1: "", S2: "", S3: "", S4: "" };
      for (const a of data as IngresoAngie[]) newAportes[a.semana] = String(a.monto);
      setAportes(newAportes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingAportes(false);
    }
  };

  const handleCambiarSemana = async (conceptoId: string, nuevaSemana: Semana) => {
    const pendientesMov = movs.filter(m => m.conceptoId === conceptoId && m.estado === "pendiente" && m.semana !== nuevaSemana);
    if (pendientesMov.length === 0) return;
    setSavingSemanaConcept(conceptoId);
    setError(null);
    try {
      for (const mov of pendientesMov) {
        const res = await fetch(`/api/mes/${mes}/movimientos/${mov.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "reasignar_semana", semana: nuevaSemana }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error");
        setMovs(prev => prev.map(m => m.id === mov.id ? data as Movimiento : m));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingSemanaConcept(null);
    }
  };

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
      setMovs(prev => prev.map(m => m.id === id ? data as Movimiento : m));
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
      tipo: "ejecutar", montoEjecutado: monto, ejecutor: panel.ejecutor,
      fuenteEnMano: panel.fuenteEnMano, fuenteNequi: panel.fuenteNequi,
      fuenteCamilo: panel.fuenteCamilo, fuenteAngie: panel.fuenteAngie,
    }, () => {
      const activeCuentas = CUENTAS_H4C.filter(({ fuenteKey }) => panel[fuenteKey]).map(({ cuenta }) => cuenta);
      if (activeCuentas.length > 0) {
        const perCuenta = monto / activeCuentas.length;
        setSaldosLocal(prev => prev.map(s =>
          activeCuentas.includes(s.cuenta) ? { ...s, saldoInicial: Math.max(0, s.saldoInicial - perCuenta) } : s
        ));
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dk dk-app">

      {/* ── SIDEBAR ── */}
      <aside className="dk-side" style={{ overflowY: "auto" }}>
        <div className="dk-brand">
          <span className="mark"><Icon name="bolt" size={18} fill /></span>
          <span className="nm">Flujo</span>
        </div>

        <nav className="dk-nav">
          <button className="dk-navitem on" onClick={() => router.push("/meses")}><Icon name="list" size={19} /> Inicio de mes</button>
          <button className="dk-navitem" onClick={() => router.push(`/mes/${mes}/semana`)}>
            <Icon name="calendar" size={19} /> Esta semana
            <span className="badge">{pendientes}</span>
          </button>
          <button className="dk-navitem" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}><Icon name="wallet" size={19} /> Bolsillos</button>
          <button className="dk-navitem" onClick={() => router.push("/meses?modo=historial")}><Icon name="archive" size={19} /> Historial</button>
        </nav>

        <p className="dk-navlabel">Mes</p>
        <nav className="dk-nav">
          <button className="dk-navitem" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            <Icon name="calendar" size={18} /> {label}
          </button>
        </nav>

        {view === "planificacion" ? (
          <>
            <p className="dk-navlabel" style={{ marginTop: 20 }}>Ingreso Camilo</p>
            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "10px 12px", marginBottom: 8 }}>
              <input
                type="number"
                value={ingresoMonto}
                onChange={e => setIngresoMonto(e.target.value)}
                placeholder="0"
                className="fl-input"
                style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600, marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {CUENTAS_DESTINO.map(({ key, label: cLabel }) => (
                  <button key={key} type="button" onClick={() => setIngresoCuenta(key)}
                    className="fl-chip"
                    style={{ cursor: "pointer", fontSize: 11, padding: "3px 8px",
                      background: ingresoCuenta === key ? "var(--primary)" : "var(--surface)",
                      color: ingresoCuenta === key ? "var(--on-primary)" : "var(--ink-soft)",
                      borderColor: "transparent" }}>
                    {cLabel}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleGuardarIngreso}
                disabled={ingresoBusy || !ingresoMonto}
                className="fl-btn primary sm"
                style={{ width: "100%", justifyContent: "center" }}>
                {ingresoBusy ? "…" : ingresoCamiloLocal ? "Actualizar ingreso" : "Guardar ingreso"}
              </button>
              {ingresoError && <p style={{ marginTop: 4, fontSize: 11, color: "var(--neg)" }}>{ingresoError}</p>}
              {ingresoCamiloLocal && (
                <p style={{ marginTop: 4, fontSize: 11, color: "var(--pos)", fontWeight: 600 }}>
                  ✓ {COP(ingresoCamiloLocal.montoCop)}
                </p>
              )}
            </div>

            <p className="dk-navlabel">Aportes Angie</p>
            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "10px 12px", marginBottom: 8 }}>
              {SEMANAS.map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", width: 20 }}>{s}</span>
                  <input
                    type="number"
                    value={aportes[s]}
                    onChange={e => setAportes(prev => ({ ...prev, [s]: e.target.value }))}
                    placeholder="0"
                    className="fl-input"
                    style={{ flex: 1, textAlign: "right", fontSize: 12, fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                  />
                </div>
              ))}
              <button type="button" onClick={handleGuardarAportes}
                disabled={savingAportes}
                className="fl-btn primary sm"
                style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                {savingAportes ? "…" : "Guardar aportes"}
              </button>
            </div>

            <p className="dk-navlabel">Balance mes</p>
            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "10px 12px", marginBottom: 8 }}>
              {([
                { label: "Comprometido",     value: totalComprometido,  color: "var(--ink)"  },
                { label: "Ingreso Camilo",   value: ingresoCamiloNum,   color: "var(--ink)"  },
                { label: "Aportes Angie",    value: aportesNum,         color: "var(--ink)"  },
                { label: "Total disponible", value: ingresoTotal,       color: "var(--pos)"  },
                { label: "Diferencia",       value: diferenciaTotal,    color: diferenciaTotal >= 0 ? "var(--pos)" : "var(--neg)" },
              ] as { label: string; value: number; color: string }[]).map(({ label: lbl, value, color }) => (
                <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>{lbl}</span>
                  <span style={{ fontSize: 11, color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{COP(value)}</span>
                </div>
              ))}
            </div>

            <p className="dk-navlabel">Por semana</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
              {balancePlanificacion.map(({ semana, remanente, aporteAngie, comprometido, diferencia }, i) => (
                <button key={semana} type="button"
                  onClick={() => setWkPlan(wkPlan === semana ? "todas" : semana)}
                  style={{
                    background: wkPlan === semana ? "var(--primary-soft)" : "var(--surface-2)",
                    borderRadius: 12, padding: "8px 12px", textAlign: "left",
                    border: `1px solid ${wkPlan === semana ? "var(--primary)" : "transparent"}`,
                    cursor: "pointer", width: "100%",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>{semana}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: diferencia >= 0 ? "var(--pos)" : "var(--neg)" }}>
                      {diferencia >= 0 ? "+" : ""}{COP(diferencia, { compact: true })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-faint)" }}>
                    <span>{i === 0 ? `C:${COP(remanente, { compact: true })}` : `↪ ${COP(remanente, { compact: true })}`} A:{COP(aporteAngie, { compact: true })}</span>
                    <span>{COP(comprometido, { compact: true })}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="dk-navlabel" style={{ marginTop: 20 }}>Saldos</p>
            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "10px 12px", marginBottom: 4 }}>
              {CUENTAS_H4C.map(({ cuenta, label: cuentaLabel, persona, fuenteKey }) => {
                const entry = saldosLocal.find(s => s.cuenta === cuenta);
                const ejecutado = movs
                  .filter(m => m.estado === "ejecutado" && m[fuenteKey])
                  .reduce((sum, m) => sum + (m.montoEjecutado ?? m.montoPresupuestado), 0);
                const recargas = (cuenta === "nu_angie" || cuenta === "en_mano")
                  ? recargasAngieProp.filter(r => r.cuentaDestino === cuenta).reduce((sum, r) => sum + r.monto, 0)
                  : 0;
                const disponible = (entry?.saldoInicial ?? 0) + recargas;
                const inicial = disponible + ejecutado;
                return (
                  <div key={cuenta} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {persona
                        ? <span className={`fl-person ${persona}`} style={{ width: 18, height: 18, fontSize: 9 }}>{persona === "c" ? "C" : "A"}</span>
                        : <span style={{ width: 18, height: 18, borderRadius: 6, background: "var(--line)", display: "grid", placeItems: "center" }}><Icon name="wallet" size={10} /></span>}
                      <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>{cuentaLabel}</span>
                    </div>
                    <div style={{ paddingLeft: 26, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
                        <span style={{ color: "var(--ink-faint)" }}>Inicial</span>
                        <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>{entry ? COP(inicial, { compact: true }) : "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
                        <span style={{ color: "var(--ink-faint)" }}>Ejecutado</span>
                        <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>{COP(ejecutado, { compact: true })}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: "var(--ink-soft)" }}>Disponible</span>
                        <span style={{ color: disponible > 0 ? "var(--pos)" : "var(--neg)", fontVariantNumeric: "tabular-nums" }}>{entry ? COP(disponible, { compact: true }) : "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: "var(--ink-soft)" }}>Total</span>
                <span style={{ color: "var(--ink)" }}>{COP(totalSaldosLocal, { compact: true })}</span>
              </div>
              {/* B3: mostrar ingreso Camilo en sección Saldos */}
              {ingresoCamiloLocal && ingresoCamiloLocal.montoCop > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTop: "1px dashed var(--line)", fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: "var(--ink-faint)" }}>Ingreso mes</span>
                  <span style={{ color: "var(--pos)" }}>{COP(ingresoCamiloLocal.montoCop, { compact: true })}</span>
                </div>
              )}
            </div>

            <p className="dk-navlabel" style={{ marginTop: 16 }}>Por semana</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
              {balanceSemanas.map(({ semana, remanente, comprometido, ejecutado, diferencia, pendiente, aporteAngie, isConfirmado }, i) => (
                <div key={semana} style={{ background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>{semana}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: diferencia >= 0 ? "var(--pos)" : "var(--neg)" }}>
                      {diferencia > 0 ? "+" : ""}{COP(diferencia, { compact: true })}
                    </span>
                  </div>
                  <div className="fl-bar" style={{ height: 5, marginBottom: 4 }}>
                    <i style={{ width: comprometido > 0 ? `${Math.min(100, Math.round((ejecutado / comprometido) * 100))}%` : "0%", background: diferencia < 0 ? "var(--warn)" : "var(--primary)" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-faint)" }}>
                    <span>
                      {i === 0 ? (
                        <>
                          {ingresoCamiloLocal && ingresoCamiloLocal.montoCop > 0 && (
                            <span style={{ color: "var(--pos)", marginRight: 4 }}>
                              C:{COP(ingresoCamiloLocal.montoCop, { compact: true })}
                            </span>
                          )}
                          <span style={{ color: isConfirmado ? "var(--pos)" : "var(--ink-faint)" }}>
                            A:{COP(aporteAngie, { compact: true })}{isConfirmado ? " ✓" : " (plan)"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ marginRight: 4 }}>↪ {COP(remanente - aporteAngie, { compact: true })}</span>
                          <span style={{ color: isConfirmado ? "var(--pos)" : "var(--ink-faint)" }}>
                            A:{COP(aporteAngie, { compact: true })}{isConfirmado ? " ✓" : " (plan)"}
                          </span>
                        </>
                      )}
                      {" · "}{COP(comprometido, { compact: true })}
                    </span>
                    <span>{pendiente > 0 ? `${pendiente} pend.` : "✓"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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

          {/* Toggle Planificación / Ejecución */}
          <div style={{ display: "flex", borderRadius: 999, background: "var(--line)", padding: 2 }}>
            {(["planificacion", "ejecucion"] as const).map(v => (
              <button key={v} type="button"
                onClick={() => v === "ejecucion" ? handleSwitchToEjecucion() : setView(v)}
                style={{
                  borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: view === v ? "var(--surface)" : "transparent",
                  color: view === v ? "var(--primary)" : "var(--ink-soft)",
                  transition: "background 0.15s",
                }}>
                {v === "planificacion" ? "Planificación" : "Ejecución"}
              </button>
            ))}
          </div>

          <div className="dk-actions">
            <button className="fl-btn ghost sm" onClick={onSwitchToMobile}>
              <Icon name="phone" size={15} /> Vista móvil
            </button>
            {view === "ejecucion" && (
              <>
                <button className="fl-btn ghost sm"
                  onClick={() => {
                    setIngresoMonto(ingresoCamiloLocal ? String(ingresoCamiloLocal.montoCop) : "");
                    setIngresoCuenta(ingresoCamiloLocal?.cuentaDestino ?? "camilo");
                    setIngresoError(null);
                    setIngresoModalOpen(true);
                  }}
                  style={ingresoCamiloLocal ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}>
                  {ingresoCamiloLocal
                    ? <><Icon name="check" size={15} /> {COP(ingresoCamiloLocal.montoCop, { compact: true })}</>
                    : <><Icon name="wallet" size={15} /> Ingreso Camilo</>}
                </button>
                <button className="fl-btn ghost sm"
                  onClick={() => setSaldosOk(true)}
                  style={saldosOk ? { color: "var(--pos)", borderColor: "var(--pos)" } : undefined}>
                  {saldosOk
                    ? <><Icon name="check" size={15} /> Saldos confirmados</>
                    : <><Icon name="wallet" size={15} /> Confirmar saldos</>}
                </button>
              </>
            )}
            {view === "planificacion" && (
              <>
                <button className="fl-btn ghost sm" onClick={() => setShowAgregarConcepto(true)}>
                  <Icon name="plus" size={15} /> Agregar concepto
                </button>
                <button className="fl-btn primary sm" onClick={handleSwitchToEjecucion}>
                  <Icon name="flag" size={15} /> Cerrar planificación →
                </button>
              </>
            )}
            {view === "ejecucion" && (
              <>
                <button className="fl-btn ghost sm" onClick={() => setShowAporteAngie(true)}>
                  <span className="fl-person a" style={{ width: 16, height: 16, fontSize: 8 }}>A</span> Aporte Angie
                </button>
                <button className="fl-btn ghost sm" onClick={() => setShowAgregarConcepto(true)}>
                  <Icon name="plus" size={15} /> Agregar concepto
                </button>
                <button
                  className="fl-btn ghost sm"
                  disabled={gastosPendientesClasificar > 0}
                  title={gastosPendientesClasificar > 0 ? `${gastosPendientesClasificar} gasto(s) sin clasificar en ${semanaParaCerrar}` : undefined}
                  onClick={() => setShowCerrarSemana(true)}>
                  <Icon name="check" size={15} /> Cerrar {semanaParaCerrar}
                </button>
              </>
            )}
          </div>
        </header>

        {view === "ejecucion" && ejecutarBloqueado && (
          <div style={{ margin: "12px 32px 0", padding: "10px 14px", background: "var(--warn-soft)", color: "var(--warn)", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
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
            {view === "planificacion" ? (
              <>
                <div className="dk-kpi">
                  <p className="k"><Icon name="wallet" size={14} /> Ingreso mes</p>
                  <p className="v">{COP(ingresoTotal)}</p>
                  <p className="h">C: {COP(ingresoCamiloNum, { compact: true })} · A: {COP(aportesNum, { compact: true })}</p>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="list" size={14} /> Comprometido</p>
                  <p className="v">{COP(totalComprometido)}</p>
                  <p className="h">{conceptosActivosMes.length} conceptos activos</p>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="trophy" size={14} /> Diferencia</p>
                  <p className="v" style={{ color: diferenciaTotal >= 0 ? "var(--pos)" : "var(--neg)" }}>
                    {diferenciaTotal >= 0 ? "+" : ""}{COP(diferenciaTotal)}
                  </p>
                  <p className="h">ingreso − comprometido</p>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="check" size={14} /> Semana activa</p>
                  <p className="v" style={{ fontSize: 36 }}>{activeSemana}</p>
                  <p className="h">{dates[activeSemana]}</p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* ── Split: tabla + rail ── */}
          <div className="dk-grid">

            {view === "planificacion" ? (
              <div className="dk-board-panel">
                <div className="dk-board-head">
                  <h3>Distribución de fijos por semana</h3>
                  <span className="cnt">{movs.length} conceptos</span>
                  <div className="dk-filters">
                    {(["todas", "S1", "S2", "S3", "S4"] as const).map(f => (
                      <button key={f} className={`dk-fchip${wkPlan === f ? " on" : ""}`} onClick={() => setWkPlan(f)}>
                        {f === "todas" ? "Todas" : f}
                      </button>
                    ))}
                  </div>
                </div>
                <ConceptoBoard
                  key="plan"
                  movimientos={movs}
                  mes={mes}
                  mode="planeacion"
                  focus={wkPlan}
                  onMovimientoUpdate={handleMovUpdate}
                />
              </div>
            ) : (
              <div className="dk-board-panel">
                <div className="dk-board-head">
                  <h3>Pagos fijos por semana</h3>
                  <span className="cnt">{movs.filter(m => m.estado === "ejecutado").length}/{movs.filter(m => m.estado !== "no_aplica" && m.estado !== "pospuesto_mes_siguiente").length} ejecutados</span>
                  <div className="dk-filters">
                    {(["todas", "S1", "S2", "S3", "S4"] as const).map(f => (
                      <button key={f} className={`dk-fchip${wk === f ? " on" : ""}`} onClick={() => setWk(f)}>
                        {f === "todas" ? "Todas" : f}
                      </button>
                    ))}
                  </div>
                </div>
                <ConceptoBoard
                  key="exec"
                  movimientos={movs}
                  mes={mes}
                  mode="ejecucion"
                  focus={wk}
                  onMovimientoUpdate={handleMovUpdate}
                  remanenteAngiePerSemana={remanenteAngiePerSemana}
                  onAfterExec={(monto, fuenteCamilo, fuenteAngie, fuenteNequi, fuenteEnMano) => {
                    const fuenteMap: Record<string, boolean> = { fuenteCamilo, fuenteAngie, fuenteNequi, fuenteEnMano };
                    const activeCuentas = CUENTAS_H4C
                      .filter(({ fuenteKey }) => fuenteMap[fuenteKey])
                      .map(({ cuenta }) => cuenta);
                    if (activeCuentas.length > 0) {
                      const perCuenta = monto / activeCuentas.length;
                      setSaldosLocal(prev => prev.map(s =>
                        activeCuentas.includes(s.cuenta) ? { ...s, saldoInicial: Math.max(0, s.saldoInicial - perCuenta) } : s
                      ));
                    }
                  }}
                />
              </div>
            )}


          </div>
        </div>
      </div>

      {/* ── Modal Aporte Angie (Bug #17) ── */}
      {showAporteAngie && (
        <ModalAporteAngie
          mes={mes}
          existing={ingresosAngieProp}
          onClose={() => setShowAporteAngie(false)}
          onSave={(ingresos) => {
            const newAportes: Record<Semana, string> = { S1: "", S2: "", S3: "", S4: "" };
            for (const a of ingresos) newAportes[a.semana] = String(a.monto);
            setAportes(newAportes);
            setShowAporteAngie(false);
          }}
        />
      )}

      {/* ── Modal Confirmar Saldos (Bug #7) ── */}
      {showConfirmarSaldos && (
        <ModalConfirmarSaldos
          mes={mes}
          existing={saldosLocal}
          onConfirmed={(saldos) => {
            setSaldosLocal(saldos);
            setSaldosOk(true);
            setShowConfirmarSaldos(false);
            setView("ejecucion");
          }}
        />
      )}

      {/* ── Modal Cerrar Semana (Bug #15) ── */}
      {showCerrarSemana && (
        <ModalCerrarSemana
          mes={mes}
          semana={semanaParaCerrar}
          onClose={() => setShowCerrarSemana(false)}
          onSuccess={() => setShowCerrarSemana(false)}
        />
      )}

      {/* ── Modal Agregar Concepto (solo Planificación) ── */}
      {showAgregarConcepto && (
        <ModalAgregarConcepto
          mes={mes}
          onClose={() => setShowAgregarConcepto(false)}
          onSave={(concepto, movimiento) => {
            setConceptosLocal(prev => [...prev, concepto]);
            setMovs(prev => [...prev, movimiento]);
            setShowAgregarConcepto(false);
          }}
        />
      )}

      {/* ── Modal Ingreso Camilo (solo Ejecución) ── */}
      {ingresoModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}
          onClick={() => setIngresoModalOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 420, borderRadius: 16, background: "var(--surface)", padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}
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
                  type="number" value={ingresoMonto} onChange={e => setIngresoMonto(e.target.value)}
                  placeholder="Ej: 8500000" className="fl-input"
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
                    <button key={key} type="button" onClick={() => setIngresoCuenta(key)}
                      className="fl-chip"
                      style={{ cursor: "pointer", background: ingresoCuenta === key ? "var(--primary)" : "var(--surface-2)", color: ingresoCuenta === key ? "var(--on-primary)" : "var(--ink-soft)", borderColor: "transparent" }}>
                      {cLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
              <button onClick={handleGuardarIngreso}
                disabled={ingresoBusy || !Number(ingresoMonto) || isNaN(Number(ingresoMonto))}
                className="fl-btn primary sm" style={{ flex: 1 }}>
                {ingresoBusy ? "Guardando…" : "Guardar ingreso"}
              </button>
              <button onClick={() => setIngresoModalOpen(false)} className="fl-btn ghost sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
