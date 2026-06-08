# FLUJO — Estado del Proyecto
Actualizado: 6 junio 2026 | Fase: Go-live — M1 Ejecución aprobado — QA matemáticas Por Semana cerrado

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
| categoria | string | Casa / Servicios Públicos / Membresías y Suscripciones / Educación / Salud / Mercado y Alimentación / Compromisos Financieros / Recreación / Transporte / Metas Familiares / Frida / Hijos / Servicio Domestico |
| tipo | enum | fijo / pago_fraccionado / discrecional |
| frecuencia | enum | mensual / bimestral / semanal |
| mes_activo_bimestral | string | Solo bimestral — meses separados por coma. Null en otros casos |
| monto_referencia | number | COP |
| semana_default | enum | S1 / S2 / S3 / S4 / variable |
| requiere_aprobacion | boolean | Si modificarlo requiere aprobación del otro actor |
| estado_concepto | enum | activo / retirado |
| fecha_retiro | date | Nullable |
| notas | string | Nullable |

### Categorías aprobadas (13)

Casa / Servicios Públicos / Membresías y Suscripciones / Educación / Salud /
Mercado y Alimentación / Compromisos Financieros / Recreación / Transporte /
Metas Familiares / Frida / Hijos / Servicio Domestico

### H2 — Mes Activo

| Columna | Tipo | Detalle |
|---|---|---|
| id_movimiento | string | MOV_{unix_timestamp} |
| id_concepto | string | FK a H1 |
| mes | string | 2026-05 |
| nombre_snapshot | string | Copia del nombre de H1 al crear — inmutable |
| categoria_snapshot | string | Copia de categoría al crear |
| tipo_snapshot | enum | Copia de tipo al crear |
| semana | enum | S1 / S2 / S3 / S4 / sin_asignar |
| monto_presupuestado | number | COP |
| monto_ejecutado | — | Calculado: monto_ejecutado_camilo + monto_ejecutado_angie |
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
| monto_ejecutado_camilo | number | COP · nullable — parte del monto ejecutado por Camilo |
| monto_ejecutado_angie | number | COP · nullable — parte del monto ejecutado por Angie |
| id_recarga_origen | string | FK a H4D · nullable — null = pendiente de conciliar |

**Decisión:** monto_ejecutado_camilo + monto_ejecutado_angie revisión cuando se construya módulo hijos.

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
| sobre_techo | boolean | True cuando consumo acumulado supera techo en H3A |
| id_recarga_origen | string | FK a H4D · nullable — null = pendiente de conciliar |

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

Rango C — Saldos iniciales

| Columna | Tipo | Detalle |
|---|---|---|
| id_saldo | string | SALDO_{unix_timestamp} |
| mes | string | 2026-05 |
| cuenta | enum | nu_camilo / nu_angie / arq / en_mano |
| saldo_inicial | number | COP |
| fecha_confirmacion | date | |
| incluye_remanente | boolean | True si saldo inicial incluye remanente del mes anterior |
| id_cierre_origen | string | FK a H5A · nullable |

### H4D — Recargas confirmadas Angie

Rango en tab H4: V:AC (8 columnas)

| Columna | Tipo | Detalle |
|---|---|---|
| id_recarga | string | RECARGA_ANG_{unix_timestamp} |
| mes | string | 2026-06 |
| semana | enum | S1 / S2 / S3 / S4 |
| monto | number | COP |
| fecha | date | Fecha de registro |
| registrado_por | string | Actor que registra |
| cuenta_destino | enum | nu_angie / en_mano |
| notas | string | Nullable |

**Decisión:** H4B = solo referencia del plan (no fuente operativa). H4D = fuente de verdad del ingreso real de Angie. Balance y cierres leen H4D, no H4B.

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
| destino_remanente | enum | carry_over / ahorro / gasto · default: carry_over |
| remanente_ejecutado | boolean | True cuando remanente sale de H5A |

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

## Reglas de negocio del modelo — APROBADAS

Sesión: Auditoría de datos · 3 junio 2026

### Balance disponible
- Solo ingresos H4A / H4D con `estado = confirmado` contribuyen al balance disponible por semana

### Prerequisitos cierre de semana
1. Todos los H4D de la semana con `estado = confirmado`
2. `COUNT(H3B WHERE clasificado = false) = 0`
3. `COUNT(H2 + H3B WHERE fuente_angie = TRUE AND id_recarga_origen = null) = 0`

### Al cierre de semana
- Usuario define `destino_remanente` · default `carry_over`
- Si `destino_remanente = ahorro` → cierre escribe consumo en H3B contra bolsillo que usuario elige
- Si `destino_remanente = carry_over` → H4C mes siguiente: `incluye_remanente = true` + `id_cierre_origen = id_cierre`
- Si `destino_remanente = gasto` → cierre escribe consumo en H3B contra bolsillo remanente

### Prerequisitos cierre de mes
1. `COUNT(H5A WHERE mes = mes_actual) = 4`
2. Todos los H4A y H4D del mes con `estado = confirmado`

### Inicialización de mes nuevo
- Concepto bimestral: solo crear fila en H2 si mes_actual ∈ `mes_activo_bimestral`
- Concepto con `estado = pospuesto` del mes anterior: entra con `semana = sin_asignar`

### Prerequisito cierre de planificación
- `COUNT(H2 WHERE mes = mes_actual AND semana = sin_asignar) = 0`

### Bolsillos
- Si consumo acumulado > techo H3A: `sobre_techo = true` · UI alerta · no bloquea
- Si monto_recarga > (techo - consumo_acumulado): exceso entra automáticamente a remanente H5A

### Ejecución
- `monto_ejecutado` H2 = `monto_ejecutado_camilo` + `monto_ejecutado_angie`
- Transferencia entre actores: registrar salida cuenta origen + entrada cuenta destino · sin campo especial

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
| Deploy | Vercel — deploy automático en cada push a main — URL: flujo-7nsrzrdfo-camilo-s-projects10.vercel.app |
| Autenticación MVP | PIN simple — actor: camilo / angie |
| Autenticación futura | Google OAuth — sin retrofit |
| Registro rápido | Claude API — JSON con campo confianza, costo menor a $0.20 USD/mes |
| Escrituras compuestas | batchUpdate — falla completa o no falla |

### Estructura de archivos actual

| Archivo | Estado |
|---|---|
| app/ | Directorio Next.js App Router |
| app/page.tsx | Server Component — Home: fetch paralelo con métricas + snapshot semana activa |
| app/registro/page.tsx | Actualizado — M4 completo: state machine idle/procesando/aclaracion/propuesta/confirmando/exito |
| app/mes/[mes]/page.tsx | Creado — ruta dinámica para MesM1; lógica del page.tsx anterior |
| app/api/meses/route.ts | Creado — GET lista de meses activos con resumen calculado desde H2+H4 |
| app/api/conceptos/route.ts | Creado — GET devuelve H1 real desde Sheets |
| app/api/conceptos/[id]/route.ts | Creado — PATCH actualiza monto/semanaDefault/notas en H1 |
| app/api/mes/[mes]/iniciar/route.ts | Creado — POST inicializa mes en H2 (Ticket 5) |
| app/api/mes/[mes]/route.ts | Creado — GET devuelve H2 del mes (Ticket 6) |
| app/api/mes/[mes]/movimientos/[id]/route.ts | Actualizado — PATCH ejecutar/posponer/no_aplica en H2 + ejecutor opcional |
| app/api/mes/[mes]/cerrar-m1/route.ts | Creado — POST cierra M1: valida S1 sin pendientes, escribe snapshot en H5 |
| app/api/ingresos/camilo/[mes]/route.ts | Creado — GET + POST (upsert) ingreso Camilo en H4A |
| app/api/ingresos/angie/[mes]/route.ts | Creado — GET + PUT (upsert por semana) aportes Angie en H4B |
| lib/data/types.ts | Actualizado — CierreSemana alineado al esquema de ESTADO.md |
| lib/data/index.ts | Creado — IDataProvider con getMeses() + getCierresSemana() + métodos H1-H5 |
| lib/data/sheets.ts | Actualizado — H1-H4 + getMeses + getCierresSemana + createCierreSemana implementados |
| lib/data/mock.ts | Creado — MockDataProvider con stubs |
| lib/data/provider.ts | Creado — singleton getProvider() |
| components/PantallaMeses.tsx | Actualizado — MetricasMes con 6 tarjetas: panel métricas + snapshot semana activa |
| components/MesM1.tsx | Creado — pantalla M1 legacy (tabla desktop, sin usar desde T21) |
| components/MesM1Mobile.tsx | Creado — vista móvil nueva M1: header berry, toggle Planeación/Ejecución, métricas, saldos 2×2, tabs semana, lista conceptos con acciones inline, panel ejecutar, BottomNav |
| app/mes/[mes]/MesM1ClientWrapper.tsx | Actualizado — responsive: auto-detecta width < 768 → MesM1Mobile, ≥ 768 → MesM1Desktop; listener resize; toggle manual funciona |
| components/m1/ModalIngresoCamilo.tsx | Creado — monto COP, cuenta destino, estado |
| components/m1/ModalAporteAngie.tsx | Creado — grid S1-S4 con montos por semana |
| components/m1/ModalEditarConcepto.tsx | Creado — edita monto/semanaDefault/notas de H1 |
| components/m1/VistaPlanificacion.tsx | Creado — vista planificación M1 con balance, agregar concepto (B4) |
| components/m1/ModalAgregarConcepto.tsx | Creado — modal B4: tres ciclos de vida (solo este mes / cuotas / permanente) |
| app/api/mes/[mes]/conceptos/route.ts | Creado — POST crea concepto en H1 + movimiento en H2 (atómico) |
| app/api/registro/interpretar/route.ts | Creado — POST proxy Claude API, interpreta texto e imagen, devuelve InterpretacionM4 |
| app/api/registro/sin-concepto/route.ts | Creado — POST escribe consumo en H3 con clasificado:false, auto-crea tab H3 |
| components/m4/InputRegistro.tsx | Creado — tabs texto/foto, cámara directa (capture via useEffect), preview imagen |
| components/m4/AclaracionBanner.tsx | Creado — banner condicional cuando confianza baja o aclaracion_necesaria |
| components/m4/PropuestaCard.tsx | Creado — tarjeta editable: concepto H2, monto, semana, fuente, ejecutor |
| components/m4/ConfirmacionExito.tsx | Creado — pantalla éxito con nombre concepto y botón nuevo registro |
| .env.local | Creado — credenciales Google + ANTHROPIC_API_KEY (gitignored) |
| ESTADO.md | En el repo — fuente de verdad |
| scripts/seed-h1.mjs | Creado — cargó 40 conceptos reales en H1 (uso único) |
| scripts/reset-junio-completo.mjs | Creado — limpieza completa de junio 2026: H2 clear + H3B + H4A + H4B + H4C + H5A + H5B — commit 54cf653 |
| scripts/update-h1-montos.mjs | Creado — actualizó montos y retiró concepto |
| scripts/setup-h2.mjs | Creado — creó pestaña H2 con 22 headers |
| scripts/check-h2.mjs | Creado — verifica DoD en H2 |
| package.json | googleapis + next/font + @anthropic-ai/sdk agregados |
| components/m1/RemRow.tsx | Creado — remanente semana y Angie en header S1-S4, verde/rojo por signo |
| components/m1/CatGroup.tsx | Creado — categorías colapsables default, orden monto descendente, vacías al final atenuadas |
| components/ModalCorrecionM5.tsx | Creado — 5 escenarios, registro original como referencia, persiste en H3 via PATCH |
| app/api/consumos/[id]/route.ts | Creado — PATCH actualiza H3 via updateConsumoH3() |
| app/api/mes/[mes]/consumos/[semana]/route.ts | Creado — GET sirve historial H3 por semana |
| next.config.ts | Generado por create-next-app |

---

## Estado técnico

