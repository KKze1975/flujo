/* ============================================================
   FLUJO · proto-screens-2.jsx
   Registro IA (estados), Inicio de mes (M1), Cierre, Historial, Mes detalle
   ============================================================ */

/* ================= REGISTRO IA (sheet con estados) ================= */
const EJEMPLOS = [
  { txt: "Almuerzo con Angie, 38 mil con Nequi", out: "ok",
    i: { desc: "Almuerzo con Angie", monto: 38000, cat: "Recreación", semana: "S3", fuente: "nequi", conf: "alta", concepto: null } },
  { txt: "Pagué la cita de Frida", out: "ok",
    i: { desc: "Veterinario · Frida", monto: 145000, cat: "Frida", semana: "S3", fuente: "camilo", conf: "media", concepto: "Veterinario · Frida (S3)" } },
  { txt: "Gasté algo ayer y no recuerdo cuánto", out: "aclaracion",
    i: { desc: "Gasto sin monto", monto: 0, cat: "—", semana: "S3", fuente: "en_mano", conf: "baja", concepto: null } },
];
const CONF = { alta: "pos", media: "warn", baja: "neg" };

function RegistroSheet() {
  const { closeSheet, showToast } = useNav();
  const [estado, setEstado] = useState("idle");   // idle|procesando|aclaracion|propuesta|guardando|exito|error
  const [txt, setTxt] = useState("");
  const [interp, setInterp] = useState(null);
  const [quien, setQuien] = useState("c");

  const run = (ejemplo, errorMode) => {
    setEstado("procesando");
    setTimeout(() => {
      if (errorMode) { setEstado("error"); return; }
      setInterp({ ...ejemplo.i });
      setEstado(ejemplo.out === "aclaracion" ? "aclaracion" : "propuesta");
    }, 1500);
  };
  const submitFree = () => {
    if (!txt.trim()) return;
    run(EJEMPLOS[0], false);
  };
  const confirmar = () => {
    setEstado("guardando");
    setTimeout(() => { setEstado("exito"); }, 900);
  };
  const reset = () => { setEstado("idle"); setTxt(""); setInterp(null); };

  return (
    <div className="t-calido" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <SheetHead title={estado === "exito" ? "Listo" : "Registro rápido"} />
      <div className="sheet-body">

        {estado === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="fl-ai-input" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={2}
                placeholder="Escribe el gasto como hablas… p. ej. “mercado 64 mil en el Jumbo”"
                style={{ border: "none", resize: "none", outline: "none", background: "transparent",
                         font: "inherit", fontSize: 15, color: "var(--ink)", lineHeight: 1.45 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="icon-btn" onClick={() => run(EJEMPLOS[1], true)} title="Foto del recibo"><Icon name="camera" size={17} /></button>
                  <button className="icon-btn" title="Dictar"><Icon name="mic" size={17} /></button>
                </div>
                <button className="fl-btn primary sm" style={{ opacity: txt.trim() ? 1 : 0.5 }} disabled={!txt.trim()} onClick={submitFree}>
                  <Icon name="send" size={15} /> Interpretar
                </button>
              </div>
            </div>
            <p className="fl-sectlabel">Ejemplos</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EJEMPLOS.map((e, i) => (
                <button key={i} className="fl-card" onClick={() => { setTxt(e.txt); run(e, false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", padding: 13, border: "1px solid var(--line)" }}>
                  <Icon name="sparkle" size={16} fill style={{ color: "var(--primary)", flex: "none" }} />
                  <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>“{e.txt}”</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {estado === "procesando" && (
          <div style={{ padding: "44px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div className="ai-spin" />
            <p className="fl-ai-pill"><Icon name="sparkle" size={14} fill /> Claude está interpretando tu gasto…</p>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {[100, 72, 86].map((w, i) => <div key={i} className="skeleton" style={{ width: `${w}%` }} />)}
            </div>
          </div>
        )}

        {estado === "aclaracion" && interp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
            <Bubble txt={txt} />
            <div className="fl-card" style={{ borderLeft: "3px solid var(--warn)", display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="fl-badge warn" style={{ alignSelf: "flex-start" }}><Icon name="info" size={12} /> Confianza baja</span>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5 }}>
                No me quedó claro el <b>monto</b> ni el <b>concepto</b>. ¿Me ayudas a precisarlo?
              </p>
              <p className="fl-faint">Puedo intentar igual con mi mejor estimación, o lo reescribes con el valor.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="fl-btn ghost" onClick={reset}>Reescribir</button>
              <button className="fl-btn primary block" onClick={() => setEstado("propuesta")}>Continuar igual</button>
            </div>
          </div>
        )}

        {(estado === "propuesta" || estado === "guardando") && interp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <Bubble txt={txt} />
            <div className="fl-ai-pill" style={{ alignSelf: "flex-start" }}><Icon name="sparkle" size={14} fill /> Claude interpretó tu gasto</div>
            <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 17 }}>
              <div className="fl-row">
                <span className="fl-sectlabel" style={{ margin: 0 }}>Propuesta</span>
                <span className={`fl-badge ${CONF[interp.conf]}`}><span className="dot" />Confianza {interp.conf}</span>
              </div>
              {interp.concepto
                ? <div className="fl-card" style={{ padding: "10px 13px", background: "var(--primary-soft)", display: "flex", alignItems: "center", gap: 9, boxShadow: "none" }}>
                    <Icon name="check" size={15} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>Vinculado a “{interp.concepto}”</span>
                  </div>
                : <div className="fl-card" style={{ padding: "10px 13px", background: "var(--warn-soft)", display: "flex", alignItems: "center", gap: 9, boxShadow: "none" }}>
                    <Icon name="info" size={15} style={{ color: "var(--warn)" }} />
                    <span style={{ fontSize: 12.5, color: "var(--warn)", fontWeight: 600 }}>Sin concepto fijo · se guarda como gasto variable</span>
                  </div>}
              <Field label="Descripción"><div className="fl-input">{interp.desc}</div></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Monto"><div className="fl-input num">{interp.monto ? COP(interp.monto) : "—"}</div></Field>
                <Field label="Categoría">
                  <div style={{ display: "flex", alignItems: "center", height: 41 }}>
                    <span className="fl-chip"><Icon name={D.catIcon[interp.cat] || "wallet"} size={14} /> {interp.cat}</span>
                  </div>
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Semana"><div className="fl-input">{interp.semana}</div></Field>
                <Field label="Fuente"><div className="fl-input">{FUENTES.find((f) => f.value === interp.fuente)?.label}</div></Field>
              </div>
              <Field label="¿Quién pagó?">
                <Segmented value={quien} onChange={setQuien}
                  options={[{ value: "c", label: <><span className="fl-person c">C</span> Camilo</> },
                            { value: "a", label: <><span className="fl-person a">A</span> Angie</> }]} />
              </Field>
              <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                <button className="fl-btn ghost"><Icon name="pencil" size={15} /></button>
                <button className="fl-btn primary block" onClick={confirmar} disabled={estado === "guardando"}>
                  {estado === "guardando" ? "Guardando…" : <><Icon name="check" size={16} /> Confirmar gasto</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {estado === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 14, alignItems: "center", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--neg-soft)", color: "var(--neg)", display: "grid", placeItems: "center" }}>
              <Icon name="alert" size={30} />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--ink)", margin: 0 }}>No pude leer la imagen</p>
              <p className="fl-muted" style={{ marginTop: 6, lineHeight: 1.5, maxWidth: "30ch" }}>La foto del recibo salió borrosa. Intenta de nuevo con más luz o escríbelo a mano.</p>
            </div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="fl-btn ghost" onClick={reset}>Escribir a mano</button>
              <button className="fl-btn primary block" onClick={() => run(EJEMPLOS[1], false)}><Icon name="camera" size={15} /> Reintentar</button>
            </div>
          </div>
        )}

        {estado === "exito" && interp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 18, alignItems: "center", textAlign: "center" }}>
            <div className="ok-pop" style={{ width: 76, height: 76, borderRadius: 999, background: "var(--pos)", color: "#fff", display: "grid", placeItems: "center" }}>
              <Icon name="check" size={38} />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "var(--ink)", margin: 0 }}>Gasto registrado</p>
              <p className="fl-muted" style={{ marginTop: 6 }}>{interp.desc} · {COP(interp.monto || 38000)}</p>
            </div>
            <div className="fl-card" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="fl-muted">Pagó</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span className={`fl-person ${quien}`}>{quien === "c" ? "C" : "A"}</span>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{quien === "c" ? "Camilo" : "Angie"}</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="fl-btn ghost" onClick={reset}>Registrar otro</button>
              <button className="fl-btn primary block" onClick={() => { closeSheet(); showToast("Gasto registrado"); }}>Listo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function Bubble({ txt }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: "var(--primary)", color: "var(--on-primary)", padding: "11px 15px",
                    borderRadius: "18px 18px 6px 18px", maxWidth: "82%", fontSize: 14, fontWeight: 500 }}>
        “{txt}”
      </div>
    </div>
  );
}

/* ================= INICIO DE MES / PLANIFICACIÓN (M1) ================= */
function InicioMes() {
  const { showToast, setViewMode, m1mode, setM1mode } = useNav();
  const mode = m1mode || "plan";
  const [wk, setWk] = useState(D.semana);
  const [saldosOk, setSaldosOk] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [done, setDone] = useState({});   // name -> true cuando se ejecuta
  const semana = D.planSemanas.find((s) => s.s === wk);
  const ingresos = D.ingresos.camilo + D.ingresos.angie;
  const proyeccion = ingresos - D.presupuestado;

  const isExec = (it) => it.estado === "ejecutado" || done[it.n];
  const all = D.planSemanas.flatMap((s) => s.items);
  const totalFijos = all.reduce((s, it) => s + it.amt, 0);
  const ejecFijos = all.filter(isExec).reduce((s, it) => s + it.amt, 0);
  const pend = all.filter((it) => !isExec(it));
  const pendMonto = totalFijos - ejecFijos;
  const pct = Math.round((ejecFijos / totalFijos) * 100);
  const ejecutar = (it) => { setDone((d) => ({ ...d, [it.n]: true })); showToast(`${it.n} · ejecutado`); };

  return (
    <div className="t-calido">
      <AppBar eyebrow="Inicio de mes" title={D.mesLabel}
        subtitle={mode === "plan" ? "Planeación · distribuyan y confirmen" : <>Ejecución · semana activa <b>{D.semana}</b></>}
        onBack={false}
        right={
          <button onClick={() => setViewMode("desktop")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 12, fontWeight: 700,
                     cursor: "pointer", padding: "7px 12px", borderRadius: 999, border: "none",
                     background: "var(--appbar-hair)", color: "var(--appbar-ink)" }}>
            <Icon name="monitor" size={14} /> Escritorio
          </button>
        } />
      <div className="fl-body">
        <Segmented
          options={[{ value: "plan", label: "Planeación" }, { value: "exec", label: "Ejecución" }]}
          value={mode} onChange={setM1mode} />

        {mode === "plan" ? (
          /* ===================== PLANEACIÓN ===================== */
          <>
            <div className="fl-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <MiniStat k="Ingresos" v={COP(ingresos, { compact: true })} />
                <MiniStat k="Presupuesto" v={COP(D.presupuestado, { compact: true })} />
                <MiniStat k="Proyección" v={(proyeccion >= 0 ? "+" : "") + COP(proyeccion, { compact: true })} color={proyeccion >= 0 ? "var(--pos)" : "var(--neg)"} />
              </div>
            </div>

            <p className="fl-sectlabel">Saldos por cuenta</p>
            <div className="fl-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {D.cuentas.map((c) => (
                  <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    {c.persona ? <span className={`fl-person ${c.persona}`}>{c.persona === "c" ? "C" : "A"}</span>
                               : <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--surface-2)", display: "grid", placeItems: "center" }}><Icon name="wallet" size={12} style={{ color: "var(--ink-faint)" }} /></span>}
                    <div>
                      <p className="fl-faint" style={{ margin: 0 }}>{c.k}</p>
                      <p className="fl-num" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{COP(c.v)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className={`fl-btn ${saldosOk ? "pos" : "primary"} block`} style={{ marginTop: 15 }}
                      onClick={() => { setSaldosOk(true); showToast("Saldos confirmados"); }}>
                {saldosOk ? <><Icon name="check" size={16} /> Saldos confirmados</> : "Confirmar saldos del mes"}
              </button>
            </div>

            <p className="fl-sectlabel">Distribución de fijos por semana</p>
            <div className="wk-pills">
              {D.planSemanas.map((s) => (
                <button key={s.s} className={`wk-pill ${wk === s.s ? "on" : ""}`} onClick={() => setWk(s.s)}>
                  {s.s}<span className="sub">{s.items.length}</span>
                </button>
              ))}
            </div>
            <div className="fl-card">
              <div className="fl-row" style={{ marginBottom: 10 }}>
                <span className="fl-faint">Semana {wk} · {semana.items.length} conceptos</span>
                <span className="fl-num" style={{ fontWeight: 700, color: "var(--ink)" }}>{COP(semana.items.reduce((s, it) => s + it.amt, 0))}</span>
              </div>
              {semana.items.map((it, i) => (
                <div className="fl-listrow" key={it.n} style={i === 0 ? { paddingTop: 4 } : null}>
                  <span className="li-ic"><Icon name={D.catIcon[it.cat] || "wallet"} size={19} /></span>
                  <div className="li-tx">
                    <p className="t">{it.n} {it.aprob && <span className="fl-badge primary" style={{ marginLeft: 4, fontSize: 9, padding: "1px 6px" }}><Icon name="lock" size={9} /> aprobado</span>}</p>
                    <p className="d">{it.cat}</p>
                  </div>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className="li-amt">{COP(it.amt)}</span>
                    {it.by && <span className={`fl-person ${it.by}`} style={{ width: 18, height: 18, fontSize: 9 }}>{it.by === "c" ? "C" : "A"}</span>}
                  </span>
                </div>
              ))}
            </div>

            <button className={`fl-btn ${cerrada ? "pos" : "primary"} block`} style={{ marginTop: 4 }}
                    onClick={() => { setCerrada(true); showToast("Planificación cerrada"); }}>
              {cerrada ? <><Icon name="check" size={16} /> Planificación cerrada</> : <><Icon name="flag" size={16} /> Cerrar planificación</>}
            </button>
          </>
        ) : (
          /* ===================== EJECUCIÓN ===================== */
          <>
            <div className="fl-card">
              <div className="fl-row" style={{ alignItems: "flex-start", marginBottom: 11 }}>
                <div>
                  <p className="fl-faint" style={{ margin: "0 0 3px" }}>Ejecutado del mes</p>
                  <p className="fl-num" style={{ fontSize: 25, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
                    {COP(ejecFijos, { compact: true })} <span style={{ fontSize: 13, color: "var(--ink-faint)", fontWeight: 600 }}>/ {COP(totalFijos, { compact: true })}</span>
                  </p>
                </div>
                <span className="fl-badge pos" style={{ fontSize: 13, padding: "5px 11px" }}>{pct}%</span>
              </div>
              <div className="fl-bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="fl-row" style={{ marginTop: 12 }}>
                <span className="fl-muted">{pend.length} pendientes</span>
                <span className="fl-num" style={{ fontWeight: 700, color: "var(--warn)" }}>{COP(pendMonto)} por pagar</span>
              </div>
            </div>

            <p className="fl-sectlabel">Pagos fijos por semana</p>
            <div className="wk-pills">
              {D.planSemanas.map((s) => {
                const ex = s.items.filter(isExec).length;
                return (
                  <button key={s.s} className={`wk-pill ${wk === s.s ? "on" : ""}`} onClick={() => setWk(s.s)}>
                    {s.s}<span className="sub">{ex}/{s.items.length}</span>
                  </button>
                );
              })}
            </div>
            {wk === D.semana && (
              <span className="fl-badge primary" style={{ alignSelf: "flex-start" }}><Icon name="calendar" size={11} /> Semana activa · cierra en {D.diasRestantes} días</span>
            )}
            <div className="fl-card">
              {semana.items.map((it, i) => {
                const ejec = isExec(it);
                return (
                  <div className="fl-listrow" key={it.n} style={i === 0 ? { paddingTop: 4 } : null}>
                    <span className="li-ic"><Icon name={D.catIcon[it.cat] || "wallet"} size={19} /></span>
                    <div className="li-tx">
                      <p className="t">{it.n} {it.aprob && <span className="fl-badge primary" style={{ marginLeft: 4, fontSize: 9, padding: "1px 6px" }}><Icon name="lock" size={9} /></span>}</p>
                      <p className="d">{it.cat} · {COP(it.amt)}</p>
                    </div>
                    {ejec
                      ? <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span className="fl-badge pos"><Icon name="check" size={11} /> Ejecutado</span>
                        </span>
                      : <button className="fl-btn primary sm" onClick={() => ejecutar(it)}>Ejecutar</button>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function MiniStat({ k, v, color }) {
  return (
    <div>
      <p className="fl-faint" style={{ margin: "0 0 5px" }}>{k}</p>
      <p className="fl-num" style={{ fontSize: 16, fontWeight: 700, color: color || "var(--ink)", letterSpacing: "-0.02em" }}>{v}</p>
    </div>
  );
}

/* ================= CIERRE DEL DOMINGO ================= */
function Cierre() {
  const { back, showToast, replace } = useNav();
  const c = D.cierre;
  const ahorro = c.planeado - c.ejecutado;
  return (
    <div className="t-calido">
      <AppBar onBack eyebrow="Revisión del domingo" title={`Cerrar ${c.semana}`} subtitle="Lo planeado vs. lo ejecutado" />
      <div className="fl-body">
        <div className="fl-card" style={{ textAlign: "center", paddingTop: 20, paddingBottom: 20 }}>
          <p className="fl-statbig" style={{ padding: 0 }}><span className="v" style={{ color: "var(--pos)" }}>{COP(ahorro)}</span></p>
          <p className="fl-muted" style={{ marginTop: 8 }}>quedaron sin gastar esta semana</p>
          <div className="fl-row" style={{ marginTop: 16, gap: 18, justifyContent: "center" }}>
            <span><span className="fl-faint">Planeado</span><br /><span className="fl-num" style={{ fontSize: 15, fontWeight: 700 }}>{COP(c.planeado)}</span></span>
            <span style={{ width: 1, background: "var(--line)" }} />
            <span><span className="fl-faint">Ejecutado</span><br /><span className="fl-num" style={{ fontSize: 15, fontWeight: 700 }}>{COP(c.ejecutado)}</span></span>
          </div>
        </div>

        <p className="fl-sectlabel">Detalle por línea</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {c.lineas.map((l) => (
            <div key={l.n}>
              <div className="fl-row">
                <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{l.n}</span>
                <span className="fl-num" style={{ fontSize: 12.5, color: l.real > l.plan ? "var(--neg)" : "var(--ink-soft)" }}>
                  {COP(l.real)} / {COP(l.plan)}
                </span>
              </div>
              <ProgressPair plan={l.plan} real={l.real} />
            </div>
          ))}
        </div>

        <p className="fl-sectlabel">Antes de cerrar</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div className="fl-listrow" style={{ paddingTop: 4 }}>
            <span className="li-ic" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}><Icon name="arrow" size={18} /></span>
            <div className="li-tx"><p className="t">{c.pospuestos.length} concepto pospuesto</p><p className="d">{c.pospuestos[0].n} → pasa a S4</p></div>
          </div>
          <div className="fl-listrow">
            <span className="li-ic" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}><Icon name="info" size={18} /></span>
            <div className="li-tx"><p className="t">{c.sinClasificar} gasto sin clasificar</p><p className="d">Revísalo en la semana</p></div>
          </div>
        </div>

        <p className="fl-sectlabel">Proyección · siguiente semana</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="fl-row"><span className="fl-muted">Remanente que arrastra Angie</span><span className="fl-num" style={{ fontWeight: 700 }}>{COP(c.remanente)}</span></div>
          <div className="fl-row"><span className="fl-muted">Aporte planeado S4</span><span className="fl-num" style={{ fontWeight: 700 }}>{COP(c.aporteAngieProx)}</span></div>
          <div className="fl-divider" />
          <div className="fl-row"><span style={{ fontWeight: 700, color: "var(--ink)" }}>Balance proyectado S4</span><span className="fl-num fl-pos" style={{ fontWeight: 700, fontSize: 16 }}>{COP(c.balanceProx)}</span></div>
        </div>

        <button className="fl-btn primary block" style={{ marginTop: 2 }}
                onClick={() => { replace("home"); showToast("Semana S3 cerrada ✓"); }}>
          <Icon name="flag" size={16} /> Cerrar semana y planear S4
        </button>
      </div>
    </div>
  );
}

/* ================= HISTORIAL (+ carga / vacío / error) ================= */
function Historial() {
  const { nav } = useNav();
  const [view, setView] = useState("loading");
  useEffect(() => { const t = setTimeout(() => setView("data"), 950); return () => clearTimeout(t); }, []);

  return (
    <div className="t-calido">
      <AppBar eyebrow="Historial" title="Meses cerrados" subtitle="Solo lectura" />
      <div className="fl-body">
        {view === "loading" && [0, 1, 2].map((i) => (
          <div className="fl-card" key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton" style={{ width: "45%", height: 16 }} />
            <div className="skeleton" style={{ width: "80%" }} />
          </div>
        ))}

        {view === "empty" && (
          <EmptyState icon="archive" t="Aún no hay meses cerrados" d="Cuando cierres tu primer mes completo, aparecerá aquí para consultarlo."
            action={<button className="fl-btn primary" style={{ marginTop: 16 }} onClick={() => nav("mes")}>Ir a inicio de mes</button>} />
        )}

        {view === "error" && (
          <EmptyState icon="alert" t="No pudimos cargar el historial" d="Revisa tu conexión e inténtalo de nuevo."
            action={<button className="fl-btn primary" style={{ marginTop: 16 }} onClick={() => setView("loading")}>Reintentar</button>} />
        )}

        {view === "data" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {D.historial.map((m) => {
              const pos = m.sup >= 0;
              return (
                <button key={m.mes} className="fl-card" onClick={() => nav("mesDetalle", { mes: m.mes })}
                  style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", border: "1px solid var(--line)" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--ink)", margin: 0 }}>{m.label}</p>
                    <p className="fl-faint" style={{ marginTop: 3 }}>Ejecutado {COP(m.eje, { compact: true })} de {COP(m.pre, { compact: true })}</p>
                  </div>
                  <span className={`fl-badge ${pos ? "pos" : "neg"}`}>{pos ? "+" : ""}{COP(m.sup, { compact: true })}</span>
                  <Icon name="arrow" size={16} style={{ color: "var(--ink-faint)" }} />
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
          <span className="fl-faint" style={{ alignSelf: "center" }}>Demo de estados:</span>
          {["data", "loading", "empty", "error"].map((v) => (
            <button key={v} onClick={() => setView(v)} className="fl-chip" style={{ padding: "4px 9px", fontSize: 10.5, cursor: "pointer",
              background: view === v ? "var(--primary)" : "var(--surface-2)", color: view === v ? "var(--on-primary)" : "var(--ink-soft)" }}>
              {v === "data" ? "datos" : v === "loading" ? "carga" : v === "empty" ? "vacío" : "error"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= MES DETALLE (read-only) ================= */
function MesDetalle({ mes }) {
  const m = D.historial.find((x) => x.mes === mes) || D.historial[0];
  const pos = m.sup >= 0;
  return (
    <div className="t-calido">
      <AppBar onBack size="sm" title={m.label} subtitle="Mes cerrado · solo lectura"
              right={<span className="fl-badge" style={{ background: "var(--appbar-hair)", color: "var(--appbar-ink)" }}><Icon name="lock" size={11} /></span>} />
      <div className="fl-body">
        <div className="fl-card" style={{ textAlign: "center", paddingTop: 20, paddingBottom: 20 }}>
          <p className="fl-faint">Superávit del mes</p>
          <p className="fl-statbig" style={{ padding: 0, marginTop: 6 }}>
            <span className="v" style={{ color: pos ? "var(--pos)" : "var(--neg)" }}>{pos ? "+" : ""}{COP(m.sup)}</span>
          </p>
        </div>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Line k="Ingresos" v={m.ing} />
          <div className="fl-divider" />
          <Line k="Presupuestado" v={m.pre} />
          <Line k="Ejecutado" v={m.eje} />
          <div className="fl-divider" />
          <div>
            <div className="fl-row" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>Ejecución</span>
              <span className="fl-num" style={{ fontWeight: 700 }}>{Math.round((m.eje / m.pre) * 100)}%</span>
            </div>
            <ProgressPair plan={m.pre} real={m.eje} />
          </div>
        </div>
        <EmptyState icon="info" t="Detalle archivado" d="El desglose semana a semana de un mes cerrado se consulta aquí. (Demo)" />
      </div>
    </div>
  );
}
function Line({ k, v }) {
  return <div className="fl-row"><span className="fl-muted">{k}</span><span className="fl-num" style={{ fontWeight: 700, color: "var(--ink)" }}>{COP(v)}</span></div>;
}

window.SCREENS = Object.assign(window.SCREENS || {}, { mes: InicioMes, cierre: Cierre, historial: Historial, mesDetalle: MesDetalle });
window.SHEETS = Object.assign(window.SHEETS || {}, { registro: RegistroSheet });
