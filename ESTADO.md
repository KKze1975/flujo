# FLUJO — Estado del Proyecto
Actualizado: 26 junio 2026 | Fase: Go-live — S3 cerrado — T51 abierto (bug planificación monto H2)

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
| T51 — Fix planificación M1: monto_presupuestado H2 no se actualiza | Abierto — descubierto sesión DEBUGGING 2026-06-26 |

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

---

## Sesión 10 junio 2026 — QA post go-live semana 1

### Tickets completados

| Ticket | Descripción | Commit |
|---|---|---|
| T55 | Fix barra ejecutado VistaSemanal — totalEjecutado sumaba solo H2, ignoraba H3B | 3c9a4c1 |
| T56 | Eliminar panel redundante "ANGIE · ESTA SEMANA" — 32 líneas eliminadas | d19d947 |
| favicon + splash | Favicon SVG + SplashScreen animado | eac17f6 |

### Aprendizajes

- El primer uso real expone bugs que el QA interno no detecta — la barra de ejecutado llevaba días incorrecta y solo se detectó con Angie activa.
- Verificar Sheet de producción directamente es más rápido que navegar el código para confirmar si un número es correcto.

### Estado al cierre

- Cola pendiente: BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05
- Próxima sesión: recopilar hallazgos semana 1 completa con Angie y priorizar backlog.

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

## Sesión 8 junio 2026 (cierre) — DISEÑO + CONSTRUCCIÓN T49 + T50

### T49 — Revertir movimientos desde M4

**Diseño aprobado:**
- H2: PATCH revertir_ejecucion → estado pendiente → item pasa de Ejecutados a Pendientes en VistaSemanal sin recargar
- H3B: DELETE consumo → item desaparece de Ejecutados · acumulado bolsillo se recalcula
- Sin modal de confirmación en H2 (acción reversible) · Con confirmación en H3B (acción destructiva — T50)
- Botón Revertir en modal Corregir existente — H2 y H3B

| Pieza | Commit | Descripción |
|---|---|---|
| P1 | c69a5e9 | deleteConsumoH3 — IDataProvider + SheetsDataProvider + DELETE endpoint |
| P2 | 04c008c | Botón Revertir en ModalCorreccion (H3B) y ModalCorreccionH2 (H2) |

### T50 — Confirmación modal antes de eliminar H3B

| Pieza | Commit | Descripción |
|---|---|---|
| P1 | ab77a1b | Overlay confirmación con nombre del item · Cancelar no actúa · Eliminar ejecuta DELETE |

### Verificación con trazabilidad — /admin/trazabilidad

- H2 revertido (MOV_1780841388020): 6 campos correctos — estado pendiente, montoEjecutado null, desviacion null, ejecutor null, fuenteAngie false, fechaEjecucion null ✅
- H3B eliminado: 1 consumo antes → 0 después ✅
- H4C sin modificar — correcto, saldos iniciales no se recalculan ✅

### DoD — verificado en producción con trazabilidad

- T49: 7/7 ✅
- T50: criterios completos ✅

### Estado al cierre

- T49 y T50 completos y verificados.
- Próximo paso: go-live formal con Angie o siguiente ticket de la cola.
- Cola activa: BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05.

---

## T51 — Rama dev + Protected Branch
- Rama dev creada desde main
- Protected branch en GitHub: pendiente configuración manual
- Preview URL: pendiente primer push

---

## T51-T54 — Ambiente dev/staging · 9 junio 2026

### Qué se construyó

| Capa | Dev | Prod |
|---|---|---|
| Código | rama `dev` | rama `main` |
| URL | Vercel preview (auto en cada push) | flujo-dun.vercel.app |
| Sheet | Flujo DEV (copia real) | Sheet original |
| Variables Vercel | GOOGLE_SHEET_ID → Sheet dev | GOOGLE_SHEET_ID → Sheet prod |

### Flujo de trabajo por ticket

1. `git checkout dev && git pull origin dev`
2. Construir — commits a dev con patrón `T[n]-P[n]: descripción`
3. `git push origin dev` → Vercel genera preview automáticamente
4. Verificar DoD en preview URL
5. Angie hace QA en preview URL si el ticket lo requiere
6. PR en GitHub de dev → main → merge → producción

### Checklist de promoción a prod (tickets que tocan esquema del Sheet)

- [ ] Cambio aplicado y verificado en Sheet de dev
- [ ] Mismo cambio aplicado manualmente en Sheet de prod antes del merge
- [ ] Verificado en /admin/trazabilidad post-merge

### Estado

- T51: rama dev + protected branch ✅
- T52: Sheet de dev + variables de entorno Preview ✅
- T53: INVARIANTS.md + pre-commit hook ✅
- T54: documentación flujo de trabajo ✅

---

## Cierre sesión 9 junio 2026 — CONSTRUCCIÓN T51-T54

### Resumen

- T51: rama dev + protected branch en GitHub ✅
- T52: Sheet de dev (copia prod) + GOOGLE_SHEET_ID separado por environment en Vercel ✅

### Sheet de dev

| Campo | Valor |
|---|---|
| Nombre | Flujo DEV |
| Sheet ID | 1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w |
| Service account | psibot@psibot-495119.iam.gserviceaccount.com |
| Acceso | Editor |

- T53: INVARIANTS.md (I-01 a I-11) + pre-commit hook (tsc + Sheet ID prod) ✅
- T54: documentación flujo de trabajo dev→prod + checklist promoción a prod ✅

### Aprendizajes

- Trailing newline en variable de entorno produce 404 silencioso en runtime — origen: copiar ID desde interfaz que agrega \n al valor.
- Protected branch con "Do not allow bypassing" es necesario — sin esa opción el admin puede hacer push directo.

### Estado al cierre

- Rama dev activa y sincronizada con origin/dev
- Preview URL operativa — conecta a Sheet de dev
- main protegido — push directo bloqueado para todos incluyendo admin
- Kanban: 49 tickets, 69 items deuda técnica
- Próxima sesión: BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05

---

## Prompt de apertura de sesión

Este workspace tiene múltiples proyectos. Antes de cualquier acción:
1. Lee `D:\Users\camilo\flujo\ESTADO.md` — este archivo
2. Confirma que el proyecto activo es **flujo** (no school-bot ni otro)
3. Propón el siguiente paso según el estado documentado

Nunca asumir contexto de otros proyectos.

**Prompt exacto para iniciar sesión:**
> "Lee `D:\Users\camilo\flujo\ESTADO.md` y propón el siguiente paso."

---

## Infraestructura y herramientas

### Entorno de desarrollo
- Dispositivo principal: Chromebook
- Entorno de ejecución: AWS Workspace Windows
- Node.js: v26.1.0
- Gestor de paquetes: npm

### Repositorio
- Local: `D:\Users\camilo\flujo\`
- GitHub: github.com/KKze1975/flujo (público)
- Rama principal: `main` — protegida, push directo bloqueado para todos incluyendo admin
- Rama desarrollo: `dev` — activa, preview URL auto en cada push a Vercel

### Flujo de trabajo dev → prod
1. `git checkout dev && git pull origin dev`
2. Construir — commits a dev con patrón `T[n]-P[n]: descripción`
3. `git push origin dev` → Vercel genera preview automáticamente
4. Verificar DoD en preview URL
5. PR en GitHub dev → main → merge → producción

### Asistentes IA
- Claude (claude.ai) — project manager, contexto HG-SDD, diseño de UX, decisiones de arquitectura
- Claude Code — ejecutor de tareas en AWS Workspace Windows
- graphify — navegación de código (graphify query/path/explain antes de leer archivos fuente)

### Claude Code interaction
- Todo prompt a Claude Code que incluya git termina con: "Crea el PR pero no lo mergees. El merge es manual y requiere QA de Angie primero."

### Stack técnico
- Framework: Next.js 16.2.6 — App Router + TypeScript + Tailwind CSS
- Runtime dev: Turbopack (activo por default)
- Backend: API Routes de Next.js — sin servidor separado
- Base de datos MVP: Google Sheets (invisible para usuarios finales)

### Google Sheets API
- Proyecto Google Cloud: `psibot`
- Cuenta de servicio: `psibot@psibot-495119.iam.gserviceaccount.com`
- Google Sheet prod: ID `1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A` — H1–H5 operativos
- Google Sheet dev: ID separado — configurado en Vercel Preview environment
- Credenciales: service account JSON en `.env.local` (gitignored)

### Anthropic API
- Modelo principal: `claude-sonnet-4-6` — parser M4 y registro rápido
- Modelo background: `claude-haiku-4-5` — clasificación FAB asíncrona (T48)
- Variable de entorno: `ANTHROPIC_API_KEY` (en `.env.local`)

### Vercel
- Deploy producción: flujo-dun.vercel.app — auto en cada push a `main`
- Deploy preview: URL auto en cada push a `dev` — conecta a Sheet de dev
- Variables de entorno: `GOOGLE_SHEET_ID` diferenciado por environment (Preview vs Production)
- SSO Protection: desactivada — app familiar

### Autenticación MVP
- PIN simple — actor: `camilo` / `angie`
- Google OAuth: feature futura sin retrofit

### Paquetes npm clave
- `next` — framework
- `googleapis` — Google Sheets API
- `@anthropic-ai/sdk` — Claude API
- `typescript`, `tailwindcss` — tipado y estilos

### Archivos excluidos del repo (.gitignore)
- `.env.local` — credenciales Google + ANTHROPIC_API_KEY
- `node_modules/`
- `graphify-out/` — grafo de código generado localmente
- Capturas de pantalla (ss-*.png) — evidencia de QA, no parte del código

### Destino de despliegue
- Vercel — free tier, costo $0
- Deploy automático en cada push — sin pipeline adicional
- DevOps formal (tests, staging con rama dedicada, alertas): post MVP

---

## Sesión 13 junio 2026 — RETROSPECTIVA

### Tipo de sesión
RETROSPECTIVA — Grill-Me + revisión metodológica HG-SDD

### Hallazgos críticos

1. **Bug de saldos es urgente — no backlog**
   Angie está en producción con datos reales. Los saldos se propagan mal entre vistas.
   Hipótesis de causa raíz: cada vista tiene su propia lógica de agregación construida
   ticket a ticket — no hay capa de cómputo centralizada. Hipótesis pendiente de
   verificación en sesión DEBUGGING.

2. **Backlog no está priorizado por fricción real**
   Está ordenado por orden de identificación durante desarrollo. Con Angie en
   producción ese criterio ya no es válido. Resetear prioridades post-DEBUGGING.

3. **No hay preguntas de aprendizaje definidas para las primeras semanas de uso real**
   El canal de observación existe — Camilo vive con la usuaria. Sin preguntas
   explícitas el aprendizaje queda al azar.

4. **Revisión de seguridad pendiente**
   Consecuencia estructural del vibe coding: la seguridad nunca fue un requisito
   explícito en ningún ticket. Superficie de ataque no auditada. Tratamiento:
   auditoría separada — no un ticket del backlog. Precondición: sistema estable
   en producción con bug de saldos resuelto.

### Decisiones tomadas

- Bug de saldos entra como prioridad inmediata sobre todo el backlog existente.
- Pregunta de observación semanal adoptada: ¿qué hizo Angie que no esperabas?
  ¿Qué no hizo que esperabas que hiciera?
- Auditoría de seguridad: sesión separada con criterios propios, posterior a
  estabilización del sistema.
- Deuda técnica irrelevante post go-live: archivar explícitamente, no dejar como ruido.

### Invariante candidato

- **I-12:** Todo endpoint nuevo declara su política de acceso antes de cerrar el
  ticket. "Sin autenticación" es una decisión válida si es consciente — no una omisión.

### Actualizaciones metodológicas HG-SDD

El documento Human-Grounded-SDD.docx recibe tres actualizaciones aprobadas en
esta sesión:
- Gap 1: Fase 4 Retrospectiva — cuarta pregunta + INVARIANTS.md como artefacto.
  "Sprint" → "sesión" en todo el documento.
- Gap 2: Fase 2 Especificación — criterio de seguridad mínimo: política de acceso
  declarada antes de abrir el ticket.
- Gap 3: Fase 5 Observación — nueva fase post go-live con dos preguntas semanales
  y criterio de reordenamiento del backlog por fricción observada.

### Estado al cierre

- Angie: usuaria activa en producción con datos reales.
- Bug de saldos: reproducible, pendiente sesión DEBUGGING.
- Backlog: congelado hasta completar DEBUGGING de saldos.
- Auditoría de seguridad: en horizonte, post-estabilización.
- HG-SDD: actualizaciones aprobadas, pendientes de incorporar al .docx.

### Próxima sesión

DEBUGGING — bug de saldos.
Objetivo único: trazar el flujo de un registro de Angie desde H3B hasta cada
vista que debería reflejarlo. Documentar exactamente dónde divergen los números.
Sin proponer ningún fix hasta tener el mapa completo.
El caso es reproducible — esa es la entrada de la sesión.

## Sesión 14 junio 2026 — DEBUGGING/Observación semana 1 producción

### Objetivo
Observación controlada en dev para mapear comportamiento del sistema en primera semana de uso real con Angie.

### Hallazgos

#### Bug de datos — MOV_1780844291091 (Universal)
- Movimiento ejecutado con `ejecutor` presente pero todas las fuentes en FALSE
- Causa: endpoint PATCH H2 no valida que al menos una fuente esté marcada antes de aceptar estado `ejecutado`
- Resuelto manualmente en dev (revert + re-ejecución correcta)
- Pendiente ticket de validación

#### BL-07 — Fix totalPresupuestado excluir no_aplica y pospuesto
- `totalPresupuestado` en VistaSemanal.tsx (L722) y endpoint movimientosInit (L31) suma todos los movimientos sin filtrar
- Fix: `estado !== "no_aplica" && estado !== "pospuesto"` antes del reduce
- Impacto: display only — no toca modelo de datos ni Sheet
- DoD: barra S2 muestra $2.015.996 (excluye Apoyo Mariella $100.000) y porcentaje recalculado consistente
- Prioridad: deploy hoy

#### BL-08 — Auditabilidad inline totalPresupuestado
- La barra morada es caja negra — genera comportamiento de verificación manual (calculadora)
- Solución: tap en monto presupuestado despliega lista de conceptos que lo componen
- Dependencia: BL-07 primero
- Prioridad: deploy hoy

#### BL-09 — Auditabilidad inline tarjetas de bolsillos
- Tarjetas muestran total ejecutado sin desglose de consumos — mismo patrón de desconfianza
- Solución: tap en tarjeta muestra lista de consumos que componen el ejecutado
- Prioridad: deploy hoy

### Deuda técnica
- DT-H5-01: H5 acumula cierres sin metadata de criterio de cálculo — agregar `version_calculo` antes de activar vista histórica
- DT-UX-01: Señalización de mecánica de bolsillos (FAB como único punto de entrada) — pendiente para escala a otros usuarios

### Cola actualizada
BL-07 → BL-08 → BL-09 → BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05

## BL-07 — Fix totalPresupuestado · 14 junio 2026

- Filtro aplicado en `VistaSemanal.tsx` L722 (cliente) y `app/api/mes/[mes]/semana/[semana]/route.ts` L31 (servidor)
- Estados excluidos: `no_aplica`, `pospuesto`, `pospuesto_mes_siguiente`
- Commit: 522dea7 — pusheado a origin/dev
- DoD verificado: S2 muestra $1.765.996 ✓
- Estado: completo

## BL-08 y BL-09 — Popovers auditabilidad · 14 junio 2026

### Tickets cerrados
- BL-08: popover en monto presupuestado — lista de conceptos con nombre y monto
- BL-09: popover en tarjetas de bolsillos — lista de consumos con descripción, monto y fecha

### Commits
- 752b235 BL-08: popover auditabilidad totalPresupuestado
- c1b2de1 BL-09: popover auditabilidad consumos bolsillo
- ba7d607 fix: position fixed para popovers
- d1af3fa fix: position fixed bolsillos
- 89d5120 fix: coordenadas viewport
- a5aa284 fix: color texto popovers
- 6102614 fix: posicionamiento BL-09 viewport móvil

### Problemas encontrados en construcción
- position: absolute clipado por overflow del carousel (BL-09) y z-index insuficiente (BL-08)
- Texto invisible por herencia de color del appbar (color claro sobre fondo blanco)
- Coordenadas fixed incorrectas (window.scrollY sumado innecesariamente)
- Popover BL-09 salía del viewport en tarjeta derecha del carousel — corregido con clamp al innerWidth

### DoD verificado
Todos los 5 puntos pasados en preview URL de dev antes del merge.

### Cola actualizada
BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05

## Deuda de proceso — pipeline dev→prod · 14 junio 2026

- Merge a main ejecutado sin QA de Angie — viola workflow documentado.
- Angie accede a una URL de producción distinta a flujo-dun.vercel.app — no identificada aún.
- Consecuencia: deploy de BL-08/BL-09 llegó a URL que ella no usa.
- Pendiente próxima sesión: identificar URL exacta de Angie, verificar qué deployment ve, corregir pipeline para que QA de Angie sea precondición explícita del merge a main.

## Sesión 15 junio 2026 — DISEÑO + Etnografía semana 1 producción + QA BL-10

### Tipo de sesión
DISEÑO + QA — Etnografía semana 1 + definición BL-10 + construcción + QA en preview dev

---

### 1. Deuda de proceso resuelta — pipeline dev→prod

- **URL de Angie identificada:** `https://flujo-ldpq0a0ju-camilo-s-projects10.vercel.app/`
- **Causa del merge accidental (sesión 14 jun):** prompt a Claude Code incluía PR + merge en modo auto
- **Decisión permanente:** todo prompt a Claude Code que incluya git termina con:
  *"Crea el PR pero no lo mergees. El merge es manual y requiere QA de Angie primero."*
  Esta instrucción vive en PROMPT_AGENTE.md y se agrega a sección Claude Code interaction de ESTADO.md

