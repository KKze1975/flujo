"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Ring from "@/components/ui/Ring";
import BottomNav from "@/components/ui/BottomNav";
import RegistroRapido from "@/components/m4/RegistroRapido";
import ModalRegistroIngresoAngie from "@/components/m1/ModalRegistroIngresoAngie";
import type { Movimiento, CierreSemana, Semana, Actor, ConsumoH3, IngresoAngie } from "@/lib/data/types";

type Fuente = "en_mano" | "nequi" | "camilo" | "angie";

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
const BOLSILLOS_ACTIVOS = [
  { id: "frida",           nombre: "Frida",           icon: "paw"    },
  { id: "entretenimiento", nombre: "Entretenimiento",  icon: "film"   },
  { id: "mercado_semanal", nombre: "Mercado semanal",  icon: "bag"    },
  { id: "mercado_mensual", nombre: "Mercado mensual",  icon: "bag"    },
  { id: "fondo_transporte",nombre: "Fondo transporte", icon: "car"    },
  { id: "angie",           nombre: "Angie",            icon: "wallet" },
];

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

type M5Scenario = "monto" | "ejecutor" | "fuente" | "clasif" | "semana";

const SCN_LABEL: Record<M5Scenario, { eye: string; title: string; note: string }> = {
  monto:    { eye: "Error de monto",           title: "Corregir el monto",         note: "Ajusta el valor; el registro original queda como referencia." },
  ejecutor: { eye: "Ejecutor incorrecto",      title: "¿Quién ejecutó el gasto?",  note: "Cambia la persona que pagó." },
  fuente:   { eye: "Fuente de pago incorrecta",title: "Cambiar la fuente de pago", note: "Selecciona de dónde salió realmente el dinero." },
  clasif:   { eye: "Gasto sin clasificar · H3",title: "Clasificar el gasto",       note: "Asígnalo a un bolsillo activo para registrar correctamente el consumo." },
  semana:   { eye: "Semana incorrecta",        title: "Mover de semana",           note: "Reasigna el registro a la semana correcta del mes." },
};

