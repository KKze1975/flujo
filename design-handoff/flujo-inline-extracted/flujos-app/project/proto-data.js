/* ============================================================
   FLUJO · proto-data.js — datos mock del dominio (Mayo 2026)
   Familia Villamil · Camilo (c) + Angie (a)
   ============================================================ */
window.DATA = {
  mes: "2026-05",
  mesLabel: "Mayo 2026",
  semana: "S3",
  semanaRango: "11 – 17 may",
  diasRestantes: 3,

  ingresos: { camilo: 2920000, angie: 2110000 },
  presupuestado: 5030000,
  ejecutado: 3420000,
  disponibleSemana: 412000,
  semanasCerradas: 2,

  cuentas: [
    { k: "NU Camilo", v: 1240000, persona: "c" },
    { k: "NU Angie",  v: 680000,  persona: "a" },
    { k: "ARQ",       v: 3100000, persona: null },
    { k: "En mano",   v: 145000,  persona: null },
  ],

  /* iconos por categoría */
  catIcon: {
    "Casa": "home",
    "Servicios Públicos": "bolt",
    "Membresías": "film",
    "Educación": "book",
    "Salud": "heart",
    "Mercado y Alimentación": "cart",
    "Compromisos Financieros": "wallet",
    "Recreación": "film",
    "Transporte": "car",
    "Metas Familiares": "trophy",
    "Frida": "paw",
  },

  /* ── Bolsillos (techo semanal) ── */
  bolsillos: [
    { id: "merc", n: "Mercado",          icon: "cart", g: 214300, t: 280000,
      consumos: [
        { d: "Jumbo · mercado grande", amt: 142000, by: "a", day: "Lun 12" },
        { d: "Frutería La 70",         amt: 38300,  by: "c", day: "Mié 14" },
        { d: "Carnes El Buen Corte",   amt: 34000,  by: "a", day: "Vie 16" },
      ] },
    { id: "entr", n: "Entretenimiento", icon: "film", g: 86000, t: 120000,
      consumos: [
        { d: "Cine Colombia · 2 boletas", amt: 48000, by: "c", day: "Sáb 17" },
        { d: "Helados Crepes",            amt: 38000, by: "a", day: "Dom 18" },
      ] },
    { id: "vari", n: "Gastos variables", icon: "wallet", g: 163500, t: 150000,
      consumos: [
        { d: "Domicilio Rappi",      amt: 52000, by: "c", day: "Mar 13" },
        { d: "Farmacia · vitaminas", amt: 64500, by: "a", day: "Jue 15" },
        { d: "Parqueadero centro",   amt: 47000, by: "c", day: "Sáb 17" },
      ] },
  ],

  /* ── Semana activa (S3) ── */
  semanaPend: [
    { id: "p1", n: "Gimnasio Angie",     cat: "Salud",        amt: 89000 },
    { id: "p2", n: "Gasolina",           cat: "Transporte",   amt: 70000 },
    { id: "p3", n: "Veterinario · Frida", cat: "Frida",       amt: 145000 },
  ],
  semanaExec: [
    { id: "e1", n: "Internet Claro", cat: "Servicios Públicos", amt: 89900, src: "Nequi",     by: "c" },
    { id: "e2", n: "Netflix",        cat: "Membresías",         amt: 44900, src: "NU Camilo",  by: "c" },
  ],

  /* ── Inicio de mes / Planificación (M1) — conceptos fijos ── */
  planSemanas: [
    { s: "S1", label: "Semana 1 · 1–7 may", ingreso: 1460000, items: [
      { n: "Arriendo",            cat: "Casa",                   amt: 1450000, aprob: true,  estado: "ejecutado", by: "c" },
      { n: "Administración",      cat: "Casa",                   amt: 280000,  estado: "ejecutado", by: "c" },
      { n: "Tarjeta de crédito",  cat: "Compromisos Financieros", amt: 350000, estado: "ejecutado", by: "c" },
      { n: "Seguro médico",       cat: "Salud",                  amt: 180000,  estado: "ejecutado", by: "a" },
      { n: "Ahorro · viaje",      cat: "Metas Familiares",       amt: 300000,  estado: "ejecutado", by: "a" },
    ]},
    { s: "S2", label: "Semana 2 · 8–10 may", ingreso: 1055000, items: [
      { n: "Préstamo carro",  cat: "Compromisos Financieros", amt: 520000, estado: "ejecutado", by: "c" },
      { n: "Energía",         cat: "Servicios Públicos",      amt: 95000,  estado: "ejecutado", by: "c" },
      { n: "Agua",            cat: "Servicios Públicos",      amt: 62000,  estado: "ejecutado", by: "c" },
      { n: "Gas",             cat: "Servicios Públicos",      amt: 38000,  estado: "pendiente" },
      { n: "Spotify",         cat: "Membresías",              amt: 16900,  estado: "pendiente" },
    ]},
    { s: "S3", label: "Semana 3 · 11–17 may", ingreso: 1460000, items: [
      { n: "Internet Claro",  cat: "Servicios Públicos", amt: 89900, estado: "ejecutado", by: "c" },
      { n: "Netflix",         cat: "Membresías",         amt: 44900, estado: "ejecutado", by: "c" },
      { n: "Gimnasio Angie",  cat: "Salud",              amt: 89000, estado: "pendiente" },
      { n: "Veterinario · Frida", cat: "Frida",          amt: 145000, estado: "pendiente" },
    ]},
    { s: "S4", label: "Semana 4 · 18–31 may", ingreso: 1055000, items: [
      { n: "Curso inglés Angie", cat: "Educación", amt: 220000, estado: "pendiente" },
    ]},
  ],

  /* ── Cierre del domingo (revisión S3) ── */
  cierre: {
    semana: "S3",
    planeado: 1098000,
    ejecutado: 680400,
    remanente: 417600,
    pospuestos: [
      { n: "Gasolina", cat: "Transporte", amt: 70000 },
    ],
    sinClasificar: 1,
    aporteAngieProx: 540000,
    balanceProx: 612000,
    lineas: [
      { n: "Conceptos fijos S3", plan: 268800, real: 134800 },
      { n: "Bolsillo Mercado",   plan: 280000, real: 214300 },
      { n: "Entretenimiento",    plan: 120000, real: 86000 },
      { n: "Gastos variables",   plan: 150000, real: 163500 },
    ],
  },

  /* ── Historial de meses ── */
  historial: [
    { mes: "2026-04", label: "Abril 2026",   ing: 4980000, pre: 4980000, eje: 4760000, sup: 220000 },
    { mes: "2026-03", label: "Marzo 2026",   ing: 4920000, pre: 5010000, eje: 5180000, sup: -260000 },
    { mes: "2026-02", label: "Febrero 2026", ing: 4870000, pre: 4800000, eje: 4690000, sup: 180000 },
    { mes: "2026-01", label: "Enero 2026",   ing: 5240000, pre: 5100000, eje: 4980000, sup: 260000 },
  ],
};
