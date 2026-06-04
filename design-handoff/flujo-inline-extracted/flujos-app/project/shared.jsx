/* ============================================================
   FLUJO · shared.jsx — helpers, iconos, phone shell, poster
   Exporta a window: COP, Icon, Phone, StatusBar, Poster, Ring
   ============================================================ */
const { useState } = React;

/* ---------- money ---------- */
function COP(n, { compact = false } = {}) {
  if (compact && Math.abs(n) >= 1000) {
    const v = n / 1000;
    return "$" + (Number.isInteger(v) ? v : v.toFixed(0)) + "k";
  }
  return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

/* ---------- iconos (line, 24x24, stroke=currentColor) ---------- */
const PATHS = {
  bolt:     "M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l0-8z",
  calendar: "M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  list:     "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  archive:  "M3 7h18v3H3zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9.5 14h5",
  home:     "M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9",
  wallet:   "M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2zM17 13h.01",
  chart:    "M5 20V10M12 20V4M19 20v-7",
  plus:     "M12 5v14M5 12h14",
  camera:   "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L18 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  mic:      "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  check:    "M5 12.5 10 17.5 19.5 7",
  arrow:    "M5 12h14M13 6l6 6-6 6",
  back:     "M19 12H5M11 6l-6 6 6 6",
  sparkle:  "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z",
  receipt:  "M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21zM9 8h6M9 12h6",
  pencil:   "M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.5zM14 7l3 3",
  user:     "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6",
  bag:      "M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2",
  film:     "M3 5h18v14H3zM3 9h18M3 15h18M8 5v14M16 5v14",
  car:      "M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14v6H5zM7.5 14h.01M16.5 14h.01M5 17v2M19 17v2",
  paw:      "M12 13c2.5 0 4 2 4 3.5S14.5 19 12 19s-4-.5-4-2.5S9.5 13 12 13zM7 9.5a1.5 2 0 1 0 0-.01M17 9.5a1.5 2 0 1 0 0-.01M9.5 6.5a1.3 1.8 0 1 0 0-.01M14.5 6.5a1.3 1.8 0 1 0 0-.01",
  x:        "M6 6l12 12M18 6L6 18",
  send:     "M4 12l16-7-7 16-2.5-6.5z",
  clock:    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  trophy:   "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9 20h6M12 13v7",
  store:    "M4 9l1-4h14l1 4M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 20v-6h6v6",
  heart:    "M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z",
  book:     "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2zM5 4v16M18 18H7",
  lock:     "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  info:     "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  alert:    "M12 3l9 16H3zM12 10v4M12 17h.01",
  flag:     "M5 21V4M5 4c3-2 7 2 10 0v9c-3 2-7-2-10 0",
  cart:     "M3 4h2l2 12h11M7 16h11l1.5-8H6M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01",
  sun:      "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19",
  monitor:  "M3 5h18v11H3zM9 20h6M12 16v4",
  phone:    "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10.5 18h3",
};
function Icon({ name, size = 22, fill = false, style }) {
  const d = PATHS[name] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
         stroke={fill ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round"
         strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ---------- status bar ---------- */
function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-dots">
        <span>▮▮▮</span><span>≋</span><span>􀛨</span>
      </span>
    </div>
  );
}

/* ---------- phone shell ---------- */
function Phone({ theme, children }) {
  return (
    <div className={`fl phone ${theme}`}>
      <div className="phone-screen">
        <StatusBar />
        <div className="phone-scroll">{children}</div>
      </div>
    </div>
  );
}

/* ---------- progress ring (bolsillos) ---------- */
function Ring({ pct, over }) {
  const r = 23, c = 2 * Math.PI * r;
  const v = Math.min(pct, 100);
  const color = over ? "var(--neg)" : "var(--primary)";
  return (
    <div className="fl-ring">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeLinecap="round" strokeDasharray={c}
                strokeDashoffset={c - (c * v) / 100} />
      </svg>
      <span className="pct" style={over ? { color: "var(--neg)" } : null}>{pct}%</span>
    </div>
  );
}

/* ============================================================
   POSTER — hoja de sistema por dirección
   ============================================================ */
function Poster({ theme, name, tagline, blurb, swatches, fonts, duo }) {
  return (
    <div className={`fl fl-poster ${theme}`}>
      <div className="p-head">
        <p className="tag">{tagline}</p>
        <h2>{name}</h2>
        <p>{blurb}</p>
      </div>

      <div className="p-block">
        <p className="p-label">Paleta</p>
        <div className="p-swatches">
          {swatches.map((s) => (
            <div className="p-sw" key={s.nm}>
              <div className="chip" style={{ background: s.c }} />
              <span className="nm">{s.nm}</span>
              <span className="hx">{s.hx}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-block p-type">
        <p className="p-label">Tipografía · {fonts}</p>
        <div className="row">
          <span className="lab">Display</span>
          <span className="specimen-d" style={{ fontSize: 30 }}>Presupuesto familiar</span>
        </div>
        <div className="row">
          <span className="lab">Cifras</span>
          <span className="specimen-n" style={{ fontSize: 30 }}>$3.420.000</span>
        </div>
        <div className="row">
          <span className="lab">Texto</span>
          <span className="specimen-b" style={{ fontSize: 15, lineHeight: 1.5 }}>
            Cualquiera de los dos registra un gasto en lenguaje natural; Claude propone
            categoría y bolsillo.
          </span>
        </div>
      </div>

      {duo && (
        <div className="p-block">
          <p className="p-label">Identidad de pareja</p>
          <div className="fl-card">
            <div className="fl-row" style={{ marginBottom: 11 }}>
              <span className="fl-muted">Aporte del mes</span>
              <span className="fl-num" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>$5.030.000</span>
            </div>
            <div className="fl-split">
              <span className="c" style={{ width: "58%" }} />
              <span className="a" style={{ width: "42%" }} />
            </div>
            <div className="fl-legend">
              <span className="side"><span className="fl-person c">C</span><span className="nm">Camilo</span></span>
              <span className="side"><span className="nm">Angie</span><span className="fl-person a">A</span></span>
            </div>
          </div>
          <p className="fl-faint" style={{ marginTop: 10, lineHeight: 1.5 }}>
            Cada quién tiene su color — visible en quién pagó, aportes y ejecución. El “juntos”, hecho diseño.
          </p>
        </div>
      )}

      <div className="p-block">
        <p className="p-label">Componentes</p>
        <div className="p-components">
          <div className="p-comp-row">
            <button className="fl-btn primary sm">Confirmar</button>
            <button className="fl-btn ghost sm">Editar</button>
            <button className="fl-btn pos sm"><Icon name="check" size={15} /> OK</button>
            <span className="fl-fab" style={{ width: 40, height: 40, margin: 0 }}>
              <Icon name="bolt" size={18} fill />
            </span>
          </div>
          <div className="p-comp-row">
            <span className="fl-badge pos"><span className="dot" />Ejecutado</span>
            <span className="fl-badge warn"><span className="dot" />Pendiente</span>
            <span className="fl-badge primary">Confianza alta</span>
            <span className="fl-chip"><Icon name="bag" size={14} /> Mercado</span>
          </div>
          <div className="p-comp-row" style={{ gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="fl-row" style={{ marginBottom: 6 }}>
                <span className="fl-faint">Mercado</span>
                <span className="fl-num" style={{ fontSize: 12, color: "var(--ink-soft)" }}>$214k / $280k</span>
              </div>
              <div className="fl-bar"><i style={{ width: "76%" }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { COP, Icon, StatusBar, Phone, Ring, Poster });
