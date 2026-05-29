/* ============================================================
   FLUJO · m1-desktop.jsx — Inicio de mes (M1) vista escritorio
   ============================================================ */
const WK_LABEL = { S1: "1–7 may", S2: "8–10 may", S3: "11–17 may", S4: "18–31 may" };

function M1Desktop() {
  const { setViewMode } = useNav();
  const [wk, setWk] = useState("todas");
  const [saldosOk, setSaldosOk] = useState(false);
  const [done, setDone] = useState({});   // `${semana}-${n}` -> true

  const all = D.planSemanas.flatMap((s) => s.items.map((it) => ({ ...it, semana: s.s })));
  const isExec = (it) => it.estado === "ejecutado" || done[`${it.semana}-${it.n}`];
  const filtered = wk === "todas" ? all : all.filter((it) => it.semana === wk);

  const totalFijos = all.reduce((s, it) => s + it.amt, 0);
  const ejecFijos = all.filter(isExec).reduce((s, it) => s + it.amt, 0);
  const pendientes = all.filter((it) => !isExec(it)).length;
  const ingresos = D.ingresos.camilo + D.ingresos.angie;
  const proy = ingresos - D.presupuestado;

  // resumen por categoría
  const byCat = {};
  all.forEach((it) => { byCat[it.cat] = (byCat[it.cat] || 0) + it.amt; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = cats[0] ? cats[0][1] : 1;

  const ejecutar = (it) => setDone((d) => ({ ...d, [`${it.semana}-${it.n}`]: true }));

  // filas (con encabezados de grupo si "todas")
  const rows = [];
  if (wk === "todas") {
    D.planSemanas.forEach((s) => {
      rows.push({ group: s.label });
      s.items.forEach((it) => rows.push({ it: { ...it, semana: s.s } }));
    });
  } else {
    filtered.forEach((it) => rows.push({ it }));
  }

  return (
    <div className="dk t-calido dk-app">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="dk-side">
        <div className="dk-brand">
          <span className="mark"><Icon name="bolt" size={18} fill /></span>
          <span className="nm">Flujo</span>
        </div>
        <nav className="dk-nav">
          <button className="dk-navitem on"><Icon name="list" size={19} /> Inicio de mes</button>
          <button className="dk-navitem"><Icon name="calendar" size={19} /> Esta semana <span className="badge">{pendientes}</span></button>
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
        <div className="dk-user">
          <span className="av"><span className="fl-person c">C</span><span className="fl-person a">A</span></span>
          <span className="tx"><p className="t">Familia Villamil</p><p className="d">Camilo & Angie</p></span>
        </div>
      </aside>

      {/* ---------- MAIN ---------- */}
      <div className="dk-main">
        <header className="dk-topbar">
          <div>
            <h1 className="ttl">Inicio de mes <span className="dk-monthpill"><Icon name="sun" size={13} /> {D.mesLabel}</span></h1>
            <p className="sub">Planeen el mes, confirmen saldos y ejecuten los pagos fijos — juntos.</p>
          </div>
          <div className="dk-actions">
            <button className="fl-btn ghost sm" onClick={() => setViewMode("mobile")}>
              <Icon name="phone" size={15} /> Vista móvil
            </button>
            <button className={`fl-btn ${saldosOk ? "ghost" : "ghost"} sm`} onClick={() => setSaldosOk(true)}
                    style={saldosOk ? { color: "var(--pos)", borderColor: "var(--pos)" } : null}>
              {saldosOk ? <><Icon name="check" size={15} /> Saldos confirmados</> : <><Icon name="wallet" size={15} /> Confirmar saldos</>}
            </button>
            <button className="fl-btn primary sm"><Icon name="flag" size={15} /> Cerrar planificación</button>
          </div>
        </header>

        <div className="dk-content">
          {/* KPIs */}
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
              <p className="k"><Icon name="check" size={14} /> Ejecutado · fijos</p>
              <p className="v">{COP(ejecFijos)}</p>
              <div className="fl-bar" style={{ marginTop: 12 }}><i style={{ width: `${Math.round((ejecFijos / totalFijos) * 100)}%` }} /></div>
              <p className="h">{Math.round((ejecFijos / totalFijos) * 100)}% · {pendientes} pendientes</p>
            </div>
            <div className="dk-kpi">
              <p className="k"><Icon name="trophy" size={14} /> Proyección superávit</p>
              <p className="v" style={{ color: proy >= 0 ? "var(--pos)" : "var(--neg)" }}>{proy >= 0 ? "+" : ""}{COP(proy)}</p>
              <p className="h">ingresos − presupuesto</p>
            </div>
          </div>

          {/* split: tabla + rail */}
          <div className="dk-grid">
            {/* tabla */}
            <div className="dk-panel">
              <div className="dk-panel-head">
                <h3>Conceptos fijos</h3>
                <span className="cnt">{filtered.length} conceptos</span>
                <div className="dk-filters">
                  {["todas", "S1", "S2", "S3", "S4"].map((f) => (
                    <button key={f} className={`dk-fchip ${wk === f ? "on" : ""}`} onClick={() => setWk(f)}>
                      {f === "todas" ? "Todas" : f}
                    </button>
                  ))}
                </div>
              </div>
              <table className="dk-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    {wk === "todas" && <th>Sem.</th>}
                    <th className="num">Monto</th>
                    <th>Estado</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) =>
                    r.group ? (
                      <tr className="dk-grouprow" key={`g${i}`}>
                        <td colSpan={wk === "todas" ? 6 : 5}>{r.group}</td>
                      </tr>
                    ) : (
                      <Row key={`${r.it.semana}-${r.it.n}`} it={r.it} showWk={wk === "todas"} exec={isExec(r.it)} onExec={() => ejecutar(r.it)} />
                    )
                  )}
                </tbody>
                <tfoot>
                  <tr className="dk-foot">
                    <td className="lbl">Total fijos {wk !== "todas" ? `· ${wk}` : ""}</td>
                    <td></td>
                    {wk === "todas" && <td></td>}
                    <td className="num tot">{COP(filtered.reduce((s, it) => s + it.amt, 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* rail */}
            <div className="dk-rail">
              <div className="dk-card">
                <h4><Icon name="wallet" size={16} /> Saldos por cuenta</h4>
                {D.cuentas.map((c) => (
                  <div className="dk-acct" key={c.k}>
                    {c.persona ? <span className={`fl-person ${c.persona}`}>{c.persona === "c" ? "C" : "A"}</span>
                               : <span className="sq"><Icon name="wallet" size={13} /></span>}
                    <span className="nm">{c.k}</span>
                    <span className="v">{COP(c.v)}</span>
                  </div>
                ))}
                <div className="dk-acct" style={{ borderTop: "2px solid var(--line)" }}>
                  <span className="nm" style={{ fontWeight: 700, color: "var(--ink)" }}>Total</span>
                  <span className="v" style={{ fontSize: 15 }}>{COP(D.cuentas.reduce((s, c) => s + c.v, 0))}</span>
                </div>
                <button className={`fl-btn ${saldosOk ? "ghost" : "primary"} block sm`} style={{ marginTop: 14 }}
                        onClick={() => setSaldosOk(true)}
                        {...(saldosOk ? { style: { marginTop: 14, color: "var(--pos)", borderColor: "var(--pos)" } } : {})}>
                  {saldosOk ? <><Icon name="check" size={15} /> Confirmados · 1 may</> : "Confirmar saldos del mes"}
                </button>
              </div>

              <div className="dk-card">
                <h4><Icon name="lock" size={15} /> Aprobaciones</h4>
                <div className="dk-approval">
                  <Icon name="info" size={20} className="ic" style={{ color: "var(--warn)", flex: "none" }} />
                  <div className="tx"><p className="t">Curso inglés · Angie</p><p className="d">S4 · {COP(220000)} — requiere visto bueno</p></div>
                  <button className="dk-exec-btn">Aprobar</button>
                </div>
                <div className="dk-acct" style={{ marginTop: 4 }}>
                  <span className="fl-person c">C</span>
                  <span className="nm">Arriendo</span>
                  <span className="dk-done"><Icon name="check" size={13} /> aprobado</span>
                </div>
              </div>

              <div className="dk-card">
                <h4><Icon name="chart" size={15} /> Por categoría</h4>
                {cats.map(([cat, amt]) => (
                  <div className="dk-catbar" key={cat}>
                    <div className="row">
                      <span className="n">{cat}</span>
                      <span className="v">{COP(amt, { compact: true })}</span>
                    </div>
                    <div className="fl-bar"><i style={{ width: `${(amt / catMax) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ it, showWk, exec, onExec }) {
  return (
    <tr>
      <td>
        <div className="dk-concepto">
          <span className="ic"><Icon name={D.catIcon[it.cat] || "wallet"} size={17} /></span>
          <span className="nm">{it.n}</span>
          {it.aprob && <span className="fl-badge primary" style={{ fontSize: 9, padding: "1px 6px" }}><Icon name="lock" size={9} /></span>}
        </div>
      </td>
      <td style={{ color: "var(--ink-soft)" }}>{it.cat}</td>
      {showWk && <td><span className="dk-wk">{it.semana}</span></td>}
      <td className="num"><span className="dk-amt">{COP(it.amt)}</span></td>
      <td>
        {exec
          ? <span className="fl-badge pos"><Icon name="check" size={11} /> Ejecutado</span>
          : <span className="fl-badge warn"><span className="dot" /> Pendiente</span>}
      </td>
      <td style={{ textAlign: "right" }}>
        {exec
          ? <span className="dk-done"><Icon name="check" size={13} /> listo</span>
          : <button className="dk-exec-btn" onClick={onExec}>Ejecutar</button>}
      </td>
    </tr>
  );
}

window.M1Desktop = M1Desktop;