| Componente | Estado |
|---|---|
| Google Sheet nuevo | Activo — ID: 1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A — H1, H2, H3, H4, H5 operativos |
| Cuenta de servicio | psibot@psibot-495119.iam.gserviceaccount.com — configurada |
| Repo GitHub (github.com/KKze1975/flujo) | Activo — rama main |
| Next.js local | http://localhost:3000 — operativo |
| Ticket 7 — Pantalla M1 | Completo — commit y push realizados |
| Ticket 8 — Modo Planificación M1 + B4 | Completo y verificado en browser |
| Ticket 9 — Prueba integrada M1 Planificación + Ejecución | Completo — DoD 7/7 cubiertos via API |
| MesM1.tsx | Completo — lista 39 conceptos, acciones PATCH H2, modales H1/H4, visual Zoho-style con Inter |
| VistaPlanificacion.tsx | Completo — planificación, balance semanas, no aplica/posponer, agregar concepto (B4) |
| ModalAgregarConcepto.tsx | Completo — tres ciclos de vida: solo este mes / cuotas / permanente |
| API H2 PATCH | Operativo — ejecutar/posponer/no_aplica con desviación y fecha |
| API POST /mes/[mes]/cerrar-m1 | Operativo — cierra M1, auto-crea H5, escribe snapshot S1 |
| Ticket 10 — Cerrar M1 ejecución | Completo — botón funcional, primera ejecución real S1 mayo 2026 |
| Ticket 11 — Fix razonPostergacion | Completo — input en panel posponer, persiste en H2 |
| Ticket 12 — Pantalla de meses | Completo — Home operativo, junio 2026 inicializado con carry-over |
| Ticket 13 — Home con métricas | Completo — 6 tarjetas: panel métricas + snapshot semana activa, botón registro rápido |
| Ticket 14 — M4 Registro rápido | Completo — texto natural + foto de factura, Claude interpreta con conceptos H2 reales, propuesta editable, PATCH H2, fallback H3 clasificado:false |
| Mayo 2026 | H2 activo — M1 cerrado, ejecución en paralelo con Sheets |
| Junio 2026 | Sheet en cero — reset completo ejecutado 2026-06-02 — listo para QA usuario. H2 vacía pendiente reinit desde app. |
| PantallaMeses | Operativa — tarjetas con métricas, inicialización automática, navegación a MesM1 |
| API POST /mes/[mes]/conceptos | Operativo — crea H1 + H2 atómico para B4 |
| API H4 | Operativo — upsert ingreso Camilo y aportes Angie por semana |
| Amazon WorkSpaces | Activo — entorno de desarrollo principal |
| graphify | Activo — grafo de código en graphify-out/ — 811 nodos, 1209 aristas, 75 comunidades — se actualiza automáticamente al editar .ts/.tsx |
| Google Sheet original | Legacy — no se toca |
| Ticket 15 — Filtro por semana + Cierre semanal | Completo — DoD 5/5 verificado |
| Filtro S1/S2/S3/S4/Todas en MesM1 | Operativo — semana activa por default, totales reactivos |
| API POST /mes/[mes]/cerrar-semana | Operativo — batchUpdate H5 Rango A + B atómico |
| Ticket 16 — Saldos por cuenta | Completo — DoD 5/5 verificado en Sheet |
| H4 Rango C (H4!P:T) | Operativo — 4 cuentas por mes, upsert idempotente |
| API GET/POST /mes/[mes]/saldos | Operativo — lee y escribe H4C correctamente |
| ModalConfirmarSaldos | Operativo — bloqueo obligatorio al abrir M1 Ejecución |
| Panel saldos Home | Operativo — 4 cuentas + total + fecha de confirmación |
| T16b — Rediseño Home como hub | Completo — DoD 6/6 verificado |
| HomeHub.tsx | Operativo — header mes/semana, 3 acciones, métricas contextuales, 2 FABs |
| app/mes/[mes]/semana/page.tsx | Operativo — vista semanal con H2 + H3 + FAB registro rápido |
| components/VistaSemanal.tsx | Creado — vista semanal M4: header + bolsillos + tabs + acciones inline + FAB RegistroRapido |
| app/api/mes/[mes]/semana/[semana]/route.ts | Creado — GET movimientos semana + métricas + cierreSemana |
| RegistroRapido.tsx | Extraído como componente reutilizable |
| PantallaMeses | Actualizado — prop modoHistorial para solo lectura |
| T17 — Vista semanal M4 | Completo — DoD 6/6 verificado en producción |
| Deploy Vercel | Operativo — primer deploy exitoso, variables de entorno configuradas |
| Ticket Handoff Claude Design | Completo — sistema visual fl-* migrado, deploy Vercel activo, validado en hardware real (29 mayo 2026) |
| T19 — MesM1 Desktop | Completo — vista desktop con toggle móvil/desktop, @layer base fix para Tailwind v4, validado en browser |
| T20 — Fix bugs desktop M1 | Completo — sidebar grid fix, Ejecutar conectado a API, balance semanal en sidebar, modal Ingreso Camilo, bloqueo sin ingreso |
| T21 — Layout desktop + móvil Planeación y Ejecución | Completo — DoD 7/7 (incl. DoD 6) — MesM1Mobile nueva vista móvil fl-*, toggle Planeación/Ejecución, acciones inline, wrapper responsive auto-detecta viewport |
| ConceptoBoard — Grid S1-S4 con cards interactivas | Completo — commit d36715d — Planeación y Ejecución desktop |
| T27 — Diseño pre go-live | Completo — DoD 6/6 verificado en producción |
| T28 — Conectar ModalCorreccionM5 a VistaSemanal | Completo — DoD 8/8 verificado en producción (H3 + H2) |
| T31 — Fix categorías H1 + H2 | Completo — DoD 5/5 + ext 14 filas H2 corregidas — commits ada938d, 469c0a2, dbdd592 |
| T29 — Planificación bugs B1 B2 B3 B4 B7p | Completo — DoD 5/5 — commits 25fd70e, f3a6896 |
| T30 — Ejecución: saldos reactivos + estados visuales | Completo — DoD 5/5 — commit e889270 |
| Fix build Vercel — Turbopack error mezcla || y ?? | Commit be4bb39 — MesM1Desktop.tsx línea 384 |
| T22 — Planificación: acciones y flujo | Completo — bugs 3,4,5,6 resueltos — commit 48406fe |
| T23 — Ejecución: acciones y flujo | Completo — DoD 7/7 verificado en producción |
| T24 — Balance y cálculos | Completo — DoD 2/2 verificado en producción — bug #2 falso positivo |
| T25 — Navegación y regresiones | Completo — DoD 2/3 verificado en producción — #14 drag and drop movido a deuda técnica |
| T39 — Migración de esquema · correcciones modelo de datos | Completo — DoD 8/8 verificados — commit 6ed3e8b |
| T40 — Mapeo campos nuevos H2/H3/H4C/H5 | Completo — commit b6af48d — DoD 6/6 — tsc limpio — sin regresiones |
| T41 — Reactividad balanceSemanas | Completo — commit 82cd1de — recargasAngieLocal useState — DoD 3/3 |
| T42 — Fix rail Saldos (Inicial + Disponible + Recargado) | Completo — commits 1f29b9c, 3dc8889, dd6db4a — DoD verificado en Vercel |
| Fix H2 rangos A:V → A:Y | Completo — commit b363eaf — detectado en QA post-T40 |
| Fix H3 rango + placeholders sin-concepto | Completo — commit 8faab11 — auditoría post-T40 |
| T43 — Módulo trazabilidad /admin/trazabilidad | Completo — commit e7b0e91 — DoD 8/8 — tsc limpio — sin regresiones |
| T44 — Fix H4 spillover + createRecargaAngie determinista | Completo — commit 84b23eb — DoD 8/8 — tsc limpio — sin regresiones |
| Fix reactividad bolsillos (handleSheetSuccess) | Completo — Promise.all consumos + movimientos — commit pendiente |
| T45 — Migración pago_fraccionado + flujo FAB | Construido — commits 184b42f, 0dc8ef0, da3e017 — DoD 4/5/6 pendientes verificación móvil |
| T46 — Eliminar tarjetas métricas superiores MesM1Desktop | Completo — commits 887ed38, 4915410, c0f0473 — tsc limpio — verificado en Vercel |
| Fix QA-6jun-3 — remanenteSemana ConceptoBoard nunca negativo | Completo — commit 1bc042f — WeekColumn: remanenteSemana = porPagar en lugar de tot-ejecutadoMonto — cero cuando todo ejecutado |
| Fix QA-6jun-4 — balanceSemanas usa recargas Angie en lugar de cierre.remanenteAngie | Completo — commit 77e8842 — Por Semana sidebar: aporteAngie = recargas reales (no el sobrante del cierre) — eliminó -$1.64M falso en S1-S4 |

---

## QA Pre Go-Live — 30 mayo 2026

### Bugs identificados

| # | Vista | Flujo | Qué pasó | Severidad |
|---|---|---|---|---|
| 1 | Desktop | M1 Planificación | Balance por semana no acumulativo | Media |
| 2 | Desktop | M1 Planificación | Mover al mes siguiente no recalcula balance | Media |
| 3 | Desktop | M1 Planificación | No es posible editar monto de concepto | Alta |
| 4 | Desktop | M1 Planificación | No hay forma de revertir "Mover al mes siguiente" | Alta |
| 5 | Desktop | M1 Planificación | Falta botón agregar concepto | Alta |
| 6 | Desktop | M1 Planificación | Falta botón cerrar planificación | Alta |
| 7 | Desktop | M1 Ejecución | Modal pide ingreso Camilo en lugar de saldos por cuenta | Alta |
| 8 | Desktop | M1 Ejecución | Sidebar no muestra saldos por cuenta | Alta |
| 9 | Desktop | M1 Ejecución | Semanas no muestran ingresos | Media |
| 10 | Desktop | M1 Ejecución | No hay forma de revertir una ejecución | Alta |
| 11 | Desktop | M1 Ejecución | Falta opción agregar concepto | Alta |
| 12 | Desktop | M1 Ejecución | Falta opción "No aplica este mes" | Alta |
| 13 | Desktop | M1 Ejecución | Falta opciones mover concepto a semana/mes | Alta |
| 14 | Desktop | M1 Ejecución | Falta drag and drop entre columnas | Media |
| 15 | Desktop | M1 Ejecución | Falta botón cerrar semana | Alta |
| 16 | Desktop | Navegación | Sidebar izquierdo no navega | Alta |
| 17 | Desktop | M4 | Falta botón registrar aporte Angie | Alta |
| 18 | Desktop | M1 Ejecución | Permite ejecutar sin fondos suficientes | Alta |
| 19 | Desktop | M1 Ejecución + M4 | Falta adjuntar comprobante al ejecutar | Media |

**Resueltos en T22:** bugs 3, 4, 5, 6 — Planificación: acciones y flujo
**Resueltos en T23:** bugs 7, 8, 10, 11, 12, 13, 15 — Ejecución: acciones y flujo
**Resueltos en T24:** bugs 1, 9 — Balance y cálculos | bug 2 — falso positivo, lógica ya era correcta
**Resueltos en T25:** bugs 16, 17 — Navegación y regresiones | bug 14 — movido a deuda técnica (evento no propaga)

### Mejoras de diseño pre go-live

1. Balance por semana encima de cada columna S1-S4 en el grid
2. Conceptos agrupados por categoría colapsable
3. Saldo de cuentas en encabezado de cada semana en Ejecución
4. Remanente de Angie visible en Ejecución
5. M4 — historial con opción de corregir y mover registros

### Tickets derivados

| Ticket | Descripción | Bugs | Prioridad |
|---|---|---|---|
| T22 | Planificación: acciones y flujo | 3, 4, 5, 6 | Completo |
| T23 | Ejecución: acciones y flujo | 7, 8, 10, 11, 12, 13, 15 | Completo |
| T24 | Balance y cálculos | 1, 2, 9 | Bloqueante go-live |
| T25 | Navegación y regresiones | 14, 16, 17, 19 | Bloqueante go-live |
| T26 | Validación de fondos | 18 | Importante — no bloqueante inmediato |
| T27 | Mejoras de diseño pre go-live | Mejoras 1-5 | Diseño aprobado — pendiente Claude Design |

### QA Post-T25 — 1 junio 2026

#### Hallazgos Planificación

| # | Tipo | Descripción |
|---|---|---|
| B1 | Bug | Concepto "Energía" aparece duplicado |
| B2 | Bug | Al cambiar valor de Empleada no se actualizan los valores por semana |
| B3 | Bug | No acepta valor cero para un concepto |
| B4 | Bug | Mover entre semanas roto — se rompió al agrupar por categorías |
| B7p | Bug | "Por categoría" en rail derecho — retirar en Planificación |
| F1 | Feature | Estado "aprobado" por concepto al revisar en planificación |
| F2 | Fix datos | Mesadas y Empleada fuera de categoría Mercado — fix en H1 via script |

#### Hallazgos Ejecución

| # | Tipo | Descripción |
|---|---|---|
| B5 | Bug | Al ingresar saldo no actualiza rail izquierdo "Por semana" |
| B6 | Bug | Saldo de cuentas en rail izquierdo no se actualiza al ejecutar conceptos |
| B7e | Bug | "Por categoría" en rail derecho — retirar en Ejecución |
| F3 | Feature | Ingresos planeados vs confirmados diferenciados en "Por semana" |
| F4 | Feature | Color verde en ficha de categoría cuando todos sus conceptos ejecutados |
| F5 | Feature | Adjuntar comprobante — Google Drive — post go-live |
| F6 | Feature | Validación + reasignación de fondos antes de ejecutar — post go-live |
| F7 | Feature | Mesadas con anticipos, préstamos y descuentos — post go-live |

#### Decisiones de diseño tomadas

| Decisión | Detalle |
|---|---|
| Split de concepto entre semanas (MVP) | Bajar monto + crear nuevo concepto via B4 — sin cambio de esquema |
| Reasignación de fondos (D2) | Modal antes de ejecutar cuando no hay disponibilidad — requiere sesión de diseño — post go-live |

#### Tickets derivados

| Ticket | Descripción | Bugs/Features | Prioridad |
|---|---|---|---|
| T29 | Planificación: bugs de edición y mover | B1, B2, B3, B4, B7p | Completo — DoD 5/5 |
| T30 | Ejecución: saldos reactivos + estados visuales | B5, B6, B7e, F3, F4 | Completo — DoD 5/5 — commit e889270 |
| T31 | Fix H1 + H2: categorías Hijos y Servicio Domestico | F2 | Completo — DoD 5/5 + ext 14 filas H2 |
| T32b | Fix bloqueantes QA go-live | B1, B2, B3, B4 | Completo — DoD 6/6 — commits 5460967, 0507256 |
| T26 | Modal reasignación de fondos | F6 expandido | Post go-live — requiere diseño |
| T32 | Estado "aprobado" por concepto en Planificación | F1 | Post go-live |
| T33 | Mesadas con anticipos, préstamos y descuentos | F7 | Post go-live |
| T34 | Comprobantes al ejecutar | F5 | Post go-live — Google Drive |
| T35 | Split nativo de concepto en semanas | D1 futuro | Post go-live — requiere diseño |
| T36 | Vista granular H3 en VistaSemanal | M4-B2 | Post go-live — requiere diseño |
| T37 | FAB aporte Angie en VistaSemanal — modal acumulativo + refetch foco M1 | G1 | Completo — DoD 7/7 — commits e0a59ab, 3f44734, 26cbb0e, fix registradoPor |
| T38 | Desglose inicial/ejecutado/disponible por cuenta en rail Saldos | G2 | Completo — commit feat/T38 |
| T26 | Modal validación de fondos | #18 | Completo — DoD 9/9 — commits 00d19b5, aa52772 |

---

## QA Go-Live — 2 junio 2026

