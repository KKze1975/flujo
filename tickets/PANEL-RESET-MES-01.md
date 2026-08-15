---
ticket_id: PANEL-RESET-MES-01
orden: 29
estado: propuesto
tier: A
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
---

# PANEL-RESET-MES-01 — Exponer reset de mes en el panel, gateado por PIN

## Goal completo

`POST /api/admin/reset-mes` ya existe y funciona (usado hoy desde
`admin/trazabilidad/page.tsx`), pero no tiene autenticación propia — cualquiera
con la URL puede invocarlo. En vez de construir un mecanismo de auth dedicado
para este único endpoint (que era el plan original de `SEC-AUTH-ADMIN-RESET-01`),
se resuelve por la vía del panel: la tarjeta "Reset de mes" solo es alcanzable
detrás del PIN de `PANEL-ADMIN-01`.

**Relación con `SEC-AUTH-ADMIN-RESET-01` — no duplicar:** ese ticket sigue
`propuesto` y cubre el mismo objetivo de fondo (el endpoint no debe ser
invocable sin credencial) por un mecanismo distinto y más antiguo (header
secreto o PIN de sesión ad-hoc solo para esa ruta). Una vez este ticket cierre,
`SEC-AUTH-ADMIN-RESET-01` queda cubierto en la práctica — pero es decisión de
Camilo marcarlo `descartado` o `completado_parcial`, no de este ticket.

**No cubre:**
- El endpoint `reset-mes` en sí — no se modifica su lógica de borrado, solo se
  le agrega una superficie de UI protegida.
- La decisión de mecanismo de PIN — ya se resolvió en `PANEL-ADMIN-01`.

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] Tarjeta "Reset de mes" en `/admin/panel`, solo accesible tras el PIN.
- [ ] Confirmación de dos pasos antes de ejecutar (re-escribir el mes, mismo
      patrón de fricción intencional que ya usa `admin/trazabilidad`, pero sin
      `window.confirm()` — modal propio del brief de diseño).
- [ ] Verificado en dev: llamada real, respuesta mostrada con el mismo detalle
      por hoja (H2/H3B/H4A-D/H5A/H5B) que ya devuelve el endpoint.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Endpoint ya construido: `app/api/admin/reset-mes/route.ts`.
- Hallazgo de seguridad original: `AUDIT-FABLE-01` (23 findings), formalizado
  como `SEC-AUTH-ADMIN-RESET-01`.
- Decisión de Camilo (11 ago 2026): en vez de resolver esto de forma aislada,
  se resuelve como parte del panel de administración completo.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
