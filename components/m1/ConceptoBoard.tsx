"use client";

import { useState, useMemo } from "react";
import type { Movimiento, Semana, Actor, Categoria } from "@/lib/data/types";
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

type EjecucionAction =
  | { tipo: "revertir" }
  | { tipo: "no_aplica" }
  | { tipo: "mover_semana"; semana: Semana }
  | { tipo: "mover_mes_siguiente" };

// ── DkExecForm ────────────────────────────────────────────────────────────────

function DkExecForm({
  mov, busy, onConfirm, onCancel, onEjecucionAction,
}: {
  mov: Movimiento;
  busy: boolean;
  onConfirm: (s: ExecState) => void;
  onCancel: () => void;
  onEjecucionAction?: (action: EjecucionAction) => void;
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

  // Executed card — show revert UI only
  if (mov.estado === "ejecutado") {
    return (
      <div className="dk-exp" onClick={e => e.stopPropagation()}>
        <div className="dk-exp-sec">
          <p className="dk-exp-lbl">Ejecutado</p>
          <div className="dk-amtrow">
            <span className="dk-amt-in" style={{ display: "flex", alignItems: "center", color: "var(--pos)" }}>
              {copFull(mov.montoEjecutado ?? mov.montoPresupuestado)}
            </span>
          </div>
          {mov.fechaEjecucion && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-faint)" }}>{mov.fechaEjecucion}</p>
          )}
        </div>
        <div className="dk-exp-actions">
          <button type="button" className="fl-btn ghost sm block"
            disabled={busy}
            onClick={() => onEjecucionAction?.({ tipo: "revertir" })}>
            <Icon name="x" size={15} /> {busy ? "…" : "Revertir ejecución"}
          </button>
          <button type="button" className="dk-exp-cancel" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    );
  }

  // Pending card — full execution form + secondary actions
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

      {onEjecucionAction && (
        <div className="dk-exp-opts" style={{ marginTop: 8 }}>
          <button type="button" className="dk-opt"
            onClick={() => onEjecucionAction({ tipo: "no_aplica" })}>
            <span className="dk-opt-bx"><Icon name="x" size={12} /></span>
            <span className="tx">No aplica este mes</span>
          </button>
          <button type="button" className="dk-opt"
            onClick={() => onEjecucionAction({ tipo: "mover_mes_siguiente" })}>
            <span className="dk-opt-bx"><Icon name="arrow" size={12} /></span>
            <span className="tx">Mover al mes siguiente</span>
          </button>
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            {SEMANAS.map(s => (
              <button key={s} type="button" className="dk-fchip"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => onEjecucionAction({ tipo: "mover_semana", semana: s })}>
                → {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DkPlanForm ────────────────────────────────────────────────────────────────

function DkPlanForm({
  mov, busy, onSave, onCancel,
}: {
  mov: Movimiento;
  busy: boolean;
  onSave: (exc: null | "no" | "next", editedMonto: number) => void;
  onCancel: () => void;
}) {
  const initialExc: null | "no" | "next" =
    mov.estado === "no_aplica" ? "no" :
    (mov.estado === "pospuesto" || mov.estado === "pospuesto_mes_siguiente") ? "next" : null;
  const [exc, setExc] = useState<null | "no" | "next">(initialExc);
  const [editedMonto, setEditedMonto] = useState(String(mov.montoPresupuestado));
  const off = exc !== null;
  const montoNum = Number(editedMonto);
  const montoChanged = montoNum > 0 && montoNum !== mov.montoPresupuestado;

  return (
    <div className="dk-exp" onClick={e => e.stopPropagation()}>
      <p className="dk-exp-hint">
        <Icon name="arrow" size={12} style={{ flexShrink: 0, transform: "rotate(90deg)", color: "var(--primary)" }} />
        Para cambiar de semana, arrastra la tarjeta a otra columna.
      </p>

      <div className={`dk-exp-sec${off ? " off" : ""}`}>
        <p className="dk-exp-lbl">Monto planeado</p>
        <div className="dk-amtrow">
          <input
            type="number"
            className="dk-amt-in"
            value={editedMonto}
            onChange={e => setEditedMonto(e.target.value)}
            onClick={e => e.stopPropagation()}
            disabled={off}
          />
          {montoChanged && (
            <button type="button" className="dk-amt-reset"
              onClick={() => setEditedMonto(String(mov.montoPresupuestado))}>
              ↺ {copFull(mov.montoPresupuestado)}
            </button>
          )}
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
          disabled={busy || (montoNum <= 0 && !off)}
          onClick={() => onSave(exc, montoNum > 0 ? montoNum : mov.montoPresupuestado)}>
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
  onToggle, onConfirmExec, onSavePlan, onEjecucionAction,
  dragId, onDragStart, onDragEnd,
}: {
  mov: Movimiento;
  mode: BoardMode;
  isOpen: boolean;
  busy: boolean;
  onToggle: () => void;
  onConfirmExec: (s: ExecState) => void;
  onSavePlan: (exc: null | "no" | "next", editedMonto: number) => void;
  onEjecucionAction?: (action: EjecucionAction) => void;
  dragId: string | null;
  onDragStart: (id: string, sem: Semana) => void;
  onDragEnd: () => void;
}) {
  const isExec = mov.estado === "ejecutado";
  const isDue  = !isExec && mode === "ejecucion";
  const isNoAp = mov.estado === "no_aplica";
  const isPosp = mov.estado === "pospuesto" || mov.estado === "pospuesto_mes_siguiente";
  const canAct = mode === "planeacion" ? !isExec : true;
  const canDrag = mode === "planeacion" && !isOpen && !isPosp && !isNoAp && !isExec;
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
          ? <DkExecForm mov={mov} busy={busy} onConfirm={onConfirmExec} onCancel={onToggle} onEjecucionAction={onEjecucionAction} />
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

// ── RemRow ────────────────────────────────────────────────────────────────────

function RemRow({ label, value, persona }: { label: string; value: number; persona?: "c" | "a" }) {
  const cls = value > 0 ? "pos" : value < 0 ? "neg" : "flat";
  const sgn = value >= 0 ? "+" : "−";
  return (
    <div className="dk-rem-row">
      <span className="k">
        {persona && (
          <span className={`fl-person ${persona}`} style={{ width: 16, height: 16, fontSize: 9 }}>
            {persona === "a" ? "A" : "C"}
          </span>
        )}
        <span className="kt">{label}</span>
      </span>
      <span className={`v ${cls}`}>
        <span className="sgn">{sgn}</span>
        {copCompact(Math.abs(value))}
      </span>
    </div>
  );
}

// ── CatGroup ─────────────────────────────────────────────────────────────────

const ALL_CATS: Categoria[] = [
  "Casa", "Servicios Públicos", "Membresías y Suscripciones", "Educación",
  "Salud", "Mercado y Alimentación", "Compromisos Financieros",
  "Recreación", "Transporte", "Metas Familiares", "Frida",
];

function CatGroup({
  cat, items, mode, defaultOpen, empty,
  openCard, onToggle, onConfirmExec, onSavePlan, onEjecucionAction, busy,
  dragId, onDragStart, onDragEnd,
}: {
  cat: Categoria; items: Movimiento[]; mode: BoardMode;
  defaultOpen: boolean; empty: boolean;
  openCard: string | null; onToggle: (id: string) => void;
  onConfirmExec: (id: string, s: ExecState) => void;
  onSavePlan: (id: string, exc: null | "no" | "next", editedMonto: number) => void;
  onEjecucionAction?: (id: string, action: EjecucionAction) => void;
  busy: boolean; dragId: string | null;
  onDragStart: (id: string, sem: Semana) => void; onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tot = items.reduce((s, m) => s + m.montoPresupuestado, 0);

  return (
    <div className={`dk-catgroup${open && !empty ? " open" : ""}${empty ? " empty" : ""}`}>
      <button
        type="button"
        className="dk-cathead"
        onClick={empty ? undefined : () => setOpen(o => !o)}
      >
        <span className="dk-cat-ic">
          <Icon name={CAT_ICON[cat] ?? "wallet"} size={15} />
        </span>
        <span className="dk-cat-tx">
          <span className="nm">{cat}</span>
          <span className="meta">
            {empty ? "Sin conceptos" : `${items.length} concepto${items.length !== 1 ? "s" : ""}`}
          </span>
        </span>
        <span className="dk-cat-amt">{empty ? "—" : copCompact(tot)}</span>
        <span className="dk-cat-chev">
          <Icon name="arrow" size={14} />
        </span>
      </button>
      {open && !empty && (
        <div className="dk-cat-body">
          {items.map(mov => (
            <ConceptCard
              key={mov.id} mov={mov} mode={mode} busy={busy}
              isOpen={openCard === mov.id}
              onToggle={() => onToggle(mov.id)}
              onConfirmExec={s => onConfirmExec(mov.id, s)}
              onSavePlan={(exc, monto) => onSavePlan(mov.id, exc, monto)}
              onEjecucionAction={onEjecucionAction ? (a) => onEjecucionAction(mov.id, a) : undefined}
              dragId={dragId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── WeekColumn ────────────────────────────────────────────────────────────────

function WeekColumn({
  semana, items, dates, mode, focus, activeSemana,
  openCard, onToggle, onConfirmExec, onSavePlan, onEjecucionAction, busy,
  dragId, onDragStart, onDragEnd, onDrop, dropHover, setDropHover,
  remanenteAngie,
}: {
  semana: Semana; items: Movimiento[]; dates: Record<Semana, string>;
  mode: BoardMode; focus: "todas" | Semana; activeSemana: Semana;
  openCard: string | null;
  onToggle: (id: string) => void;
  onConfirmExec: (movId: string, s: ExecState) => void;
  onSavePlan: (movId: string, exc: null | "no" | "next", editedMonto: number) => void;
  onEjecucionAction?: (movId: string, action: EjecucionAction) => void;
  busy: boolean;
  dragId: string | null;
  onDragStart: (id: string, sem: Semana) => void;
  onDragEnd: () => void;
  onDrop: (to: Semana) => void;
  dropHover: Semana | null;
  setDropHover: (s: Semana | null) => void;
  remanenteAngie?: number;
}) {
  const tot = items.reduce((s, m) => s + m.montoPresupuestado, 0);
  const ejecutados = items.filter(m => m.estado === "ejecutado");
  const ejecutadoMonto = ejecutados.reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0);
  const pct = items.length ? Math.round((ejecutados.length / items.length) * 100) : 0;
  const porPagar = items.filter(m => m.estado === "pendiente").reduce((s, m) => s + m.montoPresupuestado, 0);
  const remanenteSemana = tot - ejecutadoMonto;
  const dim = focus !== "todas" && focus !== semana;
  const isFocus = focus === semana;
  const allDone = ejecutados.length === items.length && items.length > 0;
  const isActiva = semana === activeSemana;
  const canDrop = mode === "planeacion" && !!dragId && dragId !== "";
  const isDropTarget = canDrop && dropHover === semana;

  // Group items by category; order active-week categories first (by total desc), then empty ones at end
  const catGroups = useMemo(() => {
    const map: Partial<Record<Categoria, Movimiento[]>> = {};
    for (const mov of items) {
      const cat = mov.categoriaSnapshot as Categoria;
      if (!map[cat]) map[cat] = [];
      map[cat]!.push(mov);
    }
    // Categories with items sorted by total presupuestado desc
    const withItems = ALL_CATS
      .filter(c => map[c] && map[c]!.length > 0)
      .sort((a, b) => {
        const ta = (map[a] ?? []).reduce((s, m) => s + m.montoPresupuestado, 0);
        const tb = (map[b] ?? []).reduce((s, m) => s + m.montoPresupuestado, 0);
        return tb - ta;
      });
    // For active semana: categories not present in this week's items go at end, dimmed
    const emptyCats = semana === activeSemana
      ? ALL_CATS.filter(c => !map[c] || map[c]!.length === 0)
      : [];
    return { withItems, emptyCats, map };
  }, [items, semana, activeSemana]);

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
            {/* T27 · Remanente semana + Remanente Angie */}
            <div className="dk-wk-rem">
              <RemRow label="Remanente semana" value={remanenteSemana} />
              {remanenteAngie !== undefined && (
                <RemRow label="Remanente Angie" value={remanenteAngie} persona="a" />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="dk-wk-share"><i style={{ width: `${pct}%` }} /></div>
            <p className="dk-wk-progtx">{pct > 0 ? `${pct}% listo` : `${items.length} conceptos`}</p>
          </>
        )}
      </div>

      <div className="dk-wk-body">
        {items.length === 0 && !catGroups.emptyCats.length && (
          <div className="dk-wk-empty">{canDrop ? "Suelta aquí" : "Sin conceptos"}</div>
        )}
        {/* T27 · Categorías colapsables */}
        {catGroups.withItems.map(cat => (
          <CatGroup
            key={cat} cat={cat} items={catGroups.map[cat] ?? []}
            mode={mode} defaultOpen={false} empty={false}
            openCard={openCard} onToggle={onToggle}
            onConfirmExec={onConfirmExec} onSavePlan={onSavePlan}
            onEjecucionAction={onEjecucionAction}
            busy={busy} dragId={dragId}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
          />
        ))}
        {/* T27 · Categorías sin conceptos en semana activa — al final, atenuadas */}
        {catGroups.emptyCats.map(cat => (
          <CatGroup
            key={cat} cat={cat} items={[]}
            mode={mode} defaultOpen={false} empty
            openCard={openCard} onToggle={onToggle}
            onConfirmExec={onConfirmExec} onSavePlan={onSavePlan}
            onEjecucionAction={onEjecucionAction}
            busy={busy} dragId={dragId}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
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
  remanenteAngiePerSemana,
}: {
  movimientos: Movimiento[];
  mes: string;
  mode: BoardMode;
  focus: "todas" | Semana;
  onMovimientoUpdate: (updated: Movimiento) => void;
  remanenteAngiePerSemana?: Record<Semana, number>;
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

  const handleSavePlan = async (movId: string, exc: null | "no" | "next", editedMonto: number) => {
    const mov = movs.find(m => m.id === movId);
    if (!mov) return;
    const originalPosp = mov.estado === "pospuesto" || mov.estado === "pospuesto_mes_siguiente";
    const montoChanged = editedMonto !== mov.montoPresupuestado;

    if (montoChanged) {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/conceptos/${mov.conceptoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto: editedMonto }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al actualizar monto");
        setMovs(prev => prev.map(m => m.id === movId ? { ...m, montoPresupuestado: editedMonto } : m));
        onMovimientoUpdate({ ...mov, montoPresupuestado: editedMonto });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error desconocido");
        setBusy(false);
        return;
      }
      setBusy(false);
    }

    if (exc === "no") {
      patchar(movId, { tipo: "no_aplica" });
    } else if (exc === "next") {
      if (!originalPosp) patchar(movId, { tipo: "mover_mes_siguiente" });
      else setOpenCard(null);
    } else {
      if (originalPosp) patchar(movId, { tipo: "revertir_mes_siguiente" });
      else setOpenCard(null);
    }
  };

  const handleEjecucionAction = (movId: string, action: EjecucionAction) => {
    if (action.tipo === "revertir") patchar(movId, { tipo: "revertir_ejecucion" });
    else if (action.tipo === "no_aplica") patchar(movId, { tipo: "no_aplica" });
    else if (action.tipo === "mover_mes_siguiente") patchar(movId, { tipo: "mover_mes_siguiente" });
    else patchar(movId, { tipo: "reasignar_semana", semana: action.semana });
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
            onEjecucionAction={mode === "ejecucion" ? handleEjecucionAction : undefined}
            busy={busy}
            dragId={dragId}
            onDragStart={(id) => setDragId(id)}
            onDragEnd={() => { setDragId(null); setDropHover(null); }}
            onDrop={handleDrop}
            dropHover={dropHover}
            setDropHover={setDropHover}
            remanenteAngie={remanenteAngiePerSemana?.[s]}
          />
        ))}
      </div>
    </div>
  );
}
