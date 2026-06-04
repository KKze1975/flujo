/* ============================================================
   FLUJO · screens.jsx — Home, Semana, Registro IA
   Cada pantalla recibe prop `theme` (.t-calido / .t-preciso / .t-vivo)
   ============================================================ */

/* ---------- HOME / Inicio ---------- */
function ScreenHome({ theme }) {
  return (
    <Phone theme={theme}>
      <div className="fl-appbar">
        <p className="eyebrow">Flujo · Salud financiera familiar</p>
        <h1>Mayo 2026</h1>
        <p className="sub">Semana activa: <b>S3</b> · faltan 3 días para el cierre</p>
        <div style={{ marginTop: 18 }}>
          <p className="balance-label">Disponible esta semana</p>
          <div className="balance">{COP(412000)}</div>
        </div>
      </div>

      <div className="fl-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="fl-action">
            <span className="ic"><Icon name="calendar" /></span>
            <span className="txt">
              <p className="t">Esta semana</p>
              <p className="d">S3 · gastos y registro diario</p>
            </span>
            <Icon name="arrow" size={18} style={{ color: "var(--ink-faint)" }} />
          </div>
          <div className="fl-action">
            <span className="ic"><Icon name="list" /></span>
            <span className="txt">
              <p className="t">Inicio de mes</p>
              <p className="d">Planificación · ejecución de fijos</p>
            </span>
            <Icon name="arrow" size={18} style={{ color: "var(--ink-faint)" }} />
          </div>
        </div>

        <p className="fl-sectlabel" style={{ marginTop: 4 }}>Mes activo · contexto</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="fl-row" style={{ marginBottom: 8 }}>
              <span className="fl-muted">Ejecutado</span>
              <span className="fl-num" style={{ fontSize: 14 }}>68% · {COP(3420000)}</span>
            </div>
            <div className="fl-bar"><i style={{ width: "68%" }} /></div>
            <p className="fl-faint" style={{ marginTop: 6 }}>de {COP(5030000)} presupuestado</p>
          </div>
          <div className="fl-divider" />
          <div className="fl-row">
            <span className="fl-muted">Semanas cerradas</span>
            <span className="fl-num" style={{ fontSize: 14, color: "var(--ink)" }}>2 / 4</span>
          </div>
          <div className="fl-row">
            <span className="fl-muted">Bolsillos al límite</span>
            <span className="fl-badge warn"><span className="dot" />1 · Gastos variables</span>
          </div>
        </div>

        <p className="fl-sectlabel" style={{ marginTop: 4 }}>Aporte del mes</p>
        <div className="fl-card">
          <div className="fl-row" style={{ marginBottom: 11 }}>
            <span className="fl-muted">Camilo + Angie</span>
            <span className="fl-num" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{COP(5030000)}</span>
          </div>
          <div className="fl-split">
            <span className="c" style={{ width: "58%" }} />
            <span className="a" style={{ width: "42%" }} />
          </div>
          <div className="fl-legend">
            <span className="side"><span className="fl-person c">C</span><span className="nm">Camilo</span><span className="vl">{COP(2920000)}</span></span>
            <span className="side"><span className="vl">{COP(2110000)}</span><span className="nm">Angie</span><span className="fl-person a">A</span></span>
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </Phone>
  );
}

function AcctMini({ label, v }) {
  return (
    <div>
      <p className="fl-faint" style={{ marginBottom: 4 }}>{label}</p>
      <p className="fl-num" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{COP(v)}</p>
    </div>
  );
}