### Resultado: BLOQUEADO — 3 bugs críticos

### Bloqueantes (T32b)

| # | Vista | Descripción |
|---|---|---|
| B1 | Planificación | Agregar concepto no genera fila ni modifica saldos |
| B2 | Planificación | Concepto nuevo no visible en Planificación post-creación |
| B3 | Ejecución | Cargar ingreso mes no actualiza rails Saldos ni Por semana |
| B4 | Ejecución | Contador ejecutados incluye pospuestos/no aplica en denominador |

### Deuda técnica identificada en QA

| # | Descripción |
|---|---|
| P3 | Navegación categoría/concepto confusa — diferenciación visual adicional |
| P5 | Buscador de concepto por mes o semana |
| E2 | Opción de nota en ejecución junto al comprobante |
| E4 | Concepto ejecutable vía carga de bolsillo — lógica a definir |
| E5 | Lógica cuando se gasta menos en concepto de bolsillo (ej. Frida) |

### Comportamientos verificados como correctos

- Ingresos actualizan balance mes y balance por semana ✓
- Carry over de saldos entre semanas consistente ✓
- Valores H1 al inicializar mes son correctos — vienen del presupuesto base ✓
- Conceptos agregados en Planificación aparecen en Ejecución ✓

---

## QA Go-Live 2 — 2 junio 2026

### Resultado: BLOQUEADO — T32b pendiente

### Verificado como correcto

- Ingresos actualizan balance mes y rail izquierdo ✓
- Carry over entre semanas consistente ✓
- Editar monto → todas las semanas actualizan ✓
- Mover concepto entre semanas con botones S1-S4 ✓
- Rail derecho sin "Por categoría" Planificación y Ejecución ✓
- Categorías Hijos y Servicio Domestico correctas ✓
- Confirmar saldos bloquea sin saldos ✓
- Ejecutar concepto reduce saldo cuenta en sidebar ✓
- Categoría todos ejecutados → header verde ✓
- Revertir ejecución disponible ✓
- Cerrar semana disponible ✓

### Bloqueantes confirmados (T32b)

- B1/B2: Agregar concepto en Planificación no funciona
- B3: Rail izquierdo Por semana muestra valores plan en lugar de ejecutado real — dos manifestaciones: aporte Angie no actualiza rail Saldos, y Por semana no refleja ingresos confirmados vs planeados

### Nuevos items deuda técnica

- E6: Cierre semana pide registrar remanente manualmente — debería preguntar dónde está el remanente y confirmar

---

## QA Go-Live 3 — 3 junio 2026

### Resultado: PAUSADO — Defecto arquitectónico identificado

### T37 — verificado en producción
- DoD 2/6: Modal registra recarga, múltiples recargas acumulan ✓
- DoD 3/6: Confirmado ✓
- DoD 4/6: Confirmado ✓
- DoD 5/6: Confirmado ✓
- DoD 6/6: Sin regresiones en VistaSemanal ✓
- DoD 1/6: AMBIGUO — 180.000 registrado en modal pero M1 muestra 40.000. Pendiente verificar H4D en Sheet.

### T26 — verificado en producción
- Modal aparece cuando no hay fondos ✓
- Camino 3: cancelar (click fuera) ✓
- Camino 1: aceptar déficit — NO RENDERIZADO — bug
- Camino 2: reasignar desde otro concepto — NO RENDERIZADO — bug

### Flujos existentes — regresiones
- M1 Planificación desktop: editar monto / agregar concepto / mover semana ✓
- M1 Ejecución: mover a S3 ROTO — regresión (funciona S1/S2/S4, falla S3)
- Cierre semana: pide remanente explícito — deuda E6 preexistente confirmada
- VistaSemanal: bolsillos / historial H3 / corrección M5 ✓
- M1 móvil: toggle Planeación/Ejecución / acciones inline ✓
- M4: no verificado en esta sesión

### Defecto arquitectónico identificado

Múltiples puntos de entrada para ingresos Angie (H4B, H4D, modal T26)
no convergen en una única fuente de verdad. Cada vista calcula
remanenteAngiePerSemana desde fuentes distintas generando divergencia
de números entre vistas.

Manifestaciones observadas:
- Recarga 180.000 en modal → M1 muestra 40.000 (monto H2, no H4D)
- Rail Saldos no reactivo post-recarga FAB
- T26 caminos 1 y 2 incompletos

### Decisión

Go-live junio 7 PAUSADO.
Causa: defecto arquitectónico — no patcheable ticket a ticket.
Próxima sesión: DISEÑO — Auditoría de datos.
Objetivo: cartografiar fuentes de verdad, redefinir modelo, alinear frontend.

---

## Deuda técnica conocida

