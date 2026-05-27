# FLUJO — Estado del Proyecto
Actualizado: Mayo 2026 | Fase: Construcción — Ticket 9 cerrado y verificado via API

---

## Misión

Promover salud y educación financiera familiar (Camilo, Angie, Lucas, Emma)
a través de una experiencia que facilite el manejo del presupuesto, motive
el ahorro, la optimización de recursos, la consecución de metas personales
y la visión de largo plazo.

---

## Flujos as-is — DOCUMENTADOS Y VALIDADOS

Instrucción: No preguntar cómo funciona el proceso actual. Ya está documentado aquí. Usarlo como contexto.

**Momento 1 — Inicio de mes (Camilo solo)**
Recibe ingreso en dólares, convierte a pesos. Abre el Sheet, ejecuta pagos
trasladando cada concepto de la columna "presupuestado" a "ejecutado",
registrando de qué cuenta salió el dinero (cuenta Camilo / cuenta Angie /
EN MANO / NEQUI). Los números pueden variar por tasa de cambio o por
decisiones de aplazamiento.

**Momento 2 — Planificación con Angie (juntos, inicio de mes)**
Revisan los movimientos del Momento 1. Deciden qué pagos se posponen según
disponibilidad. Planifican cómo el ingreso semanal de Angie cubre lo que
falta durante el mes.

**Momento 3 — Domingo (juntos, semanal)**
Comparan lo gastado contra lo planeado esa semana. Entienden dónde fue el
dinero. Proyectan la semana siguiente. Gastos típicos: mercado, mesada de
los niños, empleada doméstica, imprevistos.

---

## Flujos to-be — VALIDADOS

**Momento 1 — Camilo solo, inicio de mes**
Ejecuta pagos contra un presupuesto pre-aprobado usando una interfaz
estructurada (checklist ejecutable en desktop o móvil). Opera con autonomía.
Cualquier modificación queda registrada con trazabilidad — visible y
etiquetada para el Momento 2.

**Momento 2 — Camilo + Angie, inicio de mes**
Angie llega informada, no a ser puesta al día. Ve qué se pagó, qué se movió
y por qué. Planifican el resto del mes: total de Angie, distribución semanal,
movimientos entre semanas si es necesario. El sistema absorbe cambios sin
requerir cirugía manual.

**Momento 3 — Angie durante la semana + ambos el domingo**
Angie registra ingresos y gastos en lenguaje natural durante la semana.
El domingo tiene dos funciones: cierre de la semana que termina + ajuste
del plan para la semana siguiente.

**Momento 4 — Movimientos diarios (cualquier momento, cualquier actor)**
Camilo o Angie registran gastos durante la semana mediante nota rápida o
foto de factura. El sistema interpreta y propone categoría, bolsillo y fuente
de pago. El usuario confirma o corrige. Registra quien ejecuta el pago.

---

## Requisitos funcionales — VALIDADOS

| # | Requisito | Momento |
|---|---|---|
| R1 | Presupuesto base persistente y pre-aprobado | M1 |
| R2 | Desviaciones registradas, etiquetadas, visibles — no sobreescriben el plan | M1, M2 |
| R3 | Vista y registro independiente para Angie | M2, M3, M4 |
| R4 | Semanas como unidad operativa nativa | M2, M3, M4 |
| R5 | Cierre semanal automático | M3 |
| R6 | Plan semanal mutable sin romper el consolidado mensual | M3 |
| R7 | Registro conversacional con confirmación selectiva y corrección posterior | M4 |
| R7b | Historial de registros visible y corregible | M4 |
| R8 | Reasignación nativa con trazabilidad (origen, destino, razón) | M1, M2, M3 |
| R9 | Vista de impacto antes de confirmar una reasignación | M1, M3 |

---

## Esquema de datos — APROBADO

### H1 — Presupuesto Base

