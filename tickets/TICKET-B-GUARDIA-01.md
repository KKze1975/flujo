---
ticket_id: TICKET-B-GUARDIA-01
orden: 11
estado: activo
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

- [ ] Confirmar que `FIX-CREARMOVIMIENTOSMES-01` está cerrado y verificado
      antes de reintentar la prueba de DoD bullet 2 (dependencia de facto,
      aunque el campo `dependencias` del frontmatter diga "ninguna" porque
      la relación es de secuencia de verificación, no de bloqueo de código).
- [ ] DoD bullet 2 verificado: iniciar un mes futuro con traslado
      preexistente del concepto → 400, sin duplicar, confirmado por lectura
      directa del Sheet dev.
- [ ] Confirmar en código (`mover_mes_siguiente`, P1 commit `ee0b9e1`) si la
      exclusión de `frecuencia: semanal` lee H1 dinámicamente o usa lista
      estática — documentar la respuesta en Notas de ejecución.
- [ ] `node scripts/generate-kanban.mjs` ejecutado.
- [ ] PR creado (no mergeado) una vez el DoD completo esté verificado.

## Contexto / diagnóstico previo

- Sesión "Ticket B — 3 julio 2026", commits `ee0b9e1` y `291e8bd` ya en
  rama `dev`, `tsc --noEmit` limpio confirmado en ambos.
- Bloqueado por el hallazgo colateral de `crearMovimientosMes` durante su
  propia verificación — de ahí nace `FIX-CREARMOVIMIENTOSMES-01`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