- Vista M1 Ejecución no refleja cambios hechos en M1 Planificación sin recargar — estado desincronizado entre vistas o caché de fetch
- Vista Ejecución desktop sin agrupación por categorías colapsable — H3
- Botones barra izquierda desktop no navegan — sin navegación a Home — H6
- Tabla de conceptos en MesM1 (thead/tbody/tr/td) usa clases Tailwind y hex hardcodeados — pendiente migración a tokens fl-*
- VistaSemanal no refleja en tiempo real los gastos registrados via FAB RegistroRapido — requiere reload manual
- RegistroRapido desde FAB de VistaSemanal no ofrece opción explícita de guardar como "pendiente de clasificación"
- 2 vulnerabilidades moderadas en dependencias npm — pendiente npm audit después del MVP
- Claude Code auto-update failed — resolver con: npm i -g @anthropic-ai/claude-code
- H6: agregar cat_hijos y cat_servicio_domestico — columnas cat_* desactualizadas, reflejar las 13 categorías aprobadas
- Frontend: vistas que agrupan por categoría deben leer categoría desde datos — verificar que no haya categorías hardcodeadas en CatGroup.tsx o similares
- Rail izquierdo "Por semana" en Planificación — diagnosticado en T30: `balancePlanificacion` ya depende de `aportes` (reactivo). No es bug activo — falso positivo resuelto.
- Rail derecho Planificación — espacio liberado por B7p pendiente de asignar (actualmente vacío en modo Planificación).
- Concepto mensual pospuesto genera doble fila en mes siguiente — revisar si es comportamiento deseado
- Uber One, NY Times, El País, Game Pass agregados via B4 en primera ejecución — verificar que quedaron correctamente en H1
- components/ui/BottomNav.tsx creado en handoff — verificar si duplica components en proto-shell o es el componente activo
- Bloqueo ejecución sin ingreso no validado visualmente — verificar al inicializar Julio 2026
- scripts/seed-h1.mjs fue ejecutado — puede eliminarse o conservarse como referencia de re-seed
- Verificar en producción Vercel que el grid S1-S4 renderiza correctamente después del deploy automático
- DevOps: rama `dev` + deploy preview de Vercel pendiente — hoy todo push a `main` va directo a producción. Setup estimado 10 min. Prioridad: antes del primer ticket post go-live.
- 2 consumos de test en H3 junio 2026 (CONSUMO_1780266997613 S1, CONSUMO_1780267124959 S2) — clasificados, no bloquean cierre — limpiar manualmente antes de go-live si se desea historial limpio
- Bug preexistente en escritura semana H3: POST sin-concepto con semana "S4" guardó "S2" en Sheet — revisar índice de columna semana en sheets.ts antes de go-live
- Botón "Corregir" en ejecutados H2 (VistaSemanal) no verificado visualmente en móvil real — bundle confirma implementación pero falta captura pixel. Verificar antes de go-live.
- Drag and drop entre columnas en Ejecución desktop — canDrag/canDrop habilitados en ConceptoBoard pero el evento no propaga. Investigar antes de habilitar en producción.
- remanenteAngiePerSemana no reactivo post ModalAporteAngie — requiere invalidar estado después de guardar aporte.
- Drag en Ejecución sin bloqueo por semana cerrada — cuando se habilite drag, agregar validación.
- Comprobantes al ejecutar — storage Google Drive, requiere Drive API + endpoint upload. Post go-live.
- QA go-live P3: Navegación categoría/concepto confusa — diferenciación visual adicional pendiente.
- QA go-live P5: Buscador de concepto por mes o semana — post go-live.
- QA go-live E2: Opción de nota en ejecución junto al comprobante — post go-live.
- QA go-live E4: Concepto ejecutable vía carga de bolsillo — lógica a definir, post go-live.
- QA go-live E5: Lógica cuando se gasta menos en concepto de bolsillo (ej. Frida) — post go-live.
- QA go-live E6: Cierre semana pide remanente manual — debería preguntar ubicación y confirmar — post go-live.
- Build Vercel: tsc local no detectó error de Turbopack (mezcla || y ?? sin paréntesis — commit be4bb39). Revisar configuración tsc/turbopack antes del primer ticket post go-live.
- balanceSemanas Ejecución: indicador (plan) vs ✓ siempre muestra (plan) para semanas sin cierre formal — cierresSemanaProps es SSR puro, no reactivo. Cosmético — no afecta cálculos.
- proyeccion KPI superior usa saldos SSR en lugar de saldosLocal — cosmético, no afecta trazabilidad.
- M4-B1: Foto en móvil falla con error JSON al adjuntar — falla en conversión base64 pre-API, antes de llamar a Claude. Desktop funciona correctamente. Post go-live.
- M4-B2: VistaSemanal no muestra historial granular de H3 por semana — registros M4 no auditables en la vista semanal. Los datos se guardan correctamente en H3. Post go-live.
- T38: Rail Saldos no muestra desglose de ejecutado por cuenta — solo muestra disponible actual.
- T26: No hay validación de fondos al ejecutar — Aprobado para construir — especificación completa en QA tickets.
- T37-DT1: Fila Total en rail Saldos de M1 Ejecución no suma recargas H4D — totalSaldosLocal excluye recargas Angie. El Total visible no coincide con la suma de las 4 cuentas cuando hay recargas registradas. Post go-live.
- ~~QA-3jun-1: Mover concepto a S3 roto~~ — RESUELTO: efecto colateral de tickets anteriores (sesión 4 jun)
- ~~QA-3jun-2: T26 caminos 1 y 2 no renderizados en modal validación fondos~~ — RESUELTO: verificado en producción (sesión 4 jun)
- ~~QA-3jun-3: remanenteAngiePerSemana diverge M1 vs VistaSemanal~~ — RESUELTO: raíz era H4D spillover, resuelto en T44 (sesión 4 jun)
- ~~B-QA-01: Bolsillo agotado desaparece de lista FAB~~ — RESUELTO: badge "sobre techo" en ModalCorreccion M5, sobreTecho=true en H3B (sesión 4 jun)
- ~~B-QA-02: FAB aporte Angie abría modal incorrecto~~ — RESUELTO en T44 (sesión 4 jun)
- DT-QA-01: Proyección superávit valor incorrecto (-$20.4M) — probable causa saldos iniciales H4C subrepresentados — post go-live
- DT-QA-02: Label "Registrar aporte de Angie" en modal T26 no adapta por actor — requiere autenticación real — post go-live
- DT-QA-03: idRecargaOrigen=null cuando fuenteAngie=true — conciliación pendiente — post go-live
- DT-QA-04: Dropdown Concepto en H2 en FAB muestra todas las semanas sin filtrar por semana activa — post go-live
- T26-DT1: Post-recarga Angie, botón "Ejecutar con" no cambia automáticamente a la cuenta recién recargada — usuario debe seleccionarla manualmente. Post go-live.
- DT-M4-01: monto_ejecutado_camilo / monto_ejecutado_angie / id_recarga_origen no se llenan al ejecutar desde RegistroRapido — PATCH solo escribe campos legacy. Post go-live.
- T39-DT1: rowToMovimiento no mapea campos nuevos H2 (montoEjecutadoCamilo, montoEjecutadoAngie, idRecargaOrigen) — rangos de lectura H2 desactualizados. Corresponde a T40.
- T39-DT2: rowToConsumoH3 / consumoH3ToRow no mapean sobreTecho, idRecargaOrigen — rango H3!A:N debe expandirse a H3!A:P. Corresponde a T40.
- T39-DT3: rowToSaldoCuenta / saldoCuentaToRow no mapean incluyeRemanente, idCierreOrigen — rango H4!P:T debe expandirse a H4!P:V. Corresponde a T40.
- T39-DT4: destinoRemanente, remanenteEjecutado en H5A — rowToCierreSemana no mapea campos nuevos. Corresponde a T40.
- git add -A en T40 capturó archivos sin trackear de sesiones anteriores (design-handoff/, screenshots, reset-junio.mjs) — agregar a .gitignore o limpiar antes del siguiente ticket
- Rail Saldos: label "(plan)" en A:$X de Por Semana no distingue entre sin recargas vs con recargas sin cierre — mostrar "(real)" cuando hay recargas H4D registradas. Post go-live.
- Rail Saldos: totalSaldosLocal suma saldosConDescuento (descontados server) en lugar de saldosBrutos — el Total visible puede no coincidir con la suma de Inicial de las 4 cuentas. Post go-live.
- H3B sin-concepto/route.ts: H3B_HEADERS declara 14 columnas pero el row tiene 16 — sobre_techo siempre se escribe como "" en lugar de calcularse. Post go-live.
- M1 Ejecución: conceptos pago_fraccionado muestran estado "pendiente" aunque tengan consumos en H3B — diferenciación visual pendiente. Post go-live.
- H3 junio: 5 consumos de prueba en MERCADO_Y_ALIMENTACION_1779730807246 — limpiar antes de go-live o dejar como datos reales.
- BL-01 (deuda técnica post go-live — reclasificado 6 jun): ModalCorreccionM5 selector bolsillos usa IDs H2 en lugar de IDs H3A — dato corrupto en Sheet al clasificar. Confirmado en trazabilidad sesión 5 jun.
- BL-02 (deuda técnica post go-live — reclasificado 6 jun): PropuestaCard dropdown concepto muestra conceptos de todas las semanas sin filtrar por semana activa.
- BL-03 (deuda técnica post go-live — reclasificado 6 jun): Registro via FAB aparece sin categoría en historial VistaSemanal.
- BL-04 (deuda técnica post go-live — reclasificado 6 jun): Modal cierre semana — "Remanente Angie" es campo manual vacío, debe calcularse desde H4D menos consumos con fuenteAngie=true. Para domingo 8 jun: campo manual — se le explica a Angie que es temporal. Rediseño modal semana siguiente.
- BL-05 (deuda técnica post go-live — reclasificado 6 jun): Modal cierre semana — "Aporte S2 planeado" es campo manual vacío, debe traerse de H4B. Para domingo 8 jun: campo manual — temporal. Rediseño modal semana siguiente.
- BL-06 (deuda técnica post go-live — reclasificado 6 jun): PropuestaCard label "Concepto en H2" para pago_fraccionado — lógica correcta (escribe H3B), label engañoso para el usuario.
- QA-7jun-01 (deuda técnica post go-live): T26 no valida fondos Angie en consumos H3B (pago_fraccionado) — solo intercepta PATCH H2. Usuario puede registrar gasto pago_fraccionado con fuenteAngie sin saldo suficiente sin que el sistema lo bloquee.
- QA-7jun-04 (feature request post go-live): Falta desglose de consumos H3B por concepto pago_fraccionado en M1 Ejecución — usuario no puede auditar qué gastos componen el total de un bolsillo desde la vista principal.

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
- Ticket 16 — Saldos por cuenta: H4C + pantalla confirmación obligatoria al abrir M1 Ejecución + sidebar saldos en tiempo real + panel en Home

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
| Mayo 2026 | graphify como capa de navegación de código | ESTADO.md cubre contexto de negocio y decisiones. graphify cubre estructura del código — reemplaza grep/lectura masiva de archivos para navegación |
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
| Mayo 2026 | Ejecución real en Sheets — última vez | Mayo 2026 fue la última ejecución en el Sheet legacy. Junio 2026: go-live completo en la app |
| Mayo 2026 | Pantalla de meses es el Home de la app | PantallaMeses reemplaza el acceso directo a MesM1 |
| Mayo 2026 | Dos meses activos simultáneos permitidos | Mayo en ejecución + Junio inicializado — sin conflicto |
| Mayo 2026 | Historial solo lectura | Sin navegación al detalle — se llenará al cerrar el primer mes |
| Mayo 2026 | Botón inicializar detecta mes siguiente automáticamente | Sin hardcode — deriva del último mes en H2 |
| Mayo 2026 | M4 vincula con H2 cuando hay concepto correspondiente | Sin concepto → H3 clasificado: false |
| Mayo 2026 | Confianza baja → AclaracionBanner antes de propuesta | No bloquea — permite continuar |
| Mayo 2026 | Ejecutor seleccionable en M4 | camilo / angie en PropuestaCard |
| Mayo 2026 | Saldos iniciales confirman al abrir M1 Ejecución | Sin saldo confirmado no hay ejecución — bloqueo obligatorio |
| Mayo 2026 | Saldos por cuenta en sidebar M1 y panel Home | NU Camilo / NU Angie / ARQ / EN MANO |
| Mayo 2026 | H4 Rango C — Saldos iniciales | 4 cuentas por mes — confirmación única al inicio de ejecución |
| Mayo 2026 | Sistema de tokens fl-* integrado desde Claude Design handoff | themes.css → globals.css, componentes migrados uno a uno con validación visual por pantalla |
| Mayo 2026 | M2 y M3 colapsados en filtro por semana en MesM1 | Vista y revisión semanal con Angie no requieren pantallas separadas — M4 ya cubre el registro con ejecutor seleccionable |
| Mayo 2026 | Filtro por semana adelantado al MVP | Estaba en features futuras — es el mecanismo que habilita M2 y M3 |
| Mayo 2026 | H5 Rango B es requisito para go-live | Sin cierre de semana no hay remanente Angie como input para plan semana siguiente |
| Mayo 2026 | Botón cerrar semana bloqueado si hay H3 clasificado:false | Sin clasificar todos los gastos el cierre no tiene integridad — remanente Angie sería inexacto |
| Mayo 2026 | Cierre semanal es batchUpdate atómico H5A + H5B | Falla completa o no falla — consistencia con patrón establecido |
| Mayo 2026 | H4C en columnas P:T del tab H4 existente | Consistente con patrón H4A (A:G) + H4B (I:N) — un tab por hoja lógica |
| Mayo 2026 | ensureH4CHeaders separado de ensureH4Headers | H4 ya existía — el chequeo temprano de A1 impedía escribir los headers de H4C |
| Mayo 2026 | Confirmación de saldos como bloqueo sin cancelar en M1 Ejecución | Sin saldo inicial no hay trazabilidad de cuenta — requisito no negociable |
| Mayo 2026 | Home rediseñado como hub de navegación | Vista semanal M4 es el destino principal — M1 e historial son destinos secundarios |
| Mayo 2026 | Navegación Home: Esta semana / Inicio de mes / Historial | Esta semana → vista semanal mes activo. Inicio de mes → lista de meses → MesM1. Historial → lista de meses solo lectura |
| Mayo 2026 | Dos FABs en Home | FAB relámpago → registro rápido de compra. FAB dinero → ingreso a bolsillo |
| Mayo 2026 | Vista semanal M4 es igual para Camilo y Angie | PIN identifica actor — sin vistas diferenciadas por rol |
| Mayo 2026 | T16b prerequisito de T16 y T17 | Home hub debe existir antes de vista semanal y saldos |
| Mayo 2026 | Vercel SSO Protection desactivada | App familiar — no requiere login de Vercel para acceder al deploy |
| Mayo 2026 | MesM1ClientWrapper co-ubicado en app/mes/[mes]/ | Fix hidratación App Router — Client Component en misma carpeta que Server Component |
| Mayo 2026 | T27 — Cierre semanal vive en M1 Ejecución | M4 es vista de registro rápido — gestión completa en M1 |
| Mayo 2026 | T27 — Rail derecho M1 Ejecución | 3 tarjetas: Presupuestado · Ejecutado · Proyección superávit/déficit |
| Mayo 2026 | T27 — Agrupación por categoría | Colapsado por default · orden por semana activa + monto descendente · sin conceptos al final atenuado |
| Mayo 2026 | T27 — Remanente semana y Angie en encabezado S1-S4 | Dos líneas nuevas bajo el encabezado existente · verde positivo · rojo negativo |
| Mayo 2026 | T27 — Modal corrección M5 | 5 escenarios: monto · ejecutor · fuente de pago · H3 sin clasificar (vincula a bolsillo, no a concepto H2) · semana incorrecta · muestra registro original como referencia |
| Mayo 2026 | DevOps MVP: sin pipeline formal | Vercel CI/CD automático es suficiente para 4 usuarios. Tests, staging y alertas = post MVP. Única excepción documentada: rama dev + preview URL antes del primer ticket post go-live. |
| Junio 2026 | Split concepto entre semanas MVP | Bajar monto + crear nuevo concepto via B4 — sin cambio de esquema H2 |
| Junio 2026 | Reasignación de fondos D2 | Modal guiado antes de ejecutar cuando no hay disponibilidad — post go-live |
| Junio 2026 | Comprobantes storage | Google Drive — Drive API + endpoint upload — post go-live |
| Junio 2026 | Mesadas y Empleada | Mover fuera de categoría Mercado en H1 via script antes de go-live |
| Junio 2026 | H4D es fuente de verdad ingreso real Angie | H4B es solo plan — balance y cierres leen H4D |
| Junio 2026 | Balance solo cuenta ingresos confirmados | Ingreso pendiente no contribuye al disponible |
| Junio 2026 | Remanente con destino explícito | destino_remanente enum — default carry_over — usuario puede cambiar al cierre |
| Junio 2026 | H4C registra origen del saldo inicial | incluye_remanente + id_cierre_origen para trazabilidad entre meses |
| Junio 2026 | Concepto pospuesto entra con semana = sin_asignar | Usuario asigna semana explícitamente — sin default S1 |
| Junio 2026 | Ejecución parcial por dos actores en H2 | monto_ejecutado_camilo + monto_ejecutado_angie — revisión con módulo hijos |
| Junio 2026 | Sobregiro bolsillo no bloquea | sobre_techo = true + alerta UI — decisión queda en el usuario |
| Junio 2026 | Exceso recarga sobre techo → remanente automático | Sin campo especial — entra a H5A |
| Junio 2026 | Prereq cierre semana: conciliación Angie completa | id_recarga_origen null = 0 antes de cerrar |
| Junio 2026 | Prereq cierre mes: 4 semanas cerradas + todos confirmados | Sin excepciones — regla estricta |
| Junio 2026 | H4D desplazado de V:AC a X:AE | H4C expandido a P:V (7 cols) — colisión con H4D resuelta desplazando H4D 2 columnas a la derecha. Separador nuevo en W. |
| Junio 2026 | T40: campos nuevos como : type \| null en lugar de ?: type | Campos siempre presentes en JSON con null para registros históricos — consistente con el resto del sistema |
| Junio 2026 | Rail Saldos NU Angie muestra fila Recargado | Recargas H4D son ingresos del mes, no saldo inicial — naturaleza diferente a saldo Camilo |
| Junio 2026 | disponible = bruto - ejecutado + recargas | Fórmula correcta — evita doble conteo cuando saldosConDescuento clampea a 0 |
| Junio 2026 | T41: recargasAngieLocal como useState | Prop SSR congelada no refleja recargas registradas en sesión — mismo patrón que movs |
| 5 jun 2026 | tipo bolsillo renombrado a pago_fraccionado | Semántica incorrecta — bolsillo sugiere contenedor de dinero, el concepto real es límite de gasto con pagos fraccionados |
| 5 jun 2026 | Celular Angie → tipo fijo | Pago único mensual — no tiene pagos fraccionados |
| 5 jun 2026 | Gastos pago_fraccionado van a H3B, no PATCH H2 | H2 tiene una fila por concepto — no soporta múltiples consumos del mismo concepto |
| 5 jun 2026 | pago_fraccionado en H2 siempre queda pendiente | H2 es referencia de presupuesto — los consumos van a H3B — estado lo gestiona el cierre de semana |
| 5 jun 2026 | Panel límites calcula desde H3B | montoEjecutado H2 siempre null para pago_fraccionado — consumo acumulado real está en H3B |
| 5 jun 2026 | BOLSILLOS_ACTIVOS eliminado | IDs obsoletos — reemplazado por bolsillos prop con conceptoId real de H1 |
| 5 jun 2026 | Metas financieras (Fondo emergencia, CDT NU) — diseño post go-live | Lógica diferente a gastos operativos — no bloquea go-live |

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
- Próximo ticket: definir entre M2 (vista Angie) o flujo de cierre de semana (M3 parcial)

---

## Retrospectiva — Ticket 10 (Cerrar M1 ejecución + primera ejecución real)

**Qué funcionó:**
- Bug del botón corregido: condición evaluaba todas las semanas, ahora solo S1
- Primera ejecución real de mayo 2026 completada: S1 ejecutado, M1 cerrado
- H5 auto-creada al primer cierre — sin script manual de setup
- TypeScript sin errores al finalizar

**Qué no funcionó:**
- razonPostergacion seguía sin persistir — resuelto en Ticket 11

**Qué cambia en el próximo sprint:**
- Foco: preparar sistema para go-live junio 2026

---

## Retrospectiva — Ticket 11 (Fix razonPostergacion)

**Qué funcionó:**
- Diagnóstico correcto: bug estaba en el frontend, backend ya era correcto
- Fix en 1m 28s — AccionPosponer + input en panel + razonPostergacion en patchar
- DoD verificado: razonPostergacion visible en H2 del Sheet

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Próximo foco: preparar sistema para go-live junio 2026

---

## Retrospectiva — Ticket 12 (Pantalla de meses)

**Qué funcionó:**
- Home operativo: mayo 2026 en tarjeta activa, junio 2026 inicializado con carry-over automático
- getMeses() implementado desde H2 — sin tabla auxiliar
- TypeScript sin errores al finalizar
- API /api/meses devuelve resúmenes correctos desde H2+H4

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Ticket 14: por definir — candidatos: M2 vista Angie / M3 cierre semanal / M4 registro rápido real

---

## Retrospectiva — Ticket 13 (Home con métricas + snapshot semanal)

**Qué funcionó:**
- 6 tarjetas de métricas con datos reales: disponible semana, ejecutado vs presupuestado, semanas cerradas, recaudo semana, ejecutado semana, disponible semana
- getCierresSemana tolerante a H5 vacío — "sin cierres aún" sin error
- Semana activa derivada del día del mes server-side — siempre actualizada
- Botón "+ Registro rápido" navegable — placeholder M4 en /registro
- TypeScript sin errores en ambos commits

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Definir Ticket 15 — candidatos: M3 cierre semanal / M2 vista Angie / R7b historial de registros M4

---

## Retrospectiva — Ticket 14 (M4 Registro rápido)

**Qué funcionó:**
- Claude interpreta texto natural con alta precisión cuando recibe la lista real de conceptos H2
- Flujo estado completo: idle → procesando → [aclaracion] → propuesta → confirmando → exito
- PATCH H2 verificado en Sheet — movimiento "Víveres y otros" ejecutado correctamente
- Foto de factura + cámara directa operativos en móvil (capture via useEffect para evitar hydration mismatch)
- TypeScript sin errores al finalizar

**Qué no funcionó:**
- Primera versión enviaba concepto_sugerido sin contexto — Claude inventaba nombres (ej. "mercado D1")
- Fix: pasar lista de conceptos pendientes de H2 al system prompt dinámicamente
- capture="environment" como prop JSX causó hydration mismatch — resuelto con useEffect

**Qué cambia en el próximo sprint:**
- Definir Ticket 15