| Columna | Tipo | Detalle |
|---|---|---|
| id_concepto | string | {CATEGORIA_UPPERCASE}_{unix_timestamp} — generado por la app |
| nombre | string | Nombre legible |
| categoria | string | Casa / Servicios Públicos / Membresías y Suscripciones / Educación / Salud / Mercado y Alimentación / Compromisos Financieros / Recreación / Transporte / Metas Familiares / Frida |
| tipo | enum | fijo / bolsillo / discrecional |
| frecuencia | enum | mensual / bimestral / semanal |
| mes_activo_bimestral | string | Solo bimestral — meses separados por coma. Null en otros casos |
| monto_referencia | number | COP |
| semana_default | enum | S1 / S2 / S3 / S4 / variable |
| requiere_aprobacion | boolean | Si modificarlo requiere aprobación del otro actor |
| estado_concepto | enum | activo / retirado |
| fecha_retiro | date | Nullable |
| notas | string | Nullable |

### Categorías aprobadas (11)

Casa / Servicios Públicos / Membresías y Suscripciones / Educación / Salud /
Mercado y Alimentación / Compromisos Financieros / Recreación / Transporte /
Metas Familiares / Frida

### H2 — Mes Activo

| Columna | Tipo | Detalle |
|---|---|---|
| id_movimiento | string | MOV_{unix_timestamp} |
| id_concepto | string | FK a H1 |
| mes | string | 2026-05 |
| nombre_snapshot | string | Copia del nombre de H1 al crear — inmutable |
| categoria_snapshot | string | Copia de categoría al crear |
| tipo_snapshot | enum | Copia de tipo al crear |
| semana | enum | S1 / S2 / S3 / S4 |
| monto_presupuestado | number | COP |
| monto_ejecutado | number | COP — Null si no ejecutado |
| desviacion | number | monto_ejecutado - monto_presupuestado. Null si no ejecutado |
| estado | enum | pendiente / ejecutado / pospuesto / no_aplica |
| ejecutor | enum | camilo / angie |
| fuente_en_mano | boolean | |
| fuente_nequi | boolean | |
| fuente_camilo | boolean | |
| fuente_angie | boolean | |
| fecha_ejecucion | date | Nullable |
| razon_desviacion | string | Nullable |
| razon_postergacion | string | Nullable |
| comprobante_url | string | Nullable |
| pendiente_aprobacion | boolean | |
| notas | string | Nullable |

### H3 — Bolsillos

Rango A — Definición

| Columna | Tipo | Detalle |
|---|---|---|
| id_bolsillo | string | BOLSILLO_{unix_timestamp} |
| nombre | string | Frida / Entretenimiento / Mercado semanal / Mercado mensual / Fondo transporte / Angie |
| techo | number | COP — Null para bolsillo Angie |
| periodo | enum | mensual / semanal |
| color | string | Hex |
| estado_bolsillo | enum | activo / retirado |

Rango B — Consumos

| Columna | Tipo | Detalle |
|---|---|---|
| id_consumo | string | CONSUMO_{unix_timestamp} |
| id_bolsillo | string | FK a Rango A |
| mes | string | 2026-05 |
| semana | enum | S1 / S2 / S3 / S4 |
| descripcion | string | |
| monto | number | COP |
| ejecutor | enum | camilo / angie |
| fuente_en_mano | boolean | |
| fuente_nequi | boolean | |
| fuente_camilo | boolean | |
| fuente_angie | boolean | |
| fecha | date | |
| comprobante_url | string | Nullable |
| clasificado | boolean | False si pendiente de clasificación |

### H4 — Ingresos

Rango A — Ingresos Camilo

| Columna | Tipo | Detalle |
|---|---|---|
| id_ingreso | string | INGRESO_CAM_{unix_timestamp} |
| mes | string | 2026-05 |
| monto_cop | number | COP — sin conversión USD |
| cuenta_destino | enum | en_mano / nequi / camilo / angie |
| estado | enum | pendiente / confirmado |
| fecha_confirmacion | date | Nullable |
| notas | string | Nullable |