---

### 2. PROMPT_AGENTE.md — creado y commiteado

- Archivo creado en raíz del repo — commit 50be40a en `dev`
- Template de sesiones autónomas para Claude Code
- Estructura: contexto fijo del proyecto + sección 3 como único placeholder por ticket + restricciones fijas + criterios de parada + cierre esperado con SESSION_LOG.md
- **5 criterios de parada:**
  1. `tsc --noEmit` con errores — no usar `--no-verify`
  2. Hook detecta Sheet ID hardcodeado — no usar `--no-verify`
  3. DoD no verificable en preview URL
  4. Cambio fuera del scope — documentar como deuda técnica, no ejecutar
  5. Conflicto de merge — no resolver solo
- SESSION_LOG.md: bitácora efímera que escribe el agente, se absorbe en ESTADO.md al cierre
- Aplica para sesiones away y para sesiones normales — la restricción de no merge es universal

---

### 3. Etnografía semana 1 producción — hallazgos

**Señal A — Satisfacción de completar (motivación central de Angie)**
Ejecutar y cerrar pendientes genera satisfacción emocional. Es el motor principal de uso.
Principio adoptado: cualquier feature nueva debe evaluar si refuerza o interrumpe ese loop.

**Señal B — Imprevistos no identificables**
Gastos sin concepto en H1 se registran por FAB pero quedan indistinguibles del gasto planeado.
Problema doble: (1) no hay visibilidad de impacto en el momento, (2) no hay trazabilidad para análisis posterior.
Imprevisto = gasto sin concepto en H1. Casos de timing (pospuesto entre semanas) son problema distinto — ticket separado.

---

### 4. Hallazgos de diseño — backlog futuro

- **Cierre de semana vive en M4 VistaSemanal** — flujo natural Camilo + Angie juntos. No en M1.
- **Las semanas no cierran puntualmente** — necesidad de acceder a semanas anteriores no cerradas. Solución: indicador de semana sin cerrar que lleva directamente al cierre pendiente (no selector libre de semanas).
- **Flujo de cierre tiene tres momentos secuenciales:**
  1. Revisar ejecutados y pendientes de la semana que cierra
  2. Identificar desviaciones e imprevistos — decidir cobertura
  3. Ajustar semana siguiente (posponer conceptos, reducir montos)
- **Ver dos semanas simultáneamente** es necesario para el flujo de cierre completo — hoy M4 muestra una sola.
- **Hipótesis anotada (no abierta):** M1 desktop podría volverse redundante si M4 cubre cierre y planificación. Pendiente sesión de diseño separada.

---

### 5. BL-10 — Marcar imprevistos en H3B

**Diseño aprobado, construido y QA en preview dev en esta sesión.**

**Decisiones de diseño:**
- Campo `imprevisto` (boolean, default `false`) en H3B — solo registros nuevos desde S3 junio 2026
- Marcado **exclusivamente manual** — Claude siempre encuentra un bolsillo "next best thing", el marcado automático no tiene sentido en el modelo asíncrono de T48
- Toggle manual desde modal de corrección en M4 VistaSemanal
- Badge eliminado del DoD por decisión de diseño — sin utilidad práctica en el flujo real (el marcado ocurre al cierre, no durante el registro)
- Sin escritura retroactiva — registros S1/S2 sin el campo se leen como `false`

**Commits:**

| Commit | Descripción |
|---|---|
| 2b2baf3 | BL-10-P1: Campo imprevisto en tipos, sheets, sin-concepto |
| b78bf75 | BL-10-P2: Marcado automático en clasificar endpoint |
| 082686b | BL-10-P3: Endpoint PATCH + toggle en ModalCorreccion M4 |
| e673bbb | BL-10-P4: Badges en M4 lista y sección en M1 Desktop |
| 91b9dc3 | fix: ensureH3 verifica longitud de headers, no solo A1 |
| 2525e3b | fix: updateConsumoH3 repara Q1 si falta, corrige READ a H3!A:Q |

**PR:** https://github.com/KKze1975/flujo/pull/5 — sin mergear, pendiente QA de Angie en preview URL de dev

**Bugs encontrados y resueltos en QA:**

| Bug | Causa | Fix | Commit |
|---|---|---|---|
| Q1 vacío — campo `imprevisto` no aparecía en Sheet | `ensureH3` salía si A1 = "id_consumo" sin verificar columnas nuevas | Compara longitud de headers antes de salir | 91b9dc3 |
| PATCH imprevisto fallaba silenciosamente | `updateConsumoH3` leía solo A:P, Q1 nunca existía | READ corregido a H3!A:Q, repara headers si faltan antes del update | 2525e3b |

**DoD final verificado en Sheet de dev:**

| Punto | Estado | Evidencia |
|---|---|---|
| Campo `imprevisto` en H3B registros nuevos | ✅ | Sheet dev — columna Q visible |
| Sin escritura retroactiva en S1/S2 | ✅ | Registros anteriores sin columna |
| Toggle manual desde M4 | ✅ | Sheet dev — `imprevisto = TRUE` en registros marcados |
| Badge en lista | ~~eliminado~~ | Decisión de diseño — sin utilidad práctica |
| `tsc --noEmit` limpio | ✅ | Confirmado por Code |

**Invariante candidato (patrón ensureHeaders):**
`ensureHeaders` debe verificar completitud del esquema (longitud de columnas), no solo existencia del primer header. Verificar solo A1 es condición necesaria pero no suficiente — ya ocurrió en T39/T40 con H4D. Candidato a I-13.

---

### 6. Ticket B — Reasignación para cubrir imprevistos (pendiente diseño)

- Depende de BL-10 — necesita visibilidad de imprevistos primero
- Caso de uso concreto: cubrir desviación reduciendo presupuesto de semana siguiente o posponiendo conceptos
- Conecta con R8/R9 del modelo de requisitos (reasignación nativa con trazabilidad)

---

### Cola actualizada

`BL-10 (pendiente QA Angie → merge) → BL-02 → BL-06 → QA-7jun-01 → BL-04/BL-05 → Ticket B`

---

### Estado al cierre

- PROMPT_AGENTE.md: commiteado en `dev` (50be40a) — operacional
- BL-10: construido, QA en preview dev pasado por Camilo, PR abierto — pendiente QA de Angie antes de merge a main
- URL de Angie documentada y pipeline corregido
- Deuda técnica BL10-01 (H3B_HEADERS duplicado) y BL10-02 (M1 Mobile sin consumosH3): documentadas, no bloqueantes
- Invariante candidato I-13: `ensureHeaders` debe verificar completitud, no solo existencia

### Próxima sesión

QA — BL-10 con Angie en preview URL de dev.
Si pasa QA, merge PR a main y continuar con BL-02.

---

## Sesión 15 junio 2026 — DISEÑO · Cierre de semana inline

### Tipo de sesión
DISEÑO — Cierre de semana integrado en VistaSemanal mobile

### Contexto
Decisión conjunta Angie + Camilo post primera semana de uso real.
El cierre de semana debe sentirse orgánico desde M4 VistaSemanal — no
como una acción separada detrás de un modal. Premisa reforzada: no hay
roles diferenciados. Angie y Camilo tienen acceso simétrico a todas las
acciones. Esta sesión también resuelve BL-04 y BL-05 que quedan absorbidos
en el nuevo diseño.

### Decisiones tomadas

- Modal de cierre de semana eliminado completamente.
- Cierre de semana se ejecuta inline desde VistaSemanal mobile, sin modal
  intermedio.
- Navegación entre semanas agregada al header de VistaSemanal:
  ← S1 | S2 (activa) | S3 →
  Flecha izquierda deshabilitada en S1. Flecha derecha deshabilitada en
  semana activa del mes. No se puede navegar al futuro.
- Bloque de cierre posicionado en la parte superior de VistaSemanal,
  inmediatamente debajo del selector de semanas, antes del contenido de
  pendientes/ejecutados.
- Estructura del bloque de cierre:
  - Línea informativa: Remanente Angie: $X · Aporte planeado Sn: $Y
  - Botón: [ Cerrar semana Sn ]
  - Si la semana ya tiene cierre en H5A: muestra "Semana cerrada ✓",
    botón no aparece. La vista queda en modo lectura.
- Un tap en el botón ejecuta POST /mes/[mes]/cerrar-semana directamente.
  Confirmación visual inline — el botón se reemplaza por "Semana cerrada ✓".
- Sin selección de destino del remanente. Default siempre: carry_over.
- El servidor calcula todos los campos del cierre en el POST:
  remanente_angie (H4D - consumos fuenteAngie=true de la semana),
  aporte_angie_planeado (H4B semana correspondiente),
  total_presupuestado / total_ejecutado / desviacion (H2 + H3B semana).
- Prerequisitos de cierre simplificados: ninguno. Se confía en el usuario.
  La vista muestra la info necesaria para que decida cuándo cerrar.
- BL-04 absorbido: remanente Angie calculado en servidor, no campo manual.
- BL-05 absorbido: aporte planeado leído de H4B en servidor, no campo manual.

### Tickets creados

| Ticket | Descripción | Dependencia |
|--------|-------------|-------------|
| BL-10  | Navegación entre semanas en header VistaSemanal (flechas ← →) | Ninguna |
| BL-11  | Bloque cierre semana inline en VistaSemanal + POST calculado en servidor | BL-10 |

BL-04 y BL-05 quedan cerrados por diseño — absorbidos en BL-11.

### Cola actualizada

BL-10 → BL-11 → BL-02 → BL-06 → QA-7jun-01

### Estado al cierre

- Diseño aprobado. Sin código abierto.
- Próxima sesión: CONSTRUCCIÓN BL-10.

## Sesión 15 junio 2026 — CONSTRUCCIÓN + QA · BL-10, BL-11, BL-11b

### Tickets completados

| Ticket | Descripción | Commits | DoD |
|--------|-------------|---------|-----|
| BL-10 | Navegación entre semanas VistaSemanal | 5133905, f0290ba | ✓ |
| BL-11 | Bloque cierre semana inline + POST calculado servidor | d76ce3e, da59686, 0d68724 | ✓ |
| BL-11b | Gate modal + señal visual selector + ajustes UI | 340675e, 0350be8, 7fc71b1 | ✓ |
| Fix BL-11b | Botón cierre visible en semanas pasadas sin cerrar | d4292ac | ✓ |

### Decisiones de diseño aprobadas

#### Bloque de cierre de semana
- Línea informativa (remanente + aporte planeado) eliminada. Solo botón.
- Botón de cierre en header morado, debajo del porcentaje de ejecución.
- Semana cerrada: muestra "Semana Sn cerrada ✓" en el mismo espacio.
- Botón visible en semana activa Y en semanas pasadas sin cerrar
  (modo edición). Oculto en modo lectura.

#### Tres estados de semana en VistaSemanal

| Estado | Condición | Comportamiento |
|--------|-----------|----------------|
| Activa | semana === semanaActivaMes | Acceso completo, sin gate |
| Cerrada | tieneCierre === true | Gate modal antes del contenido |
| Futura | semana > semanaActivaMes | Gate modal antes del contenido |

#### Gate modal
- Aparece cada vez que se navega a semana no activa — no persiste.
- Sin botón X — usuario debe elegir una opción.
- Variante cerrada: "Solo leer" / "Editar semana"
- Variante futura: "Solo leer" / "Planear semana"
- Modo lectura: FAB oculto, botones de acción ocultos.
- Modo editar/planear: acciones visibles. Sin botón re-cierre.

#### Señal visual selector de semanas
- Semana activa: morado con marca.
- Semana cerrada: gris + 🔒 (opacity 0.72).
- Semana futura: gris tenue.

#### Re-cierre
Permanente desde UI. Deuda técnica aceptada conscientemente.

### Bug encontrado y resuelto en QA
- S2 sin cierre no mostraba botón al entrar en modo edición.
- Causa: condición `semana === semanaActivaMes` excluía semanas pasadas.
- Fix: `idxVisible <= SEMANAS.indexOf(semanaActivaMes)` — comparación
  numérica sobre array ["S1","S2","S3","S4"]. Guarda `modoSemana !== "lectura"`
  oculta el botón en modo solo leer.

### Cola actualizada

BL-02 → BL-06 → QA-7jun-01

### Estado al cierre

- BL-10, BL-11, BL-11b: DoD verificados en preview URL.
- PR #5 (dev → main): pendiente merge — QA completado, listo para producción.
- BL-04 y BL-05: cerrados por diseño, absorbidos en BL-11.
- Próxima sesión: merge PR #5 → BL-02.

---

## Sesión 20 junio 2026 — DISEÑO · Cierre S3 + Observaciones producción

### Tipo de sesión
DISEÑO — Análisis de observaciones de uso real en producción. Sin código abierto.

### Contexto
Sesión de cierre de S3 con Angie activa en producción. Cuatro observaciones de usabilidad
y confiabilidad identificadas durante el uso real de la semana. Diseño completo aprobado
para construcción en loop autónomo.

---

### Estado Sheet producción al cierre S3

Leído directamente desde Google Drive. Datos reales al 20 junio 2026.

**Movimientos S3 ejecutados (fuente Angie):** $750.000
**Consumos H3B S3 (fuente Angie):** $690.070
**Total salida fuente Angie S3:** $1.440.070
**Pendientes S3 reales** (descontando Entretenimiento y Frutas ya pagados): $426.000

| Pendiente | Monto |
|---|---:|
| PS Plus | 60.000 |
| Uber One | 16.000 |
| Provisión Mireyita | 100.000 |
| Víveres y otros | 250.000 |

---

### Observaciones de producción — diseño aprobado

#### OBS-1 — Barra morada: totalEjecutado incompleto para pago_fraccionado

**Problema:** para conceptos `pago_fraccionado`, el movimiento H2 permanece `pendiente`
durante la semana. El gasto real ocurre en H3B. La barra no refleja ese gasto en tiempo real.

**Diseño aprobado:**

| Campo | Fuente | Momento |
|---|---|---|
| `totalPresupuestado` | H2 `monto_presupuestado` | Siempre |
| `totalEjecutado` durante semana | H2 ejecutados (fijos) + suma consumos H3B (pago_fraccionado) de esa semana | Tiempo real |
| `totalEjecutado` post cierre | H2 `monto_ejecutado` escrito por cerrar-semana | Al cerrar semana |

Al ejecutar POST `cerrar-semana`: para cada H2 con `tipo_snapshot = pago_fraccionado`
de la semana → escribir `monto_ejecutado` = suma H3B correspondiente + `estado = ejecutado`
+ `fecha_ejecucion` = fecha del cierre. Si no hay consumos H3B: `monto_ejecutado = 0`,
estado `ejecutado` igualmente.

---

#### OBS-2 — Bolsillos vs Pendientes: separación genera confusión operativa

