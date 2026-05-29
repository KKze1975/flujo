"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Ring from "@/components/ui/Ring";
import BottomNav from "@/components/ui/BottomNav";
import RegistroRapido from "@/components/m4/RegistroRapido";
import type { Movimiento, CierreSemana, Semana, Actor } from "@/lib/data/types";

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
}: {
  mes: string;
  mesLabel: string;
  semanaActiva: Semana;
  movimientosInit: Movimiento[];
  cierreSemana: CierreSemana | null;
}) {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosInit);
  const [panel, setPanel] = useState<ActivePanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "ejecutados">("pendientes");
  const [sheetOpen, setSheetOpen] = useState(false);

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

      </div>

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
              <RegistroRapido onClose={() => setSheetOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