Rango B — Ingresos Angie

| Columna | Tipo | Detalle |
|---|---|---|
| id_ingreso | string | INGRESO_ANG_{unix_timestamp} |
| mes | string | 2026-05 |
| semana | enum | S1 / S2 / S3 / S4 |
| monto | number | COP |
| fecha | date | |
| notas | string | Nullable |

Remanente y saldo bolsillo Angie calculados en tiempo real desde H3 — sin campos calculados en H4.

### H5 — Semanas

Rango A — Cierre de semana

| Columna | Tipo | Detalle |
|---|---|---|
| id_cierre | string | CIERRE_{unix_timestamp} |
| mes | string | 2026-05 |
| semana | enum | S1 / S2 / S3 / S4 |
| fecha_cierre | date | |
| total_presupuestado | number | Snapshot |
| total_ejecutado | number | Snapshot |
| desviacion_total | number | Snapshot |
| remanente_angie | number | Snapshot |
| ubicacion_remanente_angie | string | Snapshot |
| conceptos_pospuestos | number | |
| conceptos_no_aplica | number | |
| gastos_sin_clasificar | number | Debe ser 0 al cerrar |
| cerrado_por | enum | camilo / angie |
| notas | string | Nullable |

Rango B — Plan semana siguiente

| Columna | Tipo | Detalle |
|---|---|---|
| id_plan | string | PLAN_{unix_timestamp} |
| mes | string | 2026-05 |
| semana | enum | S1 / S2 / S3 / S4 |
| fecha_plan | date | |
| aporte_angie_planeado | number | |
| remanente_angie_arrastrado | number | Snapshot |
| total_comprometido | number | |
| balance_proyectado | number | Calculado |
| notas | string | Nullable |

### H6 — Historial

| Columna | Tipo | Detalle |
|---|---|---|
| id_cierre_mes | string | CIERRE_MES_{unix_timestamp} |
| mes | string | 2026-05 |
| fecha_cierre | date | |
| total_presupuestado | number | |
| total_ejecutado | number | |
| desviacion_total | number | |
| deficit_superavit | number | Positivo = superávit |
| total_ingresos_camilo | number | |
| total_ingresos_angie | number | |
| total_ingresos | number | |
| cat_casa | number | |
| cat_servicios_publicos | number | |
| cat_membresias | number | |
| cat_educacion | number | |
| cat_salud | number | |
| cat_mercado_alimentacion | number | |
| cat_compromisos_financieros | number | |
| cat_recreacion | number | |
| cat_transporte | number | |
| cat_metas_familiares | number | |
| cat_frida | number | |
| semanas_cerradas | number | |
| cerrado_por | enum | camilo / angie |
| notas | string | Nullable |

---

## Presupuesto base — APROBADO

40 conceptos aprobados en sesión de diseño Mayo 2026.
Archivo fuente: H1_presupuesto_base.csv

### Gaps pendientes de completar

| Concepto | Gap |
|---|---|
| CDT NU | Sin techo — se alimenta de remanentes |
| Ropa | Monto pendiente |
| Claude Pro | ~105.000 — verificar cobro exacto en COP |

### Gaps resueltos en sesión Ticket 5

| Concepto | Monto confirmado |
|---|---|
| EPS / ARL / Pensión | 540.000 |
| Plan complementario | 740.000 |
| Dr. Sánchez (Angie) | 115.000 |
| Mercado mensual | 600.000 |
| Chucherías viernes | 40.000 |
| Ayuda mamá servicios | Retirado (recurrente desde junio 2026) |

### Decisiones de diseño tomadas en sesión de presupuesto

