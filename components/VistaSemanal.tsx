"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Ring from "@/components/ui/Ring";
import BottomNav from "@/components/ui/BottomNav";
import RegistroRapido from "@/components/m4/RegistroRapido";
import type { Movimiento, CierreSemana, Semana, Actor, ConsumoH3, IngresoAngie } from "@/lib/data/types";

type Fuente = "en_mano" | "nequi" | "camilo" | "angie";
type ModoSemana = "activa" | "lectura" | "edicion";

type ActivePanel =
  | { tipo: "ok"; id: string; fuente: Fuente | null; ejecutor: Actor }
  | { tipo: "editar"; id: string; monto: string; fuente: Fuente | null; ejecutor: Actor }
  | { tipo: "recibo"; id: string };

const FUENTES: { value: Fuente; label: string }[] = [
  { value: "en_mano", label: "En mano" },
  { value: "nequi",   label: "Nequi"   },
  { value: "camilo",  label: "NU Camilo" },
  { value: "angie",   label: "NU Angie"  },
];

function COP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

function copCompact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return `${sign}$${a}`;
}

// Active bolsillos list (ESTADO.md: vincula exclusivamente a bolsillos activos)

const FUENTES_M5 = [
  { key: "fuenteCamilo" as const, label: "NU Camilo", persona: "c" as const },
  { key: "fuenteAngie"  as const, label: "NU Angie",  persona: "a" as const },
  { key: "fuenteNequi"  as const, label: "ARQ",       persona: null         },
  { key: "fuenteEnMano" as const, label: "En mano",   persona: null         },
];

// ── M5 Modal ──────────────────────────────────────────────────────────────────

type M5FuenteKey = "fuenteCamilo" | "fuenteAngie" | "fuenteNequi" | "fuenteEnMano";

function fuenteLabel(c: ConsumoH3): string {
  if (c.fuenteCamilo) return "NU Camilo";
  if (c.fuenteAngie)  return "NU Angie";
  if (c.fuenteNequi)  return "ARQ";
  if (c.fuenteEnMano) return "En mano";
  return "—";
}

function OriginalRecord({ consumo, flagClasif }: { consumo: ConsumoH3; flagClasif?: boolean }) {
  const fuente = fuenteLabel(consumo);
  const catIcon = CAT_ICON[consumo.bolsilloId] ?? "wallet";
  return (
    <div className="dk-orig">
      <p className="dk-orig-lbl"><Icon name="receipt" size={12} /> Registro original</p>
      <div className="dk-orig-main">
        <span className="dk-orig-ic"><Icon name={catIcon} size={16} /></span>
        <div className="dk-orig-tx">
          <p className="t">{consumo.descripcion || "Sin descripción"}</p>
          <p className="d">{consumo.fecha}</p>
        </div>
        <span className="dk-orig-amt">{COP(consumo.monto)}</span>
      </div>
      <div className="dk-orig-tags">
        <span className={`dk-otag${flagClasif ? " flag" : ""}`}>
          {flagClasif && <Icon name="alert" size={11} />}
          {consumo.clasificado ? consumo.bolsilloId : "Sin clasificar"}
        </span>
        <span className="dk-otag">Semana {consumo.semana}</span>
        <span className="dk-otag">{fuente}</span>
        <span className="dk-otag">
          <span className={`fl-person ${consumo.ejecutor === "camilo" ? "c" : "a"}`} style={{ width: 14, height: 14, fontSize: 8 }}>
            {consumo.ejecutor === "camilo" ? "C" : "A"}
          </span>
          {consumo.ejecutor === "camilo" ? "Camilo" : "Angie"}
        </span>
      </div>
    </div>
  );
}

type M5Scenario = "descripcion" | "monto" | "ejecutor" | "fuente" | "clasif" | "semana";

const SCN_LABEL: Record<M5Scenario, { eye: string; title: string; note: string }> = {
  descripcion: { eye: "Descripción incorrecta",    title: "Corregir la descripción",   note: "Edita el texto del gasto registrado." },
  monto:    { eye: "Error de monto",           title: "Corregir el monto",         note: "Ajusta el valor; el registro original queda como referencia." },
  ejecutor: { eye: "Ejecutor incorrecto",      title: "¿Quién ejecutó el gasto?",  note: "Cambia la persona que pagó." },
  fuente:   { eye: "Fuente de pago incorrecta",title: "Cambiar la fuente de pago", note: "Selecciona de dónde salió realmente el dinero." },
  clasif:   { eye: "Categoría / Concepto",     title: "Clasificar el gasto",       note: "Asígnalo a un bolsillo activo para registrar correctamente el consumo." },
  semana:   { eye: "Semana incorrecta",        title: "Mover de semana",           note: "Reasigna el registro a la semana correcta del mes." },
};

