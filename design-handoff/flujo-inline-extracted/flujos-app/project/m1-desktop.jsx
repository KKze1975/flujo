/* ============================================================
   FLUJO · m1-desktop.jsx — Inicio de mes (M1) · escritorio
   Dos modos: Planeación (distribuir + confirmar) y Ejecución (pagar fijos)
   ============================================================ */

/* ---- input de monto reutilizable (formato COP, editable) ---- */
function AmtInput({ value, onChange, disabled }) {
  return (
    <input
      className="dk-amt-in" inputMode="numeric" disabled={disabled}
      value={COP(value)}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ---- formulario inline · EJECUCIÓN ---- */
function DkExecForm({ it, onConfirm, onCancel }) {
  const [src, setSrc] = useState(it.by === "a" ? "NU Angie" : "NU Camilo");
  const [by, setBy]   = useState(it.by || "c");
  const [amt, setAmt] = useState(it.amt);
  return (
    <div className="dk-exp" onClick={(e) => e.stopPropagation()}>
      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Fuente de pago</p>
        <div className="dk-srcs">
          {D.cuentas.map((c) => (
            <button key={c.k} type="button" className={`dk-src ${src === c.k ? "on" : ""}`} onClick={() => setSrc(c.k)}>
              {c.persona
                ? <span className={`fl-person ${c.persona}`}>{c.persona === "c" ? "C" : "A"}</span>
                : <span className="dk-src-ic"><Icon name={c.k === "En mano" ? "wallet" : "store"} size={13} /></span>}
              <span className="nm">{c.k}</span>
              <span className="dk-rb"><Icon name="check" size={11} /></span>
            </button>
          ))}
        </div>
      </div>

      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Ejecutó</p>
        <div className="dk-seg2">
          {[["c", "Camilo"], ["a", "Angie"]].map(([k, nm]) => (
            <button key={k} type="button" className={by === k ? "on" : ""} onClick={() => setBy(k)}>
              <span className={`fl-person ${k}`}>{k === "c" ? "C" : "A"}</span> {nm}
            </button>
          ))}
        </div>
      </div>

      <div className="dk-exp-sec">
        <p className="dk-exp-lbl">Monto ejecutado</p>
        <div className="dk-amt">
          <AmtInput value={amt} onChange={setAmt} />
          {amt !== it.amt && (
            <button type="button" className="dk-amt-reset" onClick={() => setAmt(it.amt)}>↺ plan {COP(it.amt, { compact: true })}</button>
          )}
        </div>
      </div>

      <div className="dk-exp-actions">
        <button type="button" className="fl-btn primary sm block" onClick={() => onConfirm({ src, by, amt })}>
          <Icon name="check" size={15} /> Confirmar ejecución
        </button>
        <button type="button" className="dk-exp-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/* ---- formulario inline · PLANEACIÓN ---- */
function DkPlanForm({ it, onSave, onCancel }) {
  const [amt, setAmt] = useState(it.amt);
  const [exc, setExc] = useState(null);            // null | "no" | "next"
  const off = exc !== null;
  return (
    <div className="dk-exp" onClick={(e) => e.stopPropagation()}>
      <div className={`dk-exp-sec ${off ? "off" : ""}`}>
        <p className="dk-exp-lbl">Monto planeado</p>
        <div className="dk-amt"><AmtInput value={amt} onChange={setAmt} disabled={off} /></div>
      </div>

      <p className="dk-exp-hint"><Icon name="arrow" size={12} /> Para cambiarlo de semana, arrastra la tarjeta a otra columna.</p>

      <div className="dk-exp-opts">
        <button type="button" className={`dk-opt ${exc === "no" ? "on" : ""}`} onClick={() => setExc(exc === "no" ? null : "no")}>
          <span className="dk-opt-bx"><Icon name="x" size={12} /></span>
          <span className="tx">No aplica este mes</span>
          <span className="dk-rb"><Icon name="check" size={11} /></span>
        </button>
        <button type="button" className={`dk-opt ${exc === "next" ? "on" : ""}`} onClick={() => setExc(exc === "next" ? null : "next")}>
          <span className="dk-opt-bx"><Icon name="arrow" size={12} /></span>
          <span className="tx">Mover al mes siguiente</span>
          <span className="dk-rb"><Icon name="check" size={11} /></span>
        </button>
      </div>

      <div className="dk-exp-actions">
        <button type="button" className="fl-btn primary sm block" onClick={() => onSave({ amt, exc })}>
          <Icon name="check" size={15} /> Guardar
        </button>
        <button type="button" className="dk-exp-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/* ---- tarjeta de concepto (modo-dependiente, con expansión inline) ---- */
function DkConcept({ it, semana, mode, ex, open, onToggle, onConfirmExec, onSavePlan, meta, mark, onDragStart, onDragEnd, dragging }) {
  const baseWho = it.by ? (it.by === "c" ? "Camilo" : "Angie") : "Compartido";
  const execBy  = meta ? meta.by : it.by;
  const shownAmt = (meta && meta.amt) || (mark && mark.amt) || it.amt;
  const clickable = mode === "exec" ? !ex : true;
  const canDrag = mode === "plan" && !open;

  const cls = [
    "dk-cc",
    ex ? "exec" : "",
    mode === "exec" && !ex ? "due" : "",
    open ? "open" : "",
    clickable && !open ? "clickable" : "",
    canDrag ? "grab" : "",
    dragging ? "dragging" : "",
    mark && (mark.exc === "no" || mark.exc === "next") ? "marked" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      onClick={!open && clickable ? onToggle : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.setData("text/plain", it.n); e.dataTransfer.effectAllowed = "move"; onDragStart && onDragStart(it.n, semana); } : undefined}
      onDragEnd={canDrag ? () => onDragEnd && onDragEnd() : undefined}
    >
      <div className="dk-cc-top">
        <span className="dk-cc-ic"><Icon name={D.catIcon[it.cat] || "wallet"} size={16} /></span>
        <div className="dk-cc-tx">
          <p className="dk-cc-nm" title={it.n}>
            <span className="nm-t">{it.n}</span>
            {it.aprob && <span className="lock" style={{ display: "inline-flex", color: "var(--primary)" }}><Icon name="lock" size={11} /></span>}
          </p>
          <p className="dk-cc-cat">{it.cat}</p>
        </div>
        {!open && <span className="dk-cc-amt">{COP(shownAmt, { compact: true })}</span>}
        {open && <span className="dk-cc-chev open"><Icon name="arrow" size={14} /></span>}
      </div>

      {open ? (
        mode === "exec"
          ? <DkExecForm it={it} onConfirm={onConfirmExec} onCancel={onToggle} />
          : <DkPlanForm it={it} onSave={onSavePlan} onCancel={onToggle} />
      ) : (
        <div className="dk-cc-foot">
          <span className="dk-cc-who">
            {mode === "exec" && ex
              ? <><span className={`fl-person ${execBy || "c"}`}>{(execBy || "c") === "c" ? "C" : "A"}</span>{`Pagó ${execBy === "a" ? "Angie" : "Camilo"}`}{meta && <span className="dk-cc-src"> · {meta.src}</span>}</>
              : <>{it.by ? <span className={`fl-person ${it.by}`}>{it.by === "c" ? "C" : "A"}</span> : <span className="sq sq-sm"><Icon name="wallet" size={11} /></span>}{baseWho}</>}
          </span>
          {mode === "exec"
            ? (ex
                ? <span className="dk-done"><Icon name="check" size={12} /> Ejecutado</span>
                : <span className="dk-cc-cta">Ejecutar <Icon name="arrow" size={12} /></span>)
            : (mark && mark.exc === "no"
                ? <span className="fl-badge" style={{ fontSize: 10, padding: "2px 7px" }}>No aplica</span>
                : mark && mark.exc === "next"
                ? <span className="fl-badge primary" style={{ fontSize: 10, padding: "2px 7px" }}><Icon name="arrow" size={10} /> Jun</span>
                : ex
                ? <span className="dk-done soft"><Icon name="check" size={12} /> listo</span>
                : <span className="fl-badge warn" style={{ fontSize: 10, padding: "2px 7px" }}><span className="dot" /> por pagar</span>)}
        </div>
      )}
    </div>
  );
}

/* ---- columna de semana ---- */
const WK_ORDER = ["S1", "S2", "S3", "S4"];
function DkWeek({ sm, items, flow, mode, focus, isExec, ejecutar, activa, openCard, onToggle, onConfirmExec, onSavePlan, execMeta, planMarks, onDragStartCard, onDragEndCard, onDropWeek, dragName, dropHover, setDropHover }) {
  const list = items || sm.items;
  const tot = list.reduce((s, it) => s + it.amt, 0);
  const exec = list.filter((it) => isExec(sm.s, it));
  const pct = list.length ? Math.round((exec.length / list.length) * 100) : 0;
  const dim = focus !== "todas" && focus !== sm.s;
  const isFocus = focus === sm.s;
  const allDone = exec.length === list.length && list.length > 0;
  const rangoCorto = (sm.label.split("·")[1] || sm.label).trim();
  const shareIngreso = Math.round((tot / (D.ingresos.camilo + D.ingresos.angie)) * 100);
  const canDrop = mode === "plan" && !!dragName;
  const isDropTarget = canDrop && dropHover === sm.s;
  const money = (n) => (n >= 0 ? "+" : "−") + COP(Math.abs(n), { compact: true });
  const idx = WK_ORDER.indexOf(sm.s);
  const prevS = idx > 0 ? WK_ORDER[idx - 1] : null;
  const nextS = idx < WK_ORDER.length - 1 ? WK_ORDER[idx + 1] : null;

  return (
    <div
      className={`dk-wk ${dim ? "dim" : ""} ${isFocus ? "focus" : ""} ${mode === "exec" && allDone ? "done" : ""} ${mode === "exec" && activa ? "activa" : ""} ${isDropTarget ? "drop-hover" : ""}`}
      onDragOver={canDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dropHover !== sm.s) setDropHover(sm.s); } : undefined}
      onDrop={canDrop ? (e) => { e.preventDefault(); onDropWeek(sm.s); } : undefined}
    >
      <div className="dk-wk-head">
        <div className="dk-wk-noderow">
          <div className="dk-wk-node">{sm.s}</div>
          {mode === "exec" && activa && <span className="dk-wk-tag">Semana activa</span>}
        </div>
        <p className="dk-wk-range">{rangoCorto}</p>
        <p className="dk-wk-sub">{list.length} conceptos · {COP(tot, { compact: true })}</p>
        {mode === "exec" ? (
          <>
            <div className="dk-wk-prog"><i style={{ width: `${pct}%` }} /></div>
            <p className="dk-wk-progtx">{exec.length}/{list.length} ejecutados · {COP(tot - exec.reduce((s, it) => s + it.amt, 0), { compact: true })} por pagar</p>
          </>
        ) : (
          <>
            <div className="dk-wk-share"><i style={{ width: `${shareIngreso}%` }} /></div>
            <p className="dk-wk-progtx">{shareIngreso}% del ingreso del mes</p>
          </>
        )}
      </div>

      <div className="dk-wk-body">
        {list.length === 0 && <div className="dk-wk-empty">{canDrop ? "Suelta aquí" : "Sin conceptos"}</div>}
        {list.map((it) => {
          const key = `${sm.s}-${it.n}`;
          return (
            <DkConcept
              key={it.n} it={it} semana={sm.s} mode={mode} ex={isExec(sm.s, it)}
              open={openCard === key}
              onToggle={() => onToggle(key)}
              onConfirmExec={(m) => onConfirmExec(key, sm.s, it, m)}
              onSavePlan={(m) => onSavePlan(key, it, m)}
              meta={execMeta[key]} mark={planMarks[key]}
              onDragStart={onDragStartCard} onDragEnd={onDragEndCard} dragging={dragName === it.n}
            />
          );
        })}
      </div>

      {flow && (
        <div className="dk-wk-flow">
          {flow.prev !== 0 && (
            <div className="dk-flow-row"><span className="k">Arrastre {prevS}</span><span className={`v ${flow.prev >= 0 ? "pos" : "neg"}`}>{money(flow.prev)}</span></div>
          )}
          <div className="dk-flow-row"><span className="k">Ingresos</span><span className="v pos">+{COP(flow.ingreso, { compact: true })}</span></div>
          <div className="dk-flow-row"><span className="k">Gastos</span><span className="v neg">−{COP(flow.gasto, { compact: true })}</span></div>
          <div className={`dk-flow-result ${flow.acum >= 0 ? "pos" : "neg"}`}>
            <span className="lhs">
              <span className="tag">{flow.acum >= 0 ? "Superávit" : "Déficit"}</span>
              <span className="sub">{nextS ? <>pasa a {nextS} <Icon name="arrow" size={11} /></> : "saldo final del mes"}</span>
            </span>
            <span className="amt">{flow.acum >= 0 ? "+" : "−"}{COP(Math.abs(flow.acum))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function M1Desktop() {
  const { setViewMode, m1mode, setM1mode } = useNav();
  const mode = m1mode || "plan";
  const [focus, setFocus] = useState("todas");
  const [saldosOk, setSaldosOk] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [done, setDone] = useState({});
  const [aprobOk, setAprobOk] = useState(false);
  const [openCard, setOpenCard] = useState(null);
  const [execMeta, setExecMeta] = useState({});
  const [planMarks, setPlanMarks] = useState({});
  const [board, setBoard] = useState(() => {
    const b = {};
    D.planSemanas.forEach((sm) => { b[sm.s] = sm.items.map((it) => ({ ...it })); });
    return b;
  });
  const [dragName, setDragName] = useState(null);
  const [dropHover, setDropHover] = useState(null);
  const onDragStartCard = (name) => setDragName(name);
  const onDragEndCard = () => { setDragName(null); setDropHover(null); };
  const moveConcept = (toS) => {
    setBoard((b) => {
      let fromS = null, item = null;
      for (const s of WK_ORDER) { const f = (b[s] || []).find((it) => it.n === dragName); if (f) { fromS = s; item = f; break; } }
      if (!item || fromS === toS) return b;
      const nb = { ...b };
      nb[fromS] = b[fromS].filter((it) => it.n !== dragName);
      nb[toS] = [...b[toS], item];
      return nb;
    });
    setDragName(null); setDropHover(null);
  };

  const toggleCard = (key) => setOpenCard((k) => (k === key ? null : key));
  const confirmExec = (key, s, it, m) => {
    setDone((d) => ({ ...d, [key]: true }));
    setExecMeta((mm) => ({ ...mm, [key]: m }));
    setOpenCard(null);
  };
  const savePlan = (key, it, m) => {
    setPlanMarks((mm) => ({ ...mm, [key]: m }));
    setOpenCard(null);
  };
  const switchMode = (m) => { setM1mode(m); setOpenCard(null); };

  const isExec = (s, it) => it.estado === "ejecutado" || done[`${s}-${it.n}`];
  const ejecutar = (s, it) => setDone((d) => ({ ...d, [`${s}-${it.n}`]: true }));

  const all = WK_ORDER.flatMap((s) => (board[s] || []).map((it) => ({ ...it, semana: s })));
  const totalFijos = all.reduce((s, it) => s + it.amt, 0);
  const ejecFijos = all.filter((it) => isExec(it.semana, it)).reduce((s, it) => s + it.amt, 0);
  const pendList = all.filter((it) => !isExec(it.semana, it));
  const pendMonto = totalFijos - ejecFijos;
  const ingresos = D.ingresos.camilo + D.ingresos.angie;
  const proy = ingresos - D.presupuestado;
  const pctEjec = Math.round((ejecFijos / totalFijos) * 100);
  const totalCuentas = D.cuentas.reduce((s, c) => s + c.v, 0);

  // flujo de caja semanal (déficit/superávit que se arrastra a la semana siguiente)
  const ingresoBy = {};
  D.planSemanas.forEach((sm) => { ingresoBy[sm.s] = sm.ingreso || 0; });
  const flujo = (() => {
    let acum = 0; const m = {};
    WK_ORDER.forEach((s) => {
      const gasto = (board[s] || []).reduce((t, it) => t + it.amt, 0);
      const ingreso = ingresoBy[s];
      const prev = acum;
      acum = prev + ingreso - gasto;
      m[s] = { ingreso, gasto, prev, acum };
    });
    return m;
  })();

  const byCat = {};
  all.forEach((it) => { byCat[it.cat] = (byCat[it.cat] || 0) + it.amt; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = cats[0] ? cats[0][1] : 1;

  // pendientes de la semana activa (exec)
  const semActiva = D.planSemanas.find((s) => s.s === D.semana);
  const pendActiva = semActiva ? semActiva.items.filter((it) => !isExec(D.semana, it)) : [];

  return (
    <div className={`dk t-calido dk-app ${mode === "exec" ? "side-rail" : ""}`}>
      {/* ---------- SIDEBAR ---------- */}
      <aside className="dk-side">
        <div className="dk-brand">
          <span className="mark"><Icon name="bolt" size={18} fill /></span>
          <span className="nm">Flujo</span>
        </div>
        <nav className="dk-nav">
          <button className="dk-navitem on"><Icon name="list" size={19} /> Inicio de mes</button>
          <button className="dk-navitem"><Icon name="calendar" size={19} /> Esta semana <span className="badge">{pendList.length}</span></button>
          <button className="dk-navitem"><Icon name="wallet" size={19} /> Bolsillos</button>
          <button className="dk-navitem"><Icon name="archive" size={19} /> Historial</button>
        </nav>
        <p className="dk-navlabel">Mes</p>
        <nav className="dk-nav">
          <button className="dk-navitem on" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            <Icon name="sun" size={18} /> {D.mesLabel}
          </button>
          <button className="dk-navitem"><Icon name="plus" size={18} /> Iniciar Junio 2026</button>
        </nav>

        {mode === "exec" && (
          <div className="dk-side-rail">
            <div className="dk-card accent">
              <h4><Icon name="calendar" size={16} /> Por pagar esta semana <span className="pill">{D.semana}</span></h4>
              {pendActiva.length === 0
                ? <div className="dk-rail-empty"><Icon name="check" size={22} /><p>Semana {D.semana} al día</p></div>
                : pendActiva.map((it) => (
                    <div className="dk-todo" key={it.n}>
                      <span className="dk-cc-ic"><Icon name={D.catIcon[it.cat] || "wallet"} size={15} /></span>
                      <div className="tx"><p className="t">{it.n}</p><p className="d">{COP(it.amt)}</p></div>
                      <button className="dk-exec-btn" onClick={() => ejecutar(D.semana, it)}>Ejecutar</button>
                    </div>
                  ))}
            </div>

            <div className="dk-card">
              <h4><Icon name="wallet" size={15} /> Fuentes de pago</h4>
              {D.cuentas.map((c) => (
                <div className="dk-acct" key={c.k}>
                  {c.persona ? <span className={`fl-person ${c.persona}`}>{c.persona === "c" ? "C" : "A"}</span>
                             : <span className="sq"><Icon name="wallet" size={13} /></span>}
                  <span className="nm">{c.k}</span>
                  <span className="v">{COP(c.v)}</span>
                </div>
              ))}
              <div className="dk-acct" style={{ borderTop: "2px solid var(--line)" }}>
                <span className="nm" style={{ fontWeight: 700, color: "var(--ink)" }}>Total disponible</span>
                <span className="v" style={{ fontSize: 15 }}>{COP(totalCuentas)}</span>
              </div>
            </div>

            <div className="dk-card">
              <h4><Icon name="chart" size={15} /> Progreso por semana</h4>
              {D.planSemanas.map((sm) => {
                const ex = (board[sm.s] || []).filter((it) => isExec(sm.s, it));
                const n = (board[sm.s] || []).length;
                const p = n ? Math.round((ex.length / n) * 100) : 0;
                return (
                  <div className="dk-catbar" key={sm.s}>
                    <div className="row"><span className="n">{sm.s} · {ex.length}/{n}</span><span className="v">{p}%</span></div>
                    <div className="fl-bar pos"><i style={{ width: `${p}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="dk-user">
          <span className="av"><span className="fl-person c">C</span><span className="fl-person a">A</span></span>
          <span className="tx"><p className="t">Familia Villamil</p><p className="d">Camilo &amp; Angie</p></span>
        </div>
      </aside>

      {/* ---------- MAIN ---------- */}
      <div className="dk-main">
        <header className="dk-topbar">
          <div>
            <h1 className="ttl">Inicio de mes <span className="dk-monthpill"><Icon name="sun" size={13} /> {D.mesLabel}</span></h1>
            <p className="sub">
              {mode === "plan"
                ? "Distribuyan el mes en semanas, confirmen saldos y proyecten el superávit."
                : <>Vayan ejecutando los pagos fijos · semana activa <b style={{ color: "var(--ink)" }}>{D.semana}</b> ({D.semanaRango}).</>}
            </p>
          </div>

          <div className="dk-modeseg">
            <button className={mode === "plan" ? "on" : ""} onClick={() => switchMode("plan")}><Icon name="list" size={15} /> Planeación</button>
            <button className={mode === "exec" ? "on" : ""} onClick={() => switchMode("exec")}><Icon name="check" size={15} /> Ejecución</button>
          </div>

          <div className="dk-actions">
            <button className="fl-btn ghost sm" onClick={() => setViewMode("mobile")}>
              <Icon name="phone" size={15} /> Vista móvil
            </button>
            {mode === "plan"
              ? <button className="fl-btn primary sm" onClick={() => setCerrada(true)} disabled={cerrada}
                        style={cerrada ? { opacity: 0.5, cursor: "default" } : null}>
                  <Icon name={cerrada ? "check" : "flag"} size={15} /> {cerrada ? "Plan cerrado" : "Cerrar planificación"}
                </button>
              : <button className="fl-btn primary sm"><Icon name="bolt" size={15} fill /> Registrar pago</button>}
          </div>
        </header>

        <div className="dk-content">
          {mode === "plan" ? (
            /* ============ PLANEACIÓN ============ */
            <>
              {cerrada && (
                <div className="dk-closed">
                  <Icon name="check" size={18} />
                  Planificación de {D.mesLabel} cerrada · {all.length} conceptos distribuidos en 4 semanas
                  <button className="x" onClick={() => setCerrada(false)}>Reabrir</button>
                </div>
              )}

              <div className="dk-kpis">
                <div className="dk-kpi">
                  <p className="k"><Icon name="wallet" size={14} /> Ingresos del mes</p>
                  <p className="v">{COP(ingresos)}</p>
                  <div className="fl-split" style={{ marginTop: 12 }}>
                    <span className="c" style={{ width: "58%" }} /><span className="a" style={{ width: "42%" }} />
                  </div>
                  <div className="fl-legend" style={{ marginTop: 9 }}>
                    <span className="side"><span className="fl-person c">C</span><span className="vl">{COP(D.ingresos.camilo, { compact: true })}</span></span>
                    <span className="side"><span className="vl">{COP(D.ingresos.angie, { compact: true })}</span><span className="fl-person a">A</span></span>
                  </div>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="list" size={14} /> Presupuestado</p>
                  <p className="v">{COP(D.presupuestado)}</p>
                  <p className="h">Fijos {COP(totalFijos, { compact: true })} + bolsillos</p>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="lock" size={14} /> Total fijos del mes</p>
                  <p className="v">{COP(totalFijos)}</p>
                  <p className="h">{all.length} conceptos · {Math.round((totalFijos / ingresos) * 100)}% del ingreso</p>
                </div>
                <div className="dk-kpi feature">
                  <p className="k"><Icon name="trophy" size={14} /> Proyección superávit</p>
                  <p className="v" style={{ color: proy >= 0 ? "var(--pos)" : "var(--neg)" }}>{proy >= 0 ? "+" : ""}{COP(proy)}</p>
                  <p className="h">ingresos − presupuesto</p>
                </div>
              </div>

              <div className="dk-layout solo">
                <div className="dk-board-panel">
                  <div className="dk-board-head">
                    <h3>Distribución de fijos por semana</h3>
                    <span className="cnt">{all.length} conceptos · {COP(totalFijos, { compact: true })}</span>
                    <div className="dk-filters">
                      {["todas", "S1", "S2", "S3", "S4"].map((f) => (
                        <button key={f} className={`dk-fchip ${focus === f ? "on" : ""}`} onClick={() => setFocus(f)}>
                          {f === "todas" ? "Todas" : f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`dk-board ${focus !== "todas" ? "focus-one" : ""}`}>
                    {D.planSemanas.map((sm) => (
                      <DkWeek key={sm.s} sm={sm} items={board[sm.s]} flow={flujo[sm.s]} mode="plan" focus={focus} isExec={isExec} ejecutar={ejecutar}
                              openCard={openCard} onToggle={toggleCard} onConfirmExec={confirmExec} onSavePlan={savePlan}
                              execMeta={execMeta} planMarks={planMarks}
                              onDragStartCard={onDragStartCard} onDragEndCard={onDragEndCard} onDropWeek={moveConcept}
                              dragName={dragName} dropHover={dropHover} setDropHover={setDropHover} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ============ EJECUCIÓN ============ */
            <>
              <div className="dk-kpis">
                <div className="dk-kpi">
                  <p className="k"><Icon name="check" size={14} /> Ejecutado · fijos</p>
                  <p className="v">{COP(ejecFijos)}</p>
                  <div className="fl-bar" style={{ marginTop: 12 }}><i style={{ width: `${pctEjec}%` }} /></div>
                  <p className="h">{pctEjec}% de {COP(totalFijos, { compact: true })}</p>
                </div>
                <div className="dk-kpi warn">
                  <p className="k"><Icon name="clock" size={14} /> Por pagar</p>
                  <p className="v" style={{ color: "var(--warn)" }}>{COP(pendMonto)}</p>
                  <p className="h">{pendList.length} conceptos pendientes</p>
                </div>
                <div className="dk-kpi">
                  <p className="k"><Icon name="calendar" size={14} /> Esta semana · {D.semana}</p>
                  <p className="v">{COP(pendActiva.reduce((s, it) => s + it.amt, 0))}</p>
                  <p className="h">{pendActiva.length} por pagar · cierra en {D.diasRestantes} días</p>
                </div>
                <div className="dk-kpi feature">
                  <p className="k"><Icon name="wallet" size={14} /> Disponible en cuentas</p>
                  <p className="v">{COP(totalCuentas)}</p>
                  <p className="h">cubre {Math.round((totalCuentas / Math.max(pendMonto, 1)) * 100)}% de lo pendiente</p>
                </div>
              </div>

              <div className="dk-layout solo">
                <div className="dk-board-panel">
                  <div className="dk-board-head">
                    <h3>Pagos fijos por semana</h3>
                    <span className="cnt">{ejecFijos > 0 ? `${pctEjec}% ejecutado` : "sin ejecutar"} · {pendList.length} pendientes</span>
                    <div className="dk-filters">
                      {["todas", "S1", "S2", "S3", "S4"].map((f) => (
                        <button key={f} className={`dk-fchip ${focus === f ? "on" : ""}`} onClick={() => setFocus(f)}>
                          {f === "todas" ? "Todas" : f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`dk-board ${focus !== "todas" ? "focus-one" : ""}`}>
                    {D.planSemanas.map((sm) => (
                      <DkWeek key={sm.s} sm={sm} items={board[sm.s]} flow={flujo[sm.s]} mode="exec" focus={focus} isExec={isExec} ejecutar={ejecutar} activa={sm.s === D.semana}
                              openCard={openCard} onToggle={toggleCard} onConfirmExec={confirmExec} onSavePlan={savePlan}
                              execMeta={execMeta} planMarks={planMarks} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.M1Desktop = M1Desktop;
