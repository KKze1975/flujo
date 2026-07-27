---
ticket_id: UBER-04
orden: 15
estado: completado
tier: A
dependencias: UBER-01, UBER-03
---

# UBER-04 — Ingesta, parser y escritura a H3B

## Goal completo

Gmail API (OAuth2) detecta correos de Uber casi en tiempo real, extrae
monto/fecha/origen/destino, y escribe el consumo al bolsillo Transporte
estándar en H3B (`TRANSPORTE_1748100037`, migrado a `pago_fraccionado` por
`UBER-03`) — **sin distinguir** viajes de trabajo vs. personales. Camilo
hace esa separación manualmente, fuera de Flujo (decisión explícita,
`UBER-02` descartado por este motivo).

**Cambio de alcance tras `UBER-02` (descartado):** el Goal original incluía
clasificación `[Personal]`/`[Business]` y un indicador de dos colores
(trabajo/casa) en el bolsillo Transporte — ambos ya no aplican. Todo monto
de Uber detectado se trata igual, como cualquier otro consumo del bolsillo
Transporte.

Tipo de trabajo: construcción, loop autónomo una vez desbloqueado por
`UBER-01` y `UBER-03`.

**No cubre:** reporte a Zoho Expense — fuera de alcance, no construir.
Clasificación trabajo/personal — descartada, ver arriba.

## Definition of Done

- [x] Monto, fecha y origen/destino extraídos correctamente de al menos 2
      tipos de servicio Uber reales — **verificado contra 5 correos reales**
      de `camilovillamil@gmail.com` (3 Uber Black, 1 Flash Moto, más el
      reintento de pago del segundo Black), no sintéticos.
- [x] Consumo escrito en H3B con `bolsilloId = TRANSPORTE_1748100037`, sin
      afectar otros bolsillos — implementado, sigue el patrón exacto de
      `app/api/registro/sin-concepto/route.ts`.
- [x] **Deduplicación — cambiada de `threadId` a llave compuesta de viaje**,
      con evidencia real que threadId no sirve (ver Notas de ejecución).
- [x] Correo real de Uber dispara el parseo sin intervención manual —
      **verificado end-to-end**: Camilo completó el prerrequisito manual de
      OAuth2, se corrió el cron 3 veces contra Gmail real y el Sheet dev
      real (ver Notas de ejecución) — parseo, escritura a H3 y
      deduplicación confirmados por lectura directa, no solo por código de
      respuesta.

## Contexto / diagnóstico previo

Bloqueado por `UBER-01` (supuestos de parseo) y `UBER-03` (migración de
Fondo transporte a `pago_fraccionado`) — ambos deben cerrar antes de abrir
construcción, por WIP limit (I-09). `UBER-02` ya no es dependencia —
descartado, ver `UBER-02.md`.

**Excepción de WIP limit (I-09) autorizada explícitamente por Camilo** en
esta sesión — abierto pese a `TICKET-B-GUARDIA-01` seguir `activo` (misma
excepción ya usada en `FIX-FALTAPAGAR-MENSUAL-01` y `SEMANA5-01`).

**Decisiones tomadas por Camilo en esta sesión (no asumidas):**
- El pipeline vive dentro de `flujo` (Vercel Cron), no como Lambda separado
  como `school-bot` — acepta la limitación de 1 corrida/día del plan actual
  de Vercel, aunque el Goal original pedía "casi en tiempo real". Desviación
  aceptada explícitamente, documentada aquí, mismo patrón que otras
  limitaciones ya aceptadas en este proyecto.
- Sin cambio de esquema en H3 para el dedup — se reutiliza un campo
  existente en vez de agregar una columna.
- `fuente_camilo: true` y `ejecutor: "camilo"` fijos para todo consumo de
  Uber — no se infiere nada del correo sobre método de pago o quién viajó.

## Commit de cierre

`458692f` (construcción) + `37a2035` (verificación end-to-end y cierre).

## Notas de ejecución