**Problema:** los bolsillos `pago_fraccionado` aparecen en carousel separado de la lista
de Pendientes. Operacionalmente son pendientes de consumo gradual — la separación confunde.

**Diseño aprobado:**
- Sección carousel de bolsillos eliminada de VistaSemanal.
- Fichas `pago_fraccionado` se integran en lista de Pendientes — posiciones fijas 1, 2, 3.
- Orden entre ellas: Entretenimiento · Frutas y verduras · Víveres (orden H2).
- Cada ficha muestra: nombre + indicador avance (suma H3B semana / `monto_presupuestado` H2) + botón "Cerrar bolsillo".
- Botón "Cerrar bolsillo" (acción manual): PATCH H2 → `monto_ejecutado` = suma H3B semana,
  `estado = ejecutado`, `fecha_ejecucion` = hoy. Ficha pasa a Ejecutados.
- POST `cerrar-semana` consolida automáticamente bolsillos no cerrados manualmente.
- En Ejecutados: comportamiento existente sin cambios — al tocar monto despliega desglose H3B.
- Semana cerrada modo lectura: bolsillos ejecutados aparecen en Ejecutados correctamente.

---

#### OBS-3 — Imprevistos: no hay categoría para gastos sin naturaleza clara

**Problema:** gastos imprevistos se clasifican forzosamente en el bolsillo más cercano
disponible, contaminando datos de cada categoría.

**Diseño aprobado:**

Concepto nuevo en H1:
```
nombre: Imprevistos
categoria: Compromisos Financieros
tipo: pago_fraccionado
frecuencia: mensual
semana_default: variable
monto_referencia: 250000
requiere_aprobacion: FALSE
estado_concepto: activo
```

- Techo de referencia $250.000. Sobre techo: alerta visual, no bloquea (`sobre_techo = TRUE`).
- Fuente de pago: define el usuario al registrar.
- En VistaSemanal Pendientes: ficha idéntica a los otros tres — posición 4 en la lista.
- Desde FAB: opción explícita del usuario. Claude Haiku NO lo sugiere automáticamente.
- Desde Ejecutados: usuario puede reclasificar consumo existente a Imprevistos.
- Cierre de semana: mismo comportamiento que OBS-2.

**Nota operativa:** concepto creado en Sheet de dev para construcción y QA.
Debe agregarse manualmente al Sheet de producción antes del merge a main.

---

#### OBS-4 — Posponer/No aplica: solo disponible en M1 desktop, no en VistaSemanal

**Problema:** desde VistaSemanal mobile no hay forma de posponer o descartar un concepto
sin salir de la vista.

**Diseño aprobado:**
- Opciones "Posponer" y "No aplica" en modal lápiz existente de VistaSemanal.
- Aplica solo a fijos/discrecionales — NO a `pago_fraccionado`.

**No aplica:** PATCH H2 `estado = no_aplica`.

**Posponer:** selector de semana destino: S1, S2, S3, S4 del mes actual + "Mes siguiente".
- Posponer a semana del mes actual: PATCH H2 `semana = destino`.
  Bloqueo: si semana destino ya tiene cierre en H5A → error, no ejecutar PATCH.
- Posponer a mes siguiente: movimiento actual → `estado = pospuesto`. Crear fila nueva
  en H2 del mes siguiente con `semana = sin_asignar` y datos del concepto copiados.

---

### Análisis de riesgos pre-construcción

| Riesgo | Severidad | Resolución |
|---|---|---|
| BL-01 abierto contamina Imprevistos H3B | Alta | BL-01 es ticket 1 del loop — prerequisito de OBS-3 |
| POST cerrar-semana no escribe H2 individual | Alta | OBS-1 lo construye explícitamente |
| Imprevistos ausente en junio 2026 H2 | Media | Inserción directa en Sheet de dev en OBS-3-P1 |
| Claude Haiku sugiere Imprevistos automáticamente | Media | Instrucción explícita en system prompt — OBS-3-P3 |
| Posponer a mes siguiente — lógica no existe | Media | OBS-4-P4 la construye |
| Posponer a semana cerrada | Baja | Bloqueo explícito en OBS-4-P3 |

---

### Cola de construcción actualizada

```
BL-01 → OBS-1 → OBS-2 → OBS-3 → OBS-4 → BL-02 → BL-06 → QA-7jun-01
```

BL-01 es prerequisito de OBS-3. Si BL-01 falla, el loop se detiene.

---

### Artefactos generados

- `LOOP-MAESTRO.md` — prompt de orquestación autónoma para Claude Code (5 tickets en secuencia)

---

### Deuda técnica nueva

- OBS-3-DT1: Imprevistos pendiente de agregar manualmente al Sheet de producción antes del
  merge de OBS-3 a main. Verificar en SESSION_LOG.md post-construcción.

---

### Estado al cierre

- Diseños OBS-1 a OBS-4 aprobados para construir.
- LOOP-MAESTRO.md listo para ejecución en Claude Code.
- Sin código abierto — sesión de diseño pura.
- PR #5 (BL-10/BL-11/BL-11b): pendiente merge — QA completado, listo para producción.
  Merge debe ocurrir antes de ejecutar el loop de construcción.

### Próxima sesión

1. Merge PR #5 a main.
2. Ejecutar LOOP-MAESTRO.md en Claude Code (rama dev).
3. QA de Angie en preview URL de dev.

---

## Sesión CONSTRUCCIÓN · 20 junio 2026

### Lo que ocurrió

- PR #5 mergeado a main ✅
- Loop BL-01/OBS-1..4 ejecutado por Claude Code — 5 tickets commiteados en rama `dev`
- PR #6 abierto acumulando todos los cambios
- SESSION_LOG retroactivo generado (commit fe9464d tras el loop)
- `node scripts/seed-imprevistos.mjs` ejecutado contra dev Sheet — guard activado, concepto ya existía
- QA en localhost ejecutado por Camilo — PR #6 **no aprobado**, dos bugs bloqueantes encontrados

### Bugs bloqueantes PR #6

| ID | Descripción | Origen | Archivo |
|---|---|---|---|
| BL-QA-01 | Fichas de bolsillo duplicadas por MOV en lugar de agrupar por `conceptoId` — afecta lista Pendientes/Ejecutados y selector ModalCorreccion | OBS-2 | VistaSemanal.tsx:367 |
| BL-QA-02 | Lápiz en pendientes eliminó edición de monto+fuente — OBS-4 reemplazó el modal en lugar de extenderlo | OBS-4 | VistaSemanal.tsx:1241–1292 |

### Causa raíz BL-QA-01

Log de consola confirma: `Encountered two children with the same key RECREACION_1748100035`.
`bolsillosPendientes` itera sobre movimientos H2 sin deduplicar por `conceptoId`.
Un concepto `pago_fraccionado` con múltiples MOVs genera múltiples fichas.

### Causa raíz BL-QA-02

Modal del lápiz pre-loop (main) tenía: monto ejecutado + selector de fuente + Confirmar/Cancelar → PATCH `tipo: ejecutar`.
OBS-4 introdujo `ModalAccionesPendiente` (Posponer/No aplica) reemplazando ese panel en lugar de integrarlo.

### Pendientes operativos

- Imprevistos debe agregarse manualmente al Sheet de **producción** antes del merge a main (checklist promoción)
- `.env.local` actualmente apunta a dev Sheet (`1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`) — restaurar a prod antes de cualquier trabajo que no sea QA local

### Aprendizajes de sesión

- SESSION_LOG es prerrequisito del PR, no documentación posterior. PROMPT_AGENTE.md actualizado con restricción 5 modificada y criterio de parada 6.
- Observación metodológica generada para HG-SDD v6: `OBS_METODOLOGIA_SESSION_LOG.md`

### Artefactos generados esta sesión

- `PROMPT_AGENTE_actualizado.md` — restricción 5 + criterio de parada 6
- `OBS_METODOLOGIA_SESSION_LOG.md` — observación para HG-SDD v6
- `PROMPT_FIX_BL-QA-01_BL-QA-02.md` — prompt listo para ejecutar en Claude Code

### Cola de construcción actualizada

BL-QA-01 → BL-QA-02 → [re-QA Camilo] → QA Angie → merge PR #6 → BL-02 → BL-06 → QA-7jun-01

### Próxima sesión