function ModalCorreccion({
  consumo,
  bolsillos,
  consumos,
  onClose,
  onSaved,
  onRevertido,
}: {
  consumo: ConsumoH3;
  bolsillos: Movimiento[];
  consumos: ConsumoH3[];
  onClose: () => void;
  onSaved: (updated: ConsumoH3) => void;
  onRevertido: (id: string) => void;
}) {
  const defaultScenario: M5Scenario = !consumo.clasificado ? "clasif" : "monto";
  const [scenario, setScenario] = useState<M5Scenario>(defaultScenario);
  const [descripcion, setDescripcion] = useState(consumo.descripcion);
  const [monto, setMonto] = useState(consumo.monto);
  const [ejecutor, setEjecutor] = useState<Actor>(consumo.ejecutor);
  const [fuentes, setFuentes] = useState({
    fuenteCamilo: consumo.fuenteCamilo,
    fuenteAngie: consumo.fuenteAngie,
    fuenteNequi: consumo.fuenteNequi,
    fuenteEnMano: consumo.fuenteEnMano,
  });
  const [bolsilloId, setBolsilloId] = useState<string | null>(null);
  const [semana, setSemana] = useState<Semana>(consumo.semana);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoRevertir, setConfirmandoRevertir] = useState(false);
  const [imprevistoLocal, setImprevistoLocal] = useState(consumo.imprevisto);
  const [imprevistoSaving, setImprevistoSaving] = useState(false);

  const scn = SCN_LABEL[scenario];

  async function toggleImprevisto() {
    const next = !imprevistoLocal;
    setImprevistoLocal(next);
    setImprevistoSaving(true);
    try {
      const res = await fetch(`/api/consumos/${consumo.id}/imprevisto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imprevisto: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      onSaved(data as ConsumoH3);
    } catch {
      setImprevistoLocal(!next);
    } finally {
      setImprevistoSaving(false);
    }
  }

  async function guardar() {
    setBusy(true);
    setError(null);
    let patch: Record<string, unknown> = {};
    if (scenario === "descripcion") patch = { descripcion };
    if (scenario === "monto")    patch = { monto };
    if (scenario === "ejecutor") patch = { ejecutor };
    if (scenario === "fuente")   patch = { ...fuentes };
    if (scenario === "clasif") {
      // Resolve the bolsillo ensuring selectedId is always the H1 concepto id (CATEGORIA_xxx).
      // When consumo.bolsilloId is corrupted (e.g. MOV_xxx from pre-T45 data), matching by b.id
      // finds the bolsillo and b.conceptoId self-heals the value written to H3B.
      const selectedBolsillo = bolsilloId
        ? bolsillos.find((b) => b.conceptoId === bolsilloId)
        : bolsillos.find((b) => b.id === consumo.bolsilloId || b.conceptoId === consumo.bolsilloId);
      const selectedId = selectedBolsillo?.conceptoId ?? consumo.bolsilloId;
      const gastado = consumos.filter(c => c.bolsilloId === selectedId).reduce((sum, c) => sum + c.monto, 0);
      const techo = selectedBolsillo?.montoPresupuestado ?? 0;
      patch = { bolsilloId: selectedId, clasificado: true, sobreTecho: techo > 0 && gastado >= techo };
    }
    if (scenario === "semana")   patch = { semana };

    try {
      const res = await fetch(`/api/consumos/${consumo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaved(data as ConsumoH3);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  async function revertir() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/consumos/${consumo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Error al revertir");
      }
      onRevertido(consumo.id);
      onClose();
    } catch (e: unknown) {
      setConfirmandoRevertir(false);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  function toggleFuente(key: M5FuenteKey) {
    setFuentes(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const semanas: Semana[] = ["S1", "S2", "S3", "S4"];

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="dk-modal-head">
          <div className="lhs">
            <p className="eyebrow"><Icon name="pencil" size={11} /> {scn.eye}</p>
            <h3>{scn.title}</h3>
          </div>
          <button type="button" className="dk-modal-x" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </header>

        {/* Body */}
        <div className="dk-modal-body">
          {/* Scenario tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["descripcion", "monto", "ejecutor", "fuente", "clasif", "semana"] as M5Scenario[]).map(s => (
              <button
                key={s}
                type="button"
                className={`fl-btn ghost sm${scenario === s ? " primary" : ""}`}
                style={{
                  fontSize: 10.5, padding: "4px 10px",
                  background: scenario === s ? "var(--primary-soft)" : "var(--surface-2)",
                  color: scenario === s ? "var(--primary)" : "var(--ink-soft)",
                  border: scenario === s ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
                }}
                onClick={() => setScenario(s)}
              >
                {SCN_LABEL[s].eye}
              </button>
            ))}
          </div>

          {/* Imprevisto toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Imprevisto (sin concepto en H1)</span>
            <button
              type="button"
              disabled={imprevistoSaving}
              onClick={toggleImprevisto}
              style={{
                padding: "3px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: imprevistoLocal ? "var(--warn-soft, #fff3e0)" : "var(--surface-2)",
                color: imprevistoLocal ? "var(--warn, #b05e00)" : "var(--ink-soft)",
                border: imprevistoLocal ? "1.5px solid var(--warn, #b05e00)" : "1.5px solid var(--line)",
                opacity: imprevistoSaving ? 0.5 : 1,
              }}
            >
              {imprevistoLocal ? "Imprevisto ✓" : "Marcar imprevisto"}
            </button>
          </div>

          {/* Original record */}
          <OriginalRecord consumo={consumo} flagClasif={scenario === "clasif"} />

          {/* Correction control */}
          <div className="dk-corr">
            {scenario === "descripcion" && (
              <>
                <p className="dk-exp-lbl">Descripción corregida</p>
                <input
                  className="dk-amt-in"
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  style={{ width: "100%", fontWeight: 500 }}
                  placeholder="¿Qué fue este gasto?"
                />
              </>
            )}

            {scenario === "monto" && (
              <>
                <p className="dk-exp-lbl">Monto corregido</p>
                <div className="dk-amtrow">
                  <input
                    className="dk-amt-in"
                    type="number"
                    value={monto}
                    onChange={e => setMonto(Number(e.target.value) || 0)}
                    style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                  />
                </div>
                {monto !== consumo.monto && (
                  <div className="dk-diff">
                    <span className="was">{COP(consumo.monto)}</span>
                    <span className="arr"><Icon name="arrow" size={13} /></span>
                    <span className="now">{COP(monto)}</span>
                  </div>
                )}
              </>
            )}

            {scenario === "ejecutor" && (
              <>
                <p className="dk-exp-lbl">Ejecutó</p>
                <div className="dk-seg2">
                  {(["camilo", "angie"] as Actor[]).map(a => (
                    <button key={a} type="button"
                      className={ejecutor === a ? "on" : ""}
                      onClick={() => setEjecutor(a)}>
                      <span className={`fl-person ${a === "camilo" ? "c" : "a"}`} style={{ width: 18, height: 18, fontSize: 9 }}>
                        {a === "camilo" ? "C" : "A"}
                      </span>
                      {a === "camilo" ? "Camilo" : "Angie"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {scenario === "fuente" && (
              <>
                <p className="dk-exp-lbl">Fuente de pago</p>
                <div className="dk-srcs">
                  {FUENTES_M5.map(({ key, label, persona }) => (
                    <button key={key} type="button"
                      className={`dk-src${fuentes[key] ? " on" : ""}`}
                      onClick={() => toggleFuente(key)}>
                      {persona
                        ? <span className={`fl-person ${persona}`} style={{ width: 22, height: 22, fontSize: 10 }}>{persona === "c" ? "C" : "A"}</span>
                        : <span className="dk-src-ic"><Icon name="wallet" size={13} /></span>}
                      <span className="nm">{label}</span>
                      <span className="dk-rb"><Icon name="check" size={11} /></span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {scenario === "clasif" && (
              <>
                <p className="dk-exp-lbl">Bolsillo activo</p>
                <div className="dk-h2pick">
                  {bolsillos.map(b => {
                    const gastado = consumos.filter(c => c.bolsilloId === b.conceptoId).reduce((sum, c) => sum + c.monto, 0);
                    const techo = b.montoPresupuestado ?? 0;
                    const over = techo > 0 && gastado >= techo;
                    const icon = CAT_ICON[b.categoriaSnapshot] ?? "bag";
                    return (
                      <button key={b.conceptoId} type="button"
                        className={`dk-h2${bolsilloId === b.conceptoId ? " on" : ""}`}
                        onClick={() => setBolsilloId(b.conceptoId)}>
                        <span className="dk-h2-ic"><Icon name={icon} size={13} /></span>
                        <span className="nm">{b.nombreSnapshot}</span>
                        {over && <span className="fl-badge neg" style={{ fontSize: 10, padding: "1px 5px", marginLeft: 4 }}>sobre techo</span>}
                        <span className="dk-rb"><Icon name="check" size={11} /></span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {scenario === "semana" && (
              <>
                <p className="dk-exp-lbl">Semana del registro</p>
                <div className="dk-seg2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {semanas.map(s => (
                    <button key={s} type="button"
                      className={semana === s ? "on" : ""}
                      onClick={() => setSemana(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="dk-corr-note"><Icon name="info" size={13} /> {scn.note}</p>
          </div>

          {error && (
            <div style={{ background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="dk-modal-foot">
          <button type="button" className="fl-btn ghost sm" onClick={() => setConfirmandoRevertir(true)} disabled={busy}
            style={{ color: "var(--neg)", borderColor: "var(--neg)", marginRight: "auto" }}>
            <Icon name="x" size={15} /> Revertir
          </button>
          <button type="button" className="fl-btn ghost sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="fl-btn primary sm" onClick={guardar} disabled={busy}>
            <Icon name="check" size={15} /> {busy ? "…" : "Guardar corrección"}
          </button>
        </footer>

        {/* Confirmación revertir */}
        {confirmandoRevertir && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "inherit",
            background: "var(--surface)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 20, padding: 32, zIndex: 10,
          }}>
            <p style={{ fontWeight: 600, fontSize: 15, textAlign: "center", margin: 0 }}>
              ¿Eliminar &ldquo;{consumo.descripcion || "este registro"}&rdquo;?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="fl-btn ghost sm"
                onClick={() => setConfirmandoRevertir(false)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="fl-btn primary sm"
                onClick={revertir} disabled={busy}
                style={{ background: "var(--neg)", borderColor: "var(--neg)" }}>
                {busy ? "…" : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Posponer / No aplica (pendientes) ───────────────────────────────────

function ModalAccionesPendiente({
  movimiento,
  mes,
  semanasCerradas,
  onClose,
  onUpdated,
}: {
  movimiento: Movimiento;
  mes: string;
  semanasCerradas: Semana[];
  onClose: () => void;
  onUpdated: (updated: Movimiento) => void;
}) {
  type Accion = "ejecutar" | "posponer" | "no_aplica";
  type Destino = Semana | "siguiente";

  const [accion, setAccion] = useState<Accion>("ejecutar");
  const [destino, setDestino] = useState<Destino>("S1");
  const [montoEditar, setMontoEditar] = useState(String(movimiento.montoPresupuestado));
  const [fuenteEditar, setFuenteEditar] = useState<Fuente | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const semanas: Semana[] = ["S1", "S2", "S3", "S4"];

  async function confirmar() {
    setBusy(true);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (accion === "ejecutar") {
        const monto = Number(montoEditar);
        if (isNaN(monto) || monto <= 0) { setError("Monto inválido"); setBusy(false); return; }
        body = {
          tipo: "ejecutar",
          montoEjecutado: monto,
          fuenteEnMano:  fuenteEditar === "en_mano",
          fuenteNequi:   fuenteEditar === "nequi",
          fuenteCamilo:  fuenteEditar === "camilo",
          fuenteAngie:   fuenteEditar === "angie",
          ejecutor: "camilo",
        };
      } else if (accion === "no_aplica") {
        body = { tipo: "no_aplica" };
      } else if (destino === "siguiente") {
        body = { tipo: "mover_mes_siguiente" };
      } else {
        body = { tipo: "posponer", nuevaSemana: destino };
      }
      const res = await fetch(`/api/mes/${mes}/movimientos/${movimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      onUpdated(data as Movimiento);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  const btnStyle = (active: boolean) => ({
    fontSize: 10.5 as const, padding: "4px 10px",
    background: active ? "var(--primary-soft)" : "var(--surface-2)",
    color: active ? "var(--primary)" : "var(--ink-soft)",
    border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
  });

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal" onClick={(e) => e.stopPropagation()}>
        <header className="dk-modal-head">
          <div className="lhs">
            <p className="eyebrow"><Icon name="pencil" size={11} /> Opciones</p>
            <h3>{movimiento.nombreSnapshot}</h3>
          </div>
          <button type="button" className="dk-modal-x" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </header>

        <div className="dk-modal-body">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["ejecutar", "posponer", "no_aplica"] as Accion[]).map(a => (
              <button key={a} type="button"
                className={`fl-btn ghost sm${accion === a ? " primary" : ""}`}
                style={btnStyle(accion === a)}
                onClick={() => setAccion(a)}
              >
                {a === "ejecutar" ? "Ejecutar" : a === "posponer" ? "Posponer" : "No aplica"}
              </button>
            ))}
          </div>

          {accion === "ejecutar" && (
            <>
              <div style={{ marginTop: 16 }}>
                <p className="dk-exp-lbl">Monto ejecutado</p>
                <div className="dk-amtrow">
                  <input
                    className="dk-amt-in"
                    type="number"
                    value={montoEditar}
                    onChange={e => setMontoEditar(e.target.value)}
                    style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <p className="dk-exp-lbl">Fuente de pago</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {FUENTES.map(f => (
                    <button key={f.value} type="button" className="fl-chip"
                      style={{
                        justifyContent: "center", cursor: "pointer",
                        background: fuenteEditar === f.value ? "var(--primary)" : "var(--surface-2)",
                        color: fuenteEditar === f.value ? "var(--on-primary)" : "var(--ink-soft)",
                      }}
                      onClick={() => setFuenteEditar(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {accion === "posponer" && (
            <div style={{ marginTop: 16 }}>
              <p className="dk-exp-lbl">Semana destino</p>
              <div className="dk-seg2" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {semanas.map(s => {
                  const cerrada = semanasCerradas.includes(s);
                  return (
                    <button key={s} type="button"
                      className={destino === s ? "on" : ""}
                      disabled={cerrada}
                      onClick={() => setDestino(s)}
                      title={cerrada ? `${s} ya cerrada` : ""}
                    >
                      {s}{cerrada ? " ×" : ""}
                    </button>
                  );
                })}
                <button type="button"
                  className={destino === "siguiente" ? "on" : ""}
                  onClick={() => setDestino("siguiente")}
                >
                  Mes sig.
                </button>
              </div>
            </div>
          )}

          {accion === "no_aplica" && (
            <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              El concepto no aplica para esta semana y no será ejecutado en este período.
            </p>
          )}

          {error && (
            <div style={{ background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        <footer className="dk-modal-foot">
          <button type="button" className="fl-btn ghost sm" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="fl-btn primary sm" onClick={confirmar}
            disabled={busy || (accion === "ejecutar" && !fuenteEditar)}>
            {busy ? "…" : accion === "ejecutar" ? "Confirmar ejecución" : accion === "posponer" ? "Posponer" : "Confirmar no aplica"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── M5 Modal H2 (ejecutados) ─────────────────────────────────────────────────

type M5ScenarioH2 = "monto" | "ejecutor" | "fuente" | "semana";

const SCN_H2_LABEL: Record<M5ScenarioH2, { eye: string; title: string; note: string }> = {
  monto:    { eye: "Error de monto",            title: "Corregir el monto",         note: "Ajusta el valor ejecutado; el original queda como referencia." },
  ejecutor: { eye: "Ejecutor incorrecto",       title: "¿Quién ejecutó el gasto?",  note: "Cambia la persona que pagó." },
  fuente:   { eye: "Fuente de pago incorrecta", title: "Cambiar la fuente de pago", note: "Selecciona de dónde salió realmente el dinero." },
  semana:   { eye: "Semana incorrecta",         title: "Mover de semana",           note: "Reasigna el movimiento a la semana correcta del mes." },
};

function fuenteLabelMov(m: Movimiento): string {
  if (m.fuenteCamilo) return "NU Camilo";
  if (m.fuenteAngie)  return "NU Angie";
  if (m.fuenteNequi)  return "ARQ";
  if (m.fuenteEnMano) return "En mano";
  return "—";
}

function OriginalRecordH2({ mov }: { mov: Movimiento }) {
  const fuente = fuenteLabelMov(mov);
  return (
    <div className="dk-orig">
      <p className="dk-orig-lbl"><Icon name="receipt" size={12} /> Registro original</p>
      <div className="dk-orig-main">
        <span className="dk-orig-ic"><Icon name={CAT_ICON[mov.categoriaSnapshot] ?? "wallet"} size={16} /></span>
        <div className="dk-orig-tx">
          <p className="t">{mov.nombreSnapshot}</p>
          <p className="d">{mov.fechaEjecucion ?? "—"}</p>
        </div>
        <span className="dk-orig-amt">{COP(mov.montoEjecutado ?? mov.montoPresupuestado)}</span>
      </div>
      <div className="dk-orig-tags">
        <span className="dk-otag">{mov.categoriaSnapshot}</span>
        <span className="dk-otag">Semana {mov.semana ?? "—"}</span>
        <span className="dk-otag">{fuente}</span>
        <span className="dk-otag">
          <span className={`fl-person ${mov.ejecutor === "camilo" ? "c" : "a"}`} style={{ width: 14, height: 14, fontSize: 8 }}>
            {mov.ejecutor === "camilo" ? "C" : "A"}
          </span>
          {mov.ejecutor === "camilo" ? "Camilo" : "Angie"}
        </span>
      </div>
    </div>
  );
}

function ModalCorreccionH2({
  movimiento,
  mes,
  onClose,
  onSaved,
  onRevertido,
}: {
  movimiento: Movimiento;
  mes: string;
  onClose: () => void;
  onSaved: (updated: Movimiento) => void;
  onRevertido: (updated: Movimiento) => void;
}) {
  const [scenario, setScenario] = useState<M5ScenarioH2>("monto");
  const [monto, setMonto] = useState(movimiento.montoEjecutado ?? movimiento.montoPresupuestado);
  const [ejecutor, setEjecutor] = useState<Actor>(movimiento.ejecutor ?? "camilo");
  const [fuentes, setFuentes] = useState({
    fuenteCamilo: movimiento.fuenteCamilo,
    fuenteAngie:  movimiento.fuenteAngie,
    fuenteNequi:  movimiento.fuenteNequi,
    fuenteEnMano: movimiento.fuenteEnMano,
  });
  const [semana, setSemana] = useState<Semana>(movimiento.semana ?? "S1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scn = SCN_H2_LABEL[scenario];
  const semanas: Semana[] = ["S1", "S2", "S3", "S4"];

  async function guardar() {
    setBusy(true);
    setError(null);
    let body: Record<string, unknown>;
    if (scenario === "semana") {
      body = { tipo: "reasignar_semana", semana };
    } else {
      body = {
        tipo: "ejecutar",
        montoEjecutado: scenario === "monto"    ? monto    : (movimiento.montoEjecutado ?? movimiento.montoPresupuestado),
        ejecutor:       scenario === "ejecutor" ? ejecutor : (movimiento.ejecutor ?? "camilo"),
        fuenteEnMano:   scenario === "fuente"   ? fuentes.fuenteEnMano : movimiento.fuenteEnMano,
        fuenteNequi:    scenario === "fuente"   ? fuentes.fuenteNequi  : movimiento.fuenteNequi,
        fuenteCamilo:   scenario === "fuente"   ? fuentes.fuenteCamilo : movimiento.fuenteCamilo,
        fuenteAngie:    scenario === "fuente"   ? fuentes.fuenteAngie  : movimiento.fuenteAngie,
      };
    }
    try {
      const res = await fetch(`/api/mes/${mes}/movimientos/${movimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaved(data as Movimiento);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  async function revertirH2() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/movimientos/${movimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "revertir_ejecucion" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error al revertir");
      onRevertido(data as Movimiento);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  function toggleFuenteH2(key: M5FuenteKey) {
    setFuentes(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal" onClick={e => e.stopPropagation()}>
        <header className="dk-modal-head">
          <div className="lhs">
            <p className="eyebrow"><Icon name="pencil" size={11} /> {scn.eye}</p>
            <h3>{scn.title}</h3>
          </div>
          <button type="button" className="dk-modal-x" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </header>

        <div className="dk-modal-body">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["monto", "ejecutor", "fuente", "semana"] as M5ScenarioH2[]).map(s => (
              <button key={s} type="button"
                className={`fl-btn ghost sm${scenario === s ? " primary" : ""}`}
                style={{
                  fontSize: 10.5, padding: "4px 10px",
                  background: scenario === s ? "var(--primary-soft)" : "var(--surface-2)",
                  color:      scenario === s ? "var(--primary)"      : "var(--ink-soft)",
                  border:     scenario === s ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
                }}
                onClick={() => setScenario(s)}
              >
                {SCN_H2_LABEL[s].eye}
              </button>
            ))}
          </div>

          <OriginalRecordH2 mov={movimiento} />

          <div className="dk-corr">
            {scenario === "monto" && (
              <>
                <p className="dk-exp-lbl">Monto ejecutado corregido</p>
                <div className="dk-amtrow">
                  <input className="dk-amt-in" type="number" value={monto}
                    onChange={e => setMonto(Number(e.target.value) || 0)}
                    style={{ width: "100%", textAlign: "right", fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                  />
                </div>
                {monto !== (movimiento.montoEjecutado ?? movimiento.montoPresupuestado) && (
                  <div className="dk-diff">
                    <span className="was">{COP(movimiento.montoEjecutado ?? movimiento.montoPresupuestado)}</span>
                    <span className="arr"><Icon name="arrow" size={13} /></span>
                    <span className="now">{COP(monto)}</span>
                  </div>
                )}
              </>
            )}

            {scenario === "ejecutor" && (
              <>
                <p className="dk-exp-lbl">Ejecutó</p>
                <div className="dk-seg2">
                  {(["camilo", "angie"] as Actor[]).map(a => (
                    <button key={a} type="button" className={ejecutor === a ? "on" : ""} onClick={() => setEjecutor(a)}>
                      <span className={`fl-person ${a === "camilo" ? "c" : "a"}`} style={{ width: 18, height: 18, fontSize: 9 }}>
                        {a === "camilo" ? "C" : "A"}
                      </span>
                      {a === "camilo" ? "Camilo" : "Angie"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {scenario === "fuente" && (
              <>
                <p className="dk-exp-lbl">Fuente de pago</p>
                <div className="dk-srcs">
                  {FUENTES_M5.map(({ key, label, persona }) => (
                    <button key={key} type="button"
                      className={`dk-src${fuentes[key] ? " on" : ""}`}
                      onClick={() => toggleFuenteH2(key)}>
                      {persona
                        ? <span className={`fl-person ${persona}`} style={{ width: 22, height: 22, fontSize: 10 }}>{persona === "c" ? "C" : "A"}</span>
                        : <span className="dk-src-ic"><Icon name="wallet" size={13} /></span>}
                      <span className="nm">{label}</span>
                      <span className="dk-rb"><Icon name="check" size={11} /></span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {scenario === "semana" && (
              <>
                <p className="dk-exp-lbl">Semana del movimiento</p>
                <div className="dk-seg2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {semanas.map(s => (
                    <button key={s} type="button" className={semana === s ? "on" : ""} onClick={() => setSemana(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="dk-corr-note"><Icon name="info" size={13} /> {scn.note}</p>
          </div>

          {error && (
            <div style={{ background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        <footer className="dk-modal-foot">
          <button type="button" className="fl-btn ghost sm" onClick={revertirH2} disabled={busy}
            style={{ color: "var(--neg)", borderColor: "var(--neg)", marginRight: "auto" }}>
            <Icon name="x" size={15} /> Revertir
          </button>
          <button type="button" className="fl-btn ghost sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="fl-btn primary sm" onClick={guardar} disabled={busy}>
            <Icon name="check" size={15} /> {busy ? "…" : "Guardar corrección"}
          </button>
        </footer>
      </div>
    </div>
  );
}

const CAT_ICON: Record<string, string> = {
  "Casa": "home",
  "Servicios Públicos": "bolt",
  "Membresías y Suscripciones": "film",
  "Membresías": "film",
  "Educación": "book",
  "Salud": "heart",
  "Mercado y Alimentación": "cart",
  "Compromisos Financieros": "wallet",
  "Recreación": "film",
  "Transporte": "car",
  "Metas Familiares": "trophy",
  "Frida": "paw",
};

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [year, m] = mes.split("-");
  return `${MESES_FULL[Number(m)]} ${year}`;
}

const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

export default function VistaSemanal({
  mes,
  mesLabel,
  semanaActiva,
  movimientosInit,
  cierreSemana,
  semanasCerradas = [],
  consumosInit = [],
  ingresosAngie = [],
  actor = "camilo",
  disponibleNuAngie = 0,
}: {
  mes: string;
  mesLabel: string;
  semanaActiva: Semana;
  movimientosInit: Movimiento[];
  cierreSemana: CierreSemana | null;
  semanasCerradas?: Semana[];
  consumosInit?: ConsumoH3[];
  ingresosAngie?: IngresoAngie[];
  actor?: Actor;
  disponibleNuAngie?: number;
}) {
  const router = useRouter();
  const [semanaVisible, setSemanaVisible] = useState<Semana>(semanaActiva);
  const [semanaActivaMes, setSemanaActivaMes] = useState<Semana>(semanaActiva);
  const [cierreSemanaState, setCierreSemanaState] = useState<CierreSemana | null>(cierreSemana);
  const [navegando, setNavegando] = useState(false);
  const [cerrandoSemana, setCerrandoSemana] = useState(false);
  const [cierreError, setCierreError] = useState<string | null>(null);
  const [modoSemana, setModoSemana] = useState<ModoSemana>("activa");
  const [mostrarGate, setMostrarGate] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosInit);
  const [consumos, setConsumos] = useState<ConsumoH3[]>(consumosInit);
  const [panel, setPanel] = useState<ActivePanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "ejecutados">("pendientes");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [corrigiendoConsumo, setCorrigiendoConsumo] = useState<ConsumoH3 | null>(null);
  const [corrigiendoMovimiento, setCorrigiendoMovimiento] = useState<Movimiento | null>(null);
  const [ingresosAngieLocal, setIngresosAngieLocal] = useState<IngresoAngie[]>(ingresosAngie);
  const [showPresupuestadoPopover, setShowPresupuestadoPopover] = useState(false);
  const [presupuestadoAnchor, setPresupuestadoAnchor] = useState<DOMRect | null>(null);
  const [desgloseModal, setDesgloseModal] = useState<Movimiento | null>(null);
  const [posponiendo, setPosponiendo] = useState<Movimiento | null>(null);
  const presupuestadoPopoverRef = useRef<HTMLDivElement>(null);
  const [h3bPopover, setH3bPopover] = useState<{ anchor: DOMRect; bolsilloId: string } | null>(null);
  const h3bPopoverRef = useRef<HTMLDivElement>(null);

  const idxVisible = SEMANAS.indexOf(semanaVisible);
  const puedeIzq = idxVisible > 0;
  const puedeDer = idxVisible < SEMANAS.length - 1;

  const bolsillos = movimientos.filter((m) => m.tipoSnapshot === "pago_fraccionado");
  const conceptos  = movimientos.filter((m) => m.tipoSnapshot !== "pago_fraccionado");
  const pendientes = conceptos.filter((m) => m.estado === "pendiente");
  const ejecutados = conceptos.filter((m) => m.estado === "ejecutado");

  const movimientosPresupuestados = movimientos.filter(
    m => m.estado !== "no_aplica" && m.estado !== "pospuesto" && m.estado !== "pospuesto_mes_siguiente"
  );
  const totalPresupuestado = movimientosPresupuestados.reduce((s, m) => s + m.montoPresupuestado, 0);
  // Exclude pago_fraccionado from H2 sum — their spending is always counted via H3B consumos.
  // After cerrar-semana writes estado=ejecutado to pago_fraccionado H2, this prevents double-counting.
  const totalEjecutadoH2 = movimientos
    .filter((m) => m.estado === "ejecutado" && m.tipoSnapshot !== "pago_fraccionado")
    .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
  const totalEjecutadoH3 = consumos.reduce((s, c) => s + c.monto, 0);
  const totalEjecutado = totalEjecutadoH2 + totalEjecutadoH3;
  const pct = totalPresupuestado > 0
    ? Math.round((totalEjecutado / totalPresupuestado) * 100)
    : 0;

  const pendientesClasificar = consumos.filter(c => !c.clasificado).length;
  const aportePlaneado = ingresosAngieLocal.find(a => a.semana === semanaVisible)?.monto ?? 0;
  const gastadoSemanaAngie = consumos.filter(c => c.fuenteAngie).reduce((s, c) => s + c.monto, 0);
  const disponibleSemana = aportePlaneado - gastadoSemanaAngie;

  async function patchar(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/movimientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string } & Partial<Movimiento>;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMovimientos((prev) => prev.map((m) => m.id === id ? (data as Movimiento) : m));
      setPanel(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  async function navegar(s: Semana) {
    if (navegando) return;
    setNavegando(true);
    setPanel(null);
    setTab("pendientes");
    try {
      const [semRes, conRes] = await Promise.all([
        fetch(`/api/mes/${mes}/semana/${s}`),
        fetch(`/api/mes/${mes}/consumos/${s}`),
      ]);
      let nuevaSemanaActiva = semanaActivaMes;
      if (semRes.ok) {
        const data = await semRes.json() as { movimientos: Movimiento[]; cierreSemana: CierreSemana | null; semanaActivaMes?: Semana };
        setMovimientos(data.movimientos ?? []);
        setCierreSemanaState(data.cierreSemana ?? null);
        if (data.semanaActivaMes) {
          setSemanaActivaMes(data.semanaActivaMes);
          nuevaSemanaActiva = data.semanaActivaMes;
        }
      }
      if (conRes.ok) {
        const data = await conRes.json() as { consumos: ConsumoH3[] };
        setConsumos(data.consumos ?? []);
      }
      setSemanaVisible(s);
      if (s !== nuevaSemanaActiva) {
        setMostrarGate(true);
      } else {
        setModoSemana("activa");
        setMostrarGate(false);
      }
    } catch {
      setError("Error cargando semana");
    } finally {
      setNavegando(false);
    }
  }

  async function handleCerrarSemana() {
    if (cerrandoSemana) return;
    setCerrandoSemana(true);
    setCierreError(null);
    try {
      const res = await fetch(`/api/mes/${mes}/cerrar-semana`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana: semanaVisible }),
      });
      const data = await res.json() as { ok?: boolean; cierre?: CierreSemana; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.cierre) setCierreSemanaState(data.cierre);
    } catch (e: unknown) {
      setCierreError(e instanceof Error ? e.message : "Error al cerrar semana");
    } finally {
      setCerrandoSemana(false);
    }
  }

  function toggleOK(id: string) {
    setPanel((p) =>
      p?.tipo === "ok" && p.id === id
        ? null
        : { tipo: "ok", id, fuente: null, ejecutor: "camilo" }
    );
  }

  function toggleEditar(id: string) {
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) return;
    setPanel((p) =>
      p?.tipo === "editar" && p.id === id
        ? null
        : { tipo: "editar", id, monto: String(mov.montoPresupuestado), fuente: null, ejecutor: "camilo" }
    );
  }

  async function confirmarOK() {
    if (panel?.tipo !== "ok" || !panel.fuente) return;
    const mov = movimientos.find((m) => m.id === panel.id);
    if (!mov) return;
    await patchar(panel.id, {
      tipo: "ejecutar",
      montoEjecutado: mov.montoPresupuestado,
      fuenteEnMano:  panel.fuente === "en_mano",
      fuenteNequi:   panel.fuente === "nequi",
      fuenteCamilo:  panel.fuente === "camilo",
      fuenteAngie:   panel.fuente === "angie",
      ejecutor: panel.ejecutor,
    });
  }

  async function confirmarEditar() {
    if (panel?.tipo !== "editar" || !panel.fuente) return;
    const monto = Number(panel.monto);
    if (isNaN(monto) || monto <= 0) { setError("Monto inválido"); return; }
    await patchar(panel.id, {
      tipo: "ejecutar",
      montoEjecutado: monto,
      fuenteEnMano:  panel.fuente === "en_mano",
      fuenteNequi:   panel.fuente === "nequi",
      fuenteCamilo:  panel.fuente === "camilo",
      fuenteAngie:   panel.fuente === "angie",
      ejecutor: panel.ejecutor,
    });
  }

  async function handleSheetSuccess() {
    setSheetOpen(false);
    try {
      const [consumosRes, movRes] = await Promise.all([
        fetch(`/api/mes/${mes}/consumos/${semanaVisible}`),
        fetch(`/api/mes/${mes}/semana/${semanaVisible}`),
      ]);
      if (consumosRes.ok) {
        const data = await consumosRes.json() as { consumos: ConsumoH3[] };
        setConsumos(data.consumos ?? []);
      }
      if (movRes.ok) {
        const data = await movRes.json() as { movimientos: Movimiento[] };
        setMovimientos(data.movimientos ?? []);
      }
    } catch {}
  }

  const bolsillosDedup: Movimiento[] = (() => {
    const map = new Map<string, { rep: Movimiento; movs: Movimiento[] }>();
    for (const mov of bolsillos) {
      const entry = map.get(mov.conceptoId);
      if (!entry) map.set(mov.conceptoId, { rep: mov, movs: [mov] });
      else entry.movs.push(mov);
    }
    return Array.from(map.values()).map(({ rep, movs }) => ({
      ...rep,
      montoPresupuestado: movs.reduce((s, m) => s + m.montoPresupuestado, 0),
      estado: movs.every(m => m.estado === "ejecutado") ? "ejecutado" : rep.estado,
    } as Movimiento));
  })();
  const bolsillosPendientes = bolsillosDedup.filter(b => b.estado !== "ejecutado");
  const bolsillosEjecutados = bolsillosDedup.filter(b => b.estado === "ejecutado");
  const lista = tab === "pendientes"
    ? [...bolsillosPendientes, ...pendientes]
    : [...bolsillosEjecutados, ...ejecutados];
  const consumosPendientes = consumos.filter(c => !c.clasificado);

  // Polling: refresca consumos cada 5s mientras haya items sin clasificar
  useEffect(() => {
    if (consumosPendientes.length === 0) return;
    const timerId = setInterval(async () => {
      try {
        const res = await fetch(`/api/mes/${mes}/consumos/${semanaVisible}`);
        if (res.ok) {
          const data = await res.json() as { consumos: ConsumoH3[] };
          setConsumos(data.consumos ?? []);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(timerId);
  }, [consumosPendientes.length, mes, semanaVisible]);

  useEffect(() => {
    if (!showPresupuestadoPopover) return;
    function handleClick(e: MouseEvent) {
      if (presupuestadoPopoverRef.current && !presupuestadoPopoverRef.current.contains(e.target as Node)) {
        setShowPresupuestadoPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPresupuestadoPopover]);

  useEffect(() => {
    if (!h3bPopover) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        h3bPopoverRef.current &&
        !h3bPopoverRef.current.contains(target) &&
        !target.closest("[data-h3b-trigger]")
      ) {
        setH3bPopover(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [h3bPopover]);

  return (
    <div className="t-calido screen-anim">
      {/* App bar */}
      <div className="fl-appbar">
        <div className="fl-topnav">
          <button className="fl-back" type="button" onClick={() => router.back()}>
            <Icon name="back" size={17} />
          </button>
          <div style={{ flex: 1 }} />
          {cierreSemanaState && (
            <span className="fl-badge pos"><Icon name="check" size={12} /> Cerrada</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 2 }}>
          <button
            type="button"
            disabled={!puedeIzq || navegando}
            onClick={() => navegar(SEMANAS[idxVisible - 1])}
            style={{ background: "none", border: "none", padding: "4px 12px 4px 0", cursor: puedeIzq ? "pointer" : "default", opacity: puedeIzq ? 1 : 0.3, color: "var(--on-primary)", fontSize: 22, lineHeight: 1 }}
            aria-label="Semana anterior"
          >
            ←
          </button>
          <h1 style={{
            fontSize: 21, margin: 0, display: "inline-flex", alignItems: "center", gap: 6,
            opacity: semanaVisible === semanaActivaMes ? 1 : 0.72,
          }}>
            {semanaVisible}
            {semanaVisible === semanaActivaMes ? (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--on-primary)", display: "inline-block", opacity: 0.7 }} />
            ) : cierreSemanaState ? (
              <span style={{ fontSize: 15, lineHeight: 1 }}>🔒</span>
            ) : null}
          </h1>
          <button
            type="button"
            disabled={!puedeDer || navegando}
            onClick={() => navegar(SEMANAS[idxVisible + 1])}
            style={{ background: "none", border: "none", padding: "4px 0 4px 12px", cursor: puedeDer ? "pointer" : "default", opacity: puedeDer ? 1 : 0.3, color: "var(--on-primary)", fontSize: 22, lineHeight: 1 }}
            aria-label="Semana siguiente"
          >
            →
          </button>
        </div>
        <p className="sub">{mesLabel}</p>
        <div style={{ marginTop: 14 }}>
          <div className="fl-row" style={{ marginBottom: 7 }}>
            <span className="balance-label" style={{ margin: 0 }}>Ejecutado esta semana</span>
            <span className="fl-num" style={{ fontSize: 14, color: "var(--appbar-ink)", fontWeight: 700 }}>
              {pct}%
            </span>
          </div>
          <div className="fl-bar" style={{ background: "var(--appbar-hair)" }}>
            <i style={{ width: `${Math.min(pct, 100)}%`, background: "var(--on-primary)" }} />
          </div>
          <div ref={presupuestadoPopoverRef} style={{ position: "relative", marginTop: 6 }}>
            <p className="sub" style={{ fontSize: 12 }}>
              <button
                type="button"
                style={{ fontWeight: 700, textDecoration: "underline dotted", cursor: "pointer", background: "none", border: "none", color: "inherit", fontSize: "inherit", padding: 0 }}
                onClick={(e) => {
                  setPresupuestadoAnchor((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setShowPresupuestadoPopover(v => !v);
                }}
              >
                {COP(totalEjecutado)}
              </button>{" "}de{" "}
              <button
                type="button"
                style={{ fontWeight: 700, textDecoration: "underline dotted", cursor: "pointer", background: "none", border: "none", color: "inherit", fontSize: "inherit", padding: 0 }}
                onClick={(e) => {
                  setPresupuestadoAnchor((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setShowPresupuestadoPopover(v => !v);
                }}
              >
                {COP(totalPresupuestado)}
              </button>
            </p>
            {showPresupuestadoPopover && presupuestadoAnchor && (
              <div style={{
                position: "fixed", top: presupuestadoAnchor.bottom + 4, left: presupuestadoAnchor.left, zIndex: 9999,
                background: "white", color: "#111111", border: "1px solid var(--hair)", borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)", minWidth: 260, padding: "12px 0",
              }}>
                <p style={{ fontWeight: 600, fontSize: 13, padding: "0 14px 8px" }}>Conceptos presupuestados</p>
                <div style={{ maxHeight: 256, overflowY: "auto" }}>
                  {movimientosPresupuestados.map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 14px", fontSize: 13 }}>
                      <span style={{ flex: 1, marginRight: 12 }}>{m.nombreSnapshot}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{COP(m.montoPresupuestado)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 0", borderTop: "1px solid var(--hair)", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  <span>Total</span>
                  <span>{COP(totalPresupuestado)}</span>
                </div>
                {ejecutados.length > 0 && (
                  <>
                    <p style={{ fontWeight: 600, fontSize: 13, padding: "12px 14px 8px", borderTop: "1px solid var(--hair)", marginTop: 4 }}>
                      Conceptos ejecutados
                    </p>
                    <div style={{ maxHeight: 160, overflowY: "auto" }}>
                      {ejecutados.map(m => (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 14px", fontSize: 13 }}>
                          <span style={{ flex: 1, marginRight: 12 }}>{m.nombreSnapshot}</span>
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>{COP(m.montoEjecutado ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 0", borderTop: "1px solid var(--hair)", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                      <span>Total</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{COP(totalEjecutadoH2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Cierre de semana */}
        {idxVisible <= SEMANAS.indexOf(semanaActivaMes) && !cierreSemanaState && modoSemana !== "lectura" && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              disabled={cerrandoSemana}
              onClick={handleCerrarSemana}
              style={{
                width: "100%", background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.45)", color: "var(--on-primary)",
                borderRadius: 12, padding: "9px 16px", fontSize: 13, fontWeight: 700,
                cursor: cerrandoSemana ? "default" : "pointer", opacity: cerrandoSemana ? 0.6 : 1,
              }}
            >
              {cerrandoSemana ? "Cerrando…" : `Cerrar semana ${semanaVisible}`}
            </button>
            {cierreError && (
              <p style={{ fontSize: 12, color: "rgba(255,120,120,0.95)", marginTop: 6, fontWeight: 600 }}>
                {cierreError}
              </p>
            )}
          </div>
        )}
        {cierreSemanaState && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="check" size={13} style={{ color: "var(--on-primary)", opacity: 0.75 }} />
            <span style={{ fontSize: 12, color: "var(--on-primary)", opacity: 0.75, fontWeight: 600 }}>
              Semana {semanaVisible} cerrada · {cierreSemanaState.fechaCierre}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="fl-body">

        {/* Error */}
        {error && (
          <div style={{
            background: "var(--neg-soft)", color: "var(--neg)", borderRadius: 14,
            padding: "12px 16px", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <Icon name="x" size={16} style={{ color: "var(--neg)" }} />
            </button>
          </div>
        )}

        {/* Header M4 Angie — solo actor=angie */}
        {actor === "angie" && (
          <div style={{ background: "var(--surface-2)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Saldo NU Angie</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: disponibleNuAngie < 0 ? "var(--neg)" : "var(--ink)" }}>
                {copCompact(disponibleNuAngie)}
              </span>
            </div>
            {pendientesClasificar > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neg)" }}>Sin clasificar</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--neg)" }}>{pendientesClasificar}</span>
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Aporte planeado {semanaVisible}</span>
                <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{copCompact(aportePlaneado)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Gastado esta semana</span>
                <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{copCompact(gastadoSemanaAngie)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--line)", paddingTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Disponible semana</span>
                <span style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: disponibleSemana < 0 ? "var(--neg)" : "var(--pos)" }}>
                  {copCompact(disponibleSemana)}
                </span>
              </div>
            </div>
          </div>
        )}


        {/* Tabs */}
        <div className="fl-tabs">
          {(["pendientes", "ejecutados"] as const).map((t) => {
            const count = t === "pendientes"
              ? bolsillosPendientes.length + pendientes.length
              : bolsillosEjecutados.length + ejecutados.length + consumosPendientes.length;
            return (
              <button
                key={t}
                type="button"
                className={`fl-tab${tab === t ? " on" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "pendientes" ? "Pendientes" : "Ejecutados"}
                {count > 0 && <span className="cnt">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {lista.length === 0 ? (
          <div className="fl-emptystate">
            <div className="ic"><Icon name="check" size={26} /></div>
            <p className="t">{tab === "pendientes" ? "¡Semana al día!" : "Sin ejecutados aún"}</p>
            <p className="d">
              {tab === "pendientes"
                ? "No quedan conceptos pendientes esta semana."
                : "Confirma los pagos con el botón OK."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lista.map((mov) => {
              if (mov.tipoSnapshot === "pago_fraccionado") {
                const consumosBolsillo = consumos.filter(c => c.bolsilloId === mov.conceptoId);
                const gastado = consumosBolsillo.reduce((sum, c) => sum + c.monto, 0);
                const techo = mov.montoPresupuestado;
                const pctB = techo > 0 ? Math.round((gastado / techo) * 100) : 0;
                const over = gastado > techo;
                const ejecutado = mov.estado === "ejecutado";
                return (
                  <div
                    key={mov.id}
                    className="fl-concepto"
                    style={ejecutado ? { cursor: "pointer" } : undefined}
                    onClick={ejecutado ? () => setDesgloseModal(mov) : undefined}
                  >
                    <div className="top">
                      <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                        <Ring pct={pctB} over={over} />
                        <div style={{ minWidth: 0 }}>
                          <p className="name" onClick={(e) => e.stopPropagation()}>{mov.nombreSnapshot}</p>
                          <p
                            className="cat"
                            data-h3b-trigger
                            style={{ cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setH3bPopover({
                                anchor: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                                bolsilloId: mov.conceptoId,
                              });
                            }}
                          >
                            {COP(gastado)} / {COP(techo)}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {ejecutado ? (
                          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                            {COP(mov.montoEjecutado ?? gastado)}
                          </span>
                        ) : (
                          over
                            ? <span className="fl-badge neg" style={{ marginTop: 4 }}><span className="dot" />+{COP(gastado - techo)}</span>
                            : <span className="fl-badge warn" style={{ marginTop: 4 }}><span className="dot" />{COP(techo - gastado)} libre</span>
                        )}
                      </div>
                    </div>
                    {!ejecutado && modoSemana !== "lectura" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          className="fl-btn ghost sm"
                          style={{ flex: 1 }}
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            patchar(mov.id, {
                              tipo: "ejecutar",
                              montoEjecutado: gastado,
                              fuenteEnMano: false,
                              fuenteNequi: false,
                              fuenteCamilo: false,
                              fuenteAngie: false,
                              ejecutor: "camilo",
                            });
                          }}
                        >
                          Cerrar bolsillo
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              const panelActivo = panel?.id === mov.id;
              const catIcon = CAT_ICON[mov.categoriaSnapshot] ?? "wallet";
              return (
                <div className="fl-concepto" key={mov.id}>
                  <div className="top">
                    <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                      <span className="fl-chip" style={{ padding: 8, borderRadius: 12, flexShrink: 0 }}>
                        <Icon name={catIcon} size={16} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p className="name">{mov.nombreSnapshot}</p>
                        <p className="cat">{mov.categoriaSnapshot}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p className="amt">{COP(mov.montoEjecutado ?? mov.montoPresupuestado)}</p>
                      {tab === "ejecutados" && mov.ejecutor ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                          <span className={`fl-person ${mov.ejecutor === "camilo" ? "c" : "a"}`}>
                            {mov.ejecutor === "camilo" ? "C" : "A"}
                          </span>
                          <span className="fl-badge pos"><Icon name="check" size={11} /> Listo</span>
                        </span>
                      ) : tab === "pendientes" ? (
                        <span className="fl-badge warn" style={{ marginTop: 4 }}>
                          <span className="dot" />Pendiente
                        </span>
                      ) : (
                        <span className="fl-badge" style={{ marginTop: 4 }}>{mov.estado}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones para pendientes */}
                  {tab === "pendientes" && mov.estado === "pendiente" && !panelActivo && modoSemana !== "lectura" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        className="fl-btn pos sm"
                        style={{ flex: 1 }}
                        type="button"
                        onClick={() => toggleOK(mov.id)}
                      >
                        <Icon name="check" size={15} /> OK
                      </button>
                      <button
                        className="fl-btn ghost sm"
                        type="button"
                        onClick={() => setPosponiendo(mov)}
                        title="Posponer / No aplica"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                    </div>
                  )}

                  {/* Acción corregir para ejecutados */}
                  {tab === "ejecutados" && modoSemana !== "lectura" && (
                    <div style={{ display: "flex", marginTop: 10 }}>
                      <button
                        type="button"
                        className="dk-rec-fix"
                        onClick={() => setCorrigiendoMovimiento(mov)}
                      >
                        <Icon name="pencil" size={13} /> Corregir
                      </button>
                    </div>
                  )}

                  {/* Panel OK */}
                  {panel?.tipo === "ok" && panel.id === mov.id && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: "1px solid var(--line)",
                      display: "flex", flexDirection: "column", gap: 12,
                    }}>
                      <div>
                        <p className="fl-faint" style={{ marginBottom: 7, fontWeight: 600 }}>¿De dónde salió?</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                          {FUENTES.map((f) => (
                            <button
                              key={f.value}
                              type="button"
                              className="fl-chip"
                              style={{
                                justifyContent: "center", cursor: "pointer",
                                background: panel.fuente === f.value ? "var(--primary)" : "var(--surface-2)",
                                color: panel.fuente === f.value ? "var(--on-primary)" : "var(--ink-soft)",
                                borderColor: panel.fuente === f.value ? "transparent" : "transparent",
                              }}
                              onClick={() => setPanel({ ...panel, fuente: f.value })}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="fl-faint" style={{ marginBottom: 7, fontWeight: 600 }}>¿Quién pagó?</p>
                        <div className="fl-tabs">
                          {(["camilo", "angie"] as Actor[]).map((a) => (
                            <button
                              key={a}
                              type="button"
                              className={`fl-tab${panel.ejecutor === a ? " on" : ""}`}
                              onClick={() => setPanel({ ...panel, ejecutor: a })}
                            >
                              <span className={`fl-person ${a === "camilo" ? "c" : "a"}`}>
                                {a === "camilo" ? "C" : "A"}
                              </span>
                              {a === "camilo" ? "Camilo" : "Angie"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="fl-btn ghost sm" type="button" onClick={() => setPanel(null)}>
                          Cancelar
                        </button>
                        <button
                          className="fl-btn pos sm block"
                          type="button"
                          disabled={!panel.fuente || busy}
                          style={{ flex: 1, opacity: panel.fuente ? 1 : 0.5 }}
                          onClick={confirmarOK}
                        >
                          {busy ? "…" : `Confirmar ${COP(mov.montoPresupuestado)}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Panel Editar */}
                  {panel?.tipo === "editar" && panel.id === mov.id && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: "1px solid var(--line)",
                      display: "flex", flexDirection: "column", gap: 12,
                    }}>
                      <div className="fl-field">
                        <label>Monto ejecutado</label>
                        <input
                          type="number"
                          value={panel.monto}
                          onChange={(e) => setPanel({ ...panel, monto: e.target.value })}
                          className="fl-input"
                          style={{ fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <p className="fl-faint" style={{ marginBottom: 7, fontWeight: 600 }}>¿De dónde salió?</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                          {FUENTES.map((f) => (
                            <button
                              key={f.value}
                              type="button"
                              className="fl-chip"
                              style={{
                                justifyContent: "center", cursor: "pointer",
                                background: panel.fuente === f.value ? "var(--primary)" : "var(--surface-2)",
                                color: panel.fuente === f.value ? "var(--on-primary)" : "var(--ink-soft)",
                              }}
                              onClick={() => setPanel({ ...panel, fuente: f.value })}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="fl-btn ghost sm" type="button" onClick={() => setPanel(null)}>
                          Cancelar
                        </button>
                        <button
                          className="fl-btn primary sm"
                          type="button"
                          disabled={!panel.fuente || busy || !Number(panel.monto)}
                          style={{ flex: 1 }}
                          onClick={confirmarEditar}
                        >
                          {busy ? "…" : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Registros rápidos H3B */}
        {tab === "ejecutados" && consumos.length > 0 && (
          <>
            <p className="fl-sectlabel">
              Registros rápidos{consumosPendientes.length > 0 ? ` · ${consumosPendientes.length} clasificando…` : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {consumos.map(c => {
                const fuente = fuenteLabel(c);
                return (
                  <div key={c.id} className="dk-rec">
                    <span className="dk-rec-ic">
                      <Icon name={c.clasificado ? "wallet" : "alert"} size={17} />
                    </span>
                    <div className="dk-rec-tx">
                      <p className="t">
                        {c.descripcion || "Sin descripción"}
                        {c.imprevisto && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "var(--warn-soft, #fff3e0)", color: "var(--warn, #b05e00)", verticalAlign: "middle" }}>
                            Imprevisto
                          </span>
                        )}
                      </p>
                      <p className="d">
                        {c.clasificado ? c.bolsilloId : "Clasificando…"} · {c.semana} · {fuente}
                      </p>
                    </div>
                    <span className="dk-rec-who">
                      <span className={`fl-person ${c.ejecutor === "camilo" ? "c" : "a"}`} style={{ width: 22, height: 22, fontSize: 10 }}>
                        {c.ejecutor === "camilo" ? "C" : "A"}
                      </span>
                    </span>
                    <span className="dk-rec-amt">{copCompact(c.monto)}</span>
                    {modoSemana !== "lectura" && (
                      <button
                        type="button"
                        className="dk-rec-fix"
                        onClick={() => setCorrigiendoConsumo(c)}
                      >
                        <Icon name="pencil" size={13} /> Corregir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* Bottom nav */}
      <BottomNav
        onFabClick={() => setSheetOpen(true)}
        semanaHref={`/mes/${mes}/semana`}
        active="semana"
        hideFab={modoSemana === "lectura"}
      />

      {/* Registro sheet */}
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
              <RegistroRapido onClose={handleSheetSuccess} onSuccess={handleSheetSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Gate modal — semana no activa */}
      {mostrarGate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 600, padding: "0 16px 32px",
        }}>
          <div style={{
            background: "var(--surface)", borderRadius: 20,
            padding: "24px 20px 20px", width: "100%", maxWidth: 480,
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 4 }}>
              Semana {semanaVisible}
            </p>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "var(--ink)" }}>
              {cierreSemanaState
                ? "Cerrada"
                : SEMANAS.indexOf(semanaVisible) > SEMANAS.indexOf(semanaActivaMes)
                  ? "Aún no iniciada"
                  : "Semana pasada"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20 }}>¿Qué querés hacer?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="fl-btn ghost sm"
                style={{ flex: 1 }}
                onClick={() => { setModoSemana("lectura"); setMostrarGate(false); }}
              >
                Solo leer
              </button>
              <button
                type="button"
                className="fl-btn primary sm"
                style={{ flex: 1 }}
                onClick={() => { setModoSemana("edicion"); setMostrarGate(false); }}
              >
                {SEMANAS.indexOf(semanaVisible) > SEMANAS.indexOf(semanaActivaMes)
                  ? "Planear semana"
                  : "Editar semana"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* T27 · Modal M5 — corrección de registro H3 */}
      {corrigiendoConsumo && (
        <ModalCorreccion
          consumo={corrigiendoConsumo}
          bolsillos={bolsillosDedup}
          consumos={consumos}
          onClose={() => setCorrigiendoConsumo(null)}
          onSaved={updated => {
            setConsumos(prev => prev.map(c => c.id === updated.id ? updated : c));
          }}
          onRevertido={id => {
            setConsumos(prev => prev.filter(c => c.id !== id));
          }}
        />
      )}

      {/* OBS-4 · Modal Posponer / No aplica */}
      {posponiendo && (
        <ModalAccionesPendiente
          movimiento={posponiendo}
          mes={mes}
          semanasCerradas={semanasCerradas}
          onClose={() => setPosponiendo(null)}
          onUpdated={updated => {
            setMovimientos(prev => prev.map(m => m.id === updated.id ? updated : m));
            setPosponiendo(null);
          }}
        />
      )}

      {/* T28 · Modal M5 — corrección de ejecutado H2 */}
      {corrigiendoMovimiento && (
        <ModalCorreccionH2
          movimiento={corrigiendoMovimiento}
          mes={mes}
          onClose={() => setCorrigiendoMovimiento(null)}
          onSaved={updated => {
            setMovimientos(prev => prev.map(m => m.id === updated.id ? updated : m));
          }}
          onRevertido={updated => {
            setMovimientos(prev => prev.map(m => m.id === updated.id ? updated : m));
          }}
        />
      )}

      {/* BL-QA-04 · Modal desglose H3B bolsillo ejecutado */}
      {desgloseModal !== null && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 800 }}
          onClick={() => setDesgloseModal(null)}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 480, maxHeight: "70vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "var(--ink)" }}>{desgloseModal.nombreSnapshot}</p>
              <button type="button" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-soft)" }} onClick={() => setDesgloseModal(null)}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId).length === 0
                ? <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin consumos registrados</p>
                : consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId).map(c => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--hair)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{c.descripcion || "Sin descripción"}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{COP(c.monto)}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{c.fecha}</p>
                    </div>
                  ))
              }
            </div>
            {consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId).length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--hair)", fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--ink)" }}>
                <span>Total</span>
                <span>{COP(consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId).reduce((s, c) => s + c.monto, 0))}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {h3bPopover && (() => {
        const items = consumos.filter(c => c.bolsilloId === h3bPopover.bolsilloId);
        const total = items.reduce((s, c) => s + c.monto, 0);
        return (
          <div
            ref={h3bPopoverRef}
            style={{
              position: "fixed",
              top: h3bPopover.anchor.bottom + 4,
              left: h3bPopover.anchor.left,
              zIndex: 9999,
              background: "white",
              color: "#111111",
              border: "1px solid var(--hair)",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              minWidth: 260,
              padding: "12px 0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px 8px" }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Consumos H3B</p>
              <button
                type="button"
                onClick={() => setH3bPopover(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, color: "#111" }}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: 256, overflowY: "auto" }}>
              {items.length === 0 ? (
                <p style={{ padding: "5px 14px", fontSize: 13, color: "var(--muted)" }}>
                  Sin registros esta semana.
                </p>
              ) : (
                items.map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 14px", fontSize: 13 }}>
                    <span style={{ flex: 1, marginRight: 12 }}>{c.descripcion}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{COP(c.monto)}</span>
                  </div>
                ))
              )}
            </div>
            {items.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 0", borderTop: "1px solid var(--hair)", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{COP(total)}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