| Decisión | Detalle |
|---|---|
| Arriendo + Administración = un concepto | Monto combinado 5.172.500 |
| Categorías separadas: Servicios Públicos y Membresías | Antes agrupadas como "Servicios" |
| Educación como categoría independiente | Colegio sale de Compromisos Financieros |
| Frida como bolsillo único | Trazabilidad por ítem en consumos H3 |
| Imprevistos = flujo M4 + clasificación M3 | No es concepto en H1 |
| Fondo de emergencia en Metas Familiares | Meta: 2.000.000 — aporte mensual 200.000 |
| CDT NU en Metas Familiares | Se alimenta de remanentes — sin techo fijo |
| Celular Angie como bolsillo | Varía mensualmente — techo 80.000 |
| Entretenimiento techo 1.000.000 | 250.000 semanal |
| Provisión Mireyita separada | 100.000 mensual para primas y vacaciones |
| Trazabilidad anticipos Lucas | Se gestiona en M4 — no en H1 |
| Scouts, ropa, Rappi, Twilio | Puntuales — no en H1 |
| Préstamo Leonardo | Recurrente en cuotas — revisar cuotas restantes |
| Ayuda mamá servicios | Pasa a recurrente desde junio 2026 |

---

## Arquitectura técnica — APROBADA

| Componente | Decisión |
|---|---|
| Framework | Next.js 16.2.6 — App Router + TypeScript + Tailwind CSS |
| Runtime dev | Turbopack — activo por default de create-next-app |
| Backend | API Routes de Next.js — sin servidor separado |
| Base de datos MVP | Google Sheets — invisible para usuarios finales |
| Abstracción de datos | Camino B — lib/data/index.ts como contrato, sheets.ts como implementación |
| Deploy | Vercel — deploy automático en cada push a main |
| Autenticación MVP | PIN simple — actor: camilo / angie |
| Autenticación futura | Google OAuth — sin retrofit |
| Registro rápido | Claude API — JSON con campo confianza, costo menor a $0.20 USD/mes |
| Escrituras compuestas | batchUpdate — falla completa o no falla |

### Estructura de archivos actual

| Archivo | Estado |
|---|---|
| app/ | Directorio Next.js App Router |
| app/page.tsx | Server Component — fetches H2+H1+H4 y pasa props a MesM1 |
| app/api/conceptos/route.ts | Creado — GET devuelve H1 real desde Sheets |
| app/api/conceptos/[id]/route.ts | Creado — PATCH actualiza monto/semanaDefault/notas en H1 |
| app/api/mes/[mes]/iniciar/route.ts | Creado — POST inicializa mes en H2 (Ticket 5) |
| app/api/mes/[mes]/route.ts | Creado — GET devuelve H2 del mes (Ticket 6) |
| app/api/mes/[mes]/movimientos/[id]/route.ts | Creado — PATCH ejecutar/posponer/no_aplica en H2 |
| app/api/ingresos/camilo/[mes]/route.ts | Creado — GET + POST (upsert) ingreso Camilo en H4A |
| app/api/ingresos/angie/[mes]/route.ts | Creado — GET + PUT (upsert por semana) aportes Angie en H4B |
| lib/data/types.ts | Actualizado — Concepto, Movimiento, IngresoCamilo, IngresoAngie, CuentaDestino |
| lib/data/index.ts | Creado — IDataProvider con 24 métodos H1-H4 |
| lib/data/sheets.ts | Actualizado — todos los métodos H1-H4 implementados |
| lib/data/mock.ts | Creado — MockDataProvider con stubs |
| lib/data/provider.ts | Creado — singleton getProvider() |
| components/MesM1.tsx | Creado — pantalla M1 completa: lista, acciones, modales, visual Zoho-style |
| components/m1/ModalIngresoCamilo.tsx | Creado — monto COP, cuenta destino, estado |
| components/m1/ModalAporteAngie.tsx | Creado — grid S1-S4 con montos por semana |
| components/m1/ModalEditarConcepto.tsx | Creado — edita monto/semanaDefault/notas de H1 |
| components/m1/VistaPlanificacion.tsx | Creado — vista planificación M1 con balance, agregar concepto (B4) |
| components/m1/ModalAgregarConcepto.tsx | Creado — modal B4: tres ciclos de vida (solo este mes / cuotas / permanente) |
| app/api/mes/[mes]/conceptos/route.ts | Creado — POST crea concepto en H1 + movimiento en H2 (atómico) |
| .env.local | Creado — credenciales Google (gitignored) |
| ESTADO.md | En el repo — fuente de verdad |
| scripts/seed-h1.mjs | Creado — cargó 40 conceptos reales en H1 (uso único) |
| scripts/update-h1-montos.mjs | Creado — actualizó montos y retiró concepto |
| scripts/setup-h2.mjs | Creado — creó pestaña H2 con 22 headers |
| scripts/check-h2.mjs | Creado — verifica DoD en H2 |
| package.json | googleapis + next/font agregados |
| next.config.ts | Generado por create-next-app |