**Hallazgo real que cambió el DoD tal como estaba escrito:** el DoD original
pedía "deduplicación por `threadId` de Gmail, mismo patrón que School Bot".
Verifiqué contra un hilo real de Gmail (`19f9bb91518af098`, 4 mensajes) que
**un mismo `threadId` puede contener 2 viajes de Uber genuinamente
distintos** — Uber reutiliza el mismo asunto genérico
`[Personal] Tu viaje del <día> por la <momento> con Uber` para viajes
diferentes la misma noche, y Gmail los agrupa en un solo hilo por similitud
de asunto, no por relación real. Ese hilo real contenía: un viaje con
EYDER JANIER por $19.657, y 3 mensajes sobre un viaje distinto con WILSON
GERARDO por $11.485 (los 2 primeros eran "Error en el pago", el tercero la
confirmación final). Deduplicar por `threadId` habría perdido o fusionado
datos de viajes reales.

**Fix de diseño con evidencia:** la llave de dedup real es la combinación
(dirección+hora de recogida, dirección+hora de destino, nombre del
conductor) — verificado que es idéntica entre los 3 mensajes del mismo
viaje reintentado, y distinta entre los 2 viajes reales del hilo. No existe
un ID de viaje/solicitud legible en los links del correo (todos pasan por
un proxy de tracking `email.mgt.uber.com/c/<payload-opaco>` de Uber) — la
llave compuesta es la mejor señal disponible. Implementada en
`lib/uber/parser.ts` (`llaveDedupViaje`), un hash sha256 corto (8 hex) de
esa combinación.

**Segundo hallazgo real, verificado con un correo Flash Moto adicional
(2025-10-14) no considerado en el diagnóstico original de `UBER-01`:** el
formato del correo varía entre plantillas de Uber — la reciente (viajes en
carro, jul 2026) usa `Total $ 19.657` y horas en formato 12h con am/pm
(`6:45 p. m.`); la más antigua (Flash Moto, oct 2025) usa `Total 6.333 COP`
(sin `$`, con sufijo `COP`) y horas en formato 24h sin am/pm (`09:04`). El
parser (`lib/uber/parser.ts`) maneja ambos formatos — verificado contra los
5 correos reales (no simulados): 3 Uber Black (incluye el reintento de
pago), 1 Flash Moto, extrayendo monto/tipo/direcciones/conductor
correctamente en los 5.

**Sin esquema nuevo en H3** (decisión de Camilo): H3 (ConsumoH3) no tiene
columna `notas` como H2 — se reutiliza `descripcion` (ya existe, texto
libre) para llevar la marca `[dedupe:xxxxxxxx]` junto con un resumen
legible del viaje (ej. `"Uber Black — Cra. 12 #114-30 → Cra. 18 #91-13
[dedupe:e3ca75d4]"`). El endpoint del cron lee H3 del mes correspondiente y
busca esa marca antes de escribir, como defensa adicional a marcar los
correos como leídos en Gmail.

**Parser por regex, no IA** — el cuerpo HTML es una plantilla estable y
determinística generada por el sistema de Uber; no se necesita Claude para
extraerla (a diferencia de `registro/interpretar`, que sí procesa texto
libre de usuario). Gratis, sin latencia de API, sin no-determinismo.

**Archivos construidos:**
- `lib/utils/fecha.ts`: `mesDeFecha(fecha)` y `semanaDeFechaEnMes(fecha)`
  nuevas — ninguna función existente servía para derivar mes/semana de una
  fecha de correo ya pasada (`semanaActual` usa el ciclo día-29 sin S5;
  `semanaActivaMes()` hardcodea `new Date()` sin parámetro). Cumple I-01.
- `lib/uber/parser.ts`: `extraerViajeDeCuerpo`, `llaveDedupViaje` — puras,
  sin red, ya probadas contra 5 correos reales.
- `lib/uber/gmail.ts`: cliente OAuth2 + búsqueda/agrupación/dedup, adaptado
  del patrón ya probado en `school-bot/src/gmail.js` (mismo shape de
  `getGmailClient`, `extractBody`, `markAsRead`), con el cambio de llave de
  dedup ya descrito.
- `app/api/cron/uber-parser/route.ts`: ruta gateada por `CRON_SECRET`
  (mismo patrón que `app/api/admin/backup-sheet/route.ts`), orquesta todo.
