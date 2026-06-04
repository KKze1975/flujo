/* ============================================================
   FLUJO · proto-shell.jsx — router, phone shell, primitivas
   Exporta a window: NavCtx, useNav, ProtoApp, AppBar, Sheet,
   BottomNav, Field, Segmented, ProgressPair
   ============================================================ */
const { createContext, useContext, useEffect, useRef } = React;

const NavCtx = createContext(null);
const useNav = () => useContext(NavCtx);

const MAIN_TABS = ["home", "semana", "mes", "historial"];

/* ---------- fit-to-viewport scaler ---------- */
function useFit(ref) {
  useEffect(() => {
    const fit = () => {
      if (!ref.current) return;
      const s = Math.min(1, (window.innerHeight - 28) / 844, (window.innerWidth - 28) / 390);
      ref.current.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ref]);
}

/* ---------- root app ---------- */
function ProtoApp({ start = "onboarding", view = "mobile" }) {
  const [route, setRoute] = useState({ name: start, params: {} });
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState(view);
  const [m1mode, setM1mode] = useState("plan");   // M1: "plan" | "exec"
  const fitRef = useRef(null);
  useFit(fitRef);

  const nav = (name, params = {}) => {
    setStack((s) => [...s, route]);
    setRoute({ name, params });
  };
  const replace = (name, params = {}) => setRoute({ name, params });
  const back = () => {
    setStack((s) => {
      if (!s.length) return s;
      setRoute(s[s.length - 1]);
      return s.slice(0, -1);
    });
  };
  const openSheet = (name, params = {}) => setSheet({ name, params });
  const closeSheet = () => setSheet(null);
  const showToast = (msg, icon = "check") => {
    setToast({ msg, icon });
    clearTimeout(window.__tt);
    window.__tt = setTimeout(() => setToast(null), 2400);
  };

  const Screen = (window.SCREENS || {})[route.name] || (() => <div style={{ padding: 40 }}>404 · {route.name}</div>);
  const SheetComp = sheet ? (window.SHEETS || {})[sheet.name] : null;
  const showNav = MAIN_TABS.includes(route.name);

  const ctx = { route, nav, replace, back, openSheet, closeSheet, showToast, canBack: stack.length > 0, viewMode, setViewMode, m1mode, setM1mode };

  // Vista de escritorio: M1 ocupa todo el viewport (fuera del marco de teléfono)
  const DesktopM1 = window.M1Desktop;
  if (viewMode === "desktop" && route.name === "mes" && DesktopM1) {
    return (
      <NavCtx.Provider value={ctx}>
        <DesktopM1 />
      </NavCtx.Provider>
    );
  }

  return (
    <NavCtx.Provider value={ctx}>
      <div className="proto-stage">
        <div className="proto-fit" ref={fitRef}>
          <div className="fl proto-phone t-calido">
            <div className="proto-notch" />
            <div className="proto-screen">
              <StatusBar />
              <div className="screen-scroll">
                <div className="screen-anim" key={route.name}>
                  <Screen {...route.params} />
                </div>
              </div>
              {showNav && <BottomNav active={route.name} />}
            </div>

            {SheetComp && (
              <div className="sheet-backdrop" onClick={closeSheet}>
                <div className="sheet" onClick={(e) => e.stopPropagation()}>
                  <SheetComp {...sheet.params} />
                </div>
              </div>
            )}

            {toast && (
              <div className="toast"><Icon name={toast.icon} size={17} /> {toast.msg}</div>
            )}
          </div>
        </div>
      </div>
    </NavCtx.Provider>
  );
}

/* ---------- app bar ---------- */
function AppBar({ eyebrow, title, subtitle, onBack, right, children, size = "lg" }) {
  const { back } = useNav();
  return (
    <div className="fl-appbar">
      {(onBack || right) && (
        <div className="fl-topnav">
          {onBack !== false && <button className="fl-back" onClick={back}><Icon name="back" size={17} /></button>}
          <div style={{ flex: 1 }} />
          {right}
        </div>
      )}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <h1 style={size === "sm" ? { fontSize: 21 } : null}>{title}</h1>}
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </div>
  );
}

/* ---------- bottom nav ---------- */
function BottomNav({ active }) {
  const { nav, replace, openSheet } = useNav();
  const go = (name) => replace(name);
  const items = [
    { id: "home", label: "Inicio", icon: "home" },
    { id: "semana", label: "Semana", icon: "calendar" },
    { id: "fab" },
    { id: "mes", label: "Mes", icon: "list" },
    { id: "historial", label: "Historial", icon: "archive" },
  ];
  return (
    <div className="fl-bottomnav">
      {items.map((it) =>
        it.id === "fab" ? (
          <button className="fl-fab" key="fab" onClick={() => openSheet("registro")} aria-label="Registro rápido">
            <Icon name="bolt" size={24} fill />
          </button>
        ) : (
          <button className={`fl-navitem ${active === it.id ? "on" : ""}`} key={it.id}
                  onClick={() => go(it.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Icon name={it.icon} size={22} />
            <span>{it.label}</span>
          </button>
        )
      )}
    </div>
  );
}

/* ---------- sheet header helper ---------- */
function SheetHead({ title, onClose }) {
  const { closeSheet } = useNav();
  return (
    <>
      <div className="sheet-grip" />
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose || closeSheet}><Icon name="x" size={16} /></button>
      </div>
    </>
  );
}

/* ---------- form primitives ---------- */
function Field({ label, children }) {
  return (
    <div className="fl-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
function Segmented({ options, value, onChange, render }) {
  return (
    <div className="fl-tabs">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        return (
          <button key={v} className={`fl-tab ${value === v ? "on" : ""}`} onClick={() => onChange(v)}>
            {render ? render(o) : (typeof o === "string" ? o : o.label)}
          </button>
        );
      })}
    </div>
  );
}
function ProgressPair({ plan, real }) {
  const max = Math.max(plan, real, 1);
  const over = real > plan;
  return (
    <div className="fl-pair">
      <div className="pp">
        <span className="plan" style={{ width: `${(plan / max) * 100}%` }} />
        <span className={`real ${over ? "over" : ""}`} style={{ width: `${(real / max) * 100}%` }} />
      </div>
    </div>
  );
}

Object.assign(window, { NavCtx, useNav, ProtoApp, AppBar, Sheet: null, BottomNav, SheetHead, Field, Segmented, ProgressPair });