/* ---------- SEMANA / Bolsillos + Gastos ---------- */
function ScreenSemana({ theme }) {
  const [tab, setTab] = useState("pend");
  const bolsillos = [
    { n: "Mercado", icon: "bag", g: 214300, t: 280000 },
    { n: "Entretenimiento", icon: "film", g: 86000, t: 120000 },
    { n: "Gastos variables", icon: "wallet", g: 163500, t: 150000 },
  ];
  const pend = [
    { n: "Gimnasio Angie", cat: "Salud", amt: 89000, icon: "user" },
    { n: "Gasolina", cat: "Transporte", amt: 70000, icon: "car" },
    { n: "Veterinario · Frida", cat: "Frida", amt: 145000, icon: "paw" },
  ];
  const exec = [
    { n: "Internet Claro", cat: "Servicios Públicos", amt: 89900, src: "Nequi", by: "c" },
    { n: "Netflix", cat: "Membresías", amt: 44900, src: "NU Camilo", by: "c" },
  ];

  return (
    <Phone theme={theme}>
      <div className="fl-appbar">
        <div className="fl-topnav">
          <button className="fl-back"><Icon name="back" size={17} /></button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20 }}>Semana 3</h1>
            <p className="sub" style={{ marginTop: 2 }}>Mayo 2026 · 11–17 may</p>
          </div>
        </div>
        <div>
          <div className="fl-row" style={{ marginBottom: 7 }}>
            <span className="balance-label" style={{ margin: 0 }}>Ejecutado esta semana</span>
            <span className="fl-num" style={{ fontSize: 14, color: "var(--appbar-ink)", fontWeight: 700 }}>62%</span>
          </div>
          <div className="fl-bar" style={{ background: "var(--appbar-hair)" }}>
            <i style={{ width: "62%", background: "var(--on-primary)" }} />
          </div>
          <p className="sub" style={{ marginTop: 6, fontSize: 12 }}>{COP(680400)} de {COP(1098000)}</p>
        </div>
      </div>

      <div className="fl-body">
        <p className="fl-sectlabel">Bolsillos · techo semanal</p>
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bolsillos.map((b, i) => {
            const pct = Math.round((b.g / b.t) * 100);
            const over = b.g > b.t;
            return (
              <div className="fl-bolsillo" key={b.n} style={i ? { borderTop: "1px solid var(--line)", paddingTop: 16 } : null}>
                <Ring pct={pct} over={over} />
                <div className="meta">
                  <p className="n">{b.n}</p>
                  <p className="amt">{COP(b.g)} <span style={{ color: "var(--ink-faint)" }}>/ {COP(b.t)}</span></p>
                </div>
                {over
                  ? <span className="fl-badge neg"><span className="dot" />+{COP(b.g - b.t)}</span>
                  : <span className="fl-badge pos">{COP(b.t - b.g)} libre</span>}
              </div>
            );
          })}
        </div>

        <div className="fl-tabs">
          <button className={`fl-tab ${tab === "pend" ? "on" : ""}`} onClick={() => setTab("pend")}>
            Pendientes <span className="cnt">3</span>
          </button>
          <button className={`fl-tab ${tab === "exec" ? "on" : ""}`} onClick={() => setTab("exec")}>
            Ejecutados <span className="cnt">2</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(tab === "pend" ? pend : exec).map((m) => (
            <div className="fl-concepto" key={m.n}>
              <div className="top">
                <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                  <span className="fl-chip" style={{ padding: 8, borderRadius: 12 }}><Icon name={m.icon || "wallet"} size={16} /></span>
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
              {tab === "pend" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="fl-btn pos sm" style={{ flex: 1 }}><Icon name="check" size={15} /> OK</button>
                  <button className="fl-btn ghost sm"><Icon name="receipt" size={15} /></button>
                  <button className="fl-btn ghost sm"><Icon name="pencil" size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="semana" />
    </Phone>
  );
}

/* ---------- REGISTRO IA / Propuesta de Claude ---------- */
function ScreenRegistro({ theme }) {
  return (
    <Phone theme={theme}>
      <div className="fl-appbar">
        <div className="fl-topnav" style={{ marginBottom: 4 }}>
          <button className="fl-back"><Icon name="back" size={17} /></button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20 }}>Registro rápido</h1>
          </div>
          <span className="fl-ai-pill" style={{ background: "var(--appbar-hair)", color: "var(--appbar-ink)" }}>
            <Icon name="sparkle" size={14} fill /> Claude
          </span>
        </div>
      </div>

      <div className="fl-body">
        {/* lo que escribió el usuario */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--primary)", color: "var(--on-primary)", padding: "11px 15px",
                        borderRadius: "18px 18px 6px 18px", maxWidth: "82%", fontSize: 14, fontWeight: 500 }}
               className={theme === "t-vivo" ? "" : ""}>
            “almuerzo con angie 38 mil, pagué con nequi”
          </div>
        </div>

        <div className="fl-ai-pill" style={{ alignSelf: "flex-start" }}>
          <Icon name="sparkle" size={14} fill /> Claude interpretó tu gasto
        </div>

        {/* propuesta */}
        <div className="fl-card" style={{ display: "flex", flexDirection: "column", gap: 15, padding: 18 }}>
          <div className="fl-row">
            <span className="fl-sectlabel" style={{ margin: 0 }}>Propuesta</span>
            <span className="fl-badge primary">Confianza alta</span>
          </div>

          <div className="fl-field">
            <label>Descripción</label>
            <div className="fl-input">Almuerzo con Angie</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fl-field">
              <label>Monto</label>
              <div className="fl-input num">{COP(38000)}</div>
            </div>
            <div className="fl-field">
              <label>Categoría</label>
              <div style={{ display: "flex", alignItems: "center", height: 41 }}>
                <span className="fl-chip"><Icon name="film" size={14} /> Recreación</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fl-field">
              <label>Semana</label>
              <div className="fl-input">S3</div>
            </div>
            <div className="fl-field">
              <label>Fuente</label>
              <div className="fl-input">Nequi</div>
            </div>
          </div>

          <div className="fl-field">
            <label>¿Quién pagó?</label>
            <div className="fl-tabs" style={{ marginTop: 2 }}>
              <button className="fl-tab on"><span className="fl-person c">C</span> Camilo</button>
              <button className="fl-tab"><span className="fl-person a">A</span> Angie</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="fl-btn ghost" style={{ flex: "0 0 auto" }}>Editar</button>
            <button className="fl-btn primary block" style={{ flex: 1 }}>
              <Icon name="check" size={17} /> Confirmar gasto
            </button>
          </div>
        </div>

        <p className="fl-faint" style={{ textAlign: "center", padding: "0 12px" }}>
          Sin concepto fijo vinculado · se guarda como gasto variable de la semana
        </p>
      </div>
    </Phone>
  );
}

/* ---------- bottom nav compartido ---------- */
function BottomNav({ active }) {
  const items = [
    { id: "home", label: "Inicio", icon: "home" },
    { id: "semana", label: "Semana", icon: "calendar" },
    { id: "fab", label: "", icon: "bolt" },
    { id: "mes", label: "Mes", icon: "chart" },
    { id: "cuentas", label: "Cuentas", icon: "wallet" },
  ];
  return (
    <div className="fl-bottomnav">
      {items.map((it) =>
        it.id === "fab" ? (
          <button className="fl-fab" key="fab"><Icon name="bolt" size={24} fill /></button>
        ) : (
          <div className={`fl-navitem ${active === it.id ? "on" : ""}`} key={it.id}>
            <Icon name={it.icon} size={22} />
            <span>{it.label}</span>
          </div>
        )
      )}
    </div>
  );
}

Object.assign(window, { ScreenHome, ScreenSemana, ScreenRegistro, BottomNav, AcctMini });
