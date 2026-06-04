/* ============================================================
   FLUJO · proto-screens-1.jsx — Onboarding, Home, Semana, Bolsillo
   ============================================================ */
const D = window.DATA;
const FUENTES = [
  { value: "en_mano", label: "En mano" },
  { value: "nequi", label: "Nequi" },
  { value: "camilo", label: "NU Camilo" },
  { value: "angie", label: "NU Angie" },
];

/* ---------------- ONBOARDING ---------------- */
function Onboarding() {
  const { replace } = useNav();
  const [step, setStep] = useState(0);
  const slides = [
    { ic: "heart", tint: "var(--primary)", h: "Su presupuesto,\nde los dos",
      p: "Flujo reemplaza la hoja de cálculo. Camilo y Angie ven lo mismo, deciden juntos y cada quien tiene su color." },
    { ic: "sparkle", tint: "var(--accent)", h: "Registra hablando\nnormal",
      p: "“Almuerzo 38 mil con Nequi”. Claude entiende, propone categoría y bolsillo, y tú solo confirmas." },
    { ic: "calendar", tint: "var(--pos)", h: "El domingo,\ncierran la semana",
      p: "Revisan lo planeado contra lo ejecutado, arrastran lo que sobró y proyectan la semana que viene." },
  ];
  const s = slides[step];
  const last = step === slides.length - 1;
  return (
    <div className="ob t-calido">
      <div className="ob-art" style={{ background: `radial-gradient(120% 100% at 50% 10%, color-mix(in oklch, ${s.tint} 22%, var(--bg)) 0%, var(--bg) 70%)` }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div style={{ width: 132, height: 132, borderRadius: 40, background: s.tint, color: "var(--on-primary)",
                        display: "grid", placeItems: "center", boxShadow: "var(--shadow-pop)", transform: "rotate(-6deg)" }}>
            <Icon name={s.ic} size={56} fill={s.ic === "sparkle" || s.ic === "heart"} />
          </div>
          <div style={{ position: "absolute", top: -18, right: -54, display: "flex", gap: 6 }}>
            <span className="fl-person c lg">C</span><span className="fl-person a lg">A</span>
          </div>
        </div>
      </div>
      <div className="ob-foot">
        <div className="ob-dots">{slides.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}</div>
        <h2 style={{ whiteSpace: "pre-line" }}>{s.h}</h2>
        <p>{s.p}</p>
        <div style={{ display: "flex", gap: 10 }}>
          {!last && <button className="fl-btn ghost" onClick={() => replace("home")}>Saltar</button>}
          <button className="fl-btn primary block" onClick={() => last ? replace("home") : setStep(step + 1)}>
            {last ? "Entrar a Flujo" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HOME ---------------- */
function Home() {
  const { nav, openSheet } = useNav();
  return (
    <div className="t-calido">
      <AppBar eyebrow="Flujo · Salud financiera familiar" title={D.mesLabel}
              subtitle={<>Semana activa: <b>{D.semana}</b> · faltan {D.diasRestantes} días para el cierre</>}>
        <div style={{ marginTop: 18 }}>
          <p className="balance-label">Disponible esta semana</p>
          <div className="balance">{COP(D.disponibleSemana)}</div>
        </div>
      </AppBar>

      <div className="fl-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ActionCard icon="calendar" t="Esta semana" d={`${D.semana} · gastos y registro diario`} onClick={() => nav("semana")} />
          <ActionCard icon="list" t="Inicio de mes" d="Planificación · ejecución de fijos" onClick={() => nav("mes")} />
        </div>

        <p className="fl-sectlabel" style={{ marginTop: 4 }}>Mes activo · contexto</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="fl-row" style={{ marginBottom: 8 }}>
              <span className="fl-muted">Ejecutado</span>
              <span className="fl-num" style={{ fontSize: 14 }}>68% · {COP(D.ejecutado)}</span>
            </div>
            <div className="fl-bar"><i style={{ width: "68%" }} /></div>
            <p className="fl-faint" style={{ marginTop: 6 }}>de {COP(D.presupuestado)} presupuestado</p>
          </div>
          <div className="fl-divider" />
          <div className="fl-row">
            <span className="fl-muted">Semanas cerradas</span>
            <span className="fl-num" style={{ fontSize: 14, color: "var(--ink)" }}>{D.semanasCerradas} / 4</span>
          </div>
          <button className="fl-row" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }} onClick={() => nav("semana")}>
            <span className="fl-muted">Bolsillos al límite</span>
            <span className="fl-badge warn"><span className="dot" />1 · Gastos variables</span>
          </button>
        </div>

        <p className="fl-sectlabel" style={{ marginTop: 4 }}>Aporte del mes</p>
        <div className="fl-card">
          <div className="fl-row" style={{ marginBottom: 11 }}>
            <span className="fl-muted">Camilo + Angie</span>
            <span className="fl-num" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{COP(D.presupuestado)}</span>
          </div>
          <div className="fl-split">
            <span className="c" style={{ width: "58%" }} />
            <span className="a" style={{ width: "42%" }} />
          </div>
          <div className="fl-legend">
            <span className="side"><span className="fl-person c">C</span><span className="nm">Camilo</span><span className="vl">{COP(D.ingresos.camilo)}</span></span>
            <span className="side"><span className="vl">{COP(D.ingresos.angie)}</span><span className="nm">Angie</span><span className="fl-person a">A</span></span>
          </div>
        </div>

        <button className="fl-btn primary block" style={{ marginTop: 2 }} onClick={() => openSheet("registro")}>
          <Icon name="bolt" size={17} fill /> Registrar un gasto
        </button>
      </div>
    </div>
  );
}
function ActionCard({ icon, t, d, onClick }) {
  return (
    <button className="fl-action" onClick={onClick} style={{ textAlign: "left", border: "none", width: "100%", font: "inherit" }}>
      <span className="ic"><Icon name={icon} /></span>
      <span className="txt"><p className="t">{t}</p><p className="d">{d}</p></span>
      <Icon name="arrow" size={18} style={{ color: "var(--ink-faint)" }} />
    </button>
  );
}

/* ---------------- SEMANA ---------------- */
function Semana() {
  const { nav, showToast } = useNav();
  const [tab, setTab] = useState("pend");
  const [pend, setPend] = useState(D.semanaPend);
  const [exec, setExec] = useState(D.semanaExec);
  const [open, setOpen] = useState(null);   // id en panel OK
  const [fuente, setFuente] = useState(null);
  const [quien, setQuien] = useState("c");

  const ejecutar = (m) => {
    setPend((p) => p.filter((x) => x.id !== m.id));
    setExec((e) => [{ ...m, src: FUENTES.find((f) => f.value === fuente)?.label || "En mano", by: quien }, ...e]);
    setOpen(null); setFuente(null); setQuien("c");
    showToast(`${m.n} · ejecutado`);
  };

  return (
    <div className="t-calido">
      <AppBar onBack title="Semana 3" subtitle={`${D.mesLabel} · ${D.semanaRango}`}
              right={<button className="fl-back" onClick={() => nav("cierre")} title="Cerrar semana"><Icon name="flag" size={16} /></button>}>
        <div style={{ marginTop: 14 }}>
          <div className="fl-row" style={{ marginBottom: 7 }}>
            <span className="balance-label" style={{ margin: 0 }}>Ejecutado esta semana</span>
            <span className="fl-num" style={{ fontSize: 14, color: "var(--appbar-ink)", fontWeight: 700 }}>62%</span>
          </div>
          <div className="fl-bar" style={{ background: "var(--appbar-hair)" }}>
            <i style={{ width: "62%", background: "var(--on-primary)" }} />
          </div>
          <p className="sub" style={{ marginTop: 6, fontSize: 12 }}>{COP(680400)} de {COP(1098000)}</p>
        </div>
      </AppBar>

      <div className="fl-body">
        <p className="fl-sectlabel">Bolsillos · techo semanal</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {D.bolsillos.map((b, i) => {
            const pct = Math.round((b.g / b.t) * 100), over = b.g > b.t;
            return (
              <button key={b.id} onClick={() => nav("bolsillo", { id: b.id })}
                      className="fl-bolsillo" style={{ background: "none", border: "none", width: "100%", cursor: "pointer",
                        paddingTop: i ? 14 : 4, paddingBottom: 4, borderTop: i ? "1px solid var(--line)" : "none", textAlign: "left" }}>
                <Ring pct={pct} over={over} />
                <div className="meta">
                  <p className="n">{b.n}</p>
                  <p className="amt">{COP(b.g)} <span style={{ color: "var(--ink-faint)" }}>/ {COP(b.t)}</span></p>
                </div>
                {over ? <span className="fl-badge neg"><span className="dot" />+{COP(b.g - b.t)}</span>
                      : <span className="fl-badge pos">{COP(b.t - b.g)} libre</span>}
                <Icon name="arrow" size={16} style={{ color: "var(--ink-faint)", marginLeft: 4 }} />
              </button>
            );
          })}
        </div>

        <Segmented value={tab} onChange={setTab}
          options={[{ value: "pend", label: <>Pendientes <span className="cnt">{pend.length}</span></> },
                    { value: "exec", label: <>Ejecutados <span className="cnt">{exec.length}</span></> }]} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tab === "pend" && pend.length === 0 && (
            <EmptyState icon="check" t="¡Semana al día!" d="No quedan conceptos pendientes esta semana." />
          )}
          {(tab === "pend" ? pend : exec).map((m) => (
            <div className="fl-concepto" key={m.id}>
              <div className="top">
                <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                  <span className="fl-chip" style={{ padding: 8, borderRadius: 12 }}><Icon name={D.catIcon[m.cat] || "wallet"} size={16} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="name">{m.n}</p>
                    <p className="cat">{m.cat}{m.src ? ` · ${m.src}` : ""}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="amt">{COP(m.amt)}</p>
                  {tab === "exec"
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                        <span className={`fl-person ${m.by}`}>{m.by === "c" ? "C" : "A"}</span>
                        <span className="fl-badge pos"><Icon name="check" size={11} />Listo</span>
                      </span>
                    : <span className="fl-badge warn" style={{ marginTop: 4 }}><span className="dot" />Pendiente</span>}
                </div>
              </div>

              {tab === "pend" && open !== m.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="fl-btn pos sm" style={{ flex: 1 }} onClick={() => { setOpen(m.id); setFuente(null); }}>
                    <Icon name="check" size={15} /> OK
                  </button>
                  <button className="fl-btn ghost sm" title="Recibo"><Icon name="receipt" size={15} /></button>
                  <button className="fl-btn ghost sm" title="Editar"><Icon name="pencil" size={15} /></button>
                </div>
              )}

              {tab === "pend" && open === m.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <p className="fl-faint" style={{ marginBottom: 7, fontWeight: 600 }}>¿De dónde salió?</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {FUENTES.map((f) => (
                        <button key={f.value} className="fl-chip" onClick={() => setFuente(f.value)}
                          style={{ justifyContent: "center", cursor: "pointer",
                            background: fuente === f.value ? "var(--primary)" : "var(--surface-2)",
                            color: fuente === f.value ? "var(--on-primary)" : "var(--ink-soft)" }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="fl-faint" style={{ marginBottom: 7, fontWeight: 600 }}>¿Quién pagó?</p>
                    <Segmented value={quien} onChange={setQuien}
                      options={[{ value: "c", label: <><span className="fl-person c">C</span> Camilo</> },
                                { value: "a", label: <><span className="fl-person a">A</span> Angie</> }]} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="fl-btn ghost sm" onClick={() => setOpen(null)}>Cancelar</button>
                    <button className="fl-btn pos sm" style={{ flex: 1, opacity: fuente ? 1 : 0.5 }}
                            disabled={!fuente} onClick={() => ejecutar(m)}>
                      Confirmar {COP(m.amt)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- BOLSILLO DETALLE ---------------- */
function Bolsillo({ id }) {
  const { openSheet } = useNav();
  const b = D.bolsillos.find((x) => x.id === id) || D.bolsillos[0];
  const pct = Math.round((b.g / b.t) * 100), over = b.g > b.t;
  return (
    <div className="t-calido">
      <AppBar onBack size="sm" title={b.n} subtitle="Bolsillo · techo semanal" />
      <div className="fl-body">
        <div className="fl-card" style={{ textAlign: "center", paddingTop: 22, paddingBottom: 22 }}>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 4 }}>
            <BigRing pct={pct} over={over} />
          </div>
          <p className="fl-statbig" style={{ padding: 0 }}>
            <span className="v" style={over ? { color: "var(--neg)" } : null}>{COP(b.g)}</span>
          </p>
          <p className="fl-muted" style={{ marginTop: 8 }}>de {COP(b.t)} esta semana</p>
          {over
            ? <span className="fl-badge neg" style={{ marginTop: 12 }}><Icon name="alert" size={12} /> {COP(b.g - b.t)} sobre el techo</span>
            : <span className="fl-badge pos" style={{ marginTop: 12 }}>{COP(b.t - b.g)} disponibles</span>}
        </div>

        <p className="fl-sectlabel">Consumos · {D.semana}</p>
        <div className="fl-card">
          {b.consumos.map((c, i) => (
            <div className="fl-listrow" key={i}>
              <span className={`fl-person ${c.by} lg`}>{c.by === "c" ? "C" : "A"}</span>
              <span className="li-tx"><p className="t">{c.d}</p><p className="d">{c.day} · {c.by === "c" ? "Camilo" : "Angie"}</p></span>
              <span className="li-amt">{COP(c.amt)}</span>
            </div>
          ))}
        </div>

        <button className="fl-btn primary block" onClick={() => openSheet("registro")}>
          <Icon name="plus" size={17} /> Registrar consumo
        </button>
      </div>
    </div>
  );
}
function BigRing({ pct, over }) {
  const r = 52, c = 2 * Math.PI * r, v = Math.min(pct, 100);
  return (
    <div style={{ position: "relative", width: 132, height: 132 }}>
      <svg width="132" height="132" viewBox="0 0 132 132" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={over ? "var(--neg)" : "var(--primary)"} strokeWidth="11"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <span className="fl-num" style={{ fontSize: 30, fontWeight: 700, color: over ? "var(--neg)" : "var(--ink)" }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ---------------- empty state helper ---------------- */
function EmptyState({ icon, t, d, action }) {
  return (
    <div className="fl-card" style={{ textAlign: "center", padding: "34px 22px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--primary-soft)", color: "var(--primary)",
                    display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Icon name={icon} size={26} />
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: 0 }}>{t}</p>
      <p className="fl-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{d}</p>
      {action}
    </div>
  );
}

window.SCREENS = Object.assign(window.SCREENS || {}, { onboarding: Onboarding, home: Home, semana: Semana, bolsillo: Bolsillo });
Object.assign(window, { EmptyState, FUENTES });