---

## Retrospectiva — Ticket 15 (Filtro por semana + Cierre semanal)

**Qué funcionó:**
- Filtro por semana solo UI — sin llamadas adicionales a API
- Semana activa por default — sin clic manual
- batchUpdate atómico H5A + H5B — patrón consistente con el resto del sistema
- DoD 5/5 en una sola sesión

**Qué no funcionó:**
- Bug detectado: vista M1 Ejecución no refleja cambios de Planificación sin recargar — documentado como deuda técnica

**Qué cambia en el próximo sprint:**
- Ticket 16: Saldos por cuenta (H4C + confirmación obligatoria al abrir M1 Ejecución)

---

## Retrospectiva — Ticket 16 (Saldos por cuenta)

**Qué funcionó:**
- H4C en H4 existente sin tab nuevo — patrón consistente con H4A y H4B
- Modal bloqueante sin botón cancelar — UX clara para requisito obligatorio
- Panel Home con banner ámbar si no hay saldos — feedback inmediato al abrir la app
- Script cleanup-h4c.mjs para limpiar duplicados de test — patrón reutilizable para otros rangos
- DoD 5/5 verificado en Sheet via API + script en una sola sesión

**Qué no funcionó:**
- Bug: ensureH4Headers retornaba early si H4 ya existía — headers H4C nunca se escribían en P1
- Consecuencia: POST escribía datos sin header row, GET devolvía array vacío
- Fix: ensureH4CHeaders independiente con verificación propia de P1

**Qué cambia en el próximo sprint:**
- MVP completo — go-live junio 7, 2026
- T17 (M2 vista Angie) post go-live si se decide construir

---

## Retrospectiva — T16b (Rediseño Home como hub)

**Qué funcionó:**
- HomeHub.tsx limpio — Server Component para métricas, Client Component para navegación y FABs
- RegistroRapido.tsx extraído correctamente — reutilizable desde Home y desde vista semanal
- PantallaMeses con modoHistorial — sin duplicar componente
- DoD 6/6 en una sola sesión

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- T16: Saldos por cuenta (H4C + bloqueo obligatorio al abrir M1 Ejecución)

---

## Retrospectiva — T17 (Vista semanal M4)

**Qué funcionó:**
- Vista semanal con datos reales de H2 filtrados por semana activa
- Bolsillos con progreso real desde H3
- FAB registro rápido reutilizado correctamente
- Mobile-first verificado en producción

**Qué no funcionó:**
- Deploy bloqueado por identidad git del WorkSpace — resuelto haciendo el repo público
- Claude Code se desvió al OAuth de Vercel fuera del scope del ticket

**Qué cambia en el próximo sprint:**
- git config --global con camilovillamil@gmail.com ya configurado — futuros deploys no tendrán este problema
- Repo público — sin impacto en seguridad real

---

## Retrospectiva — Sesión QA go-live + T38 + T37 parcial

Fecha: 2026-06-02

**Qué funcionó:**
- QA Planificación y Ejecución — sin bloqueantes
- T33b fix saldos — diagnóstico correcto, fix en una sesión
- T38 — desglose por cuenta en rail Saldos — DoD completo en una sesión
- balanceSemanas carry-over verificado en producción

**Qué no funcionó:**
- T37 subestimado — ModalAporteAngie no sirve para el flujo de Angie. Requiere modal nuevo + lógica acumulativa + refetch al foco
- T26 no tiene diseño — no se puede abrir como ticket de construcción

**Qué cambia en el próximo sprint:**
- Próxima sesión: DISEÑO de T37 (modal acumulativo Angie) + DISEÑO de T26 (validación de fondos)
- Sin código hasta tener ambos diseños aprobados

---

## Retrospectiva — Sesión DISEÑO + CONSTRUCCIÓN · T37

Fecha: 2026-06-02

**Qué funcionó:**
- Diseño T37 y T26 completados en una sesión
- Rediseño parcial de T37 al descubrir que H4B es solo plan
- H4D como rango nuevo — patrón consistente con H4A/B/C
- DoD 7/7 verificados en producción

**Qué no funcionó:**
- Modelo de datos de H4B no estaba claro al inicio del diseño
- T37 requirió dos iteraciones de arquitectura antes de estabilizarse
- Total en rail Saldos desincronizado — deuda técnica T37-DT1

**Qué cambia en el próximo sprint:**
- QA completo de T37 antes de abrir T26
- Verificar que no hay otros valores que excluyan H4D

---

## Retrospectiva — Sesión DISEÑO · T37 + T26

Fecha: 2026-06-02

**Qué funcionó:**
- Dos especificaciones completas en una sola sesión
- T37: flujo acumulativo con Opción B (fila por registro) — trazabilidad sin historial visible
- T26: tres caminos de resolución explícitos — sin detección automática (descartada correctamente)
- Supuestos implícitos validados antes de cerrar cada especificación

**Qué no funcionó:**
- T26 resultó más complejo de lo anticipado — tres escenarios colapsados en un ticket

**Qué cambia en el próximo sprint:**
- Próxima sesión: CONSTRUCCIÓN — T37 primero, T26 segundo
- T37 es prerequisito de T26 (Opción 2 del modal T26 usa el flujo de T37)

---

## Especificación T26 — Modal validación de fondos

**Disparador:** usuario presiona "Ejecutar" y la cuenta seleccionada no tiene saldo suficiente.

**Comportamiento:** bloquea la ejecución — no ignorable.

**Aplica en:** M1 Ejecución desktop · M1 Ejecución móvil · M4 (cuando el gasto se vincula a H2)

**Encabezado del modal:**
Nombre del concepto + cuenta con déficit + disponible vs necesario.
Ejemplo: "NU Camilo · Disponible $150.000 · Necesario $320.000"

**Opción 1 — Cambiar cuenta de pago:**
Muestra cuentas disponibles con saldo actual. Usuario selecciona y confirma. Ejecución procede con nueva cuenta. Deshabilitada si ninguna cuenta tiene saldo suficiente.

**Opción 2 — Registrar ingreso Angie:**
Label según actor logueado: "Registrar aporte de Angie" (Camilo) / "Registrar mi ingreso" (Angie). Abre ModalRegistroIngresoAngie con registradoPor = actor logueado. Post-registro: actualiza saldo visible en modal antes de confirmar ejecución.

**Opción 3 — Posponer:**
Cierra modal. Marca concepto como pospuesto en H2. No ejecuta.

**Supuestos:**
- Sin reasignación entre conceptos — post go-live
- Modal idéntico para Camilo y Angie — texto Opción 2 se adapta según actor

**DoD:**
1. Ejecutar con cuenta sin saldo → modal aparece, no ejecuta
2. Encabezado muestra concepto + cuenta + disponible vs necesario
3. Opción 1 muestra cuentas restantes con saldo actual
4. Opción 1 deshabilitada si ninguna cuenta alcanza
5. Opción 1 ejecuta con nueva cuenta al confirmar
6. Opción 2 abre ModalRegistroIngresoAngie con registradoPor correcto
7. Registro Opción 2 persiste en H4D con registradoPor correcto
8. Post-registro Opción 2: saldo actualizado visible antes de confirmar
9. Opción 3 cierra modal y marca pospuesto en H2

---

## Retrospectiva — Sesión QA + CONSTRUCCIÓN · T37 cierre + T26

Fecha: 2026-06-03 | Cierre: 09:04

**Qué funcionó:**
- Diagnóstico correcto de T37 antes de tocar código — solo T37-DT1 como valor desincronizado
- Fix T37 pre-cierre (registradoPor dinámico) en una línea — tsc limpio al primer intento
- T26 construido en una sesión con DoD 9/9 verificado en producción
- Spec T26 persistida en ESTADO.md antes de cerrar el ticket
- Reset junio consolidado — H4D integrado en reset-junio-completo.mjs

**Qué no funcionó:**
- T26 DoD #1 falló en primera verificación: la validación interceptaba EjecucionRow (vista legacy) en lugar de ConceptoBoard (vista activa en desktop)
- Causa: la arquitectura desktop tiene dos caminos de ejecución — el nuevo (ConceptoBoard grid S1-S4) y el legacy (EjecucionRow tabla). La validación se insertó en el legacy.
- Fix requirió diagnóstico adicional y un segundo commit

**Qué cambia en el próximo sprint:**
- Al agregar lógica de negocio a M1 desktop, verificar si el punto de entrada es ConceptoBoard o EjecucionRow — ConceptoBoard es la vista activa

---

## Retrospectiva — Sesión QA + CONSTRUCCIÓN · T45 cierre · 5 junio 2026

**Qué funcionó:**
- Migración datos H1/H2 limpia — script idempotente, 10 + 18 filas actualizadas
- Diagnóstico de gaps T45 en QA — tres fixes identificados y aplicados en la misma sesión
- tsc limpio en todos los commits
- Trazabilidad /admin/trazabilidad confirmó IDs correctos en H3B

**Qué no funcionó:**
- DoD de T45 incompleto al abrirse — no contempló estado H2 para pago_fraccionado ni filtro PropuestaCard
- Commit prematuro antes de verificar DoD en browser
- DoD 4/5/6 no verificados en móvil — sesión terminó antes

**Qué cambia en el próximo sprint:**
- Próxima sesión: QA — verificar DoD 4/5/6 T45 en móvil + flujo Angie completo
- H3 tiene 5 consumos de prueba — decidir si limpiar antes de go-live

---

## Sesión Estratégica — 6 junio 2026

### Decisiones tomadas

**Redefinición de scope go-live**
El go-live del 7 de junio se limita a M1 Ejecución. Los bloqueantes BL-01 a BL-06 se reclasifican como deuda técnica post go-live — no bloquean la salida a producción con el scope reducido.

**Plan go-live semana 7 junio**

| Día | Actividad |
|---|---|
| Sábado 7 jun | Inicializar junio 2026 en la app + QA M1 Ejecución (flujo completo Camilo + flujo Angie en M1) |
| Domingo 8 jun | Momento 2 real con Angie — primer cierre semanal S1 junio en condiciones reales |

**Criterio de fix durante QA**
- Bug resoluble en menos de 20 min → se resuelve
- Requiere diagnóstico o toca arquitectura → deuda técnica, se documenta y se sigue

**Modal cierre semana BL-04 y BL-05**
Los campos de remanente Angie y aporte planeado quedan manuales para el domingo. Se le explica a Angie que es temporal. Rediseño del modal queda para la semana siguiente.

**Adopción**
Prueba piloto con la familia Villamil la semana del 8 de junio. Los BL-* se priorizan según fricción real observada en uso.

---

## QA Go-Live — 6 junio 2026

### Inicio: 6 junio 2026
### Cierre: 6 junio 2026

### Flujo M1 Ejecución — Camilo

| Paso | Acción | Resultado | Fix |
|---|---|---|---|
| 1 | Inicializar junio 2026 → verificar 62 movimientos en H2 | ✓ OK | — |
| 2 | Confirmar saldos | ✓ OK | — |
| 3 | Ejecutar conceptos (múltiples) | ✓ OK — saldos consistentes contra Sheet | disponiblePorCuenta ignoraba H4A — NU Camilo mostraba 0 pese a $12.1M de ingreso |
| 4 | Posponer (mover a otra semana) | ✓ OK | — |
| 5 | Revertir ejecución | ✓ OK — saldos se actualizan correctamente | — |
| 6 | Agregar via B4 (desde Ejecución) | ✓ OK — aparece bajo categoría Recreación | — |
| 7 | Cerrar semana | ✓ OK | — |

### Flujo Angie en M1

| Paso | Acción | Resultado | Fix |
|---|---|---|---|
| 1 | Registrar aporte FAB | ✓ OK | — |
| 2 | Ejecutar con cuenta Angie | ✓ OK (post-fix) | T26 dispara correctamente, saldo ya no negativo |

### Bugs encontrados en QA

| # | Descripción | Severidad | Acción |
|---|---|---|---|
| 1 | NU Camilo disponible = 0 pese a ingreso $12.1M registrado | Media | Fix aplicado — commit 4da180a |
| 2 | Saldo Angie negativo en rail + T26 no dispara cuando recargas parcialmente gastadas | Media | Fix aplicado — commit 6223e8f |
| 3 | remanenteSemana WeekColumn muestra negativo cuando ítem ejecutado por más de presupuestado | Baja | Fix aplicado — commit 1bc042f — remanenteSemana = porPagar |
| 4 | Por Semana sidebar muestra -$1.64M en S1-S4 — balanceSemanas usaba cierre.remanenteAngie ($0) en lugar de recargas ($1.7M) | Media | Fix aplicado — commit 77e8842 |

### Fixes aplicados en sesión

| # | Descripción | Commit |
|---|---|---|
| 1 | disponiblePorCuenta suma ingreso Camilo H4A a la cuenta destino | 4da180a |
| 2 | disponiblePorCuenta unifica fórmula bruto+ingreso+recargas-ejecutado — rail y validación T26 consistentes | 6223e8f |
| 3 | remanenteSemana = porPagar — nunca negativo, cero cuando todo ejecutado | 1bc042f |
| 4 | balanceSemanas aporteAngie usa recargas reales por semana — Por Semana sidebar correcto | 77e8842 |

---

## Retrospectiva — QA Go-Live · 6 junio 2026

**Resultado: APROBADO — go-live M1 Ejecución habilitado**

**Qué funcionó:**
- Flujo completo M1 Ejecución sin bloqueantes: inicializar, confirmar saldos, ejecutar, posponer, revertir, B4, cerrar semana
- Flujo Angie: FAB aporte + T26 validación de fondos operativo
- Criterio de fix < 20 min funcionó — 2 bugs resueltos en sesión sin frenar el QA
- Reset + reinicialización desde app sin fricción