---

## Estado técnico

| Componente | Estado |
|---|---|
| Google Sheet nuevo | Activo — ID: 1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A — H1, H2, H4 operativos |
| Cuenta de servicio | psibot@psibot-495119.iam.gserviceaccount.com — configurada |
| Repo GitHub (github.com/KKze1975/flujo) | Activo — rama main |
| Next.js local | http://localhost:3000 — operativo |
| Ticket 7 — Pantalla M1 | Completo — commit y push realizados |
| Ticket 8 — Modo Planificación M1 + B4 | Completo y verificado en browser |
| Ticket 9 — Prueba integrada M1 Planificación + Ejecución | Completo — DoD 7/7 cubiertos via API |
| MesM1.tsx | Completo — lista 39 conceptos, acciones PATCH H2, modales H1/H4, visual Zoho-style con Inter |
| VistaPlanificacion.tsx | Completo — planificación, balance semanas, no aplica/posponer, agregar concepto (B4) |
| ModalAgregarConcepto.tsx | Completo — tres ciclos de vida: solo este mes / cuotas / permanente |
| API H2 PATCH | Operativo — ejecutar/posponer/no_aplica con cálculo de desviación y fecha |
| API POST /mes/[mes]/conceptos | Operativo — crea H1 + H2 atómico para B4 |
| API H4 | Operativo — upsert ingreso Camilo y aportes Angie por semana |
| Amazon WorkSpaces | Activo — entorno de desarrollo principal |
| Google Sheet original | Legacy — no se toca |

---

## Deuda técnica conocida

- 2 vulnerabilidades moderadas en dependencias npm — pendiente npm audit después del MVP
- Claude Code auto-update failed — resolver con: npm i -g @anthropic-ai/claude-code
- H6 tiene columnas cat_* desactualizadas — actualizar para reflejar las 11 categorías aprobadas
- scripts/seed-h1.mjs fue ejecutado — puede eliminarse o conservarse como referencia de re-seed
- Concepto mensual pospuesto genera doble fila en mes siguiente — revisar si es comportamiento deseado
- PATCH posponer no acepta razonPostergacion — el campo existe en H2 y en el tipo Movimiento pero el endpoint tipo:"posponer" no lo expone ni lo persiste en Sheets. Detectado en T9.

---

## Features futuras — fuera del MVP

- Modo oscuro (variables semánticas listas — sin retrofit)
- Tendencia histórica por concepto (requiere mínimo 3 meses en H6)
- Onboarding para usuarios fuera de familia Villamil
- Google OAuth como reemplazo del PIN simple
- Cola de operaciones para escrituras compuestas si el proyecto escala
- Pausa temporal de conceptos
- Sustitución vinculada de conceptos
- Drill-down por concepto en M3
- Alertas en M4
- HU-Agente M1: agente de IA que organiza M1 Planificación a nombre de Camilo
  y presenta un plan para aprobación. Lee H1 y H4, corre lógica de planificación,
  propone asignación de semanas y ajustes de balance, Camilo aprueba o ajusta
  puntualmente. Usa Claude API — infraestructura ya disponible en el stack.