function ModalCorreccion({
  consumo,
  bolsillos,
  onClose,
  onSaved,
}: {
  consumo: ConsumoH3;
  bolsillos: Movimiento[];
  onClose: () => void;
  onSaved: (updated: ConsumoH3) => void;
}) {
  const defaultScenario: M5Scenario = !consumo.clasificado ? "clasif" : "monto";
  const [scenario, setScenario] = useState<M5Scenario>(defaultScenario);
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

  const scn = SCN_LABEL[scenario];

  async function guardar() {
    setBusy(true);
    setError(null);
    let patch: Record<string, unknown> = {};
    if (scenario === "monto")    patch = { monto };
    if (scenario === "ejecutor") patch = { ejecutor };
    if (scenario === "fuente")   patch = { ...fuentes };
    if (scenario === "clasif") {
      const selectedId = bolsilloId ?? consumo.bolsilloId;
      const matchNombre = BOLSILLOS_ACTIVOS.find((a) => a.id === selectedId)?.nombre.toLowerCase();
      const h2 = bolsillos.find((m) => m.nombreSnapshot.toLowerCase() === matchNombre);
      const gastado = h2?.montoEjecutado ?? 0;
      const techo = h2?.montoPresupuestado ?? 0;
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

  function toggleFuente(key: M5FuenteKey) {
    setFuentes(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const semanas: Semana[] = ["S1", "S2", "S3", "S4"];

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal" onClick={e => e.stopPropagation()}>
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
            {(["monto", "ejecutor", "fuente", "clasif", "semana"] as M5Scenario[]).map(s => (
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

          {/* Original record */}
          <OriginalRecord consumo={consumo} flagClasif={scenario === "clasif"} />

          {/* Correction control */}
          <div className="dk-corr">
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
                  {BOLSILLOS_ACTIVOS.map(b => {
                    const h2 = bolsillos.find((m) => m.nombreSnapshot.toLowerCase() === b.nombre.toLowerCase());
                    const gastado = h2?.montoEjecutado ?? 0;
                    const techo = h2?.montoPresupuestado ?? 0;
                    const over = techo > 0 && gastado >= techo;
                    return (
                      <button key={b.id} type="button"
                        className={`dk-h2${bolsilloId === b.id ? " on" : ""}`}
                        onClick={() => setBolsilloId(b.id)}>
                        <span className="dk-h2-ic"><Icon name={b.icon} size={13} /></span>
                        <span className="nm">{b.nombre}</span>
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
          <button type="button" className="fl-btn ghost sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="fl-btn primary sm" onClick={guardar} disabled={busy}>
            <Icon name="check" size={15} /> {busy ? "…" : "Guardar corrección"}
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
}: {
  movimiento: Movimiento;
  mes: string;
  onClose: () => void;
  onSaved: (updated: Movimiento) => void;
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

export default function VistaSemanal({
  mes,
  mesLabel,
  semanaActiva,
  movimientosInit,
  cierreSemana,
  consumosInit = [],
  ingresosAngie = [],
}: {
  mes: string;
  mesLabel: string;
  semanaActiva: Semana;
  movimientosInit: Movimiento[];
  cierreSemana: CierreSemana | null;
  consumosInit?: ConsumoH3[];
  ingresosAngie?: IngresoAngie[];
}) {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosInit);
  const [consumos, setConsumos] = useState<ConsumoH3[]>(consumosInit);
  const [panel, setPanel] = useState<ActivePanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "ejecutados">("pendientes");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [corrigiendoConsumo, setCorrigiendoConsumo] = useState<ConsumoH3 | null>(null);
  const [corrigiendoMovimiento, setCorrigiendoMovimiento] = useState<Movimiento | null>(null);
  const [showAporteAngie, setShowAporteAngie] = useState(false);
  const [ingresosAngieLocal, setIngresosAngieLocal] = useState<IngresoAngie[]>(ingresosAngie);

  const bolsillos = movimientos.filter((m) => m.tipoSnapshot === "bolsillo");
  const conceptos  = movimientos.filter((m) => m.tipoSnapshot !== "bolsillo");
  const pendientes = conceptos.filter((m) => m.estado === "pendiente");
  const ejecutados = conceptos.filter((m) => m.estado !== "pendiente");

  const totalPresupuestado = movimientos.reduce((s, m) => s + m.montoPresupuestado, 0);
  const totalEjecutado = movimientos
    .filter((m) => m.estado === "ejecutado")
    .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
  const pct = totalPresupuestado > 0
    ? Math.round((totalEjecutado / totalPresupuestado) * 100)
    : 0;

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
      const res = await fetch(`/api/mes/${mes}/consumos/${semanaActiva}`);
      if (res.ok) {
        const data = await res.json() as { consumos: ConsumoH3[] };
        setConsumos(data.consumos ?? []);
      }
    } catch {}
  }

  const lista = tab === "pendientes" ? pendientes : ejecutados;

  return (
    <div className="t-calido screen-anim">
      {/* App bar */}
      <div className="fl-appbar">
        <div className="fl-topnav">
          <button className="fl-back" type="button" onClick={() => router.back()}>
            <Icon name="back" size={17} />
          </button>
          <div style={{ flex: 1 }} />
          {cierreSemana && (
            <span className="fl-badge pos"><Icon name="check" size={12} /> Cerrada</span>
          )}
        </div>
        <h1 style={{ fontSize: 21 }}>Semana {semanaActiva}</h1>
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
          <p className="sub" style={{ marginTop: 6, fontSize: 12 }}>
            {COP(totalEjecutado)} de {COP(totalPresupuestado)}
          </p>
        </div>
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

        {/* Bolsillos */}
        {bolsillos.length > 0 && (
          <>
            <p className="fl-sectlabel">Bolsillos · techo semanal</p>
            <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {bolsillos.map((b, i) => {
                const gastado = b.montoEjecutado ?? 0;
                const techo   = b.montoPresupuestado;
                const pctB    = techo > 0 ? Math.round((gastado / techo) * 100) : 0;
                const over    = gastado > techo;
                return (
                  <div key={b.id} style={{
                    paddingTop: i ? 14 : 4, paddingBottom: 4,
                    borderTop: i ? "1px solid var(--line)" : "none",
                  }}>
                    <div className="fl-bolsillo">
                      <Ring pct={pctB} over={over} />
                      <div className="meta">
                        <p className="n">{b.nombreSnapshot}</p>
                        <p className="amt">
                          {COP(gastado)} <span style={{ color: "var(--ink-faint)" }}>/ {COP(techo)}</span>
                        </p>
                      </div>
                      {over
                        ? <span className="fl-badge neg"><span className="dot" />+{COP(gastado - techo)}</span>
                        : <span className="fl-badge pos">{COP(techo - gastado)} libre</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="fl-tabs">
          {(["pendientes", "ejecutados"] as const).map((t) => {
            const count = t === "pendientes" ? pendientes.length : ejecutados.length;
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
                  {tab === "pendientes" && mov.estado === "pendiente" && !panelActivo && (
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
                        onClick={() => toggleEditar(mov.id)}
                        title="Editar monto"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                    </div>
                  )}

                  {/* Acción corregir para ejecutados */}
                  {tab === "ejecutados" && (
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

        {/* T27 · Historial M4 — registros rápidos */}
        {consumos.length > 0 && (
          <>
            <p className="fl-sectlabel">Historial M4 · Registros rápidos</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {consumos.map(c => {
                const fuente = fuenteLabel(c);
                return (
                  <div key={c.id} className="dk-rec">
                    <span className="dk-rec-ic">
                      <Icon name={c.clasificado ? "wallet" : "alert"} size={17} />
                    </span>
                    <div className="dk-rec-tx">
                      <p className="t">{c.descripcion || "Sin descripción"}</p>
                      <p className="d">
                        {c.clasificado ? c.bolsilloId : "Sin clasificar"} · {c.semana} · {fuente}
                      </p>
                    </div>
                    <span className="dk-rec-who">
                      <span className={`fl-person ${c.ejecutor === "camilo" ? "c" : "a"}`} style={{ width: 22, height: 22, fontSize: 10 }}>
                        {c.ejecutor === "camilo" ? "C" : "A"}
                      </span>
                    </span>
                    <span className="dk-rec-amt">{copCompact(c.monto)}</span>
                    <button
                      type="button"
                      className="dk-rec-fix"
                      onClick={() => setCorrigiendoConsumo(c)}
                    >
                      <Icon name="pencil" size={13} /> Corregir
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* FAB aporte Angie — T37 */}
      <button
        className="fl-fab"
        onClick={() => setShowAporteAngie(true)}
        aria-label="Registrar aporte Angie"
        type="button"
        style={{ position: "fixed", bottom: 88, right: 20, width: 48, height: 48, fontSize: 20 }}
      >
        <Icon name="wallet" size={22} fill />
      </button>

      {/* Bottom nav */}
      <BottomNav
        onFabClick={() => setSheetOpen(true)}
        semanaHref={`/mes/${mes}/semana`}
        active="semana"
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
              <RegistroRapido onClose={handleSheetSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* T27 · Modal M5 — corrección de registro H3 */}
      {corrigiendoConsumo && (
        <ModalCorreccion
          consumo={corrigiendoConsumo}
          bolsillos={bolsillos}
          onClose={() => setCorrigiendoConsumo(null)}
          onSaved={updated => {
            setConsumos(prev => prev.map(c => c.id === updated.id ? updated : c));
          }}
        />
      )}

      {/* T37 · Modal registro ingreso Angie */}
      {showAporteAngie && (
        <ModalRegistroIngresoAngie
          mes={mes}
          semana={semanaActiva}
          onClose={() => setShowAporteAngie(false)}
          onRegistered={() => {}}
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
        />
      )}
    </div>
  );
}
