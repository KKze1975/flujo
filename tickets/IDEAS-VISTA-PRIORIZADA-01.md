---
ticket_id: IDEAS-VISTA-PRIORIZADA-01
orden: 41
estado: descartado
tier: B
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01, IDEAS-TRIAGE-01]
---

# IDEAS-VISTA-PRIORIZADA-01 — Vista de revisión conjunta de ideas priorizadas

## Goal completo

Parte de la línea "backlog de ideas de features con triage por IA" (spec de Fase 2,
`ESTADO.md`, 18 sept 2026 — aprobado por Camilo). Construye la vista dentro de Flujo
donde Camilo y Angie ven las ideas priorizadas, con contexto y estado, cuando se sientan
a revisar juntos — el momento que hoy no existe (to-be de Fase 1).

**BLOQUEADO — no construir sin resolver esto primero:** no existe diseño aprobado para
esta vista (componente nuevo, sin patrón visual directamente reusable identificado en el
spec). Igual que `IDEAS-CAPTURA-01`, requiere brief + integración del rol
Diseñador/Integrador antes de que un Coder la tome — regla no negociable del proyecto
(`T21`).

**Contenido mínimo de la vista** (del spec de Fase 2, aprobado): lista de ideas
ordenadas por `prioridad_score` descendente, mostrando descripción, caso de uso, motivo
de importancia, triage (impacto/esfuerzo/alineación) y estado
(`nueva`/`en_triage`/`priorizada`/`en_construccion`/`construida`/`descartada`). Fuera de
alcance explícito del spec: generación automática de "plan de ejecución" por idea (no
validado, queda para un spec posterior).

**Fuera de alcance:**
- Cambiar el `estado` de una idea a `en_construccion`/`construida`/`descartada` desde
  esta vista es manual (cuando la idea se convierte en un ticket real de `tickets/`) —
  este ticket puede incluir esa acción manual si el diseño la contempla, pero no es
  obligatoria para el DoD mínimo; si se omite, documentarlo como deuda.

## Definition of Done

- [ ] Diseño aprobado existe para esta vista (brief + integración del rol
      Diseñador/Integrador) — **precondición antes de marcar este ticket como `activo`**.
- [ ] Vista muestra todas las ideas de H10 con `estado` distinto de `nueva` (las sin
      triage van aparte o no se muestran en la lista principal — decisión del diseño),
      ordenadas por `prioridad_score` descendente.
- [ ] Cada idea muestra descripción, caso de uso, motivo de importancia, triage completo
      y estado.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado con las ideas de prueba ya cargadas por `IDEAS-TRIAGE-01` en Sheet DEV:
      confirmar que el orden y el contenido mostrado coinciden con los datos reales del
      Sheet, leídos de vuelta o por captura de pantalla.

## Contexto / diagnóstico previo

Spec de Fase 2 completo en `ESTADO.md`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

## Descartado (18 sept 2026)

Camilo decidió que el triage y la revisión priorizada ya no ocurren dentro de la app —
pasan a hacerse conversando con él durante sesiones del vault (ver decisión gemela en
`IDEAS-TRIAGE-01`). Sin triage automático ni una revisión periódica dentro de Flujo que
lo justifique, esta vista pierde su propósito: el vault (leyendo el Sheet directo, o
`IDEAS-BACKLOG.md` de `IDEAS-VAULT-SYNC-01`) cumple el mismo rol de "vista" sin construir
nada nuevo en la app — alineado con INV-002. Decisión textual de Camilo: "confirmado"
(sobre la pregunta explícita de si descartar este ticket dado el nuevo flujo).

Nunca se construyó nada de este ticket — no hay código que revertir.
