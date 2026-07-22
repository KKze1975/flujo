---
ticket_id: SEC-AUTH-ADMIN-RESET-01
orden: 9
estado: propuesto
tier: B
dependencias: ninguna
---

# SEC-AUTH-ADMIN-RESET-01 — Autenticación en POST /api/admin/reset-mes

## Goal completo

`POST /api/admin/reset-mes` no tiene ningún mecanismo de autenticación —
cualquiera con la URL puede invocar un reset destructivo de un mes completo.
Hallazgo confirmado en auditoría adversarial (`AUDIT-FABLE-01`, 23
findings). Viola el criterio de seguridad mínimo de la metodología del
proyecto: *"todo endpoint nuevo declara su política de acceso antes de
cerrar el ticket — 'sin autenticación' es válido solo si es consciente, no
una omisión"* — este endpoint nunca declaró la decisión conscientemente.

**Tier B**: la decisión de qué mecanismo de autenticación usar (PIN simple
ya existente en la app, un header secreto para uso interno/scripts, o algo
más) es una decisión de diseño con trade-offs — no un fix mecánico.

**No cubre:**
- Auditar el resto de endpoints admin/destructivos del `AUDIT-FABLE-01` —
  alcance limitado a `reset-mes`. `deleteRowsByMes`/`resetH2` comparten el
  mismo riesgo estructural pero se abordan en un ticket separado si se
  decide (no creado aún).
- Rediseñar el modelo de autenticación general de la app (PIN → OAuth) —
  fuera de alcance, ya es feature futura documentada.

## Definition of Done

**Fase diagnóstico/diseño (tier B — HALT obligatorio):**
- [ ] Confirmar contra código real el estado actual de autenticación (o su
      ausencia total) en el endpoint.
- [ ] Proponer 2-3 opciones concretas de mecanismo de acceso (ej: reutilizar
      PIN de sesión, header con secreto de entorno, restricción por origen)
      con trade-offs. HALT — Camilo aprueba una antes de construir.

**Fase construcción (tras aprobación):**
- [ ] `tsc --noEmit` limpio.
- [ ] Endpoint rechaza invocación sin la credencial/mecanismo aprobado
      (verificar con una llamada sin credencial → 401/403, y con
      credencial válida → comportamiento normal).
- [ ] Verificado en dev, cero llamadas a producción durante la
      construcción.

## Contexto / diagnóstico previo

- Hallazgo de `AUDIT-FABLE-01` (auditoría adversarial de código), entre los
  23 findings priorizados. Reclasificado como parte de "Address unauthenticated
  destructive endpoints" en el horizonte de `ESTADO.md`.
- Principio ya establecido en la metodología: criterio de seguridad mínimo,
  Fase 2 Especificación de HG-SDD v6.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
