---
ticket_id: UBER-02
orden: 13
estado: bloqueado
tier: B
dependencias: UBER-01
---

# UBER-02 — Decisión de esquema H3B para monto "trabajo"

## Goal completo

Definir dónde vive en H3B el monto de un viaje Uber clasificado como
"trabajo" — no pertenece a ningún bolsillo familiar existente (I-03 no
aplica directamente). Opciones a evaluar: bolsillo especial no-familiar vs.
campo separado fuera del modelo de bolsillos.

**Tier B**: requiere decisión de diseño antes de construir — no es un fix
mecánico. Bloqueado por `UBER-01`: sin confirmar que el correo distingue
`[Business]`/`[Personal]`, no hay base real para diseñar el esquema.

**Actualización tras cierre de `UBER-01` (verificación real en Gmail,
completada):** el supuesto base de este ticket **no se sostiene**.
`UBER-01` buscó exhaustivamente (`in:anywhere`, todo el historial desde
2020) y **no encontró ningún correo con prefijo `[Business]`** — todos los
recibos de Uber de esta cuenta traen `[Personal]`. No hay señal de asunto
que distinga un viaje de trabajo de uno personal. Antes de que `/goal-b`
pueda diagnosticar este ticket como está planteado, la pregunta de fondo
cambia de "¿dónde vive en H3B el monto de un viaje clasificado como
trabajo?" a "¿cómo se clasifica un viaje como trabajo, si no es por el
asunto del correo?" — candidatos no evaluados aún: clasificación manual
por Camilo al momento de registrar, o alguna otra señal dentro del cuerpo
del correo (no confirmada). Este ticket necesita reformularse, no solo
desbloquearse, antes de aprobar su fase de diagnóstico.

## Definition of Done

**Fase diagnóstico/diseño (tier B — HALT obligatorio antes de aprobar):**
- [ ] Decisión documentada con alternativas descartadas y razón.
- [ ] Esquema de H3B actualizado en la especificación (no en el Sheet
      todavía).
- [ ] "Aprobado para construir" explícito de Camilo sobre esta decisión
      puntual.

## Contexto / diagnóstico previo

Depende de la evidencia recogida en `UBER-01`. Alimenta directamente el
esquema de escritura que usará `UBER-04`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