- `vercel.json`: cron diario agregado (`0 11 * * *`, ≈6am Bogotá).
- `scripts/gmail-auth-setup.mjs`: script de uso único para que Camilo
  genere el `refresh_token` (mismo patrón que `school-bot/auth.js`).

**Prerrequisito manual pendiente (Camilo, fuera de cualquier herramienta
de esta sesión):** no puedo crear un proyecto de Google Cloud ni un OAuth
Client por API. Antes de que esto funcione en producción, Camilo debe: (1)
crear/reutilizar un proyecto de Google Cloud con la Gmail API habilitada,
(2) crear un OAuth Client ID tipo "Desktop app", agregar
`camilovillamil@gmail.com` como test user, (3) correr
`GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth-setup.mjs`
una sola vez para obtener el `refresh_token`, (4) poner
`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` en
`.env.local` y en Vercel.

**Verificación end-to-end real (Camilo completó el prerrequisito manual,
OAuth2 con `scripts/gmail-auth-setup.mjs`), 3 corridas contra Gmail real y
el Sheet dev real:**

1. **1ra corrida:** escribió 36 consumos únicos (viajes deduplicados
   correctamente — 0 duplicados incluso entre mensajes de reintento de
   pago). Confirmado por lectura directa de H3: `dedupe:e3ca75d4` y
   `dedupe:75007197` coinciden exactamente con los 2 viajes reales
   verificados manualmente en la fase de diseño (EYDER JANIER $19.657,
   WILSON GERARDO $11.485) — mismo monto, mismas direcciones, mismo
   conductor, `mes`/`semana` calculados correctamente (`2026-07`/S3-S4).
2. **2da corrida — hallazgo real no anticipado:** escribió **40 consumos
   más**, sin superposición con los 36 anteriores. Causa: la query
   `is:unread` sin ventana de fecha capturaba **años de historial de Uber
   nunca marcado como leído** (76+ viajes reales en solo 2 corridas de 50
   mensajes cada una) — no solo viajes nuevos. Esto habría significado que
   la primera corrida en producción intentaría un backfill masivo de todo
   el historial no leído, no solo detección de viajes nuevos. **Camilo
   decidió explícitamente limitar el alcance**: se agregó
   `newer_than:7d` a la query de Gmail (`lib/uber/gmail.ts`,
   `VENTANA_BUSQUEDA`) — 7 días da margen sobre la cadencia diaria del cron
   por si una corrida falla, sin arrastrar años de historial.
3. **3ra corrida (con el filtro de 7 días ya aplicado):** `0 escritos, 2
   saltados` — confirma que (a) el filtro de fecha funciona sin romper
   nada, y (b) la deduplicación por `descripcion`/`[dedupe:xxxxxxxx]`
   correctamente evita reescribir consumos ya existentes en corridas
   posteriores.

**Dato relevante para Camilo, no un problema de este ticket:** quedaron
~76 consumos reales de Uber (meses `2026-06` y `2026-07`) escritos en H3 del
Sheet **dev** por las 2 primeras corridas, antes del ajuste de ventana de
fecha. Es dato real (montos/direcciones/fechas correctos), no de prueba —
se deja tal como quedó, sin limpiar, porque es información real del usuario
y no fue pedido explícitamente borrarla; si Camilo prefiere limpiar el
Sheet dev de este backfill histórico, es una acción aparte a pedir
explícitamente.

**Deuda técnica / decisión de scope, no oscurecida:** el cron corre 1
vez/día (limitación del plan de Vercel actual, aceptada por Camilo) — no es
literalmente "casi en tiempo real" como decía el Goal original. Si más
adelante se necesita menor latencia, las opciones son upgrade a Vercel Pro
(cron por minuto) o migrar a Gmail push notifications (Pub/Sub + webhook),
ninguna construida aquí. Tampoco se agregó paginación a
`gmail.users.messages.list` (límite `maxResults: 50` por corrida) — con la
ventana de 7 días esto no debería ser un problema en uso normal, pero si
algún día hay más de 50 viajes de Uber en 7 días, algunos quedarían para la
corrida siguiente (no se pierden, solo se retrasan un día).

Cero llamadas contra producción durante esta construcción. El Sheet
afectado en todas las pruebas fue el de **dev** (`GOOGLE_SHEET_ID`).
