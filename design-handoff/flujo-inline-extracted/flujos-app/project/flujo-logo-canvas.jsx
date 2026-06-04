/* ============================================================
   FLUJO · flujo-logo-canvas.jsx
   Lienzo de exploración del símbolo (3 lecturas) + pruebas de
   tamaño (favicon / app icon). Usa DesignCanvas + FlujoMark.
   ============================================================ */
const { useState: useStateLC } = React;

const TILE_DARK = "linear-gradient(152deg, #C2185B 0%, #9B1850 52%, #8B1A4A 100%)";
const CREAM = "#FBF3EE";
const INK = "#3a2630";
const INK_SOFT = "#7a5d68";

/* ---- una fila de tamaños reales (legibilidad) ---- */
function SizeRow({ variation }) {
  const sizes = [48, 32, 24, 16];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
      {sizes.map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ height: 48, display: "flex", alignItems: "center" }}>
            <FlujoMark variation={variation} px={s} />
          </div>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10.5, color: INK_SOFT, letterSpacing: "0.02em" }}>
            {s}px
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- baldosas de app icon ---- */
function Tiles({ variation }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 92, height: 92, borderRadius: 22, background: TILE_DARK,
          display: "grid", placeItems: "center",
          boxShadow: "0 1px 2px rgba(120,20,60,.18), 0 10px 26px rgba(120,20,60,.20)",
        }}>
          <FlujoMark variation={variation} px={70} palette="cream" />
        </div>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: INK_SOFT }}>teja</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 92, height: 92, borderRadius: 22, background: CREAM,
          display: "grid", placeItems: "center",
          boxShadow: "inset 0 0 0 1px rgba(120,20,60,.10), 0 10px 26px rgba(120,20,60,.10)",
        }}>
          <FlujoMark variation={variation} px={70} palette="brand" />
        </div>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: INK_SOFT }}>crema</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 92, height: 92, borderRadius: 999, background: "#fff",
          display: "grid", placeItems: "center",
          boxShadow: "inset 0 0 0 1px rgba(120,20,60,.10), 0 10px 26px rgba(120,20,60,.10)",
        }}>
          <FlujoMark variation={variation} px={66} palette="brand" />
        </div>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: INK_SOFT }}>círculo</span>
      </div>
    </div>
  );
}

/* ---- tarjeta de una variación ---- */
function VariantCard({ variation, name, tagline }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: "#fff", borderRadius: 18,
      boxShadow: "0 1px 2px rgba(120,20,60,.05), 0 10px 30px rgba(120,20,60,.07)",
      padding: "26px 28px 30px", display: "flex", flexDirection: "column", gap: 22,
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    }}>
      <div>
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", color: "#C2185B", textTransform: "uppercase" }}>
          {variation} · símbolo
        </div>
        <div style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 700, fontSize: 23, color: INK, letterSpacing: "-0.02em", marginTop: 6 }}>
          {name}
        </div>
        <div style={{ fontSize: 13.5, color: INK_SOFT, marginTop: 4, lineHeight: 1.45 }}>{tagline}</div>
      </div>

      {/* símbolo grande sobre crema */}
      <div style={{
        background: "#FBF6F2", borderRadius: 14, padding: "26px 0",
        display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(120,20,60,.06)",
      }}>
        <FlujoMark variation={variation} px={188} />
      </div>

      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a7d88", fontWeight: 700, marginBottom: 14 }}>
          Tamaño real · favicon
        </div>
        <SizeRow variation={variation} />
      </div>

      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a7d88", fontWeight: 700, marginBottom: 14 }}>
          App icon
        </div>
        <Tiles variation={variation} />
      </div>
    </div>
  );
}

/* ---- nota sobre las seis líneas ---- */
function MeaningCard() {
  const members = [
    ["Madre / padre", "una corriente que sostiene"],
    ["Madre / padre", "la que fluye al lado"],
    ["Hijo", "un cauce propio, ya en marcha"],
    ["Hijo", "el más reciente, su ritmo"],
    ["El que no nació", "presente, igual de necesario"],
    ["La mascota", "el quiebre alegre del agua"],
  ];
  return (
    <div style={{
      width: "100%", height: "100%", background: TILE_DARK, borderRadius: 18,
      padding: "30px 30px 32px", color: "#fff",
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
      display: "flex", flexDirection: "column", gap: 22,
      boxShadow: "0 10px 30px rgba(120,20,60,.18)",
    }}>
      <FlujoMark variation="A" px={120} palette="cream" />
      <div>
        <div style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 700, fontSize: 25, letterSpacing: "-0.02em" }}>
          Seis líneas, un mismo cauce
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.78)", marginTop: 8, lineHeight: 1.55, maxWidth: "40ch" }}>
          Seis corrientes avanzan en la misma dirección. Varían apenas en grosor y curva — nadie pesa más que nadie. Se mueven como una.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
        {members.map(([who, note], i) => (
          <div key={i} style={{
            display: "flex", alignItems: "baseline", gap: 12, padding: "10px 0",
            borderTop: i ? "1px solid rgba(255,255,255,.14)" : "none",
          }}>
            <span style={{
              width: 18, fontFamily: "ui-monospace, monospace", fontSize: 11,
              color: "rgba(255,255,255,.55)", flex: "none",
            }}>{(i + 1).toString().padStart(2, "0")}</span>
            <span style={{ fontWeight: 600, fontSize: 14, flex: "none" }}>{who}</span>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.62)", marginLeft: "auto", textAlign: "right" }}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
function LogoCanvas() {
  return (
    <DesignCanvas>
      <DCSection id="simbolo" title="Flujo · símbolo" subtitle="Seis corrientes que fluyen juntas — tres lecturas de la misma idea">
        <DCArtboard id="A" label="A · Corriente" width={372} height={620}>
          <VariantCard variation="A" name="Corriente serena" tagline="Paralelas, onda suave. Equilibrio y calma — la lectura más quieta." />
        </DCArtboard>
        <DCArtboard id="B" label="B · Confluencia" width={372} height={620}>
          <VariantCard variation="B" name="Confluencia" tagline="Recogidas atrás, abren hacia delante. Movimiento y futuro." />
        </DCArtboard>
        <DCArtboard id="C" label="C · Meandro" width={372} height={620}>
          <VariantCard variation="C" name="Meandro" tagline="El río que serpentea. Más fluidez, más vida en el agua." />
        </DCArtboard>
      </DCSection>

      <DCSection id="idea" title="La idea" subtitle="Qué representa cada línea">
        <DCArtboard id="meaning" label="Seis integrantes" width={440} height={560}>
          <MeaningCard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

Object.assign(window, { LogoCanvas });
