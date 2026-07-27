---
ticket_id: UBER-04
orden: 15
estado: activo
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
- [ ] Correo real de Uber dispara el parseo sin intervención manual —
      **código construido y probado con datos reales, pero NO verificado
      end-to-end todavía**: requiere que Camilo complete el prerrequisito
      manual de OAuth2 (ver Notas de ejecución) antes de poder correr el
      cron contra Gmail real y confirmar la escritura real a H3.

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

(vacío — pendiente de la verificación end-to-end con credenciales reales)

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

**Por qué no se verificó tsc/build con las credenciales reales:** sin ese
prerrequisito no hay forma de correr el cron contra Gmail real ni escribir
un consumo real a H3 — `tsc --noEmit` y el parser sí están verificados con
datos reales (los 5 correos), pero la integración end-to-end (Gmail →
Sheet) queda pendiente de que Camilo complete el prerrequisito. **No se
marca `completado`** hasta esa verificación.

**Deuda técnica / decisión de scope, no oscurecida:** el cron corre 1
vez/día (limitación del plan de Vercel actual, aceptada por Camilo) — no es
literalmente "casi en tiempo real" como decía el Goal original. Si más
adelante se necesita menor latencia, las opciones son upgrade a Vercel Pro
(cron por minuto) o migrar a Gmail push notifications (Pub/Sub + webhook),
ninguna construida aquí.

Cero llamadas contra producción durante esta construcción.
