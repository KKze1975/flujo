"use client";

import { useState, useMemo } from "react";
import type { Movimiento, Semana, Actor } from "@/lib/data/types";
import Icon from "@/components/ui/Icon";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

const MESES_ES = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

const CAT_ICON: Record<string, string> = {
  "Casa": "home", "Servicios Públicos": "bolt",
  "Membresías y Suscripciones": "receipt", "Educación": "book",
  "Salud": "heart", "Mercado y Alimentación": "bag",
  "Compromisos Financieros": "wallet", "Recreación": "film",
  "Transporte": "car", "Metas Familiares": "trophy", "Frida": "paw",
};

const FUENTES_PAGO = [
  { key: "fuenteCamilo" as const, label: "NU Camilo", persona: "c" as const },
  { key: "fuenteAngie"  as const, label: "NU Angie",  persona: "a" as const },
  { key: "fuenteNequi"  as const, label: "ARQ",       persona: null         },
  { key: "fuenteEnMano" as const, label: "En mano",   persona: null         },
];

function copCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return `${sign}$${a}`;
}

function copFull(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

function semanaDates(mes: string): Record<Semana, string> {
  const [year, monthStr] = mes.split("-");
  const month = Number(monthStr);
  const last = new Date(Number(year), month, 0).getDate();
  const m = MESES_ES[month];
  return { S1: `1–7 ${m}`, S2: `8–14 ${m}`, S3: `15–21 ${m}`, S4: `22–${last} ${m}` };
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

// ── Types ─────────────────────────────────────────────────────────────────────

type BoardMode = "planeacion" | "ejecucion";

type ExecState = {
  movId: string; monto: string; ejecutor: Actor;
  fuenteEnMano: boolean; fuenteNequi: boolean;
  fuenteCamilo: boolean; fuenteAngie: boolean;
};

// ── DkExecForm ────────────────────────────────────────────────────────────────

function DkExecForm({
  mov, busy, onConfirm, onCancel,
}: {
  mov: Movimiento;
  busy: boolean;
  onConfirm: (s: ExecState) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<ExecState>({
    movId: mov.id,
    monto: String(mov.montoPresupuestado),
    ejecutor: "camilo",
    fuenteEnMano: false, fuenteNequi: false,
    fuenteCamilo: false, fuenteAngie: false,
  });

  const monto = Number(state.monto);
  const diff = !isNaN(monto) ? monto - mov.montoPresupuestado : 0;

  return (
    <div className="dk-exp" onClick={e => e.stopPropagation()}>
      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Fuente de pago</p>
        <div className="dk-srcs">
          {FUENTES_PAGO.map(({ key, label, persona }) => (
            <button key={key} type="button"
              className={`dk-src${state[key] ? " on" : ""}`}
              onClick={() => setState(s => ({ ...s, [key]: !s[key] }))}>
              {persona
                ? <span className={`fl-person ${persona}`} style={{ width: 22, height: 22, fontSize: 10 }}>{persona === "c" ? "C" : "A"}</span>
                : <span className="dk-src-ic"><Icon name="wallet" size={13} /></span>}
              <span className="nm">{label}</span>
              <span className="dk-rb"><Icon name="check" size={11} /></span>
            </button>
          ))}
        </div>
      </div>

      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Ejecutó</p>
        <div className="dk-seg2">
          {(["camilo", "angie"] as Actor[]).map(a => (
            <button key={a} type="button"
              className={state.ejecutor === a ? "on" : ""}
              onClick={() => setState(s => ({ ...s, ejecutor: a }))}>
              <span className={`fl-person ${a === "camilo" ? "c" : "a"}`} style={{ width: 18, height: 18, fontSize: 9 }}>
                {a === "camilo" ? "C" : "A"}
              </span>
              {a === "camilo" ? "Camilo" : "Angie"}
            </button>
          ))}
        </div>
      </div>

      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Monto ejecutado</p>
        <div className="dk-amtrow">
          <input type="number" className="dk-amt-in"
            value={state.monto}
            onChange={e => setState(s => ({ ...s, monto: e.target.value }))}
            onClick={e => e.stopPropagation()}
          />
          {diff !== 0 && (
            <button type="button" className="dk-amt-reset"
              onClick={() => setState(s => ({ ...s, monto: String(mov.montoPresupuestado) }))}>
              ↺ {copCompact(mov.montoPresupuestado)}
            </button>
          )}
        </div>
        {diff !== 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: diff > 0 ? "var(--neg)" : "var(--pos)" }}>
            {diff > 0 ? "+" : ""}{copFull(diff)}
          </p>
        )}
      </div>

      <div className="dk-exp-actions">
        <button type="button" className="fl-btn primary sm block"
          disabled={busy || !monto || isNaN(monto)}
          onClick={() => onConfirm(state)}>
          <Icon name="check" size={15} /> {busy ? "…" : "Confirmar ejecución"}
        </button>
        <button type="button" className="dk-exp-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── DkPlanForm ────────────────────────────────────────────────────────────────

function DkPlanForm({
  mov, busy, onSave, onCancel,
}: {
  mov: Movimiento;
  busy: boolean;
  onSave: (exc: null | "no" | "next") => void;
  onCancel: () => void;
}) {
  const [exc, setExc] = useState<null | "no" | "next">(null);
  const off = exc !== null;

  return (
    <div className="dk-exp" onClick={e => e.stopPropagation()}>
      <p className="dk-exp-hint">
        <Icon name="arrow" size={12} style={{ flexShrink: 0, transform: "rotate(90deg)", color: "var(--primary)" }} />
        Para cambiar de semana, arrastra la tarjeta a otra columna.
      </p>

      <div className={`dk-exp-sec${off ? " off" : ""}`}>
        <p className="dk-exp-lbl">Monto planeado</p>
        <div className="dk-amtrow">
          <span className="dk-amt-in" style={{ display: "flex", alignItems: "center" }}>
            {copFull(mov.montoPresupuestado)}
          </span>
        </div>
      </div>

      <div className="dk-exp-opts">
        <button type="button" className={`dk-opt${exc === "no" ? " on" : ""}`}
          onClick={() => setExc(exc === "no" ? null : "no")}>
          <span className="dk-opt-bx"><Icon name="x" size={12} /></span>
          <span className="tx">No aplica este mes</span>
          <span className="dk-rb"><Icon name="check" size={11} /></span>
        </button>
        <button type="button" className={`dk-opt${exc === "next" ? " on" : ""}`}
          onClick={() => setExc(exc === "next" ? null : "next")}>
          <span className="dk-opt-bx"><Icon name="arrow" size={12} /></span>
          <span className="tx">Mover al mes siguiente</span>
          <span className="dk-rb"><Icon name="check" size={11} /></span>
        </button>
      </div>

      <div className="dk-exp-actions">
        <button type="button" className="fl-btn primary sm block"
          disabled={busy}
          onClick={() => onSave(exc)}>
          <Icon name="check" size={15} /> {busy ? "…" : "Guardar"}
        </button>
        <button type="button" className="dk-exp-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── ConceptCard ────────────────────────────────────────────────────────────────

function ConceptCard({
  mov, mode, isOpen, busy,
  onToggle, onConfirmExec, onSavePlan,
  dragId, onDragStart, onDragEnd,
}: {
  mov: Movimiento;
  mode: BoardMode;
  isOpen: boolean;
  busy: boolean;
  onToggle: () => void;
  onConfirmExec: (s: ExecState) => void;
  onSavePlan: (exc: null | "no" | "next") => void;
  dragId: string | null;
  onDragStart: (id: string, sem: Semana) => void;
  onDragEnd: () => void;
}) {
  const isExec = mov.estado === "ejecutado";
  const isDue  = !isExec && mode === "ejecucion";
  const isNoAp = mov.estado === "no_aplica";
  const isPosp = mov.estado === "pospuesto" || mov.estado === "pospuesto_mes_siguiente";
  const canAct = mode === "ejecucion" ? !isExec : !isNoAp && !isPosp;
  const canDrag = mode === "planeacion" && !isOpen && canAct;
  const isDragging = dragId === mov.id;

  const cls = [
    "dk-cc",
    isExec ? "exec" : "",
    isDue  ? "due"  : "",
    isOpen ? "open" : "",
    canAct && !isOpen ? "clickable" : "",
    canDrag ? "grab" : "",
    isDragging ? "dragging" : "",
    isNoAp || isPosp ? "marked" : "",
  ].filter(Boolean).join(" ");

  const statusBadge = mode === "ejecucion"
    ? (isExec
        ? <span className="dk-done"><Icon name="check" size={12} /> Ejecutado</span>
        : <span className="dk-cc-cta">Ejecutar <Icon name="arrow" size={12} /></span>)
    : (isNoAp
        ? <span className="fl-badge" style={{ fontSize: 10, padding: "2px 7px" }}>No aplica</span>
        : isPosp
          ? <span className="fl-badge primary" style={{ fontSize: 10, padding: "2px 7px" }}><Icon name="arrow" size={10} /> Mes sig.</span>
          : isExec
            ? <span className="dk-done soft"><Icon name="check" size={12} /> listo</span>
            : <span className="fl-badge warn" style={{ fontSize: 10, padding: "2px 7px" }}><span className="dot" /> por pagar</span>);

  return (
    <div
      className={cls}
      onClick={!isOpen && canAct ? onToggle : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? e => {
        e.dataTransfer.setData("text/plain", mov.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(mov.id, mov.semana as Semana);
      } : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
    >
      <div className="dk-cc-top">
        <span className="dk-cc-ic">
          <Icon name={CAT_ICON[mov.categoriaSnapshot] ?? "wallet"} size={16} />
        </span>
        <div className="dk-cc-tx">
          <p className="dk-cc-nm" title={mov.nombreSnapshot}>
            <span className="nm-t">{mov.nombreSnapshot}</span>
            {mov.pendienteAprobacion && <span className="lock"><Icon name="lock" size={11} /></span>}
          </p>
          <p className="dk-cc-cat">{mov.categoriaSnapshot}</p>
        </div>
        {!isOpen && <span className="dk-cc-amt2">{copCompact(mov.montoPresupuestado)}</span>}
        {isOpen  && <span className="dk-cc-chev open"><Icon name="arrow" size={14} /></span>}
      </div>

      {isOpen ? (
        mode === "ejecucion"
          ? <DkExecForm mov={mov} busy={busy} onConfirm={onConfirmExec} onCancel={onToggle} />
          : <DkPlanForm mov={mov} busy={busy} onSave={onSavePlan}    onCancel={onToggle} />
      ) : (
        <div className="dk-cc-foot">
          <span className="dk-cc-who">
            {mov.ejecutor
              ? <>
                  <span className={`fl-person ${mov.ejecutor === "camilo" ? "c" : "a"}`}
                    style={{ width: 18, height: 18, fontSize: 9 }}>
                    {mov.ejecutor === "camilo" ? "C" : "A"}
                  </span>
                  {mov.ejecutor === "camilo" ? "Camilo" : "Angie"}
                </>
              : <>
                  <span style={{ width: 18, height: 18, borderRadius: 6, background: "var(--surface)", display: "grid", placeItems: "center" }}>
                    <Icon name="wallet" size={11} />
                  </span>
                  Compartido
                </>}
          </span>
          {statusBadge}
        </div>
      )}
    </div>
  );
}

// ── WeekColumn ────────────────────────────────────────────────────────────────

function WeekColumn({
  semana, items, dates, mode, focus, activeSemana,
  openCard, onToggle, onConfirmExec, onSavePlan, busy,
  dragId, onDragStart, onDragEnd, onDrop, dropHover, setDropHover,
}: {
  semana: Semana; items: Movimiento[]; dates: Record<Semana, string>;
  mode: BoardMode; focus: "todas" | Semana; activeSemana: Semana;
  openCard: string | null;
  onToggle: (id: string) => void;
  onConfirmExec: (movId: string, s: ExecState) => void;
  onSavePlan: (movId: string, exc: null | "no" | "next") => void;
  busy: boolean;
  dragId: string | null;
  onDragStart: (id: string, sem: Semana) => void;
  onDragEnd: () => void;
  onDrop: (to: Semana) => void;
  dropHover: Semana | null;
  setDropHover: (s: Semana | null) => void;
}) {
  const tot = items.reduce((s, m) => s + m.montoPresupuestado, 0);
  const ejecutados = items.filter(m => m.estado === "ejecutado");
  const pct = items.length ? Math.round((ejecutados.length / items.length) * 100) : 0;
  const porPagar = items.filter(m => m.estado === "pendiente").reduce((s, m) => s + m.montoPresupuestado, 0);
  const dim = focus !== "todas" && focus !== semana;
  const isFocus = focus === semana;
  const allDone = ejecutados.length === items.length && items.length > 0;
  const isActiva = semana === activeSemana;
  const canDrop = mode === "planeacion" && !!dragId && dragId !== "";
  const isDropTarget = canDrop && dropHover === semana;

  return (
    <div
      className={[
        "dk-wkcol",
        dim        ? "dim"    : "",
        isFocus    ? "focus"  : "",
        mode === "ejecucion" && allDone  ? "done"   : "",
        mode === "ejecucion" && isActiva ? "activa" : "",
        isDropTarget ? "drop-hover" : "",
      ].filter(Boolean).join(" ")}
      onDragOver={canDrop ? e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dropHover !== semana) setDropHover(semana); } : undefined}
      onDrop={canDrop ? e => { e.preventDefault(); onDrop(semana); } : undefined}
    >
      <div className="dk-wk-head">
        <div className="dk-wk-noderow">
          <div className="dk-wk-node">{semana}</div>
          {mode === "ejecucion" && isActiva && <span className="dk-wk-tag">Semana activa</span>}
        </div>
        <p className="dk-wk-range">{dates[semana]}</p>
        <p className="dk-wk-sub">{items.length} conceptos · {copCompact(tot)}</p>
        {mode === "ejecucion" ? (
          <>
            <div className="dk-wk-prog"><i style={{ width: `${pct}%` }} /></div>
            <p className="dk-wk-progtx">{ejecutados.length}/{items.length} ejecutados · {copCompact(porPagar)} por pagar</p>
          </>
        ) : (
          <>
            <div className="dk-wk-share"><i style={{ width: `${pct}%` }} /></div>
            <p className="dk-wk-progtx">{pct > 0 ? `${pct}% listo` : `${items.length} conceptos`}</p>
          </>
        )}
      </div>

      <div className="dk-wk-body">
        {items.length === 0 && (
          <div className="dk-wk-empty">{canDrop ? "Suelta aquí" : "Sin conceptos"}</div>
        )}
        {items.map(mov => (
          <ConceptCard
            key={mov.id} mov={mov} mode={mode} busy={busy}
            isOpen={openCard === mov.id}
            onToggle={() => onToggle(mov.id)}
            onConfirmExec={s => onConfirmExec(mov.id, s)}
            onSavePlan={exc => onSavePlan(mov.id, exc)}
            dragId={dragId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ── ConceptoBoard (main export) ───────────────────────────────────────────────

export default function ConceptoBoard({
  movimientos,
  mes,
  mode,
  focus,
  onMovimientoUpdate,
}: {
  movimientos: Movimiento[];
  mes: string;
  mode: BoardMode;
  focus: "todas" | Semana;
  onMovimientoUpdate: (updated: Movimiento) => void;
}) {
  const [movs, setMovs] = useState<Movimiento[]>(movimientos);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHover, setDropHover] = useState<Semana | null>(null);
  const [localSemanas, setLocalSemanas] = useState<Record<string, Semana>>({});

  const dates = useMemo(() => semanaDates(mes), [mes]);
  const activeSemana = useMemo(() => getActiveSemana(mes), [mes]);

  const byWeek = useMemo(() => {
    const map: Record<Semana, Movimiento[]> = { S1: [], S2: [], S3: [], S4: [] };
    for (const mov of movs) {
      const s = (localSemanas[mov.id] ?? mov.semana) as Semana | null;
      if (s && map[s]) map[s].push(mov);
    }
    return map;
  }, [movs, localSemanas]);

  const patchar = async (id: string, body: Record<string, unknown>, onSuccess?: (m: Movimiento) => void) => {
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
      const updated = data as Movimiento;
      setMovs(prev => prev.map(m => m.id === id ? updated : m));
      onMovimientoUpdate(updated);
      onSuccess?.(updated);
      setOpenCard(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmExec = (movId: string, s: ExecState) => {
    const monto = Number(s.monto);
    if (!monto || isNaN(monto)) return;
    patchar(movId, {
      tipo: "ejecutar", montoEjecutado: monto, ejecutor: s.ejecutor,
      fuenteEnMano: s.fuenteEnMano, fuenteNequi: s.fuenteNequi,
      fuenteCamilo: s.fuenteCamilo, fuenteAngie: s.fuenteAngie,
    });
  };

  const handleSavePlan = (movId: string, exc: null | "no" | "next") => {
    if (exc === "no") patchar(movId, { tipo: "no_aplica" });
    else if (exc === "next") patchar(movId, { tipo: "posponer", razonPostergacion: null });
    else setOpenCard(null);
  };

  const handleDrop = (toSemana: Semana) => {
    if (!dragId) return;
    const fromSemana = (SEMANAS).find(s => byWeek[s].some(m => m.id === dragId));
    if (!fromSemana || fromSemana === toSemana) { setDragId(null); setDropHover(null); return; }
    setLocalSemanas(prev => ({ ...prev, [dragId]: toSemana }));
    const id = dragId;
    setDragId(null);
    setDropHover(null);
    patchar(id, { tipo: "reasignar_semana", semana: toSemana }, () => {
      setLocalSemanas(prev => { const n = { ...prev }; delete n[id]; return n; });
    });
  };

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 12, borderRadius: 10, background: "var(--neg-soft)", padding: "8px 14px", fontSize: 13, color: "var(--neg)", fontWeight: 600 }}>
          {error}
        </div>
      )}
      <div className={`dk-board${focus !== "todas" ? " focus-one" : ""}`}>
        {SEMANAS.map(s => (
          <WeekColumn
            key={s} semana={s} items={byWeek[s]} dates={dates}
            mode={mode} focus={focus} activeSemana={activeSemana}
            openCard={openCard}
            onToggle={id => setOpenCard(prev => prev === id ? null : id)}
            onConfirmExec={handleConfirmExec}
            onSavePlan={handleSavePlan}
            busy={busy}
            dragId={dragId}
            onDragStart={(id) => setDragId(id)}
            onDragEnd={() => { setDragId(null); setDropHover(null); }}
            onDrop={handleDrop}
            dropHover={dropHover}
            setDropHover={setDropHover}
          />
        ))}
      </div>
    </div>
  );
}