**Bugs encontrados y resueltos:**
- **Fix 1** (commit 4da180a): `disponiblePorCuenta` ignoraba ingreso Camilo H4A — NU Camilo mostraba $0 pese a $12.1M registrado
- **Fix 2** (commit 6223e8f): fórmula `disponiblePorCuenta` unificada con display rail — eliminó saldo negativo Angie y alineó validación T26

**Deuda técnica nueva:** ninguna

**Próximo paso:** sesión de diseño con claude.ai — rediseño de componentes (reubicar y eliminar)

---

## Retrospectiva — T46 Eliminar tarjetas métricas superiores · 6 junio 2026

**Qué funcionó:**
- Ticket 100% clean: bloque dk-kpis removido (65 líneas JSX), 8 variables huérfanas eliminadas
- tsc limpio al primer intento, cero errores post-refactor
- Diagnóstico de variables usadas en sidebar/rail vs solo en KPI — no se eliminó nada útil

**Qué no funcionó:**
- Dos fixes CSS necesarios post-commit: (1) max-width: 1400px en .dk-content limitaba el ancho total; (2) dk-grid tenía dos columnas (1.85fr | 1fr) pero solo un hijo — la columna vacía consumía ~35% del ancho disponible

**Causa raíz:**
- El rail de saldos por cuenta vive en el sidebar (aside.dk-side), no en dk-grid — la definición de dos columnas era un vestigio de un diseño anterior donde el rail estaba en el grid

**Qué cambia en el próximo sprint:**
- Al eliminar un bloque JSX, verificar si el CSS del contenedor padre asume una cantidad específica de hijos (columnas de grid con hijos implícitos)
- Si hay más componentes visuales, aplicar el mismo criterio: eliminar bloque JSX + variables huérfanas + tsc + verificar layout en Vercel

---

## Prompt de apertura — próxima sesión (post go-live)

Retomamos el proyecto Flujo. Lee ESTADO.md adjunto al proyecto Claude.
Tipo de sesión: CONSTRUCCIÓN
Objetivo: Priorizar y construir deuda técnica post go-live según fricción observada en uso real (semana 8 jun)
Hora de inicio: [COMPLETAR]
Entorno: Windows — PowerShell exclusivamente.

APERTURA: Genera el dashboard con los datos actuales de ESTADO.md antes de cualquier otra cosa.

Navegación de código: usar graphify query antes de leer archivos fuente.

CIERRE: Actualizar ESTADO.md con hora de cierre y retrospectiva.
Regenerar kanban: node scripts/generate-kanban.mjs

---

## Retrospectiva — Sesión CONSTRUCCIÓN · T45

Fecha: 2026-06-05

**Qué funcionó:**
- Diagnóstico arquitectónico correcto — tipo bolsillo como concepto mal nombrado resuelto en una sesión
- Script migración datos H1/H2 limpio — 10 filas H1, 18 filas H2 actualizadas
- tsc limpio en todos los commits
- Trazabilidad /admin/trazabilidad útil para confirmar IDs correctos en H3B

**Qué no funcionó:**
- DoD de T45 incompleto al abrirse — no contempló estado H2 para pago_fraccionado ni selector PropuestaCard
- Commit prematuro antes de verificar DoD en browser
- Tres gaps adicionales identificados durante construcción: PropuestaCard filtro, panel límites H3B, ModalCorreccion IDs

**Qué cambia en el próximo sprint:**
- Próxima sesión: QA — verificar DoD 4/5/6 de T45 + continuar flujo Angie (corrección M5, cierre semana)
- H3 tiene 5 consumos de prueba — decidir si limpiar antes de go-live

---

## QA Sesión 4 junio 2026

**Estado QA:** Todos los bloqueantes go-live resueltos.
**Pendiente:** flujo Angie completo en VistaSemanal.

### Tickets completados en esta sesión

| Ticket | Descripción | Commit | DoD |
|---|---|---|---|
| T43 | Módulo trazabilidad /admin/trazabilidad | e7b0e91 | 8/8 |
| T44 | Fix H4 spillover + createRecargaAngie determinista | 84b23eb | 8/8 |
| B-QA-01 | Bolsillos agotados visibles en FAB con badge "sobre techo" | 82bc317 | 5/5 |

### Bugs resueltos

- **QA-3jun-1:** Mover concepto a S3 — resuelto como efecto colateral de tickets anteriores
- **QA-3jun-2:** T26 caminos 1 y 2 no renderizados — resuelto, verificado en producción
- **QA-3jun-3:** remanenteAngie diverge M1 vs VistaSemanal — raíz era H4D spillover, resuelto en T44
- **B-QA-01:** Bolsillo agotado desaparece de lista FAB — resuelto, badge "sobre techo" en M5 es el flujo correcto
- **B-QA-02:** FAB aporte Angie abría modal incorrecto — resuelto en T44

### Deuda técnica nueva (post go-live)

- **DT-QA-01:** Proyección superávit valor incorrecto (-$20.4M) — probable causa saldos iniciales H4C subrepresentados
- **DT-QA-02:** Label "Registrar aporte de Angie" en modal T26 no adapta por actor — requiere autenticación real
- **DT-QA-03:** idRecargaOrigen=null cuando fuenteAngie=true — conciliación pendiente
- **DT-QA-04:** Dropdown Concepto en H2 en FAB muestra todas las semanas sin filtrar por semana activa
- **DT-T45-01:** H3B sin-concepto/route.ts: H3B_HEADERS declara 14 columnas pero el row tiene 16 — sobre_techo siempre se escribe como "" en lugar de calcularse. Post go-live.
- **DT-T45-02:** M1 Ejecución: conceptos pago_fraccionado muestran estado "pendiente" aunque tengan consumos en H3B — diferenciación visual pendiente. Post go-live.
- **DT-T45-03:** H3 junio: 5 consumos de prueba en MERCADO_Y_ALIMENTACION_1779730807246 — limpiar antes de go-live o dejar como datos reales.

---

## Lección aprendida — cambios de esquema

Cuando se mueve un rango en el Sheet, auditar escrituras Y lecturas en el mismo ticket.

**Checklist obligatoria:** para cada función que toca el rango — ¿lee? ¿escribe? ¿ambos? Verificar rango correcto en cada caso antes del commit.

---

## Retrospectiva — Sesión QA parcial (Mayo 2026)

**Qué funcionó:**
- Recorrido de QA identificó 6 hallazgos concretos en M1 desktop
- T21 revertido correctamente antes de acumular deuda

**Qué no funcionó:**
- T21 se intentó construir sin diseño aprobado — violación de la metodología
- El diseño desktop de Planificación y Ejecución nunca fue especificado formalmente

**Qué cambia en el próximo sprint:**
- Próxima sesión es obligatoriamente DISEÑO — no construcción
- Sin diseño aprobado de ambas vistas desktop no se abre ningún ticket de construcción

---

## Retrospectiva — Sesión DISEÑO · Layout desktop + móvil M1

Fecha: 30 mayo 2026 | 10:00 – 11:27 am

**Qué funcionó:**
- Diseño de Claude Design como punto de partida — evitó rediseñar desde cero
- Modelo de Vercel actual definió el layout correcto para desktop (2 columnas, no 3)
- Secuencia de preguntas antes de especificar — cada respuesta eliminó ambigüedad real
- T21 revertido correctamente — la sesión de diseño existió por esa razón

**Qué no funcionó:**
- Especificación inicial excluyó responsive sin señalarlo explícitamente — corrección necesaria
- Asunción implícita de que la vista móvil actual era móvil real — no lo era

**Qué cambia en el próximo sprint:**
- Claude Code lee archivo de Claude Design antes de escribir cualquier componente
- T21 abierto con DoD de 7 puntos — sesión de CONSTRUCCIÓN

---

## Retrospectiva — Sesión CONSTRUCCIÓN · T21 Layout desktop + móvil

Fecha: 30 mayo 2026 | 11:27 am – completado (DoD 6 incluido)

**Qué funcionó:**
- Paso 0 cumplido — design-handoff leído antes de escribir código; tokens fl-* y clases dk-* usados directamente
- MesM1Desktop.tsx reescrito como vista unificada (Planificación + Ejecución)
- Balance Planificación reactivo — recalcula al editar inputs sin round-trip al servidor
- `handleCambiarSemana` con PATCH H2 inmediato — semana persiste y balance reacciona en el acto
- MesM1Mobile.tsx creado como componente nuevo independiente — vista móvil fl-* completa
- Wrapper MesM1ClientWrapper actualizado con detección responsive automática (resize listener)
- TypeScript limpio al primer intento en ambos archivos — tsc --noEmit sin errores
- Semana activa como default en Planeación y Ejecución (móvil y desktop)

**Qué no funcionó:**
- No se verificó en browser real — pendiente confirmar visualmente en http://localhost:3000
- Deuda técnica H3 (agrupación por categorías colapsable en Ejecución desktop) no resuelta — fuera del scope

**Qué cambia en el próximo sprint:**
- Push a main y deploy Vercel antes de cualquier otra cosa
- Smoke test en producción: toggle Planificación/Ejecución, tabs semana, confirmar saldos, ejecutar concepto en móvil
- Si smoke test pasa → go-live declarado para junio 7, 2026

---

## Retrospectiva — Sesión CONSTRUCCIÓN · ConceptoBoard grid S1-S4

Fecha: 30 mayo 2026 | sesión de recuperación post-corte de tokens

**Qué funcionó:**
- Diagnóstico de estado sin leer archivos masivamente — git status + tsc + graphify en paralelo cubrió todo
- ConceptoBoard.tsx estaba completo al retomar (524 líneas, TSC limpio) — sesión anterior avanzó más de lo aparente
- Smoke test local con Playwright antes del commit — evidencia visual antes de push
- Verificación en producción via Vercel MCP + Playwright — deploy confirmado sin ambigüedad
- graphify update post-commit — grafo pasó de 527 a 811 nodos con ConceptoBoard integrado

**Qué no funcionó:**
- La sesión anterior se cortó por tokens justo antes del commit — trabajo completo quedó sin cerrar
- graphify no se actualizó en la sesión anterior (ConceptoBoard no estaba en el grafo al retomar)

**Qué cambia en el próximo sprint:**
- Ante corte de tokens: el código puede estar más avanzado de lo que parece — diagnosticar antes de reescribir
- Confirmar go-live junio 7, 2026: smoke test en móvil real + ejecutar al menos un concepto de junio via la app

---

## Retrospectiva — Sesión DISEÑO · T27 Mejoras de diseño pre go-live
Fecha: 31 mayo 2026

**Qué funcionó:**
- 5 mejoras diseñadas y aprobadas en una sola sesión
- Decisión de mover cierre semanal a M1 Ejecución simplifica navegación
- Layout rail derecho definido desde captura existente de Vercel

**Qué no funcionó:**
- M3 (saldo de cuentas en encabezado) descartada — ya cubierta en rail izquierdo

**Qué cambia en el próximo sprint:**
- Obtener diseño Claude Design para 3 elementos: encabezado columna · categoría colapsable · modal M5
- Con diseño aprobado: abrir T22 como primer ticket de construcción

Ajuste post Claude Design: escenario H3 sin clasificar vincula exclusivamente a bolsillos activos (Frida / Entretenimiento / Mercado semanal / Mercado mensual / Fondo transporte / Angie) — no a conceptos H2

---

## Retrospectiva — T27 Mejoras de diseño pre go-live

**Qué funcionó:**
- DoD 6/6 en una sola sesión de construcción
- graphify optimizó navegación de código — sin lectura masiva de archivos
- Handoff Claude Design → Claude Code directo sin intermediación manual
- Deploy Vercel automático verificado en producción

**Qué no funcionó:**
- WebFetch del bundle devolvió gzip binario — requirió descomprimir con PowerShell antes de leer

**Qué cambia en el próximo sprint:**
- Abrir T22 — Planificación: acciones y flujo (bugs 3, 4, 5, 6)

---

## Retrospectiva — T28 Conectar ModalCorreccionM5 a VistaSemanal

Fecha: 31 mayo 2026

**Qué funcionó:**
- Diagnóstico correcto: el modal Y el historial ya estaban implementados e inlineados en VistaSemanal.tsx — la deuda técnica sobreestimó el trabajo pendiente
- Fix quirúrgico: 11 líneas en handleSheetSuccess + 1 cambio de prop — sin tocar APIs ni tipos
- DoD 8/8 verificados vía API antes del commit — monto, clasificación, render HTML confirmados
- tsc --noEmit limpio al primer intento
- Extensión T28: ModalCorreccionM5 extendido a ejecutados H2 — PATCH H2 operativo, validaciones 400/404 correctas en producción

**Qué no funcionó:**
- graphify no tenía el nodo ModalCorreccionM5 — el grafo no se había actualizado post T27; diagnóstico tuvo que recurrir al filesystem directamente
- 2 consumos de test quedaron en H3 junio 2026 — sin endpoint DELETE, solo clasificables

**Qué cambia en el próximo sprint:**
- Próximo ticket: T22 — Planificación: acciones y flujo (bugs 3, 4, 5, 6)

---

## Retrospectiva — T28 extensión (DoD 6, 7, 8) — ModalCorreccionH2

Fecha: 31 mayo 2026

**Qué funcionó:**
- ModalCorreccionH2 inlineado en VistaSemanal — mismo patrón que H3, sin archivo nuevo
- 4 escenarios H2 (monto/ejecutor/fuente/semana) — clasif no aplica para H2
- PATCH H2: `tipo: "ejecutar"` preserva campos no corregidos; `reasignar_semana` para semana
- tsc --noEmit limpio al primer intento — sin errores de tipos
- DoD 6-8 verificados: strings en bundle + PATCH real en Sheet (monto 50000 y semana S3→S4)

**Qué no funcionó:**
- Servidor backgrounded no tomó los edits en caliente — necesitó restart manual
- Bug preexistente detectado: semana "S4" en POST sin-concepto guardó "S2" — documentado como deuda, no corregido en este ticket