- Rediseño UX navegación — segunda etapa post MVP. Principio: "don't make me think".
  Las acciones deben ser visibles, no descubribles.
  - Filtro por semana en vista M1 Planificación — ver S1/S2/S3/S4 de forma independiente.

---

## Decisiones tomadas

| Fecha | Decisión | Razón |
|---|---|---|
| Mayo 2026 | Reinicio desde diseño | Sprint 1 crasheó en Railway — design by accident |
| Mayo 2026 | Camino B para arquitectura frontend | Abstracción desde el inicio — migración futura sin reescribir frontend |
| Mayo 2026 | Sheet original pasa a legacy | No se migra, no se toca |
| Mayo 2026 | MVP acotado a familia Villamil | Onboarding para otros = feature futura |
| Mayo 2026 | Front web como única interfaz | Sheet invisible para usuarios |
| Mayo 2026 | Stack: Next.js + TypeScript + Tailwind + App Router | API Routes integradas — sin servidor separado |
| Mayo 2026 | Deploy: Vercel | Cero configuración — free tier suficiente |
| Mayo 2026 | Turbopack activo en desarrollo | Default de create-next-app — sin impacto en producción |
| Mayo 2026 | Repo anterior descartado | 44 objetos sin archivos rastreados — proyecto nuevo |
| Mayo 2026 | ESTADO.md vive en el repo | Repo privado — fuente de verdad junto al código |
| Mayo 2026 | Autenticación MVP: PIN simple | actor: camilo / angie — Google OAuth como feature futura |
| Mayo 2026 | Registro rápido: Claude API | JSON con campo confianza — costo menor a $0.20 USD/mes |
| Mayo 2026 | Escrituras compuestas: batchUpdate | Falla completa o no falla |
| Mayo 2026 | Bolsillo Angie: saldo en tiempo real desde H3 | Sin campos calculados en H4 |
| Mayo 2026 | Fuentes de pago: columnas booleanas | Filtrable directamente |
| Mayo 2026 | Snapshots en H2 | Historial inmutable ante cambios en H1 |
| Mayo 2026 | H5: registro de cierres | Snapshot del domingo — no vista calculada |
| Mayo 2026 | H6: columna por categoría | 11 columnas cat_* — una por categoría aprobada |
| Mayo 2026 | estado_concepto reemplaza activo boolean | Enum activo/retirado + fecha_retiro |
| Mayo 2026 | Cancelación de conceptos: retiro permanente | Pausa y sustitución = features futuras |
| Mayo 2026 | ID conceptos: {CATEGORIA}_{unix_timestamp} | Legible + único + estable |
| Mayo 2026 | Categorías separadas: Servicios Públicos y Membresías | Antes agrupadas — separación mejora análisis |
| Mayo 2026 | Educación como categoría independiente | Colegio sale de Compromisos Financieros |
| Mayo 2026 | Imprevistos = M4 + clasificación M3 | No es concepto en H1 — trazabilidad por clasificación |
| Mayo 2026 | Fondo emergencia en Metas Familiares | Meta 2M — aporte mensual 200.000 |
| Mayo 2026 | Provisión Mireyita separada de pago semanal | 100.000 mensual para primas y vacaciones |
| Mayo 2026 | Trazabilidad anticipos Lucas en M4 | No requiere campo en H1 |
| Mayo 2026 | Ciclo de vida de conceptos: Camino B | Gestión manual con estado_concepto — sin fecha_inicio ni fecha_fin en H1 |
| Mayo 2026 | semana: null para conceptos con semana_default variable | La semana se asigna al ejecutar — no se fuerza S1 como default |
| Mayo 2026 | 409 Conflict para doble inicialización del mismo mes | Protección de integridad — reiniciar un mes no tiene caso de uso legítimo |
| Mayo 2026 | Ticket 6 sirve M1 exclusivamente | M1 es el consumidor concreto — endpoint no es genérico |
| Mayo 2026 | GET /api/mes/[mes] devuelve H2 sin agregados | Totales y bolsillos son responsabilidad de otros tickets |
| Mayo 2026 | Verificación DoD contra Sheet real | Conexión a Sheets ya probada en Ticket 3 |
| Mayo 2026 | Mes no inicializado → 404 descriptivo | Array vacío y mes inexistente son estados diferentes |
| Mayo 2026 | Ticket 7 es M1 completo — lectura y escritura | Vista sin escritura no completa M1 |
| Mayo 2026 | Posponer = reasignar a otra semana u otro mes | Decisión se toma en el momento — no es solo marcar pospuesto |
| Mayo 2026 | Desviación de monto sin justificación obligatoria | Registra si difiere — razón opcional |
| Mayo 2026 | No aplica se marca manualmente | El sistema no lo detecta automáticamente |
| Mayo 2026 | M1 layout: h-screen flex-col con min-h-0 | Sidebar y main scroll independientemente — footer siempre visible |
| Mayo 2026 | Acciones inline: clic en fila expande panel debajo | Sin columna de acciones permanente — tabla mantiene exactamente 7 columnas |
| Mayo 2026 | Modales via createPortal a document.body | Evita problemas de stacking context con overflow en el main |
| Mayo 2026 | Colores badge via inline style, no Tailwind arbitrario | Clases como bg-[#e8f0fe] en objetos JS no son escaneadas por Tailwind v4 |
| Mayo 2026 | Borde activo sidebar via inline style borderLeft | border-l-[3px] en objetos JS tampoco es escaneado por Tailwind v4 |
| Mayo 2026 | Referencia visual M1: Zoho Expense | Azul primario #1e3a5f, superficie plana, badges de estado, Inter font |
| Mayo 2026 | Ajustes visuales M1 completados | V1-V11 verificados en browser — Inter, badges, header azul, sidebar sticky, balance dinámico |
| Mayo 2026 | Mercado semanal dividido en dos bolsillos | Frutas y verduras $200.000 / Víveres y otros $250.000 |
| Mayo 2026 | Apoyo Mariella agregado a H1 | $100.000 mensual fijo — Compromisos Financieros — S1 |
| Mayo 2026 | Conceptos semanales generan 4 filas en H2 | Una fila por semana S1-S4 al inicializar mes |
| Mayo 2026 | Entretenimiento agregado como concepto semanal | $250.000 semanal — H1 fila 36 |
| Mayo 2026 | Mesadas niños y Mireya pendientes de reubicar | Actualmente en Mercado y Alimentación — mover a nuevo concepto próxima sesión |
| Mayo 2026 | semana_default variable eliminado de H1 | Todos los conceptos tienen semana asignada — variable describía el monto, no la semana |
| Mayo 2026 | Mercado mensual → S1 | Provisión Mireyita → S3 | Dr. Sánchez → S3 | Ropa, Fondo emergencia, CDT NU → S4 | Frida → S1 |
| Mayo 2026 | H2 reinicializado con 62 movimientos | S1:28, S2:12, S3:10, S4:12 |
| Mayo 2026 | Aporte Angie $2.300.000 semanal | Dato real histórico confirmado |
| Mayo 2026 | No aplica este mes → estado no_aplica en H2 | No afecta H1 ni meses futuros |
| Mayo 2026 | Mover a mes siguiente → estado pospuesto_mes_siguiente | Carry-over al inicializar mes siguiente |
| Mayo 2026 | B4 — Solo este mes entra a H1 como retirado | Integridad referencial — H2 siempre tiene FK válido a H1 |
| Mayo 2026 | B4 — Cuotas con monto variable: Opción C | Caso borde dentro de caso borde — sin tabla auxiliar |
| Mayo 2026 | B4 — Tres ciclos de vida: solo este mes / cuotas / permanente | Camilo conoce el ciclo en el momento de crear |

---

## Retrospectiva — Sesión ARQUITECTURA + inicio CONSTRUCCIÓN

**Qué funcionó:**
- Decisiones tomadas una a la vez con historia de usuario — ninguna quedó ambigua
- Claude Code eliminó el copy-paste — flujo real de construcción establecido
- Esquema de datos completo antes de escribir código de negocio

**Qué no funcionó:**
- ESTADO.md no estaba en el repo — riesgo de pérdida si el WorkSpace falla
- Rama local master vs main en GitHub generó fricción en el primer push

**Qué cambia en el próximo sprint:**
- ESTADO.md vive en el repo desde ahora
- Resolver divergencia master/main antes de iniciar Ticket 3

---

## Retrospectiva — Ticket 3 (Conectar Google Sheets API)

**Qué funcionó:**
- Claude Code leyó ESTADO.md y detectó discrepancia en types.ts antes de escribir código
- Credenciales configuradas sin exponer el JSON en el repo (.env.local gitignored)
- DoD verificado: GET /api/conceptos devuelve datos reales de H1 sin mock
- Prerequisito master/main resuelto dentro de la misma sesión
- provider.ts singleton creado — deuda técnica documentada saldada

**Qué no funcionó:**
- JSON de credenciales requirió tres intentos por confusión entre Chromebook y WorkSpace
- Heredoc EOF en PowerShell generó error de sintaxis en el commit — sintaxis bash no funciona en PowerShell

**Qué cambia en el próximo sprint:**
- Descargar archivos directamente en el WorkSpace desde el origen, no via Chromebook
- Para commits con mensaje largo en PowerShell: usar archivo temporal o mensaje corto inline

---

## Retrospectiva — Sesión DISEÑO (Presupuesto base)

**Qué funcionó:**
- CSV del último mes permitió extraer montos reales sin depender de memoria
- Acceso a Drive desde Claude permitió cruzar con PRD v2 para validar cifras
- 40 conceptos aprobados en una sola sesión — decisiones de categorización tomadas sin ambigüedad
- Imprevistos resueltos como mecanismo de flujo (M4+M3) en lugar de concepto en H1

**Qué no funcionó:**
- Desglose de membresías no estaba en el CSV — requirió consulta manual
- Montos de salud (EPS, plan complementario) quedaron en $0 — pendientes para antes del primer cierre

**Qué cambia:**
- Completar gaps de salud antes de usar el sistema en producción

---

## Retrospectiva — Ticket 9 (Prueba integrada M1 Planificación + Ejecución)

**Qué funcionó:**
- DoD 7/7 cubiertos en una sola sesión sin bloqueos de lógica de negocio
- H4A e H4B ya tenían datos reales de sesiones anteriores — integración confirmada
- B4 atómico (H1 + H2) funcionó sin errores — Seguros de vida Camilo creado y verificado
- 5 ejecuciones en S1 via API: estado ejecutado, desviación 0, fecha y ejecutor correctos
- Posponer funcionó correctamente a nivel de estado
- no_aplica ya estaba persistido de sesiones previas — confirmado en H2

**Qué no funcionó:**
- PATCH posponer no persiste razonPostergacion — el campo existe en el tipo y en H2 pero el endpoint no lo expone
- Servidor no estaba corriendo al iniciar — requirió arrancar via cmd.exe (Start-Process con npm falla en este entorno)

**Qué cambia en el próximo sprint:**
- Agregar razonPostergacion al tipo posponer del PATCH endpoint (deuda técnica documentada)
- Próximo ticket: definir entre M2 (vista Angie) o flujo de cierre de semana (M3 parcial)

---

## Prompt de apertura — próxima sesión

Retomamos el proyecto Flujo. Lee ESTADO.md en el repo y el adjunto al proyecto Claude.
Tipo de sesión: [DEFINIR EN APERTURA]
Ticket activo: Ticket 10 — por definir (próximo: M2 vista Angie o cierre de semana M3)
Entorno: Windows — PowerShell exclusivamente.

---

Flujo - Proyecto de salud financiera familiar - Camilo Villamil - 2026
