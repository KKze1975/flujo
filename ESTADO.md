# FLUJO — Estado del Proyecto
Actualizado: Mayo 2026 | Fase: Construcción — Ticket 5 cerrado

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
| app/api/conceptos/route.ts | Creado — GET devuelve H1 real desde Sheets |
| app/api/mes/[mes]/iniciar/route.ts | Creado — POST inicializa mes en H2 (Ticket 5) |
| lib/data/types.ts | Actualizado — Concepto (12 campos), Movimiento (22 campos H2), Categoria (11 aprobadas) |
| lib/data/index.ts | Creado — IDataProvider con métodos H1-H6 + crearMovimientosMes |
| lib/data/sheets.ts | Actualizado — getMovimientos() y crearMovimientosMes() implementados |
| lib/data/mock.ts | Creado — MockDataProvider actualizado |
| lib/data/provider.ts | Creado — singleton getProvider() |
| components/ | Directorio vacío |
| public/ | Directorio vacío |
| .env.local | Creado — credenciales Google (gitignored) |
| ESTADO.md | En el repo — fuente de verdad |
| scripts/seed-h1.mjs | Creado — cargó 40 conceptos reales en H1 (uso único) |
| scripts/update-h1-montos.mjs | Creado — actualizó montos confirmados y retiró Ayuda mamá servicios |
| scripts/setup-h2.mjs | Creado — creó pestaña H2 con 22 headers |
| scripts/check-h2.mjs | Creado — verifica DoD en H2 |
| package.json | googleapis agregado |
| next.config.ts | Generado por create-next-app |

---

## Estado técnico

| Componente | Estado |
|---|---|
| Google Sheet original | Legacy — consulta histórica, no se toca |
| Google Sheet nuevo | Activo — ID: 1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A — H1 con 40 conceptos reales (montos confirmados), H2 inicializada (39 movimientos mayo 2026) |
| Cuenta de servicio | psibot@psibot-495119.iam.gserviceaccount.com — configurada y conectada |
| Repo GitHub (github.com/KKze1975/flujo) | Activo — rama main — Ticket 4 pusheado |
| Next.js local | http://localhost:3000 — GET /api/conceptos operativo |
| lib/data/types.ts | Actualizado — Concepto con 12 campos del esquema H1 aprobado |
| lib/data/index.ts | Creado — IDataProvider con 23 métodos |
| lib/data/sheets.ts | Actualizado — getConceptos() implementado y funcional |
| lib/data/mock.ts | Creado — MockDataProvider con respuestas vacías |
| lib/data/provider.ts | Creado — singleton getProvider() |
| app/api/conceptos/route.ts | Creado — GET /api/conceptos devuelve datos reales |
| app/api/mes/[mes]/iniciar/route.ts | Creado — POST /api/mes/:mes/iniciar (Ticket 5) |
| .env.local | Creado — credenciales Google (gitignored) |
| Amazon WorkSpaces | Activo — entorno de desarrollo principal |
| Railway | Descartado |
| Código Node.js anterior | Descartado |

---

## Deuda técnica conocida

- 2 vulnerabilidades moderadas en dependencias npm — pendiente npm audit después del MVP
- Claude Code auto-update failed — resolver con: npm i -g @anthropic-ai/claude-code
- H6 tiene columnas cat_* desactualizadas — actualizar para reflejar las 11 categorías aprobadas
- scripts/seed-h1.mjs fue ejecutado — puede eliminarse o conservarse como referencia de re-seed

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

## Prompt de apertura — próxima sesión

Retomamos el proyecto Flujo. Lee ESTADO.md en el repo.

Tipo de sesión: [CONSTRUCCIÓN]
Ticket activo: Ticket 6 — GET /api/mes/[mes] (vista del mes inicializado)

Reglas:
1. Un solo ticket activo — no abrir el siguiente hasta verificar el DoD
2. DoD verificado con curl — no se declara terminado internamente
3. Al cerrar: hacer commit de ESTADO.md actualizado con "ESTADO: Ticket 6 [estado al cerrar]"

---

Flujo - Proyecto de salud financiera familiar - Camilo Villamil - 2026