**Qué cambia en el próximo sprint:**
- T22 — Planificación: acciones y flujo (bugs 3, 4, 5, 6)
- Revisar índice de columna semana en sheets.ts (bug H3 semana) antes de go-live

---

## Retrospectiva — T22 Planificación: acciones y flujo

**Qué funcionó:**
- 4 bugs resueltos en una sola sesión
- DkPlanForm extendido sin reescritura — cambios quirúrgicos
- ModalAgregarConcepto reutilizado sin duplicar código
- tsc --noEmit limpio al primer intento

**Qué no funcionó:**
- Primer agente de exploración analizó VistaPlanificacion (móvil) en lugar de ConceptoBoard (desktop) — requirió dos rondas adicionales para llegar al componente correcto
- Campo FK era conceptoId no idConcepto — detectado con grep antes de tsc

**Qué cambia en el próximo sprint:**
- T23 — Ejecución: acciones y flujo (bugs 7, 8, 10, 11, 12, 13, 15)

---

## Retrospectiva — T23 Ejecución: acciones y flujo

Fecha: 2026-06-01

**Qué funcionó:**
- DoD 7/7 en una sola sesión
- Componentes existentes reutilizados (ModalConfirmarSaldos, ModalAgregarConcepto, ModalCerrarSemana)
- tipo: revertir_ejecucion agregado al PATCH H2 sin romper casos existentes
- Smoke test en producción confirmó DoD 1 y 2 antes de cerrar

**Qué no funcionó:**
- DoD no verificados contra producción por Claude Code — requirió smoke test manual

**Qué cambia en el próximo sprint:**
- T24 — Balance y cálculos (bugs 1, 2, 9)

---

## Retrospectiva — T24 Balance y cálculos

Fecha: 2026-06-01

**Qué funcionó:**
- Diagnóstico preciso via lectura quirúrgica — dos fixes de render, sin tocar lógica
- Bug #2 descartado correctamente antes de escribir código — verificación en producción evitó trabajo innecesario
- DoD 2/2 verificados en producción antes de cerrar

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- T25 — Navegación y regresiones (bugs 14, 16, 17, 19)

---

## Retrospectiva — T25 Navegación y regresiones

Fecha: 2026-06-01

**Qué funcionó:**
- ModalAporteAngie reutilizado sin lógica nueva — DoD 3 en una línea
- Sidebar navegación conectado con useRouter — 4 rutas, Bolsillos deshabilitado visualmente
- Decisión de storage para comprobantes tomada (Google Drive) y documentada antes de cerrar

**Qué no funcionó:**
- Drag and drop no funcional pese a canDrag/canDrop habilitados — causa no identificada, movido a deuda técnica
- DoD verificación en producción requirió dos ciclos de deploy por #14

**Qué cambia en el próximo sprint:**
- T22 — Planificación: acciones y flujo (bugs 3, 4, 5, 6)

---

## Retrospectiva — T30 Ejecución: saldos reactivos + estados visuales

Fecha: 2026-06-02

**Qué funcionó:**
- Diagnóstico preciso antes de escribir código: los 3 bugs tenían raíces distintas (prop congelada, callback faltante, bloque a eliminar)
- Contexto pendiente de Planificación diagnosticado y descartado correctamente — era falso positivo
- B5: un cambio de 2 líneas corrigió el problema de reactividad (`aportes` como dep)
- B6: `onAfterExec` añadido como prop opcional — sin cambiar la interfaz existente de `ConceptoBoard`
- B7e: eliminación limpia del bloque rail derecho — sin residuos
- F3: `isConfirmado` derivado de `cierresSemanaProps` (sin estado extra)
- F4: `allDone` computado in situ en `CatGroup` — sin prop adicional
- tsc --noEmit limpio al primer intento

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Go-live: junio 7, 2026 — T29, T30, T31 completos. Pendiente: smoke test en producción.

---

## Reset junio 2026 — pre-QA go-live

Fecha: 2026-06-02

Script: `scripts/reset-junio-completo.mjs` — commit 54cf653

### Log ejecutado

```
H2   → 63 filas borradas  [vacía — pendiente reinit desde app]
H3B  →  0 filas           (sin consumos de junio)
H4A  →  1 fila borrada    (ingreso Camilo)
H4B  →  4 filas borradas  (aportes Angie S1–S4)
H4C  →  4 filas borradas  (saldos iniciales)
H5A  →  0 filas           (sin cierres de semana)
H5B  →  0 filas           (tab no existe)
```

### Estado post-reset

| Hoja | Estado |
|---|---|
| H1 | Intacto — 41 conceptos activos |
| H2 | Vacía (headers intactos) — reinit pendiente desde app |
| H3 | Sin consumos de junio — Rango A (bolsillos) intacto |
| H4A | Sin ingreso Camilo de junio — mayo conservado |
| H4B | Sin aportes Angie de junio — mayo conservado |
| H4C | Sin saldos de junio |
| H5A | Sin cierres de semana |
| H5B | Tab no existe |
| H6 | Intacto |

**Próximo paso:** Abrir la app → navegar a Junio 2026 → la app reinicializa H2 automáticamente → comenzar QA.

---

## Retrospectiva — T32b Fix bloqueantes QA go-live

Fecha: 2026-06-02

**Qué funcionó:**
- B1+B2: root cause preciso antes de escribir código — prop-to-state mismatch en ConceptoBoard. `useEffect` con filtro por ID resuelve sin romper ediciones in-board.
- B3: fix display-only (no cambia modelo de datos) — ingreso visible en "Saldos" y en S1 de "Por semana" con cero riesgo de double-counting.
- B4: fix de una línea en dos lugares — denominador correcto en header y en WeekColumn.
- tsc --noEmit limpio al primer intento.

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Re-QA en producción antes de declarar go-live.

---

## Retrospectiva — T32b Fix bloqueantes QA go-live (segunda iteración)

Fecha: 2026-06-02

**Qué funcionó:**
- B1/B2 ya estaban resueltos en commit 5460967 — verificación en producción evitó trabajo innecesario
- Diagnóstico de B3 por lectura quirúrgica de código — causa raíz identificada sin tocar el servidor
- Fix acotado: solo balanceSemanas reemplazado — balancePlanificacion y remanenteAngiePerSemana intactos
- carry-over verificado visualmente antes de declarar DoD

**Qué no funcionó:**
- ESTADO.md tenía contradicción entre encabezado y tabla de tickets — generó confusión al abrir la sesión
- B3 tenía dos manifestaciones distintas (NU Angie en Saldos vs carry-over) — solo la segunda era bug real

**Qué cambia en el próximo sprint:**
- Go-live: verificar en Vercel producción, luego declarar go-live para junio 7, 2026
- Rama dev + preview URL antes del primer ticket post go-live (deuda DevOps documentada)

---

## Retrospectiva — Sesión DISEÑO · Auditoría de datos

Fecha: 2026-06-03

**Qué funcionó:**
- Acceso al Sheet real desde Google Drive — auditoría contra datos reales, no solo ESTADO.md
- Metodología de flujo primero (envelope budgeting) antes de analizar el modelo — reveló supuestos implícitos
- Matriz de combinaciones como mecanismo de estrés del modelo — más eficiente que casuística manual
- 14 casos analizados, 13 huecos identificados, 13 resueltos con 6 correcciones
- Decisiones tomadas una a una con aprobación explícita — ninguna ambigua

**Qué no funcionó:**
- Tendencia inicial a ir al detalle de los datos antes de tener el mapa conceptual — corregido a tiempo
- Gráfico inicial basado en ESTADO.md sin verificar contra Sheet real

**Qué cambia en el próximo sprint:**
- Antes de construir T37 y T26: verificar que el código implementa las reglas de negocio aprobadas hoy
- Campos nuevos en H2, H3B, H4C, H5A requieren migración de esquema antes de go-live
- Actualizar prompt de apertura para próxima sesión

---

## Retrospectiva — T39 Migración de esquema · correcciones modelo de datos

Fecha: 2026-06-03

**Qué funcionó:**
- Diagnóstico pre-ejecución completo — colisión H4C/H4D identificada antes de tocar el Sheet
- Script migrate-t39.mjs idempotente — verificó datos existentes en H4D antes de moverlos
- 5 filas H4D migradas a X:AE sin pérdida de datos
- tsc --noEmit limpio al primer intento
- DoD 8/8 verificados en Sheet real

**Qué no funcionó:**
- DoD 5 del prompt tenía error interno — decía limpiar U1 pero U1 es incluye_remanente en el nuevo layout. Detectado y corregido durante la sesión sin pérdida de trabajo.

**Qué cambia en el próximo sprint:**
- T40 — Mapeo de campos nuevos en funciones rowTo* y *ToRow + rangos de lectura actualizados
- T40 es prerequisito de T37 y T26 — no abrir esos tickets hasta que T40 esté cerrado

---

## Retrospectiva — Sesión CONSTRUCCIÓN · T40 + QA post-T40

Fecha: 2026-06-03

**Qué funcionó:**
- T40 cerrado limpio — DoD 6/6, tsc limpio, sin regresiones en smoke test
- Auditoría de rangos post-T40 encontró 2 roturas reales (H2 escritura, H3 sin-concepto) antes de que llegaran a producción con datos reales
- T41 y T42 resueltos dentro del QA — no se acumularon como deuda
- Rail Saldos corregido completamente: Inicial, Disponible, fila Recargado

**Qué no funcionó:**
- T40 introdujo roturas de rangos de escritura que tsc no detecta — solo se evidencian en runtime con datos reales
- El QA reveló bugs de display en rail Saldos que no habían sido detectados antes

**Qué cambia en el próximo sprint:**
- Después de cualquier cambio de esquema, auditoría de rangos es obligatoria antes del commit
- Próxima sesión: continuar QA — flujo Angie en VistaSemanal

---

## Retrospectiva — T43 Módulo trazabilidad /admin/trazabilidad

Fecha: 2026-06-04

**Qué funcionó:**
- Hallazgo crítico en fase de planificación: spec apuntaba a `GET /api/ingresos/angie/[mes]` para H4D pero ese endpoint retorna H4B (IngresoAngie). El endpoint correcto es `/recargas/[semana]` × 4 con flatten — detectado leyendo los route handlers antes de escribir código
- 10 fetches en paralelo con Promise.all — captura instantánea sin waterfalls
- Lógica de diff genérica con `diffHoja<T extends { id: string }>` — funciona para los 4 tipos sin duplicación
- tsc limpio al primer intento — 417 líneas, sin errores de tipos
- DoD 8/8 verificados: HTTP 200 en `/admin/trazabilidad`, regresiones `/` y `/mes/2026-06` OK

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Al leer specs de endpoints, verificar contra el route handler real — no asumir que el nombre de la ruta describe el contenido

---

## Retrospectiva — T44 Fix H4 spillover + createRecargaAngie determinista

Fecha: 2026-06-04

**Qué funcionó:**
- Diagnóstico de tres causas independientes (header V1 stale, ghost rows X2:AE6, spillover P11:V13) antes de tocar código
- Script fix-h4-spillover.mjs con verificación pre/post — ejecutó sin errores, todos los checks OK
- `ensureH4CHeaders` corregido en dos líneas: cambiar columna de chequeo de P1 a V1, comparación a "id_cierre_origen"
- `createRecargaAngie` reescrito con `values.update` + cálculo explícito de fila — elimina la no-determinismo de `values.append` de raíz
- tsc limpio al primer intento

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- Nunca usar `values.append` para rangos con tabla adyacente — siempre calcular fila explícita con `values.update`
- Cuando `ensureHeaders` usa una columna de chequeo, verificar que esa columna sea la última del rango (la más propensa a quedar stale)

---

## Retrospectiva — B-QA-01 Bolsillos agotados visibles en FAB

Fecha: 2026-06-04

**Qué funcionó:**
- Diagnóstico acotado: el filtro de BOLSILLOS_ACTIVOS en ModalCorreccion no tenía datos de techo — no era un filtro sino ausencia de información
- Fix mínimo: pasar `bolsillos` (H2 movimientos) como prop, calcular `sobreTecho` inline en el render del selector
- Badge "sobre techo" agregado en el render — usuario puede ver el estado y seleccionar de todas formas
- `sobreTecho` persistido en H3B al clasificar — trazabilidad completa
- tsc limpio al primer intento

**Qué no funcionó:**
- Nada

**Qué cambia en el próximo sprint:**
- En ModalCorreccion, el escenario "clasif" ya tiene datos H2 disponibles — cualquier lógica que dependa de techos puede consultarlos vía prop `bolsillos`

## Retrospectiva — Sesión QA · 5 junio 2026 · 16:14–17:00

**Qué funcionó:**
- T45 DoD 4/5/6 verificados en producción — lógica correcta, consumos pago_fraccionado escriben en H3B
- Trazabilidad /admin/trazabilidad como herramienta de QA — antes/después concluyente en cada verificación
- Flujo M5 ejecutado end-to-end — modal renderiza y completa el flujo
- Modal cierre semana — renderiza correctamente

**Qué no funcionó:**
- 6 bloqueantes go-live identificados — go-live 7 junio en riesgo
- ModalCorreccionM5 usa IDs H2 en lugar de H3A — dato corrupto confirmado en Sheet via trazabilidad
- Modal cierre semana requiere rediseño — campos manuales que el sistema puede calcular desde H4D y H4B

**Qué cambia en el próximo sprint:**
- Próxima sesión: DISEÑO para BL-04 y BL-05 (rediseño modal cierre semana) + CONSTRUCCIÓN para BL-01, BL-02, BL-03, BL-06
- Re-evaluar fecha go-live antes de abrir construcción

---

## Retrospectiva — Sesión CONSTRUCCIÓN · 5 junio 2026 · –17:33

**Qué funcionó:**
- Identificación correcta de premisa de negocio: selector clasif debe mostrar solo bolsillos de semana activa (presupuesto asignado), no todos los del mes

