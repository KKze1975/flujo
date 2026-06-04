/* ============================================================
   FLUJO · flujo-logo.jsx
   Símbolo: seis corrientes que fluyen juntas, de izquierda a
   derecha — como arroyos de un mismo río. Cada línea, un
   integrante (dos madres/padres, dos hijos, un hijo que no
   nació, una mascota). Ninguna pesa más que otra.
   Exporta: FlujoMark, STREAMS, FLUJO_PALETTE
   ============================================================ */

/* ---------- viewBox y geometría base ---------- */
const VB = 120;            // lienzo cuadrado
const CY = 60;             // eje vertical
const X0 = 22, X1 = 98;    // recorrido horizontal (deja aire)
const N  = 9;              // muestras por corriente (suavidad)

/* pesos sutilmente distintos — nadie domina */
const WEIGHTS = [5.4, 6.0, 4.9, 5.8, 4.6, 5.2];

/* ---------- color: magenta cálido → rosa profundo ---------- */
const FLUJO_PALETTE = { top: "#C2185B", bottom: "#8B1A4A" };
function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function lerpHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
/* tono por línea según paleta */
function lineColor(i, palette) {
  const t = i / 5;
  if (palette === "cream") return lerpHex("#FBE9F0", "#F2C9D8", t); // claros sobre teja
  return lerpHex(FLUJO_PALETTE.top, FLUJO_PALETTE.bottom, t);
}

/* ---------- Catmull-Rom → Bézier (curvas orgánicas) ---------- */
function smooth(pts) {
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/* construye una corriente: yFn(t, i) → y, t∈[0,1] */
function stream(i, yFn) {
  const pts = [];
  for (let s = 0; s < N; s++) {
    const t = s / (N - 1);
    pts.push([X0 + (X1 - X0) * t, yFn(t, i)]);
  }
  return smooth(pts);
}

/* ============================================================
   VARIACIONES
   ============================================================ */
const SP = 14.4; // separación nominal entre líneas

/* A · CORRIENTE — casi paralelas, S muy leve que cae en cascada */
function variantA() {
  const amp = 4.8;
  return WEIGHTS.map((w, i) => {
    const yFn = (t, k) => {
      const wave = amp * Math.sin((t - 0.05 + k * 0.045) * Math.PI * 1.7); // S suave, desfasada
      const env = 0.9 + 0.1 * Math.sin(t * Math.PI);                       // se mantienen paralelas
      return CY + wave + (k - 2.5) * SP * env;
    };
    return { d: stream(i, yFn), w };
  });
}

/* B · CONFLUENCIA — recogidas (pero distintas) atrás, abren delante */
function variantB() {
  const amp = 5.5;
  return WEIGHTS.map((w, i) => {
    const yFn = (t, k) => {
      const wave = amp * Math.sin(t * Math.PI * 1.05);
      const env = 0.52 + 0.64 * t;                              // canal estrecho → abre
      return CY + wave * 0.5 + (k - 2.5) * SP * env;
    };
    return { d: stream(i, yFn), w };
  });
}

/* C · MEANDRO — río que serpentea, dos curvas suaves */
function variantC() {
  const amp = 10.5;
  return WEIGHTS.map((w, i) => {
    const yFn = (t, k) => {
      const wave = amp * Math.sin((t - 0.05 + k * 0.018) * Math.PI * 1.8);
      const env = 0.72 + 0.28 * Math.sin(t * Math.PI);
      return CY + wave + (k - 2.5) * SP * env;
    };
    return { d: stream(i, yFn), w };
  });
}

const STREAMS = { A: variantA(), B: variantB(), C: variantC() };

/* ============================================================
   COMPONENTE — el símbolo
   palette: "brand" (magenta→rosa) | "cream" (claros, sobre teja)
   ============================================================ */
function FlujoMark({ variation = "A", px = 120, palette = "brand", style }) {
  const lines = STREAMS[variation] || STREAMS.A;
  return (
    <svg width={px} height={px} viewBox={`0 0 ${VB} ${VB}`} style={style}
         fill="none" aria-label="Flujo" role="img"
         shapeRendering="geometricPrecision">
      {lines.map((ln, i) => (
        <path key={i} d={ln.d} stroke={lineColor(i, palette)} strokeWidth={ln.w}
              strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

Object.assign(window, { FlujoMark, STREAMS, FLUJO_PALETTE, lineColor });