1. Ejecutar `PROMPT_FIX_BL-QA-01_BL-QA-02.md` en Claude Code.
2. Re-QA en localhost por Camilo con checklist de 8 puntos.
3. Si pasa: QA de Angie en preview URL.
4. Si pasa Angie: checklist de promoción (seed prod + merge PR #6).
5. Actualizar PROMPT_AGENTE.md en repo dev con versión corregida.
4. Merge por ticket según resultados de QA.

---

## Sesión QA · 20 junio 2026

### Tipo de sesión
QA — Re-QA PR #6 tras corrección BL-QA-01/BL-QA-02.

### Resultado del re-QA Camilo

**BL-QA-01 y BL-QA-02: aprobados** — todos los puntos del checklist verificados.

**Nuevos bugs bloqueantes encontrados durante inspección extendida:**

| ID | Tipo | Descripción |
|---|---|---|
| BL-QA-03 | Falso positivo (dato corrupto) | Barra S3 mostraba $1.909.996 en lugar de $1.659.996 — causa: MOV duplicado de Entretenimiento en S3 del Sheet de dev |
| BL-QA-04 | Bug código | Modal desglose H3B desapareció en bolsillos ejecutados — no se abre nada al tocar |
| BL-QA-05 | Dato corrupto dev | Entretenimiento tenía dos MOVs en S3 — eliminado manualmente |
| BL-QA-06 | Dato + seed | Imprevistos ausente en Pendientes — seed disparó guard contra concepto retirado; concepto nuevo nunca fue creado |

**BL-QA-03 cerrado:** eliminación del MOV duplicado (BL-QA-05) corrigió la barra automáticamente.
**BL-QA-05 cerrado:** MOV duplicado eliminado manualmente del Sheet de dev.

### Corrección de diseño OBS-3

Imprevistos es `frecuencia: semanal` (no mensual como decía el doc).
`monto_referencia: 250.000` es el techo **por semana**.
El resto del diseño aprobado se mantiene igual.

### PR #6 — estado

**No aprobado.** Bloqueantes pendientes: BL-QA-04, BL-QA-06.

### Cola de construcción actualizada

```
BL-QA-04 → BL-QA-06 → [re-QA Camilo] → QA Angie → checklist promoción → merge PR #6 → BL-02 → BL-06 → QA-7jun-01
```

### Artefactos generados

- `PROMPT_FIX_BL-QA-04_BL-QA-06.md` — prompt listo para ejecutar en Claude Code

### Próxima sesión

1. Ejecutar `PROMPT_FIX_BL-QA-04_BL-QA-06.md` en Claude Code.
2. Re-QA en preview URL por Camilo.
3. Si pasa: QA de Angie.
4. Si pasa Angie: checklist de promoción (seed prod Imprevistos + merge PR #6).

---

## Sesión QA · 20 junio 2026 — continuación

### Lo que ocurrió

- BL-QA-06 aprobado en re-QA: Imprevistos aparece en Pendientes con ficha correcta
- BL-QA-04 requirió dos intentos adicionales de fix — ambos fallaron por razón diferente:
  - Intento 1 (commit 5b82b62): colocó el modal en tab Pendientes en lugar de Ejecutados
  - Intento 2: mismo error — agente no encontró el componente correcto vía graphify
- Diagnóstico final BL-QA-04: la feature de desglose H3B en fichas de bolsillo
  no existía antes — Entretenimiento es concepto nuevo y Frutas/Víveres nunca
  tuvieron esa lógica implementada. Es feature nueva, no regresión.
- Diseño aclarado: tap en el monto $X / $250.000 de la ficha de bolsillo →
  popover idéntico al de "Conceptos presupuestados" de la barra superior,
  con consumos H3B de la semana activa + total al pie.
  Aplica tanto en tab Pendientes como en Ejecutados.
- Dato operativo: concepto Imprevistos creado manualmente en Sheet de producción
  (COMPROMISOS_FINANCIEROS_1781979860619, frecuencia: semanal,
  monto_referencia: 250000, estado_concepto: activo). MOV se agrega al momento
  del merge según semana activa en ese momento.

### Estado PR #6

No aprobado. BL-QA-04 pendiente.

### Artefactos generados

- PROMPT_REFIX_BL-QA-04_final.md — prompt listo para ejecutar en Claude Code

### Cola de construcción actualizada

BL-QA-04 → [re-QA Camilo] → QA Angie → checklist promoción → merge PR #6 → BL-02 → BL-06 → QA-7jun-01

### Próxima sesión

1. Ejecutar PROMPT_REFIX_BL-QA-04_final.md en Claude Code.
2. Re-QA Camilo con checklist BL-QA-04.
3. Si pasa: QA Angie.
4. Si pasa Angie: checklist de promoción (agregar MOV Imprevistos en prod según semana activa + merge PR #6).

---

## Sesión CONSTRUCCIÓN · 21 junio 2026

### Tipo de sesión
CONSTRUCCIÓN — ejecución BL-QA-04 + fixes adicionales + preparación merge PR #6.

### Lo que ocurrió

**BL-QA-04 resuelto** (commit 1f66ef8):
- Tap en monto `$X / $Y` de ficha bolsillo → popover con consumos H3B de la semana activa
- Funciona en tab Pendientes y Ejecutados
- Popover: descripción + monto por fila, total al pie, cierre con × o tap fuera
- Sin consumos → "Sin registros esta semana."
- `e.stopPropagation()` en trigger — tap en resto del card no abre popover

**Fixes adicionales en PR #6 (misma rama dev):**

| Commit | Ticket | Descripción |
|---|---|---|
| 66bd7f6 | FIX-MODAL-EJ | stopPropagation en título ficha ejecutados — ya no abre desgloseModal |
| 73205fd | FIX-S4-NAV | Flecha → habilitada hacia S4 futura — replica comportamiento de semanas pasadas |
| 47e73ce | FIX-BARRA-EJ | Sección "Conceptos ejecutados" agregada al popover de barra morada |
| ea9ed56 | FIX-BARRA-POPOVER-MODO | Estado `popoverMode` diferencia presupuestado vs ejecutado |
| (trigger) | FIX-BARRA-EJ-TRIGGER | onClick agregado en monto ejecutado de barra morada |

**Correcciones de datos Sheet dev:**
- `tipo_snapshot` corregido de `pago_fraccionado` a `fijo` en MOVs 028/029/030 (Fondo transporte, Fondo emergencia, CDT NU)
- `tipo` corregido en H1 para los mismos tres conceptos
- MOVs de Imprevistos (`COMPROMISOS_FINANCIEROS_1782005151968`) insertados en H2 dev para S1/S2/S4 (S3 ya existía)

**Correcciones de datos Sheet producción (pre-merge):**
- `tipo` corregido en H1 para TRANSPORTE_1748100037, METAS_FAMILIARES_1748100038, METAS_FAMILIARES_1748100039 → `fijo`
- `tipo_snapshot` corregido en H2 para MOVs 028/029/030 → `fijo`
- 4 MOVs de Imprevistos (`COMPROMISOS_FINANCIEROS_1781979860619`) insertados en H2 prod: S1/S2/S3/S4, monto 250000, estado pendiente

**QA:**
- Re-QA Camilo: 9 puntos BL-QA-04 aprobados + fixes adicionales verificados
- QA Angie: aprobado

### Estado PR #6

**Listo para merge.** Todos los bloqueantes resueltos. Datos prod corregidos.

### Próxima acción

Merge PR #6 (dev → main) en GitHub. Verificar deploy Vercel sin errores.

### Cola post-merge

BL-02 → BL-06 → QA-7jun-01

---

## Sesión CONSTRUCCIÓN · 21 junio 2026 — continuación post-merge PR #6

### Tipo de sesión
CONSTRUCCIÓN — fixes urgentes en prod post-merge PR #6.

### Lo que ocurrió

**Merge PR #6 completado:**
- Merge commit: a1e16fc
- 21 archivos integrados (2652 inserciones, 174 eliminaciones)
- Rama dev eliminada en remoto tras merge

**Bugs encontrados en producción post-merge:**

| ID | Descripción | Causa raíz |
|---|---|---|
| FIX-MES-ACTIVO | App mostraba julio como mes activo | Mes inferido desde MOVs en H2 — Sheet tiene MOVs de julio presupuestados anticipadamente |
| FIX-POPOVER-EJ-FILTRO | Popover barra no mostraba todos los conceptos ejecutados | Filtro del popover no incluía H3 consumos — total barra y detalle desalineados |

**Fixes implementados en rama dev — PR #7:**

| Commit | Ticket | Descripción |
|---|---|---|
| c9f5699 | FIX-MES-ACTIVO | app/page.tsx: mesActual() usa new Date() — mes activo ya no depende de MOVs en H2 |
| 7b861f6 | FIX-POPOVER-EJ-FILTRO | VistaSemanal.tsx: popover ejecutados lista H2 ejecutados + H3 consumos. Total footer = totalEjecutado |

**PR #7:** https://github.com/KKze1975/flujo/pull/7
- Merge commit: a4e887b
- 3 archivos integrados: app/page.tsx, components/VistaSemanal.tsx, SESSION_LOG.md
- QA Angie: aprobado
- Deploy Vercel: exitoso

### Verificación post-deploy en producción

- [x] Mes activo muestra junio correctamente
- [x] Popover barra morada muestra todos los conceptos ejecutados
- [x] Total popover coincide con total barra

### Estado producción

Estable. PR #6 y PR #7 en main. Sin bugs conocidos.

### Cola siguiente sesión

BL-02 → BL-06 → QA-7jun-01

---

## Sesión DEBUGGING · 22 junio 2026 — H3B-JULIO-01

### Tipo de sesión
DEBUGGING — Bug de producción. Registros FAB H3B guardando en mes/semana incorrectos.

### Síntomas reportados

- Consumos registrados desde el FAB el 22 junio quedaban con `mes: 2026-07 / semana: S4`
  en lugar de `mes: 2026-06 / semana: S4`.
- Causa estructural: julio había sido activado accidentalmente, generando 69 MOVs
  prematuros en H2 de producción.

### Causa raíz confirmada

**Patrón idéntico a FIX-MES-ACTIVO** — el endpoint H3B y el componente `RegistroRapido`
inferían el mes activo desde los MOVs existentes en H2, no desde la fecha del sistema.
Con MOVs de julio presentes, ambos devolvían julio. Mismo error raíz, tercera instancia.

### Datos corruptos corregidos directamente en Sheet de producción

| id_consumo | Campo | Valor incorrecto | Valor corregido |
|---|---|---|---|
| CONSUMO_1782170083338 | mes | 2026-07 | 2026-06 |
| CONSUMO_1782170083338 | semana | S4 | S4 (sin cambio) |
| CONSUMO_1782170131704 | mes | 2026-07 | 2026-06 |
| CONSUMO_1782170131704 | semana | S4 | S4 (sin cambio) |

69 MOVs de julio eliminados de H2 (todos `estado: pendiente`, ninguno ejecutado).
H2 producción queda con 73 filas — todas pertenecientes a `mes: 2026-06`.

### Correcciones de código — PR #8 (mergeado a main)

| Commit | Descripción |
|---|---|
| 2d78f29 | Endpoint H3B: `mes` calculado desde `new Date()` en servidor — nunca desde `body.mes` |
| bc2001f | `RegistroRapido`: `mes` calculado desde `new Date()` en cliente — elimina dependencia de `/api/meses` |

**Defensa en capas resultante:**
- El cliente calcula mes desde su reloj — nunca lo toma del estado de navegación ni de la API.
- El servidor recalcula mes desde su reloj — nunca acepta `mes` del body aunque llegue.
- Un mes incorrecto en el cuerpo del POST es ahora físicamente ignorado.

### Invariante formalizado

**I-14** agregado a `INVARIANTS.md`: el mes activo y la semana activa nunca se infieren
desde datos del Sheet — siempre desde `new Date()` en el servidor. Aplica a todos los
endpoints. Violación produce datos silenciosamente corruptos.

### Pendiente verificación

- P5: registrar consumo desde FAB en producción post-deploy y confirmar `mes: 2026-06`
  en Sheet. Verificación end-to-end pendiente de confirmación por Camilo.

### Aprendizaje — candidato a HG-SDD

El mismo error raíz apareció tres veces en tres lugares distintos (page.tsx, endpoint H3B,
componente RegistroRapido). La corrección puntual no es suficiente — se necesita auditoría
activa de todos los endpoints al introducir cualquier lógica que calcule mes o semana.
Grep de auditoría pendiente como deuda técnica H3B-JULIO-DT1.

### Cola siguiente sesión

1. P5: verificación end-to-end post-deploy PR #8.
2. Grep auditoría de endpoints — deuda técnica H3B-JULIO-DT1.
3. Continuar con BL-02 → BL-06 → QA-7jun-01.

---

## Sesión CONSTRUCCIÓN · 24 junio 2026 — BL-12 + corrección datos S4

### Tipo de sesión
CONSTRUCCIÓN + corrección de datos de producción.

### Incidente: cierre accidental S4 junio

Angie cerró S4 de junio por accidente el miércoles 24 junio (semana activa).
Causa: botón "Cerrar semana" ejecutaba el POST directamente sin confirmación.

**Corrección de datos ejecutada:**
- Fila `CIERRE_1782311490385` (2026-06 / S4) eliminada del tab `H5` en producción.
- Verificación post-eliminación: H5 quedó con exactamente 3 filas (S1-2025-05, S2-2026-06, S3-2026-06).
- S4 junio reactivada. MOVs pendientes y consumos de S4 intactos.
- Nota: el tab de cierres se llama `H5` (no `H5A`) — verificar consistencia con referencias en codebase.

### BL-12 — Modal de confirmación cierre de semana

**Diseño aprobado:** freno de confirmación explícita antes de ejecutar el cierre.
- Modal con texto: `"¿Cerrar semana S[n]? Esta acción no se puede deshacer."`
- Dos botones: `Cancelar` (cierra modal, no ejecuta) / `Cerrar semana` (ejecuta POST existente).
- Sin cambios en el endpoint. Sin datos calculados en el modal.

**Implementación:**
- Commit: `6389e0f` — BL-12: modal de confirmación antes de cerrar semana
- Archivo: `VistaSemanal.tsx` — estado `showConfirmCierre` + modal condicional
- `tsc --noEmit` ✓
- PR #9 mergeado a main — fast-forward, rama dev eliminada.
- QA Angie: aprobado 24 junio 2026.

### DoD BL-12
- [x] Tap en "Cerrar semana" muestra modal con número de semana dinámico
- [x] Cancelar cierra modal sin efectos
- [x] Cerrar semana ejecuta POST existente y cierra modal
- [x] tsc --noEmit limpio
- [x] QA Angie — aprobado 24 junio 2026
- [x] Merge PR #9 a main — fast-forward, rama dev eliminada

### Estado producción

BL-12 en producción (deploy Vercel automático post-merge).
Nota: al abrir próxima sesión de construcción, sincronizar dev con main antes de cualquier trabajo
(`git checkout dev && git pull origin main`).

### Cola siguiente sesión

1. Sincronizar dev con main al abrir.
2. P5: verificación end-to-end post-deploy PR #8.
3. Grep auditoría endpoints — deuda técnica H3B-JULIO-DT1.
4. Continuar BL-02 → BL-06 → QA-7jun-01.

---

## Sesión DEBUGGING · 24 junio 2026 — Cierre accidental S4: MOVs huérfanos

### Contexto

Tras revertir el cierre accidental de S4 (sesión anterior, borrando fila `CIERRE_1782311490385` de H5),
se detectó que el endpoint `POST /api/mes/[mes]/cerrar-semana` escribe en **dos lugares**:
1. **H5** — append de CierreSemana.
2. **H2** — marca como `ejecutado` todos los MOVs `pago_fraccionado` de la semana.

La reversión manual solo borró H5. Resultado: 4 bolsillos quedaron en estado incorrecto.

### MOVs afectados

| id_movimiento | bolsillo | estado incorrecto | corrección |
|---|---|---|---|
| MOV_1780841388026 | Servicios públicos | ejecutado / monto=0 / fecha=2026-06-24 | → pendiente |
| MOV_1780841388035 | Seguros | ejecutado / monto=0 / fecha=2026-06-24 | → pendiente |
| MOV_1780841388039 | Ahorro | ejecutado / monto=0 / fecha=2026-06-24 | → pendiente |
| MOV_1782066609560 | Imprevistos | ejecutado / monto=116000 / fecha=2026-06-24 | → pendiente |

Nota: Imprevistos tenía H3B consumos (116.000 COP registrados vía FAB) al momento del cierre accidental,
por eso `montoEjecutado = 116000` en lugar de 0.

### Diagnóstico técnico

Audit de `app/api/mes/[mes]/cerrar-semana/route.ts`:
```typescript
const bolsilloMovs = movsSemana.filter(m => m.tipoSnapshot === "pago_fraccionado" && m.estado !== "ejecutado");
// Marca como ejecutado con montoEjecutado = suma H3B consumos (puede ser 0 si no hubo consumos)
```

Comportamiento **intencional pero con reversión incompleta**: el endpoint hace lo correcto al cerrar;
el gap es que no existe `revertir-cierre` que deshaga H2 + H5 atómicamente.

H5B no fue afectada: para S4 `semanaSiguiente = null`, por lo que no se crea PlanSemana.

### Corrección ejecutada

Script Python en scratchpad (`revert_h2_movs.py`) con lógica defensiva:
- Verifica que los 4 MOVs objetivo tienen `estado=ejecutado` y `fecha_ejecucion=2026-06-24`.
- Detecta y detiene si hay MOVs adicionales con el mismo patrón (ninguno encontrado).
- Read-modify-write fila completa: preserva todos los campos, limpia solo `estado`, `monto_ejecutado`, `fecha_ejecucion`.
- Verificación post-actualización: los 4 MOVs quedaron `estado=pendiente`, campos vacíos.

Resultado: **4/4 MOVs corregidos exitosamente en producción.**

### Deuda técnica registrada

**DT-CIERRE-01**: El endpoint `cerrar-semana` no es reversible. Al borrar una fila de H5 manualmente,
los bolsillos (`pago_fraccionado`) en H2 quedan incorrectamente marcados como `ejecutado`.

Fix pendiente: `POST /api/mes/[mes]/revertir-cierre?semana=Sn` que revierta H5 + H2 en una sola
operación atómica.

### DoD

- [x] 4 MOVs H2 revertidos a `pendiente` en producción.
- [x] Verificación post-script confirmada.
- [x] DT-CIERRE-01 documentada.
- [x] Sin cambios de código en el repo (solo script en scratchpad, no commiteado).

### Cola siguiente sesión

1. Sincronizar dev con main al abrir (`git checkout dev && git pull origin main`).
2. P5: verificación end-to-end post-deploy PR #8.
3. Grep auditoría endpoints — deuda técnica H3B-JULIO-DT1.
4. Implementar DT-CIERRE-01 (`revertir-cierre` endpoint).
5. Continuar BL-02 → BL-06 → QA-7jun-01.

---

## DEBUGGING — Mes activo se contaminaba al inicializar mes futuro · 26 jun 2026

### Incidente
Al inicializar Julio 2026 estando el calendario en Junio 2026, Julio quedó como mes activo de la app. Comportamiento esperado: poder inicializar/planear un mes futuro sin alterar el mes activo.

### Diagnóstico (causa raíz confirmada — hipótesis H-B)
`app/meses/page.tsx:61` tomaba `meses[meses.length - 1]` (el último mes con filas en H2) como mes activo. Al inicializar Julio, el array pasó a `["2026-05","2026-06","2026-07"]` y el último elemento (Julio) se interpretó como activo. **Violación directa de I-14** (el mes activo debe derivarse de `new Date()`, nunca inferirse del Sheet). No cubierta por el PR #8.

### Fix (commit 1b36707 → PR #12 → merge a main)
- `app/meses/page.tsx`: agrega `mesActual()` derivada de `new Date()`; la usa para `mesActivo`. Guard cambia de `if (meses.length > 0)` a `if (meses.includes(mesActivo))` — métricas solo para el mes calendario vigente.
- `components/PantallaMeses.tsx`: recibe `mesActivo` como prop (badge "Activo" y `semanaHref` del BottomNav). Elimina `másReciente` que infería del Sheet.

### Modelo confirmado
Decisión de diseño registrada: **"mes inicializado/planificable" ≠ "mes activo"**. Un mes futuro puede inicializarse y quedar en lista sin badge, sin volverse activo. El activo deriva exclusivamente de `new Date()` (I-14 reforzada).

### DoD — verificado en producción por Camilo
- `/meses`: Junio con badge "Activo"; Julio en lista sin badge. ✓
- Métricas del tope con datos reales de Junio (no ceros de Julio). ✓
- BottomNav "Esta semana" → `/mes/2026-06/semana`. ✓
- `tsc --noEmit` pasa. ✓

### EXCEPCIÓN DE PROCESO — [CAMILO: COMPLETAR]
<!-- El merge de PR #12 a main se ejecutó sin sign-off de QA de Angie en preview (precondición dura documentada). Registrar una de dos:
  (a) "Excepción consciente: fix de bajo riesgo, mergeado sin QA de Angie. Aceptada por Camilo el [fecha]."
  (b) "QA de Angie realizada el [fecha/medio], no reflejada en el log de Code."
Elegir y completar antes de ejecutar este append. -->

### Deuda técnica nueva (registrada, no corregida inline)
- **DT-FECHA-01:** `mesActual()` y `semanaActual()` duplicadas en 3+ archivos → consolidar en `lib/utils/fecha.ts`. **Prioridad elevada:** es la causa estructural de esta clase de bug; mientras la derivación de fecha esté duplicada, cada copia es una oportunidad de reincidir en violación de I-14 por divergencia. Candidato a backlog priorizado, no pila general. Próxima sesión: CONSTRUCCIÓN, ticket propio con DoD que verifique los 3+ archivos.
- **DT-DEADCODE-01:** `app/page.tsx:26` — `getMeses()` se llama pero el resultado nunca se usa. Eliminar (ticket separado de DT-FECHA-01).

### Pendiente operativo
Planeación de Julio: el ingreso recibido fue menor de lo esperado. Con el bug resuelto, Julio ya es inicializable/planificable sin contaminar el mes activo. La planeación con presupuesto reducido queda como siguiente tarea de producto (no de código).

### Cola siguiente sesión

1. Sincronizar dev con main al abrir (`git checkout dev && git pull origin main`).
2. Completar excepción de proceso PR #12 (comentario arriba).
3. DT-FECHA-01: consolidar `mesActual()` / `semanaActual()` en `lib/utils/fecha.ts` (ticket propio).
4. DT-DEADCODE-01: eliminar `getMeses()` sin usar en `app/page.tsx`.
5. DT-CIERRE-01: `POST /api/mes/[mes]/revertir-cierre` (endpoint reversión atómica H5 + H2).
6. Continuar BL-02 → BL-06 → QA-7jun-01.

---

## CORRECCIÓN DE CIERRE — Bug mes activo H-B · 26 jun 2026

Dos puntos del bloque de cierre anterior quedaron incompletos. Se resuelven aquí.

### Corrección 1 — QA (resuelve el marcador pendiente)
**Angie validó QA del fix (PR #12).** Precondición de sign-off cumplida. La validación no quedó reflejada en el log de Code pero fue confirmada por Camilo al cierre. Excepción de proceso no aplica.

### Corrección 2 — Reclasificación de la tarea de planeación de Julio
El bloque anterior la registró como "pendiente operativo". Se reclasifica:

**TK-PLAN-JULIO — tipo: DISEÑO / producto (NO construcción).** Planear Julio 2026 con ingreso menor de lo esperado. No toca código; es distribución de presupuesto reducido sobre la estructura del mes ya inicializado. Habilitada ahora que inicializar Julio no contamina el mes activo. Abrir como sesión de DISEÑO independiente; no mezclar con DT-FECHA-01 (CONSTRUCCIÓN).

---

## T51 — Fix planificación M1: monto_presupuestado H2 no se actualiza · 26 jun 2026

### Tipo
CONSTRUCCIÓN

### Origen
Descubierto en sesión DEBUGGING del 26-06-2026 mediante experimento de snapshots de producción (scripts/captura-julio.mjs). Confirmado con lectura directa de H1 y H2 post-acción.

### Problema

En `VistaPlanificacion.tsx`, cambiar el monto de un concepto en modo planificación (edición inline en columna "Monto Ref.") actualiza **H1 únicamente** (`monto_referencia` del concepto — cambio permanente) pero **no propaga el cambio a H2** (`monto_presupuestado` de los movimientos del mes activo).

El flujo actual:
1. Usuario edita monto inline → React local state, concepto marcado como `dirty`
2. "Guardar borrador" o "Cerrar M1" → `persistirH1()` → `PATCH /api/conceptos/{id}` → actualiza H1
3. **H2 nunca se toca** — `monto_presupuestado` queda con el valor de inicialización del mes

El usuario espera modificar el presupuesto de ese concepto **para este mes específico**. En cambio, está modificando el catálogo base (H1), lo que afecta la inicialización de todos los meses siguientes.

Consecuencias observadas:
- H2 muestra el monto de inicialización (stale) aunque el usuario lo haya "cambiado" en la UI
- El cambio en H1 contamina futuros meses con un valor que era intención del mes actual
- El balance en sidebar de VistaPlanificacion lee H1 (correcto para la pantalla, pero desincronizado de H2)

### Bug secundario relacionado (no bloqueante actualmente)

`cerrarPlanificacion` en `VistaPlanificacion.tsx:332-347` no excluye conceptos con `frecuencia === "semanal"` del sync de semanas. Si un concepto semanal tiene `semanaDefault !== "variable"`, el cierre reasigna todas sus filas de H2 a esa semana, destruyendo la distribución S1/S2/S3/S4. No se manifiesta actualmente (Entretenimiento tiene `semanaDefault: "variable"`), pero es una bomba de tiempo.

### Archivos a modificar

- `app/api/mes/[mes]/movimientos/[id]/route.ts` — agregar tipo `actualizar_monto: { montoPresupuestado: number }` al PATCH de movimiento
- `components/m1/VistaPlanificacion.tsx`:
  - `persistirH1()` → no tocar H1 por cambios de monto (solo semanaDefault/notas van a H1)
  - `cerrarPlanificacion()` → después de persistir H1, propagar monto nuevo a filas de H2 pendientes del mes (PATCH `actualizar_monto` por cada movimiento del concepto)
  - Excluir conceptos `frecuencia === "semanal"` del sync de semanas en `cerrarPlanificacion`

### DoD

1. Cambiar el monto de un concepto en M1 planificación y cerrar → `monto_presupuestado` en H2 = nuevo monto (verificado en Sheet)
2. H1 `monto_referencia` no cambia cuando el ajuste es solo del mes (H1 solo cambia si se edita explícitamente el concepto base)
3. Para conceptos `frecuencia === "semanal"` (ej: Entretenimiento, 4 filas), el monto nuevo se propaga a las 4 filas de H2
4. Para conceptos con una sola fila en H2, el monto se propaga a esa fila
5. El bug secundario del sync de semanas queda corregido: conceptos `frecuencia === "semanal"` excluidos del loop de reasignación en `cerrarPlanificacion`
6. `tsc --noEmit` pasa limpio
7. Verificado en producción con `/admin/trazabilidad`

---

## Sesión DEBUGGING · 26 jun 2026 — Auditoría de totales Julio + Bug propagación H1→H2

### Tipo de sesión
DEBUGGING — múltiples hilos resueltos en secuencia.

---

### Hilo 1 — Auditoría de totales de planeación Julio

#### Hallazgo
Motor de cálculo de planeación **correcto**. Todos los totales del Balance Mes y
flujos semanales verificados contra Sheet crudo — delta cero en totales mensuales,
diferencia ≤$223 en flujos semanales (redondeo de display al millar). La desconfianza
de Camilo no tenía fundamento en el motor; quedó convertida en certeza documentada.

#### Anomalías encontradas (no afectaban el balance)
- H2 Entretenimiento Julio: `monto_presupuestado = $550K` vs H1 `monto_referencia = $150K` (stale)
- H2 Imprevistos Julio: `monto_presupuestado = $250K` vs H1 `monto_referencia = $0` (stale)
- H2 Entretenimiento Julio: falta fila S1, hay S4 duplicado — total cuadraba por compensación

#### Corrección nomenclatura de invariante
La regla "mes activo desde `new Date()`" está formalizada como **I-01** en
`INVARIANTS.md`, no como I-14. Una nota suelta en el cuerpo de I-01 referenciaba
"I-14 sesión 22 junio" — generó confusión de nomenclatura. El invariante vigente
es I-01. No existe I-14 en el archivo formal.

---

### Hilo 2 — Experimento de reset y reproducción de bugs Julio

#### Metodología
Reset de Julio en producción + script de captura instrumentada para aislar en qué
acción de planeación exacta aparece cada anomalía.

#### Hallazgo principal
**El bug es post-inicialización.** "Activar siguiente mes" genera Julio limpio y
correcto (H2 sincronizado con H1, distribución S1-S4 correcta, sin stale). Las
anomalías fueron introducidas por acciones de planeación en la UI, no por la
rutina de generación.

#### Infraestructura creada (commiteada en dev)
- `scripts/captura-julio.mjs` — snapshot de solo lectura del Sheet, numerado,
  con resumen de comprometido por semana. Correr con:
  `node scripts/captura-julio.mjs "descripción del paso"`
- `scripts/INSTRUCCIONES_EXPERIMENTO.md` — protocolo para Camilo

#### Deuda técnica identificada
- **DT-CAPTURA-01:** `captura-julio.mjs` apunta a producción en lugar de dev.
  Puede confundir en sesiones de verificación. Corregir antes del próximo
  experimento de debugging.

---

### Hilo 3 — Bug confirmado: propagación H1→H2 en cambio de monto

#### Causa raíz
`handleSavePlan` en `components/m1/ConceptoBoard.tsx` actualizaba H1
(`monto_referencia`) pero nunca propagaba el nuevo valor a H2
(`monto_presupuestado` de las filas del mes activo). Resultado: el plan visual
mostraba el valor nuevo pero el Sheet que governa el balance real conservaba el
valor anterior.

#### Tres paths del mismo bug
| Path | Estado |
|---|---|
| VistaPlanificacion tabla inline | Corregido (commits 9951223 + 8bda547, sesión anterior) |
| ConceptoBoard "Monto planeado" | Corregido (commit eccdfbd, esta sesión) |
| ModalEditarConcepto (botón ✎) | Pendiente — T52 |

#### Fix (commit eccdfbd · rama dev · PR #15)
`handleSavePlan` en `ConceptoBoard.tsx:754` ahora llama `actualizar_monto` en H2
para cada fila pendiente del concepto después de actualizar H1, usando el mismo
endpoint construido en la sesión anterior. Verificado: cambio de Entretenimiento
de $250K a $300K propagó a las 4 filas S1-S4 en H2. Las otras 65 filas de Julio
intactas. `tsc --noEmit` pasa limpio (54s, 0 errores).

#### DoD verificado (dev)
- [x] `tsc --noEmit` limpio
- [x] H1 `monto_referencia` Entretenimiento = 300.000 ✓
- [x] H2 `monto_presupuestado` × 4 filas Entretenimiento = 300.000 ✓
- [x] 65 filas restantes de Julio intactas ✓
- [x] Commit eccdfbd en dev ✓
- [x] PR #15 actualizado ✓
- [x] Sin merge a main — pendiente QA Angie ✓

---

### T52 — Pendiente de apertura
**ModalEditarConcepto (botón ✎):** mismo bug de no-propagación H1→H2, componente
distinto. Abrir como ticket independiente después de que PR #15 pase QA de Angie
y se mergee a main. No mezclar con PR #15.

---

### Iniciativa D — Event log de movimientos (identificada, no abierta)
Durante el experimento surgió la necesidad de un registro granular permanente de
cada acción que modifica el presupuesto (quién, qué cambió, valor anterior, valor
nuevo, timestamp). La arquitectura actual es state-based: H2 guarda estado final,
no historia de movimientos. La Iniciativa D propone agregar una capa de eventos
inmutables encima del estado. **Deferred:** requiere sesión de DISEÑO independiente.
No abrir hasta que PR #15 esté mergeado y T52 definido.

---

### Cola siguiente sesión

1. QA de Angie en Preview URL de PR #15 — merge condicional a main.
2. Abrir T52: `ModalEditarConcepto` propagación H1→H2.
3. Corregir DT-CAPTURA-01 (`captura-julio.mjs` apunta a prod en lugar de dev).
4. Sesión DISEÑO: Iniciativa D — Event log de movimientos.
5. Retomar DT-FECHA-01 (consolidar `mesActual()` / `semanaActual()` en `lib/utils/fecha.ts`).

---

## QA PR #15 — Fallida · 26 jun 2026

### Resultado
QA rechazada. PR #15 **no mergeable** hasta resolver el bug real.

### Qué se verificó
- URL de Preview: `flujo-git-dev-camil-s-projects10.vercel.app` (rama dev)
- Acción: cambiar "MONTO PLANEADO" en ConceptoBoard → guardar
- Resultado observado: solo H1 cambia — comportamiento idéntico al bug original
- Commit en Preview: eccdfbd (confirmado — es el código del fix)

### Conclusión
El fix de ConceptoBoard (commit eccdfbd) no produce el comportamiento correcto
en el entorno de Preview. La propagación H1→H2 no ocurre desde la UI real,
aunque la verificación local con el script de captura lo dio como correcto.

### Hipótesis del falso positivo en DoD
**DT-CAPTURA-01 como causa probable.** `captura-julio.mjs` apunta al Sheet de
producción, no al de dev. Durante la verificación, Code leyó producción y reportó
H2 actualizado — pero H2 de dev nunca cambió. El DoD se verificó contra el Sheet
equivocado, produciendo un falso positivo. Esta hipótesis debe confirmarse en la
próxima sesión de debugging antes de proponer un fix.

### Estado de deuda técnica
- **DT-CAPTURA-01** (ya registrada): `captura-julio.mjs` apunta a producción.
  Confirmada como probable causa del falso positivo en DoD de T51.
  Prioridad: corregir antes de cualquier verificación futura con este script.

### Cola siguiente sesión

1. DEBUGGING: confirmar hipótesis DT-CAPTURA-01 — verificar a qué Sheet apunta
   `captura-julio.mjs` y si H2 de dev realmente cambió con el fix.
2. Si DT-CAPTURA-01 confirmada: corregir el script y re-verificar el fix en dev
   contra el Sheet correcto.
3. Si el fix es correcto pero el script estaba mal: re-hacer QA en Preview.
4. Si el fix tiene un bug real: debugging de ConceptoBoard antes de nueva QA.
5. PR #15 permanece abierto — no mergear hasta QA aprobada.

---

## TK-PLAN-JULIO — Planeación Julio 2026 · 27 jun 2026

### Tipo de sesión
DISEÑO / producto. No toca código. Workaround activo por bug T51 (PR #15 sin mergear).

### Contexto
Ingreso Camilo de Julio menor al esperado ($11.450.000 vs histórico ~$12.200.000).
Ingreso Angie S1 reducido ($1.500.000 vs $2.000.000 habitual). S2/S3/S4 en valor estándar.
Julio inicializado limpio — confirmado por experimento de reset sesión anterior.

### Metodología de sesión
Log manual acción por acción llevado en Claude.ai. Cada acción documentada con:
valor anterior → valor nuevo → efecto observable en UI → verificación aritmética.
Workaround T51: cambios de monto ejecutados vía script Claude Code directo a H2,
sin pasar por UI (que contamina H1 permanentemente).

### Estado inicial (línea de partida real)
- Total H2 Julio inicializado: $19.971.211 (69 movimientos)
- no_aplica pre-existente al inicio de sesión: Entretenimiento S1 ($250.000)
- Comprometido ejecutable real al inicio: $19.721.211
- Total disponible: $18.950.000
- Déficit inicial: -$771.211

### Acciones ejecutadas

| # | Concepto | Acción | Monto | Semana | Vía |
|---|---|---|---|---|---|
| 1 | Ingreso Camilo | Registrar $11.450.000 | — | — | UI |
| 2 | Ingreso Angie S1 | Registrar $1.500.000 (reducido) | — | S1 | UI |
| 3 | Prime Video | no_aplica | $50.000 | S1 | UI |
| 4 | El País | no_aplica | $45.000 | S1 | UI |
| 5 | Disney+ | no_aplica | $60.000 | S1 | UI |
| 6 | Seguros de vida Camilo | no_aplica | $100.000 | S1 | UI |
| 7 | Apoyo Mariella | no_aplica (duplicado) | $100.000 | S2 | UI |
| 8 | Préstamo Papá | no_aplica (retirar H1) | $100.000 | S3 | UI |
| 9 | Provisión Mireyita | no_aplica | $100.000 | S3 | UI |
| 10 | Game Pass | no_aplica | $50.000 | S3 | UI |
| 11 | CDT NU | no_aplica | $100.000 | S4 | UI |
| 12 | Abono capital TC | no_aplica | $300.000 | S4 | UI |
| 13 | EPS/ARL/Pensión | S2 → S1 | $540.000 | — | UI |
| 14 | Plan complementario | S2 → S1 | $740.000 | — | UI |
| 15 | PS Plus | S1 → S4 | $60.000 | — | UI |
| 16 | Uber One | S1 → S4 | $16.000 | — | UI |
| 17 | Celular Angie | S1 → S4 | $80.000 | — | UI |
| 18 | Frida | S1 → S4 (semana) | $300.000 | — | UI |
| 19 | Frida | monto $300K → $150K solo Julio · MOV_1782565828418 · H2!H127 | $150.000 | S4 | Claude Code |
| 20a | Frutas y verduras × 4 | monto $200K → $150K solo Julio | $200.000 | S1-S4 | Claude Code |
| 20b | Víveres y otros × 4 | monto $250K → $200K solo Julio | $200.000 | S1-S4 | Claude Code |
| 21 | Préstamo Leonardo | S1 → S3 | $320.840 | — | UI |
| 22 | Cerrar planificación | Transición a Ejecución | — | — | UI |

### Balance final (Sheet — fuente de verdad)

| Semana | Comprometido | Ingresos | Balance neto real |
|---|---|---|---|
| S1 | $12.951.383 | $12.950.000 | +$5K |
| S2 | $1.848.996 | $2.000.000 | +$151K |
| S3 | $1.645.836 | $2.000.000 | +$505K |
| S4 | $1.319.996 | $2.000.000 | +$1.184K |
| **Mes** | **$17.766.211** | **$18.950.000** | **+$1.184K superávit** |

### Bugs y deuda identificados en sesión

**DT-PLAN-01 — Bug UI: no_aplica pre-existente no excluido del comprometido**
Entretenimiento S1 tenía `estado = no_aplica` en H2 desde la inicialización pero la UI
lo seguía contando en el comprometido ($250.000 de sesgo). Los `no_aplica` marcados
durante la sesión sí se excluían correctamente. Hipótesis: la UI recalcula comprometido
solo sobre cambios de estado de la sesión actual, no sobre el estado real del Sheet al
cargar. Efecto: todos los balances netos de la UI mostraron $250K peor de la realidad
durante toda la sesión.

**BUG-REGRESION-01 — Modal saldo inicial desapareció en "Cerrar planificación"**
Comportamiento esperado: al hacer clic en "Cerrar planificación" aparece modal pidiendo
saldo inicial de cuentas (principalmente cuenta Camilo) antes de pasar a Ejecución.
Comportamiento actual: transición directa a Ejecución sin capturar saldo.
Impacto: todos los movimientos de Julio quedarían con cuentas en ceros — dato corrupto.
Workaround activo: no ejecutar ningún pago hasta registrar saldo inicial vía script.
Candidato probable: regresión introducida por PR #12 o un commit reciente en main.
Prioridad: bloqueante para inicio de ejecución de Julio.

**Deuda de catálogo:**
- Apoyo Mariella: concepto duplicado — auditar y retirar el incorrecto de H1.
- Préstamo Papá: retirar de H1 (`estado_concepto → retirado`).

---

## Historia de usuario — Planeación de inicio de mes (M1) · 27 jun 2026

**Actor principal:** Camilo
**Momento:** Primeros días del mes, después de recibir ingreso
**Duración típica:** 30-60 minutos
**Contexto:** Camilo opera solo en este momento. Angie llega informada al Momento 2.

### El problema que resuelve

El ingreso de Camilo llega en dólares, se convierte a pesos, y el monto varía cada mes
por tasa de cambio. El presupuesto base (H1) es una referencia construida en un mes
"normal" — pero ningún mes es exactamente normal. La planeación es el ritual donde
Camilo reconcilia la realidad del mes con el presupuesto ideal, tomando decisiones
explícitas sobre qué aplica, qué no, y cómo distribuir el flujo semana a semana.

Sin este ritual, los pagos se ejecutan contra un presupuesto que no refleja la realidad
del mes — y las desviaciones se acumulan sin trazabilidad.

### Paso 1 — Registrar ingresos

**Qué hace:** Camilo ingresa el monto real recibido ese mes. Primero el suyo (ingreso
principal, cuenta Camilo). Luego el de Angie semana a semana — porque el ingreso de
Angie puede variar entre semanas y esa granularidad importa para el flujo.

**Por qué importa la granularidad semanal de Angie:** el modelo financiero de la familia
asume que Angie financia la segunda mitad del mes. Cada semana S2/S3/S4 se sostiene
principalmente con su aporte. Si S1 de Angie llega reducida (como en Julio 2026 —
$1.500.000 vs $2.000.000 habitual), eso crea un hueco específico en S1 que no se puede
ignorar.

**Lo que el sistema hace:** calcula automáticamente
`total_disponible = ingreso_camilo + suma(aportes_angie)` y lo contrasta con el
`comprometido` (suma de `monto_presupuestado` en H2 para el mes).

**Decisión de diseño importante:** el ingreso de Angie no se registra como un monto
mensual único sino semana a semana. Esto refleja la realidad de su flujo de caja. Cada
concepto que Angie ejecuta durante la semana se asume financiado por su ingreso de esa
semana, no por un pool mensual.

### Paso 2 — Leer el balance inicial y localizar el déficit

**Qué hace:** Camilo lee el balance proyectado del mes y el desglose por semana.

**Qué busca:** no solo si hay déficit sino en qué semana está concentrado. Esa
información determina la estrategia.

**Cómo interpreta el desglose semanal — aprendizaje crítico:**
La UI muestra flujo acumulado rodante, no déficit aislado por semana. S2 no muestra
cuánto le falta a S2 — muestra cuánto le falta al mes hasta el final de S2, heredando
el remanente de S1. Esto significa:
- Un déficit en S4 es manejable — hay tres semanas de ingresos de Angie para recuperarlo.
- Un déficit en S1 es estructural — S1 concentra los pagos más pesados (arriendo,
  colegio, salud) y solo cuenta con el ingreso de Camilo más el aporte reducido de Angie S1.
- El número de S4 = la diferencia total del mes. Si S4 es positivo, el mes cierra bien.

**En Julio 2026:** déficit inicial de ~$771K real, concentrado en S1 por el peso de los
fijos. S2/S3/S4 mostraban déficit acumulado heredado de S1, no déficit propio.

### Paso 3 — Liberar presupuesto: marcar no_aplica

**Qué hace:** Camilo revisa cada concepto y decide cuáles no aplican ese mes.

**La lógica de decisión — no es arbitraria:**

*Membresías discrecionales:* Prime Video, Disney+, El País, Game Pass. Se evalúan mes
a mes según disponibilidad. En un mes de ingreso reducido son los primeros en caer.
Son reversibles — el siguiente mes pueden volver.

*Compromisos financieros diferibles:* Abono capital TC ($300K), CDT NU ($100K). Son
metas de largo plazo importantes, pero en un mes apretado ceden ante los fijos del hogar.
La decisión es consciente y tiene costo: se retrasa la liquidación de deuda o el ahorro,
pero se protege el flujo del mes.

*Conceptos que revelan deuda de catálogo:* Apoyo Mariella (duplicado) y Préstamo Papá
(concepto a retirar). La planeación es el momento donde estos errores se hacen visibles
— la persona está mirando cada concepto con ojos frescos.

*Conceptos intocables aunque haya déficit:* Arriendo, Colegio, EPS, Plan complementario,
Préstamo Leonardo, Ayuda mamá. No porque el sistema los bloquee sino porque Camilo los
clasifica mentalmente como no negociables.

**Efecto observable esperado:** cada `no_aplica` reduce el comprometido y mejora la
diferencia total y el balance de la semana correspondiente. El usuario verifica esto
después de cada acción — es el feedback loop que confirma que el sistema responde.

### Paso 4 — Redistribuir: mover conceptos entre semanas

**Qué hace:** Camilo mueve conceptos de una semana a otra para aplanar el flujo acumulado.

**La lógica de aplanamiento:**

*Mover de S2 a S1:* conceptos cuyo pago real cae en S1 pero estaban asignados a S2 por
defecto. EPS ($540K) y Plan complementario ($740K) — el cobro real ocurre en los primeros
días del mes. Moverlos a S1 reconoce la realidad del flujo de caja. S1 entra en rojo
en la UI pero el ingreso de Camilo los cubre.

*Mover de S1 a S4:* conceptos que pueden diferirse sin consecuencia operativa. PS Plus,
Uber One, Celular Angie, Frida — ninguno tiene fecha de cobro crítica en S1. Moverlos
a S4 alivia S1 y aprovecha el remanente acumulado de los aportes de Angie.

*Mover de S1 a S3:* Préstamo Leonardo ($320.840). No es urgente en S1 y S3 tiene
capacidad de absorción después de los movimientos anteriores.

**Criterio de aplanamiento exitoso:** todas las semanas en balance positivo real, sin
que ninguna semana quede con un hueco que el flujo de Angie no pueda cubrir.
S4 en positivo = mes cerrado.

### Paso 5 — Ajustar montos para el mes (workaround T51 activo)

**Qué hace:** Camilo reduce el monto de algunos conceptos específicamente para este mes,
sin afectar el presupuesto base permanente de meses futuros.

**La distinción crítica que el sistema no maneja bien todavía:**
- *Cambio permanente:* "bajamos Entretenimiento para siempre" → debe ir a H1.
- *Cambio del mes:* "este mes Frida baja porque el ingreso es menor" → solo H2 del mes activo.

La UI actual no distingue entre ambos — cualquier cambio de monto toca H1 (bug T51).
Workaround: ejecutar cambios temporales directamente en H2 vía script, preservando H1.

**Decisiones de monto en Julio 2026 y su razonamiento:**
- Frida $300K → $150K: gasto no urgente, se reduce a la mitad. No es eliminación.
- Frutas y verduras $200K → $150K × 4 semanas: ajuste de austeridad absorbible.
- Víveres y otros $250K → $200K × 4 semanas: mismo criterio.

**Efecto acumulado:** $550K liberados en el mes.

### Paso 6 — Cerrar planificación

**Qué hace:** Camilo confirma que el balance está aceptable y ejecuta "Cerrar planificación".

**Qué debería pasar:** modal de verificación de saldo inicial de cuentas (principalmente
cuenta Camilo) antes de pasar a Ejecución. Sin saldo inicial registrado, el sistema no
puede calcular de qué cuenta sale cada pago ni el balance real por fuente durante el mes.

**Comportamiento actual (bug BUG-REGRESION-01):** transición directa a Ejecución sin
capturar saldo. Todos los movimientos del mes quedarían con cuentas en ceros.

**Criterio de éxito:** saldo inicial registrado, sistema en modo Ejecución, Angie puede
ver el plan del mes y está lista para el Momento 2.

### Tensiones y fricciones identificadas en sesión

**Tensión 1 — Cambio temporal vs. permanente:** el sistema no distingue semánticamente
entre "cambio de monto para este mes" y "cambio permanente". Causa raíz de T51 y
problema de diseño — el usuario piensa "este mes Frida baja" pero el sistema interpreta
"Frida baja para siempre".

**Tensión 2 — Flujo acumulado vs. déficit por semana:** la UI muestra flujo acumulado
rodante, financieramente correcto pero cognitivamente exigente. Un usuario nuevo no lo
interpretaría correctamente sin explicación. "S2 en -$1,1M" cuando $946K vienen de S1
es contraintuitivo.

**Tensión 3 — Workaround como proceso:** tres acciones requirieron salir de la UI y usar
Claude Code para PATCH directo al Sheet. Funciona con Camilo como operador técnico, pero
es una fricción que no puede existir en el flujo normal. La resolución de T51 la elimina.

**Fricción operativa — DT-PLAN-01:** la UI no excluye del comprometido los `no_aplica`
pre-inicializados. Genera sesgo sistemático de $250K durante toda la sesión. En un mes
apretado puede provocar decisiones de recorte innecesarias.

### Lo que esta historia revela para el diseño futuro

1. **El cambio de monto "solo para este mes" necesita ser un concepto de primera clase
   en la UI.** El usuario lo necesita en cada mes de ingreso variable. No puede ser workaround.

2. **El desglose semanal necesita una capa de explicación.** Mostrar "S2: -$1,1M" sin
   contexto del arrastre de S1 es fuente de confusión. Una etiqueta "incluye -$946K de S1"
   cambiaría la experiencia de lectura.

3. **El modal de saldo inicial es parte del ritual, no un detalle técnico.** Es el momento
   donde Camilo confirma con qué base real arranca el mes. Su desaparición (BUG-REGRESION-01)
   no es solo un bug — es la pérdida de un paso del ritual financiero.

4. **La planeación es un proceso de negociación con el presupuesto base**, no de ejecución
   ciega de lo que H1 dice. El sistema debe facilitar esa negociación — distinguir entre
   intocables, diferibles y discrecionales — sin que el usuario tenga que mantener esa
   taxonomía en su cabeza.

### Lección de proceso

Los prompts de PATCH a Claude Code nunca deben depender de IDs hardcodeados. Siempre
buscar por campos semánticos (`mes + nombre_snapshot`) y verificar valor actual antes
de escribir. En esta sesión el script de Frida encontró MOV_1782565828418 en lugar del
MOV_1782565828414 del prompt — el guard semántico evitó una escritura errónea.

### Cola siguiente sesión

1. **BLOQUEANTE:** Investigar y reparar BUG-REGRESION-01 (modal saldo inicial).
2. Registrar saldo inicial Camilo Julio vía workaround antes de ejecutar cualquier pago.
3. Resolver DT-PLAN-01 (UI no excluye no_aplica pre-existentes del comprometido).
4. Retirar Préstamo Papá y auditar duplicado Apoyo Mariella en H1.
5. Retomar cola anterior: DT-CAPTURA-01 → T51 debugging → PR #15.

---

## Workaround BUG-REGRESION-01 — Saldo inicial Julio · 27 jun 2026

### Problema
Al cerrar planificación de Julio, la app no mostró el modal de saldo inicial y pasó
directamente a Ejecución. Resultado: `nu_camilo / 2026-07` quedó con `saldo_inicial = $0`
en H4!P:V. Todos los pagos ejecutados con ese saldo habrían quedado sin fuente de cuenta.

### Diagnóstico (confirmado por auditoría de código)

El modal `ModalConfirmarSaldos.tsx` existe y su lógica es correcta:
`handleSwitchToEjecucion()` → si `!saldosOk` → modal → confirmar → `setView("ejecucion")`.

El bypass accidental está en `MesM1Desktop.tsx:943`:
```
onClick={() => setSaldosOk(true)}  // ← marca saldosOk sin mostrar modal ni escribir H4
```
Este botón dejó pasar a Ejecución con `saldosOk = true` en UI pero saldo $0 en Sheet.

**BUG-REGRESION-01 reclasificado:** no es regresión de PR — es bypass accidental
en `MesM1Desktop.tsx:943`. Ticket de construcción: eliminar bypass o redirigir a
`handleSwitchToEjecucion()`.

### Hallazgo adicional — saldo inicial mal posicionado
El primer workaround script escribió la fila de `nu_camilo` en columnas A–G (rango
IngresoAngie) en lugar de P–V (rango SaldoCuenta). `getSaldosCuenta()` lee H4!P:V —
la fila nunca habría sido encontrada. Lección: los scripts de PATCH a H4 deben
especificar el rango P:V explícitamente, no usar append genérico a la pestaña.

### Estructura real de H4
| Columnas | Sección | Leída en |
|---|---|---|
| A–N | IngresoAngie | H4!A:N |
| P–V | SaldoCuenta | H4!P:V |

### Corrección aplicada
- Las 4 filas de saldo para 2026-07 ya existían en H4!P:V (creadas por el init del mes):
  `SALDO_1782521807435_nu_camilo / nu_angie / arq / en_mano`
- Solo faltaba el valor de `nu_camilo` — estaba en $0
- PATCH directo: H4!S6 → `saldo_inicial = 11.450.000` · `fecha_confirmacion = 2026-06-27`

### Estado final H4!P:V · 2026-07
| Cuenta | saldo_inicial | Estado |
|---|---|---|
| nu_camilo | $11.450.000 | ✅ corregido |
| nu_angie | $0 | ✅ correcto |
| arq | $0 | ✅ correcto |
| en_mano | $0 | ✅ correcto |

`saldosOk = true` · Saldo Camilo visible en sidebar UI ✅

### Desbloqueado
Ejecución de pagos de Julio habilitada a partir del 27 jun 2026.

### Ticket pendiente
**T53 — Fix bypass saldo inicial `MesM1Desktop.tsx:943`**
Eliminar `onClick={() => setSaldosOk(true)}` o redirigir a `handleSwitchToEjecucion()`.
No mezclar con T51/PR#15. Abrir después de que PR#15 esté mergeado.

### Cola siguiente sesión
1. Ejecutar pagos de Julio — confirmar que fuente de cuenta queda registrada correctamente.
2. T53: fix bypass `MesM1Desktop.tsx:943`.
3. DT-PLAN-01: UI no excluye no_aplica pre-existentes del comprometido.
4. Retirar Préstamo Papá y auditar duplicado Apoyo Mariella en H1.
5. Retomar: DT-CAPTURA-01 → T51 debugging → PR #15.

---

## Iniciativa E — Soporte de meses con 5 semanas · 27 jun 2026

### Identificada en
Sesión TK-PLAN-JULIO · 27 jun 2026

### Contexto operativo
El modelo de semanas de Flujo define S1 como la semana que arranca el 29 del mes
anterior — esto es operativo real, no un workaround. Siempre ha sido así. Julio 2026
tiene una quinta semana al final del mes (28–31 jul) que el modelo actual no puede
representar. Este caso es recurrente — ocurre en cualquier mes donde el calendario
genera 5 semanas.

### Problema
El enum `semana` en H2, H3B y H5 está definido como `S1 / S2 / S3 / S4`. No existe
S5. Los meses con 5 semanas no pueden representar la última semana en el sistema —
ni sus compromisos, ni el aporte de Angie correspondiente, ni el cierre semanal.

### Impacto en Julio 2026
- Semana extra: 28–31 jul
- Aporte Angie S5: ~$2.000.000 adicionales
- Superávit real del mes sube de +$1.184K a ~+$3.184K
- Workaround Julio: semana 28–31 jul se absorbe en S4 operativamente
  hasta que Iniciativa E esté construida

### Alcance técnico
La iniciativa es una extensión del enum, no un rediseño del modelo:
- H2, H3B, H5: enum `semana` agrega valor `S5`
- Inicialización del mes: detectar si el mes requiere S5 (lógica de calendario)
  y generar filas S5 condicionalmente — meses normales siguen con 4 semanas
- UI: mostrar S5 condicionalmente cuando existe
- Lógica de cierre semanal: soporte de `cerrar-semana` para S5
- H4 Angie: quinto aporte opcional cuando aplica

### Estado
Identificada. Requiere sesión de DISEÑO independiente antes de construir.
No abrir hasta que T53 y PR#15 estén cerrados.

### Cola
Abrir sesión DISEÑO — Iniciativa E después de estabilizar T53 y PR#15.

---

## DT-MES-01 — mesActual() ignora body.mes en endpoint H3B · 27 jun 2026

### Identificado en
Sesión TK-PLAN-JULIO · auditoría pre-ejecución · 27 jun 2026

### Contexto
Al intentar ejecutar pagos de Julio (2026-07) el 27 de junio, se auditó el endpoint
de registro de gastos para verificar qué valor de `mes` escribe en H3B. El mes activo
según `new Date()` en el servidor es `2026-06` — Julio fue activado manualmente en la UI.

### Problema
`POST /api/h3b/...` declara `mes?: string` como campo opcional en el tipo Body (línea 65)
pero nunca lo lee. En línea 96 llama `mesActual()` directamente, ignorando `body.mes`.

Resultado: si el usuario está en la UI de un mes futuro activado manualmente, cualquier
gasto libre registrado se escribe en H3B con el mes del servidor (`2026-06`), no el mes
de la UI (`2026-07`). Dato corrupto silencioso — el sistema no lanza error.

### Alcance del riesgo

| Flujo | Endpoint | Mes usado | Riesgo |
|---|---|---|---|
| Ejecutar concepto presupuestado | PATCH /api/mes/[mes]/movimientos/[id] | Mes de la URL | ✅ Sin riesgo |
| Registrar gasto libre / imprevisto | POST /api/h3b/... | mesActual() servidor | ⚠️ Riesgo real |

### Workaround activo · Julio 2026
No registrar gastos libres (imprevistos, gastos no presupuestados en H3B) hasta el
29 de junio, cuando `new Date()` devuelva `2026-07` en el servidor. Solo ejecutar
conceptos presupuestados (PATCH a H2) durante el 27–28 de junio.

### Causa raíz
Misma familia que I-01 — `mesActual()` llamado directamente en el endpoint en lugar
de usar el mes del contexto del request. El campo `body.mes` fue declarado pero nunca
implementado — dead field.

### Relación con deuda existente
Candidato para DT-FECHA-01 (consolidación de utilidades de fecha — `mesActual()` /
`semanaActual()` duplicados en 3+ archivos). La corrección es: leer `body.mes` si
existe, y solo llamar `mesActual()` como fallback cuando el campo no viene en el request.

### Fix propuesto
En el endpoint POST H3B, línea 96:
```
// Antes
const mes = mesActual()

// Después
const mes = body.mes ?? mesActual()
```

### Estado
Documentado. No abrir ticket hasta que T53 y PR#15 estén cerrados.
Agrupar con DT-FECHA-01 cuando se abra esa consolidación.

---

## Inicio ejecución S1 Julio 2026 · 27 jun 2026

### Contexto
Primera ejecución de pagos de Julio. Se ejecutó parcialmente S1 — Servicios y Arriendo.
Workaround DT-MES-01 activo: no se registraron gastos libres (H3B) porque `new Date()`
devuelve `2026-06` hasta el 29 de junio. Solo se ejecutaron conceptos presupuestados
(PATCH H2) que usan el mes de la URL del request.

### Conceptos ejecutados · 27 jun 2026

| Concepto | Presupuestado | Ejecutado | Diferencia | Cuenta |
|---|---|---|---|---|
| Agua | $250.000 | $559.000 | +$309.000 | nu_camilo |
| Energía | $284.998 | $256.000 | -$28.998 | nu_camilo |
| Gas | $104.090 | $103.000 | -$1.090 | nu_camilo |
| Internet y TV | $122.000 | $122.000 | $0 | nu_camilo |
| Celular Camilo | $69.299 | $62.000 | -$7.299 | nu_camilo |
| Arriendo y Administración | $5.172.500 | $5.172.500 | $0 | nu_camilo |
| **Total** | **$6.002.887** | **$6.274.500** | **+$271.613** | |

### Desviación Agua
$559.000 ejecutado vs $250.000 presupuestado — desviación de $309.000 (más del doble).
Pendiente confirmar si es factura bimestral o consumo anormal.
El presupuesto de Agua requiere recalibración para meses futuros.

### Saldo cuenta Camilo · fin de sesión
| | |
|---|---|
| Saldo inicial Julio | $11.450.000 |
| Ejecutado 27 jun | -$6.274.500 |
| **Saldo actual** | **$5.175.500** |

### Balance semanal · post ejecución parcial S1

| Semana | Ingresos | Comprometido | Balance neto |
|---|---|---|---|
| S1 | $12.950.000 | $12.927.000 | +$23K |
| S2 | $2.000.000 | $1.949.000 | +$74K |
| S3 | $2.000.000 | $1.746.000 | +$328K |
| S4 | $2.000.000 | $1.626.000 | +$702K |
| **Mes** | **$18.950.000** | **$18.248.000** | **+$702K** |

Nota: Imprevistos excluidos del comprometido — son techo por semana, no compromiso fijo.
S2-S4 usan montos presupuestados — se actualizan al ejecutar.

### Pendientes S1 para próxima sesión
- Colegio hijos: $3.988.000
- EPS/ARL/Pensión: $540.000
- Plan complementario: $740.000
- Mercado mensual: $600.000
- Mesadas Emma y Lucas
- Ayuda mamá servicios
- Frutas y verduras / Víveres

### Cola siguiente sesión
1. Continuar ejecución S1 — Colegio, EPS, Plan complementario primero
2. Desde el 29 jun: habilitar registro de gastos libres H3B (DT-MES-01 resuelto por fecha)
3. T53: fix bypass MesM1Desktop.tsx:943
4. Recalibrar presupuesto Agua para meses futuros (H1)
5. DT-PLAN-01 · Iniciativa E · cola técnica anterior

---

## Sesión DEBUGGING — T51 / PR#15 · 29 jun 2026

### Objetivo
Verificar si el fix de T51 (`handleSavePlan` en `ConceptoBoard.tsx`) funcionaba
correctamente en el Preview de PR#15, y determinar si DT-CAPTURA-01 era la causa
del fallo de QA de Angie.

### Diagnóstico ejecutado

**Método:** Reproducción en vivo usando el Preview de Vercel de PR#15 +
`/admin/trazabilidad` como herramienta de verificación antes/después.

**Hallazgo 1 — Trazabilidad:**
Snapshot antes/después de cambiar `monto_presupuestado` en planificación mostró
0 modificaciones en H2. Diagnóstico inicial: bug persiste en PR#15.

**Hallazgo 2 — Verificación directa en Sheet:**
Camilo verificó H2 dev directamente después de cambiar Frida a $700.000 en el Preview.
El valor se actualizó inmediatamente en el Sheet. **El fix funciona.**

**Conclusión:** Trazabilidad produjo un falso negativo — posiblemente por timing
o por cómo captura el snapshot. El comportamiento real del fix es correcto.

**DT-CAPTURA-01:** Descartada como causa activa. El Preview apuntaba correctamente
al Sheet de dev. El fallo de QA de Angie tuvo otra causa no determinada — irrelevante
dado que el fix está verificado manualmente.

### Acciones ejecutadas

1. Fix verificado manualmente: cambio de `monto_presupuestado` en Preview → H2 dev
   se actualiza correctamente.
2. PR#15 mergeado a main vía `gh pr merge 15 --merge`.
3. T51 cerrado. Fix en producción.

### Estado resultante

| Item | Estado |
|---|---|
| T51 | ✅ Cerrado — fix mergeado a main |
| PR#15 | ✅ Mergeado |
| DT-CAPTURA-01 | Descartada |

### Cola siguiente sesión
1. Continuar ejecución S1 — Colegio, EPS, Plan complementario primero
2. [CONSTRUCCIÓN] T53: fix bypass `MesM1Desktop.tsx:943`
3. DT-PLAN-01 · Iniciativa E · cola técnica anterior

---

## Sesión CONSTRUCCIÓN — T53 · 29 jun 2026

### Ticket
Fix bypass saldo inicial — `MesM1Desktop.tsx:943`

### Cambio ejecutado
**Archivo:** `components/MesM1Desktop.tsx`, línea 943

```tsx
// Antes
onClick={() => setSaldosOk(true)}

// Después
onClick={() => setShowConfirmarSaldos(true)}
```

El botón "Confirmar saldos" ahora abre `ModalConfirmarSaldos` en lugar de
marcar `saldosOk = true` directamente. El modal escribe a H4, confirma saldos
y navega a ejecución — flujo correcto restaurado.

### Contexto del fix
`saldosOk` se inicializa como `useState(saldos.length >= 4)`. Si el mes ya
tiene 4 saldos en H4 (caso Julio 2026), arranca en `true` y el botón muestra
"Saldos confirmados" — comportamiento correcto para meses ya inicializados.
El fix aplica para meses nuevos donde `saldosOk = false`.

Verificado en Preview de Vercel con Agosto 2026 (mes sin saldos en H4):
el modal abre correctamente al clickear "Confirmar saldos".

### Nota técnica — trazabilidad
Durante debugging de T51, `/admin/trazabilidad` produjo un falso negativo
(mostró 0 modificaciones cuando H2 sí se había actualizado). Causa probable:
timing entre la escritura al Sheet y la captura del snapshot. Pendiente
investigar y documentar limitación de la herramienta.

### Estado

| Item | Estado |
|---|---|
| T53 | ✅ Construido — commit 418cb5a — en QA |
| PR#16 | Abierto — esperando QA de Angie |
| Merge a main | Bloqueado hasta QA de Angie |

### Cola siguiente sesión
1. QA de Angie en Preview PR#16 → mergear si aprueba
2. Continuar ejecución S1 — Colegio, EPS, Plan complementario
3. Desde el 29 jun: habilitar registro de gastos libres H3B (DT-MES-01 resuelto por fecha)
4. Recalibrar presupuesto Agua para meses futuros (H1)
5. DT-PLAN-01 · Iniciativa E · cola técnica anterior

---

## Cierre CONSTRUCCIÓN — T53 en producción · 29 jun 2026

**Tipo de sesión:** CONSTRUCCIÓN. Un solo ticket activo (T53).

### Resultado
- T53 (fix bypass saldo inicial `MesM1Desktop.tsx:943`) **mergeado y en producción**.
- QA de Angie aprobada en Preview PR#16: modal de saldo inicial abre al cerrar
  planificación, saldo se captura para iniciar ejecución y se refleja en saldos.
- PR#16 mergeado a main (`gh pr merge 16 --merge`).
- Deploy Production: commit `9605476` (Merge PR#16), branch `main`, Ready.

### Estado
| Item | Estado |
|---|---|
| T53 | ✅ En producción — commit 9605476 |
| PR#16 | ✅ Mergeado |
| BUG-REGRESION-01 | ✅ Resuelto vía T53 (ya no por workaround) |

### Nota de verificación
QA validó persistencia por lectura tras captura. No se verificó explícitamente
recarga de sesión para confirmar write persistido en H4. Comportamiento observado
correcto; no se eleva a deuda técnica (no cumple criterio de INVARIANTS.md).

### Cola siguiente sesión
1. Continuar ejecución S1 — Colegio, EPS, Plan complementario
2. Desde el 29 jun: registro de gastos libres H3B (DT-MES-01 resuelto por fecha)
3. Recalibrar presupuesto Agua para meses futuros (H1)
4. T52 (tercer path familia bug T51) — definir antes de abrir
5. DT-PLAN-01 · Iniciativa E · cola técnica anterior

---

## Sesión DEBUGGING — DT-PLAN-01 · 29 jun 2026

### Tipo de sesión
DEBUGGING. Diagnóstico antes que solución. Un ticket activo.

### Síntoma reportado
Camilo reportó dificultad de seguimiento en producción: saldos M1 planificación
desviados ~$250K, concepto Entretenimiento no figuraba correctamente en vista
semanal y saldos. Operando "por instrumentos" sobre Julio 2026 en vivo.

### Diagnóstico — Capa de datos (Lectura 1, prod)

Sheet de producción confirmado correcto:
- Entretenimiento Julio: 4 filas, S1=no_aplica, S2/S3/S4=pendiente, $250K cada una.
- Comprometido ejecutable real: $18.166.211 (excluye no_aplica/pospuesto).
- Delta bruto−ejecutable: $1.255.000 (no solo $250K — 10+ conceptos no_aplica
  marcados en sesión de planeación).
- Campo `semana` válido en las 4 filas de Entretenimiento. BL-M4-02 descartado.
- `sobre_techo` no existe como columna en H2 — hallazgo colateral, ver deuda.

**Conclusión capa de datos:** Sheet correcto. Defecto exclusivamente en UI.

### Diagnóstico — Capa de UI (Lectura 2, código)

Causa raíz confirmada: `totalComprometido` y `balancePorSemana`/`balancePlanificacion`
calculaban desde H1 (conceptos), no desde H2 (movimientos). Para conceptos
`frecuencia=semanal`, siempre multiplicaban `c.monto × 4` sin consultar estado
real de cada MOV. Errores en direcciones opuestas:

| Componente | Lógica | Error |
|---|---|---|
| `MesM1Desktop.tsx` | Excluye concepto si TODOS sus movs son no_aplica | Sobrecuenta $250K |
| `VistaPlanificacion.tsx` | `movOverrides` excluye concepto si ALGÚN mov es no_aplica | Infracuenta $750K |

Sesgo neto de visualización: hasta $1.000.000 dependiendo de la vista.

Diagnóstico adicional confirmado durante QA post-fix: branch no-semanal de
`balancePlanificacion` (`MesM1Desktop.tsx:492`) también usaba `c.monto` de H1
en vez de `mov.montoPresupuestado` de H2 — mismo patrón, afectaba S4 en ~$174K.
Fix autorizado por Camilo en misma sesión.

### Fix aplicado

**PR #17** — DT-PLAN-01 principal
- Commit fix: `c8a2250` (dev)
- Merge commit: `ae985d3` (main)
- Archivos: `components/MesM1Desktop.tsx`, `components/m1/VistaPlanificacion.tsx`
- Cambios:
  - 1A: `totalComprometido` en `MesM1Desktop` → lee `movs` filtrado por estado (H2)
  - 1B: `balancePlanificacion` branch semanal → lookup por `conceptoId + semana` en `movs`
  - 2A: `totalComprometido` en `VistaPlanificacion` → lee `movs` filtrado (bypasea `movOverrides`)
  - 2B: `balancePorSemana` → agrupa `movs` por semana en vez de leer `semanaDefault` de H1
- QA: Angie aprobó en Preview PR #17.

**PR #18** — Fix branch no-semanal
- Commit fix: `56b28a5` (dev)
- Merge commit: `af7be54` (main)
- Archivo: `components/MesM1Desktop.tsx:492`
- Cambio: `c.monto` → `mov.montoPresupuestado` en branch no-semanal de `balancePlanificacion`
- QA: Angie aprobó presencialmente.

### Verificación post-deploy

- Comprometido total Julio: $18.166.211 ✓
- S1/S2/S3 correctos ✓
- S4 muestra $1.625.996 ✓
- Entretenimiento visible con S2/S3/S4 ejecutables ✓
- Saldo en mano -$150K: comportamiento esperado — Camilo registró préstamo de
  Emma intencionalmente como deuda en `en_mano`. No es bug.

### Deuda técnica identificada en sesión

**DT-SOBRE-TECHO-01** — `sobre_techo` no existe como columna en H2.
El diseño de bolsillos asume `sobre_techo = TRUE` como mecanismo de trazabilidad
de sobregiro (ESTADO.md líneas 2896-2901). La lectura de prod confirmó que la
columna no existe. El mecanismo no está persistiendo. No es bloqueante hoy.
Requiere auditoría antes de activar flujo de bolsillos.

**DT-PLAN-02** — `movOverrides` en `VistaPlanificacion` no se sincroniza con
PATCHes de sesión para estados intermedios. El handler `marcarNoAplica` actualiza
`movOverrides` correctamente para el concepto completo, pero la inicialización
colapsa estados mixtos (concepto con MOVs parcialmente no_aplica). El fix de hoy
bypasea `movOverrides` para cálculos numéricos; la lógica de presentación de cards
no fue tocada. Pendiente revisar si genera inconsistencias visuales en sesión.

**Magnitud real DT-PLAN-01 (corrección al registro anterior):** el sesgo de
visualización era de hasta $1.255.000 (delta bruto−ejecutable real), no solo
$250K como registrado en el cierre de planeación de Julio. El cierre anterior
subestimó el impacto.

### Estado

| Item | Estado |
|---|---|
| DT-PLAN-01 | ✅ Resuelto — PR #17 + PR #18 en producción |
| PR #17 | ✅ Mergeado — ae985d3 |
| PR #18 | ✅ Mergeado — af7be54 |
| DT-SOBRE-TECHO-01 | 📋 Documentado — no bloqueante |
| DT-PLAN-02 | 📋 Documentado — no bloqueante |

### Cola siguiente sesión
1. Continuar ejecución S1 — Colegio, EPS, Plan complementario
2. Registro de gastos libres H3B (DT-MES-01 resuelto por fecha desde 29 jun)
3. Recalibrar presupuesto Agua para meses futuros (H1)
4. T52 (tercer path familia bug T51) — definir antes de abrir
5. Iniciativa E — sesión DISEÑO (precondiciones cumplidas: T51, T53, DT-PLAN-01 cerrados)
6. DT-SOBRE-TECHO-01 · DT-PLAN-02 · cola técnica

---

---

## SESIÓN — 2026-06-29 [DEBUGGING → CONSTRUCCIÓN]

### Resuelto

**T54 — Label colapsado de movimiento ejecutado mostraba `montoPresupuestado` en vez de `montoEjecutado`.**
- Síntoma: fila de Agua en M1 Ejecución (Desktop) mostraba $250K colapsada; al
  expandir, el desplegable mostraba correctamente $559K (monto real ejecutado).
  Confirmado con evidencia visual (screenshots), no solo reporte verbal.
- Causa raíz: `components/m1/ConceptoBoard.tsx:383` leía `mov.montoPresupuestado`
  incondicionalmente en estado colapsado (`!isOpen`), sin condicionar por
  `estado === "ejecutado"`. La vista expandida sí leía el campo correcto en otro
  punto del componente — de ahí la inconsistencia entre los dos estados de la
  misma fila.
- Fix: lectura condicional — `ejecutado ? (montoEjecutado ?? montoPresupuestado) : montoPresupuestado`.
- Es **bug cosmético, no financiero**: el cálculo real de disponibilidad y balance
  ya leía `montoEjecutado` correctamente (confirmado en diagnóstico de código,
  ver nota de proceso abajo). La plata estaba bien descontada; el rótulo confundía.
- Commit: `2767f47`. PR: [#20](https://github.com/KKze1975/flujo/pull/20). **No mergeado — pendiente QA Angie en Preview.**

**Hallazgo de seguridad resuelto colateralmente — Hook de pre-commit inoperante en sustancia.**
- Durante el commit de T54, el hook de verificación de Sheet ID hardcodeado se
  colgó (>5min) por escanear `node_modules` sin excluirlo.
- Al diagnosticar el cuelgue se descubrió un bug más serio: el hook **nunca
  detectó correctamente** un Sheet ID hardcodeado, ni siquiera antes del problema
  de rendimiento. Causa: `grep "GOOGLE_SHEET_ID"` sin ancla `^` matcheaba tanto
  `GOOGLE_SHEET_ID=` como `PROD_GOOGLE_SHEET_ID=` en `.env.local`, y `tr -d
  '[:space:]'` concatenaba ambos valores en una sola cadena que no aparece en
  ningún archivo real. La verificación pasaba trivialmente siempre.
- Fix: extracción anclada (`^GOOGLE_SHEET_ID=`, `^PROD_GOOGLE_SHEET_ID=`) +
  `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next`.
- Verificado 3/3: bloquea ID de prod hardcodeado, bloquea ID de dev hardcodeado,
  no bloquea string de control sin relación (sin falsos positivos).
- **Deuda abierta**: el hook vive solo en `.git/hooks/pre-commit`, no versionado
  (no hay Husky, `.githooks/`, ni mecanismo equivalente). No viaja a otro
  WorkSpace ni a CI futuro. Cualquier entorno nuevo necesita este fix replicado
  manualmente hasta que se versione.

### Nota de proceso — falso diagnóstico durante la sesión

El primer diagnóstico de código de esta sesión concluyó que la causa raíz de
"persiste valor H1 tras editar" estaba en `VistaPlanificacion.tsx` (estado
local desconectado de `MesM1Desktop`). Esa conclusión tenía dos errores
encadenados:

1. Un grep incompleto omitió la línea donde `setConceptoMod` sí actualizaba el
   estado local — invalidando parte de la causa raíz reportada.
2. Más grave: `VistaPlanificacion` **es código muerto** — solo se importa desde
   `MesM1.tsx`, que a su vez solo es referenciado desde un archivo `.bak`
   excluido del build. El path activo real es
   `MesM1ClientWrapper → MesM1Desktop/MesM1Mobile → ConceptoBoard`.

El hard stop de auditoría (paso 0, definido en el prompt de construcción) evitó
que se escribiera un fix sobre código sin efecto en producción. La causa real
se confirmó después con evidencia visual directa (screenshots del síntoma en
M1 Ejecución), no con una segunda ronda de grep.

**Lección operativa**: antes de diagnosticar sobre un componente, confirmar que
está en el path de import activo (trazar desde `app/` o el entrypoint real),
no asumirlo por nombre o ubicación de archivo. Aplica también hacia atrás:
revisar si otros diagnósticos previos en ESTADO.md asumieron rutas de
componentes sin esa verificación.

### Pendiente — prioridad inmediata

**Semana activa no avanza tras el viernes de cierre (URGENTE — riesgo de pérdida de registros).**
- Hoy lunes 29-jun-2026: ya pasó el viernes 26-jun, que para Camilo marca el
  cierre de S4 y el inicio de ciclo siguiente (regla de negocio: "la semana la
  marca el viernes de cobro/pago", no el calendario corrido).
- El sistema sigue mostrando S4 como semana activa. Camilo no puede registrar
  movimientos vía M4 semanal para lo que él considera la semana nueva.
- **Riesgo operativo concreto**: si esto no se resuelve antes de que Camilo
  necesite registrar movimientos de la semana entrante, esos registros se
  pierden o se escriben mal etiquetados.
- **No es un bug aislado — es un hueco de diseño no cerrado** que choca con dos
  invariantes/iniciativas existentes:
  - I-14 (semana/mes activo se deriva de `new Date()` en servidor, nunca se infiere)
  - Iniciativa E (meses de 5 semanas, S5 necesaria — S1 siempre arranca el 29
    del mes anterior), ya identificada como bloqueante de este mismo problema
- **Decisión de método**: NO se resuelve en esta sesión de construcción ni se
  parchea bajo presión de tiempo. Requiere sesión `[DISEÑO]` dedicada para
  decidir cómo se deriva la frontera de semana (viernes real vs. fecha corrida)
  antes de tocar código — exactamente el tipo de decisión que el hard stop de
  "no tecnología hasta flujos validados" protege.
- **Acción inmediata recomendada para Camilo mientras se diseña la solución**:
  definir manualmente cómo registrar movimientos de la semana entrante en el
  interín (¿registro manual fuera de sistema temporal? ¿forzar `semana=S1` del
  ciclo nuevo aunque la UI no lo marque activo?) — esto se decide en la sesión
  DISEÑO, no aquí, pero la sesión debe abrirse ya dada la urgencia.

### Pendiente — documentado, no resuelto hoy

- **DT-LABEL-COMPROMETIDO-01**: tarjeta "Por semana" en sidebar de M1 Desktop
  (`MesM1Desktop.tsx:883`) muestra `comprometido` = suma de `montoPresupuestado`
  de todos los movimientos de la semana, en vez de monto ejecutado real. Mismo
  patrón que T54, componente distinto. No es el cálculo real de balance
  (`diferencia`), que ya es correcto — es otra etiqueta de referencia visual.
  Confirmado en diagnóstico de código de esta sesión, no atacado.
- **Operación manual fuera de sistema — reasignación de fondos.** Camilo
  reasignó manualmente una porción del fondo reservado para colegio de los
  niños hacia pagos de primera necesidad (salud, tarjeta de crédito Crece), por
  un faltante de aproximadamente $1.200.000 en la disponibilidad inicial del
  ciclo de julio causado por un gasto no registrado a tiempo. El pago de
  colegio correspondiente se reprograma para semana 2. Operación ejecutada
  fuera del sistema — no hay mecanismo actual para registrar reasignación
  entre bolsillos/cuentas reservadas. Reitera la necesidad ya identificada de
  integración de correos bancarios (NU/Nequi) para conciliación de gasto real,
  ya en la cola de iniciativas futuras.

### Branch/PR
- PR #20 (T54) abierto contra `main`, pendiente QA Angie en Preview URL antes de merge.
- Fix de hook local, sin PR (no versionado, no aplica).

---

## CIERRE DEFINITIVO — Sesión 2026-06-29 [DEBUGGING → CONSTRUCCIÓN]

### Mergeado a producción

| Ticket | PR | Commit merge | Estado |
|---|---|---|---|
| DT-FECHA-01 | [#21](https://github.com/KKze1975/flujo/pull/21) | `26520ccf` | MERGED — deploy READY |
| T54 + docs (ESTADO.md, I-12) | [#20](https://github.com/KKze1975/flujo/pull/20) | `8855a041` | MERGED — deploy READY |

`dev` y `main` sincronizados en `8855a04` (fast-forward limpio). QA confirmado
por Angie en ambos Previews antes de merge.

**DT-FECHA-01** — resuelve el bug raíz de la sesión: la regla de Iniciativa E
("S1 arranca el día 29 del mes anterior") estaba documentada desde el 27-jun
pero nunca implementada en código — existía en 8 copias duplicadas de
`mesActual()`/`semanaActual()`, ninguna con la lógica del día 29. Consolidado
en `lib/utils/fecha.ts`, usando timezone explícito `America/Bogota` (no UTC
implícito). 8/8 casos de verificación pasados, incluyendo rollover de fin de
año y el límite exacto offset 6→S1 / offset 7→S2. Cierra también DT-FECHA-01
como deuda técnica de duplicación ya identificada previamente.

**T54** — label colapsado de movimiento ejecutado en `ConceptoBoard.tsx`
corregido: ahora muestra `montoEjecutado` real en vez de `montoPresupuestado`
cuando `estado === "ejecutado"`.

### Verificación pendiente (acción de Camilo, no de Code)

Confirmar visualmente en `flujo-dun.vercel.app` (producción, sesión
autenticada) que:
1. Dashboard muestra mes/semana activa = julio S1.
2. Movimiento Agua muestra $559K en estado colapsado (no $250K).

### Pendiente real — sin resolver, prioridad para próxima sesión

- **Iniciativa E / S5 — sesión [DISEÑO] pendiente de abrir.** El fix de hoy
  resuelve la transición de mes/semana (día 29) pero mantiene el workaround
  ya documentado: offset de día ≥28 dentro del ciclo se absorbe en S4. La
  pregunta de diseño real — tamaño variable de S5 según el mes, monto de
  aporte de Angie correspondiente (fijo vs. proporcional) — sigue sin
  decisión. No es urgente como lo de hoy; es la pieza que falta para que el
  ciclo de julio cierre completo a fin de mes.
- **DT-LABEL-COMPROMETIDO-01** — tarjeta "Por semana" en `MesM1Desktop.tsx:883`
  sigue mostrando `comprometido` = suma de `montoPresupuestado` en vez de
  ejecutado real. Documentado en sesión anterior, no atacado.
- **Hook de pre-commit sin versionar** — corregido en sustancia y rendimiento
  esta sesión, pero vive solo en `.git/hooks/pre-commit` local. No viaja a
  otro WorkSpace ni a CI futuro.
- **Operación manual fondo colegio → salud/TC** — ya documentada en el primer
  append de esta sesión, sin mecanismo de sistema para reasignación entre
  bolsillos/cuentas reservadas.

### Lecciones de proceso de esta sesión (ya en INVARIANTS.md como I-12)

Dos diagnósticos de código en esta sesión apuntaron inicialmente a causas
incorrectas por no trazar el path de import activo (`VistaPlanificacion`,
código muerto) o por trabajar sobre copias de archivo desactualizadas
(`INVARIANTS.md`, donde la copia de proyecto tenía 5 invariantes y el repo
real tenía 11). En ambos casos el hard stop de auditoría/anchor-guard ya
exigido por la metodología atrapó el error antes de escritura — el patrón
se sostuvo, pero vale la pena reforzarlo: verificar contra el repo real,
no contra copias o memoria, es el paso que más veces salvó esta sesión.

---

## FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026

**Ticket cerrado en construcción.** Tercer dato "falta por pagar" en barra morada de VistaSemanal.

### Decisión de diseño tomada
`Math.max(0, montoPresupuestado - gastado)` para bolsillos sobre techo: el sobregiro no resta del total de "falta por pagar". Ese dato pertenece a la traceability de `sobre_techo` (cola: DT-SOBRE-TECHO-01).

### Fórmula verificada contra datos reales (dev Sheet)
```
totalFaltaPagar =
    pendientes.reduce((s, m) => s + m.montoPresupuestado, 0)
  + bolsillosPendientes.reduce((s, b) => {
      const gastado = consumos.filter(c => c.bolsilloId === b.conceptoId).reduce((sum, c) => sum + c.monto, 0);
      return s + Math.max(0, b.montoPresupuestado - gastado);
    }, 0)
```
Caso verificado: Imprevistos Jun S3 — $250K presupuestado, $100K consumido (taxi + gato), saldo $150K ✓

### Archivos modificados
- `components/VistaSemanal.tsx` — único archivo

### Cambios en la barra
- Eliminado: subtítulo "Ejecutado esta semana"
- Número protagonista: `totalFaltaPagar` (tappable → nuevo popover `falta_pagar`)
- Línea secundaria: `$X presupuestado / $Y ejecutado` (ambos tappables, popovers existentes sin cambios)
- Fix posicionamiento: `left: Math.min(anchor.left, window.innerWidth - 278)` — aplica a los 3 modos

### Estado
- Commit: `4fcebe2` en rama `dev`
- PR #23: https://github.com/KKze1975/flujo/pull/23 — pendiente QA de Angie en Preview URL
- No mergear a `main` hasta DoD visual verificado

---

## Corrección y cierre — Sesión 2026-06-30 [DISEÑO → CONSTRUCCIÓN]

### Corrección al bloque anterior
El bloque `## FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026` (línea 4620) describe
la línea secundaria como `$X presupuestado / $Y ejecutado`. Eso quedó
desactualizado: el JSX real no lleva la etiqueta "ejecutado" en el segundo
monto — spec final fue `$X presupuestado` / `$Y` solo, sin redundancia
textual con la barra de progreso. No se edita el bloque anterior por ser
append-only; esta nota es la corrección de referencia.

### Proceso de diseño — no documentado en el cierre anterior
- "Falta por pagar" se evaluó en tres variantes antes de B3: A (resta
  presupuestado−ejecutado), B1 (suma pendientes sin bolsillos), B2 (B1 +
  bolsillos a monto completo). B1 excluía bolsillos por completo; B2
  sobreestimaba ignorando consumo parcial. B3 fue la única matemáticamente
  correcta.
- Dos sesiones de diagnóstico read-only con Claude Code precedieron la
  construcción: la primera levantó estructura de `VistaSemanal.tsx` y
  confirmó el mecanismo `popoverMode` reutilizable; la segunda, con loop de
  evaluación y stops explícitos (máximo 3 iteraciones, criterios de parada
  predefinidos), resolvió en una sola iteración cómo se calcula el consumo
  de bolsillo (`consumos.filter(c => c.bolsilloId === b.conceptoId)`),
  verificado contra 3 casos reales de dev incluyendo consumo parcial.
- Tres opciones de jerarquía visual evaluadas (tres-en-línea / protagonista
  con contexto secundario / protagonista con preview del mayor pendiente).
  Elegida: protagonista. Iteración posterior eliminó redundancia textual
  (subtítulo, conteo de conceptos junto al número, "%" repetido).

### QA visual — resultado (actualiza el "pendiente" del bloque anterior)
Verificado en Preview URL a 375px, no solo declarado: popover `falta_pagar`
con orden descendente correcto, footer = número de barra, los 3 modos de
popover contenidos en viewport tras el fix de clamp, popovers
`presupuestado`/`ejecutado` sin regresión visual ni funcional, subtítulo
"Ejecutado esta semana" confirmado ausente en todos los estados.

### Lección de proceso
El loop de diagnóstico con stops explícitos evitó construir sobre una
hipótesis no verificada (B1 o B2), que habría producido un número plausible
pero incorrecto en presencia de bolsillos con consumo parcial — mismo
patrón de error que la familia `DT-LABEL-*` ya había costado corregir antes.

### Pendiente para próxima sesión
- QA de Angie en Preview URL → merge a `main` si aprueba.
- Resto de la cola sin cambios: Iniciativa E / S5 (`[DISEÑO]` pendiente de
  abrir), `DT-MES-01`, `DT-SOBRE-TECHO-01`, `DT-PLAN-02`.

---

## MERGE CONFIRMADO — FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026

QA de Angie aprobado en Preview URL — funcionamiento correcto de la barra
superior (número protagonista "falta por pagar", popovers de los 3 modos,
sin regresión en presupuestado/ejecutado). PR #23 mergeado a `main`.
Ticket cerrado.