**Qué no funcionó:**
- BL-01: fix incorrecto descartado — se intentó reemplazar `bolsillos: Movimiento[]` por H1 Concepto (mes completo), contradiciendo la premisa de semana activa. Revertido.
- BL-01 queda abierto: causa raíz no confirmada en código (el ID escrito ya es `b.conceptoId`, no MOV_xxx). Requiere reproducir dato corrupto en trazabilidad antes de tocar código.
- BL-02: no ejecutado — sesión cerrada por tokens

**Qué cambia en el próximo sprint:**
- BL-01: antes de tocar código, reproducir el dato corrupto en trazabilidad e identificar exactamente qué valor incorrecto llega a `id_bolsillo`
- BL-02, BL-03, BL-04, BL-05, BL-06: pendientes

---

---

## Sesión QA pre go-live · 6 junio 2026 (continuación) · M4 + M1 Sidebar

### Bugs resueltos — VistaSemanal / M4

| # | Bug | Archivos | Commit |
|---|---|---|---|
| BL-M4-01 | Pendientes mostraba pospuesto/no_aplica — filtro debía ser `estado === "pendiente"` exclusivamente | `VistaSemanal.tsx` | — |
| BL-M4-02 | Mercado y Alimentación / Entretenimiento ausentes de pendientes — movimientos con `semana = null` (variable) eran excluidos por filtro estricto de semana | `lib/data/sheets.ts` — `getMovimientosByMesYSemana`: añade `m.semana === null && m.estado !== "ejecutado"` | — |
| BL-M4-03 | Carousel de bolsillos se inundaba con todos los conceptos del mes tras un registro FAB | `VistaSemanal.tsx` — `handleSheetSuccess` cambiado a endpoint `/api/mes/${mes}/semana/${semanaActiva}` (week-scoped) | — |
| BL-M4-04 | Registros FAB clasificados por Claude quedaban sin categoría en H3 (`clasificado = FALSE`) | `app/api/registro/sin-concepto/route.ts` — `clasificado = body.bolsilloId ? "TRUE" : "FALSE"` · `components/m4/RegistroRapido.tsx` — path pago_fraccionado fija `clasificado: true` | — |
| BL-M4-05 | NU Angie saldo no reflejaba gastos FAB (H3) — `disponiblePorCuenta` no restaba consumos H3 | `app/mes/[mes]/page.tsx`, `MesM1ClientWrapper.tsx`, `MesM1Desktop.tsx` — pipeline `gastoH3PorCuenta` por cuenta | — |
| BL-M4-06 | Recarga Angie dejaba el movimiento sin ejecutar — `handleRecargaRegistrada` no disparaba `onEjecutarConCuenta` al cubrir el déficit | `components/m1/ModalValidacionFondos.tsx` — auto-ejecución post recarga cuando nueva disponibilidad ≥ montoEjecutado | — |
| BL-M4-07 | "Ejecutado" en sidebar mostraba $0 para cuentas con gastos H3 — solo sumaba H2 | `MesM1Desktop.tsx` — `ejecutado = ejecutadoH2 + gastoH3PorCuenta[cuenta]` | — |
| BL-M4-08 | Formato compacto negativo mostraba `$-100K` en lugar de `-$100K` | `MesM1Desktop.tsx` — helper COP reformulado con `abs` y `sign` separados | — |

### Bugs resueltos — M1 Ejecución sidebar (sesión actual)

| # | Bug | Causa raíz | Fix | Archivos | Commit |
|---|---|---|---|---|---|
| S-01 | Fila "Total" del bloque Saldos mostraba suma de saldos H4C ajustados por H2, sin descontar H3 | `totalSaldosLocal` = suma de `saldosLocal.saldoInicial` — no incluía `gastoH3PorCuenta` | Reemplazado por `CUENTAS_H4C.reduce((sum, { cuenta }) => sum + disponiblePorCuenta(cuenta), 0)` | `MesM1Desktop.tsx` | 5e73625 |
| S-02 | "Por Semana" no descontaba gastos FAB — flujo de caja semanal ignoraba H3 | `balanceSemanas` computaba `ejecutado` solo desde H2 movimientos | Nuevo prop `gastoH3PorSemana` (suma de ConsumoH3 por semana S1-S4) threadeado desde `page.tsx` → wrapper → desktop; sumado al ejecutado de cada semana | `page.tsx`, `MesM1ClientWrapper.tsx`, `MesM1Desktop.tsx` | 5e73625 |
| S-03 | Movimientos de semana variable ejecutados via FAB no aparecían en "Por Semana" — sí bajaban disponible de cuenta | **Causa doble:** (1) PATCH `/ejecutar` no aceptaba ni escribía `semana` — movimiento quedaba `semana = null` post-ejecución; (2) `balanceSemanas` filtraba con `m.semana === s`, descartando `null` | (1) Route: campo `semana?: Semana` en body, se escribe si `mov.semana === null`; (2) RegistroRapido: envía `semana: payload.semana` cuando `mov.semana === null`; (3) `balanceSemanas`: para ejecutados con `semana = null`, deriva semana desde `fechaEjecucion` (día 1–7→S1, 8–14→S2, 15–21→S3, 22+→S4) via helper `semanaFromFecha` | `app/api/mes/[mes]/movimientos/[id]/route.ts`, `components/m4/RegistroRapido.tsx`, `MesM1Desktop.tsx` | 9ca7add |

### Retrospectiva — Sesión

**Qué funcionó:**
- Trazabilidad paso a paso del registro FAB identificó el bug S-03 antes de buscar en el código
- `semanaFromFecha` cubre tanto registros ya existentes con `semana = null` (usa `fechaEjecucion`) como los futuros (route escribe semana en el momento de ejecutar)
- tsc limpio en todos los commits sin iteraciones adicionales

**Qué no funcionó:**
- S-03 tenía causa doble — route Y `balanceSemanas` fallaban independientemente. El fix de solo el route habría dejado los registros históricos sin semana fuera del flujo semanal.

**Deuda técnica nueva:** ninguna

---

## QA Go-Live — 7 junio 2026

### Foco: M4 → propagación a M1 Ejecución
### Resultado: APROBADO — un bug nuevo, un feature request

### Casos verificados

| # | Caso | Resultado | Detalle |
|---|---|---|---|
| C1 | Gasto texto libre → concepto pago_fraccionado (Entretenimiento) | ✅ | Routing correcto a H3B, clasificado OK, semana OK |
| C2 | Gasto texto libre → concepto fijo (Mesada) | ✅ | PATCH H2 correcto, desviación registrada |
| C3 | Gasto fuenteAngie sin saldo suficiente | ❌ Bug | T26 no intercepta — registrado como QA-7jun-01 |
| C4 | Propagación M4 → M1 Saldos | ✅ | ejecutadoH2 + gastoH3PorCuenta correctos en rail |
| C5 | Historial VistaSemanal con categoría | ✅ | Registros clasificados aparecen con categoría |
| C6 | Registro sin clasificar en VistaSemanal | ✅ | Alerta visible, flujo correcto — BL-03 cerrado como falso positivo en uso real |

### Bugs nuevos

| ID | Vista | Descripción | Severidad |
|---|---|---|---|
| QA-7jun-01 | M4 | T26 no valida fondos Angie en consumos H3B pago_fraccionado — solo valida PATCH H2 | Media |

### Feature requests

| ID | Vista | Descripción |
|---|---|---|
| QA-7jun-04 | M1 Ejecución | Desglose de consumos H3B por concepto pago_fraccionado — auditoría sin salir de la vista principal |

### Comportamientos verificados como correctos

- Routing M4: pago_fraccionado → H3B, fijo → H2 PATCH ✓
- Rail Saldos M1: suma H2 ejecutado + H3B por cuenta correctamente ✓
- Historial VistaSemanal: registros clasificados con categoría ✓
- Registro sin clasificar: alerta visual presente ✓
- BL-03: cerrado — falso positivo en uso real ✓

### Retrospectiva — QA Go-Live · 7 junio 2026

**Qué funcionó:**
- Flujo M4 completo sin bloqueantes: texto libre, pago_fraccionado, fijo, sin clasificar
- Propagación M4 → M1 Saldos correcta — H2 + H3B sumados por cuenta
- Trazabilidad /admin/trazabilidad como herramienta de verificación — eficaz en cada caso
- Google Drive read desde claude.ai permitió diagnóstico sin abrir WorkSpace

**Qué no funcionó:**
- T26 no cubre el flujo H3B — brecha arquitectónica identificada en uso real

**Qué cambia en el próximo sprint:**
- QA-7jun-01 entra a la cola de construcción post go-live
- Orden de prioridad actualizado: BL-02 → BL-03 (cerrado) → BL-06 → QA-7jun-01 → BL-04/BL-05

---

Flujo - Proyecto de salud financiera familiar - Camilo Villamil - 2026

---

## Sesión 8 junio 2026 — DISEÑO + CONSTRUCCIÓN + DEBUGGING

### Decisiones de diseño aprobadas

- Modelo de recargas eliminado. Angie registra gastos libremente — saldo NU Angie puede quedar negativo. Se resuelve cuando Angie transfiere, sin fricción ni bloqueos.
- T26 (ModalValidacionFondos) eliminado completamente para todos los actores.
- H4D queda como tab legacy vacío — no se escribe, no se lee, no se elimina físicamente.
- `id_recarga_origen` deprecado — permanece en tipos como `string | null`, nunca se popula.
- Prerequisito cierre de semana #3 eliminado (`COUNT WHERE id_recarga_origen=null`).
- H4B sigue siendo el plan semanal de Angie — fuente del aporte planeado por semana.
- Header M4 actor=angie muestra: ejecutado H2+H3B, aporte planeado H4B, falta, pendientes clasificar.

### T47 — commits

| Pieza | Commit | Descripción |
|---|---|---|
| P1 | dadb328 | Trazabilidad: eliminar fetches H4D |
| P2 | 937ead0 | T26, ModalValidacionFondos, lógica recargas eliminados |
| P3 | 95875e5 | saldo NU Angie puede ser negativo — no truncar a cero |
| P4 | 3f3a012 | Modal cierre semana: remanente Angie pre-populado |
| P5 | 73c575b | Header M4 móvil actor=angie — 5 métricas |
| Bug 1 | 1d0dfa8 | ejecutadoAngie suma H2+H3B · lista FAB movida a tab Ejecutados |
| Bug 2 | 5ac1723 | consumosPendientes filtra clasificado=FALSE · dato sucio parcheado |
| Bug 3 | fc7b251 | semana FAB calculada en servidor — IA ya no infiere semana |

### Aprendizajes

- Datos operativos deterministas nunca se delegan a inferencia IA. La semana del registro es una propiedad del momento del POST, no una inferencia del texto del usuario. El servidor calcula, el cliente no opina.
- El primer uso real de Angie expuso 3 bugs en horas que el QA interno no detectó. El go-live con usuario real es el test más efectivo.

### Estado al cierre

- T47 completo y verificado en producción.
- Go-live Angie: pendiente — 2 días de postergación activa.
- ESTADO.md desactualizado desde sesión anterior (corte por tokens) — este append cubre ambas sesiones.
- Próximo paso: confirmar go-live con Angie o identificar fricción adicional.

---

## Sesión 8 junio 2026 (tarde) — QA + DEBUGGING

### Bugs resueltos

| Bug | Causa raíz | Commit |
|---|---|---|
| Lista H3B invisible en Ejecutados | filtro ejecutor === actor introducido en 5ac1723 — actor nunca se propaga por navegación | b9b344d |

### Decisiones de diseño tomadas

- Lista consumos FAB en Ejecutados muestra todos los consumos del hogar con clasificado=FALSE — sin filtrar por ejecutor. Decisión revisable cuando se implemente sesión por actor.
- FAB debe ser asíncrono: registro inmediato en H3B sin bloquear → Claude clasifica en background → recomendación disponible en Ejecutados para conciliación posterior. Spinner y pantalla de recomendación inmediata eliminados del flujo.

### Tickets abiertos

- **T48 — FAB asíncrono:** registro inmediato sin bloqueo. Claude interpreta monto y descripción en background. Recomendación de categoría y concepto disponible en lista Ejecutados. Único dato determinista del servidor: semana activa. Estado: aprobado para construir.
- **T49 — Revertir movimientos desde M4:** agregar opción de revertir en modal Corregir de VistaSemanal. Actualmente solo disponible en M1 Ejecución. Estado: pendiente sesión DISEÑO.

### Estado al cierre

- Go-live Angie: pendiente — FAB asíncrono (T48) es prerequisito antes de dar go formal.
- Próxima sesión: CONSTRUCCIÓN T48 en ventana nueva.

---

## Sesión 8 junio 2026 (noche) — CONSTRUCCIÓN T48

### T48 — FAB asíncrono

| Pieza | Commit | Descripción |
|---|---|---|
| P1 | 02d0702 | InputRegistro colecta monto+ejecutor+fuente · RegistroRapido elimina flujo síncrono Claude |
| P2 | 2f14d62 | POST /api/consumos/[id]/clasificar — Claude Haiku en background |
| P3 | 48abc09 | VistaSemanal — polling 5s + lista H3B muestra todos con indicador |

### DoD — verificado en producción

1. POST FAB < 500ms — sheet cierra inmediatamente ✅
2. Claude clasifica en background sin bloquear ✅
3. H3B actualiza clasificado=TRUE + bolsilloId al terminar ✅
4. Ejecutados muestra "Clasificando…" inmediatamente ✅
5. Polling cada 5s — cambia a nombre del concepto sin recargar ✅
6. tsc limpio en los 3 commits ✅
7. Verificado en producción con registro real ✅

### Estado al cierre

- T48 completo y verificado.
- Go-live Angie: desbloqueado — T48 era el prerequisito.
- Próximo paso: confirmar go-live formal con Angie.
- Cola post go-live: BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05 · T49 requiere sesión DISEÑO.

---
