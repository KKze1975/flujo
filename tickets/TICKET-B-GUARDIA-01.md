---
ticket_id: TICKET-B-GUARDIA-01
orden: 11
estado: completado
tier: A
dependencias: ninguna
---

# TICKET-B-GUARDIA-01 — Cerrar DoD pendiente de guardia anti-duplicación de traslado

## Goal completo

Ticket ya construido parcialmente (P1 commit `ee0b9e1`, P2 commit `291e8bd`,
`tsc` limpio en ambos) pero **nunca cerrado** — migrado aquí con su estado
real, no reiniciado desde cero. Guardia defensiva en `mover_mes_siguiente`
(400 si ya existe fila del concepto en el mes destino, excluyendo conceptos
`frecuencia: semanal`) y en `iniciar` (ya no bloquea inicialización completa
del mes por una sola fila de traslado preexistente).

**Lo que falta, exactamente:**
- DoD bullet 2 (iniciar un mes futuro con un traslado ya existente, verificar
  que la guardia responde 400 sin duplicar) — la verificación original quedó
  contaminada por el hallazgo crítico de `FIX-CREARMOVIMIENTOSMES-01`
  (sobrescritura de 67 filas en dev durante la misma sesión de prueba). Ese
  bug ya tiene ticket propio y su fix es prerrequisito de esta verificación.
- Confirmar si la exclusión de conceptos `frecuencia: semanal` en P1 consulta
  el campo `frecuencia` de H1 dinámicamente o es una lista hardcodeada — no
  quedó confirmado en el resumen de cierre de la sesión original.
- `generate-kanban.mjs` y creación de PR — pendientes desde entonces.

**No cubre:**
- Nada nuevo — es cierre de trabajo ya aprobado y parcialmente construido.

## Definition of Done

- [x] Confirmar que `FIX-CREARMOVIMIENTOSMES-01` está cerrado y verificado
      antes de reintentar la prueba de DoD bullet 2 (dependencia de facto,
      aunque el campo `dependencias` del frontmatter diga "ninguna" porque
      la relación es de secuencia de verificación, no de bloqueo de código).
- [x] DoD bullet 2 verificado — **redacción actualizada respecto al texto
      original** (ver Notas de ejecución): iniciar un mes futuro con traslado
      preexistente del concepto responde **201, no 400**, porque el diseño
      evolucionó de "bloquear todo el mes" a "omitir solo la fila duplicada
      y continuar" (P2, commit `291e8bd`). La guardia de 400 real vive en
      `mover_mes_siguiente` (P1) al intentar trasladar el mismo movimiento
      dos veces — verificado sin duplicación en ambos casos por lectura
      directa del Sheet dev.
- [x] Confirmar en código (`mover_mes_siguiente`, P1 commit `ee0b9e1`) si la
      exclusión de `frecuencia: semanal` lee H1 dinámicamente o usa lista
      estática — documentar la respuesta en Notas de ejecución.
- [x] `node scripts/generate-kanban.mjs` ejecutado.
- [x] PR creado (no mergeado) una vez el DoD completo esté verificado.

## Contexto / diagnóstico previo

- Sesión "Ticket B — 3 julio 2026", commits `ee0b9e1` y `291e8bd` ya en
  rama `dev`, `tsc --noEmit` limpio confirmado en ambos.
- Bloqueado por el hallazgo colateral de `crearMovimientosMes` durante su
  propia verificación — de ahí nace `FIX-CREARMOVIMIENTOSMES-01`.

## Commit de cierre

`__COMMIT_HASH__` — cierre del ticket (DoD bullet 2 verificado con evidencia
real contra Sheet dev, `generate-kanban.mjs` corrido, PR abierto).

## Notas de ejecución

**Discrepancia entre el DoD original y el comportamiento real (documentada,
no forzada a calzar):** el bullet 2 del DoD, redactado en la sesión original
del 3 jul 2026, decía "iniciar un mes futuro con traslado preexistente →
400, sin duplicar". El código real de P2 (commit `291e8bd`,
`app/api/mes/[mes]/iniciar/route.ts`) responde **201, no 409/400**, en ese
escenario — porque el diseño evolucionó durante la construcción original:
en vez de bloquear la inicialización completa del mes por una sola fila de
traslado legítimo, `iniciar` ahora distingue `soloTrasladosPrevios` (todas
las filas preexistentes se explican por conceptos que en el mes anterior
quedaron `estado: "pospuesto_mes_siguiente"`) de un mes genuinamente ya
inicializado, y en el primer caso **omite silenciosamente** la fila
duplicada para esos `conceptoId` y sigue creando el resto del mes con
`status: 201`. Solo devuelve 409 si hay filas preexistentes que NO se
explican así. La garantía real que importaba (no duplicar la fila
trasladada) se cumple igual — el código de estado documentado en el DoD
viejo quedó desactualizado, no el comportamiento.

La guardia de **400 real** existe en `mover_mes_siguiente` (P1, commit
`ee0b9e1`): al intentar trasladar el mismo movimiento una segunda vez,
responde 400 con `"Ya existe un movimiento de este concepto en {mes}. No se
puede trasladar de nuevo."` — verificado end-to-end (ver Prueba A abajo).

**Confirmación de lectura dinámica de H1 (DoD bullet 3):** en
`mover_mes_siguiente` (`app/api/mes/[mes]/movimientos/[id]/route.ts`,
línea ~114), la exclusión de conceptos `frecuencia: "semanal"` llama
`provider.getConceptos()` y busca el concepto por `mov.conceptoId` en esa
respuesta — **lee H1 dinámicamente en cada request, no es una lista
hardcodeada.** Confirmado por lectura directa del código, no por inferencia.

**Verificación real contra Sheet dev** (`GOOGLE_SHEET_ID` de `.env.local`,
nunca producción), meses sintéticos `2027-10`/`2027-11` (confirmados 404
antes de empezar; no usados por ningún ticket previo):

- *Prueba A (guardia P1):* creado concepto `TEST-TICKET-B-GUARDIA-01-A`
  (`frecuencia: "mensual"`) con movimiento pendiente en `2027-10`.
  `PATCH .../movimientos/{id}` con `mover_mes_siguiente` (1ª vez) → **200**,
  crea 1 fila en `2027-11`, marca origen `estado: "pospuesto_mes_siguiente"`.
  Repetido el mismo PATCH sobre el mismo movimiento origen → **400**,
  `"Ya existe un movimiento de este concepto en 2027-11. No se puede
  trasladar de nuevo."` Confirmado por lectura directa de H2 (`GET
  /api/mes/2027-11`): exactamente **1 fila** para ese `conceptoId`, sin
  duplicar.
- *Prueba B (guardia P2):* con ese estado (1 fila de traslado en `2027-11`),
  `POST /api/mes/2027-11/iniciar` → **201** (no 409/400), `total: 77` filas
  creadas (todos los conceptos reales activos del sistema). Conteo H2 en
  `2027-11`: **1 fila antes** de `iniciar` → **78 filas después** (77
  nuevas + la del traslado). El `conceptoId` de prueba conserva
  **exactamente 1 fila** tras `iniciar` — no se duplicó — mientras los 77
  conceptos reales sí se inicializaron normalmente (comportamiento esperado
  de la ruta, no un bug).
- *Limpieza:* borradas las 79 filas de H2 de `2027-10`/`2027-11` (todas,
  incluidas las 77 reales creadas por `iniciar`, inevitable — es el
  comportamiento normal de esa ruta) y el concepto `TEST-TICKET-B-GUARDIA-01-A`
  de H1. Verificado post-limpieza: `GET /api/mes/2027-10` y `.../2027-11`
  vuelven a 404, `GET /api/conceptos` sin residuos del prefijo
  `TEST-TICKET-B-GUARDIA-01-`.

`tsc --noEmit` limpio (sin cambios de código nuevos en este cierre, solo
verificación). `node scripts/generate-kanban.mjs` corrido sin error (49
tickets, 69 items deuda).

Servidor `npm run dev` levantado por esta sesión para las pruebas (no había
nada corriendo en `localhost:3000` antes) y detenido al terminar.
