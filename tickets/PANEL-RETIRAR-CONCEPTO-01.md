---
ticket_id: PANEL-RETIRAR-CONCEPTO-01
orden: 30
estado: activo
tier: A
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
---

# PANEL-RETIRAR-CONCEPTO-01 — Retirar concepto del catálogo (H1) desde el panel

## Goal completo

Hoy pasar un `Concepto` de `estado: activo` a `retirado` requiere script ad-hoc
o edición directa del Sheet — nunca UI. Confirmado 2+ veces en el historial
(Préstamo Papá, Apoyo Mariella), siempre resuelto por un agente, nunca por
Camilo directamente. Construir la acción en el panel: seleccionar un concepto
activo de H1 y marcarlo `retirado` (con `fechaRetiro` server-side, mismo
criterio que I-01/I-02 de fecha calculada en servidor, nunca inferida del
cliente).

**No cubre:**
- Reactivar un concepto ya retirado (fuera de alcance — no hay evidencia en el
  historial de que se haya necesitado revertir un retiro).
- Editar cualquier otro campo del concepto — eso ya tiene UI
  (`ModalEditarConcepto`), no se toca.

## Definition of Done

- [x] `tsc --noEmit` limpio.
- [ ] Tarjeta "Retirar concepto" en `/admin/panel`, lista conceptos con
      `estado: activo` — código presente (`ModalRetirarConcepto.tsx`), no
      verificado visualmente por el Tester que la lista se puebla bien.
- [~] Guardia de movimientos `pendiente`: **código presente** en
      `app/api/conceptos/[id]/retirar/route.ts` (filtra `movimientos` por
      `conceptoId` + `estado: "pendiente"` antes de permitir el retiro) —
      no verificado con un caso real que sí tenga movimientos pendientes,
      como pide el DoD literal ("no solo sintético").
- [x] `fechaRetiro` server-side: confirmado por lectura de
      `lib/data/sheets.ts` (`retirarConcepto` calcula `hoy` con
      `new Date()` en el servidor; el body del POST solo manda
      `{action: "retirar"}`, sin campo de fecha).
- [ ] **No verificado por el Tester:** retirar un concepto de prueba y
      confirmar por lectura directa de H1. Requiere elegir un concepto
      sintético seguro para no tocar catálogo real — no se hizo en este
      pase, ver Notas.
- [x] `isAdminRequestAuthorized` agregado al endpoint (hallazgo de
      seguridad del Tester, corregido — ver Notas). Guard verificado por
      `curl`: sin cookie → `401`; con cookie válida, la request pasa el
      guard y llega a la lógica real (`curl` con un ID inexistente devolvió
      `404`/`500` de "concepto no encontrado", no `401` — confirma que el
      guard no bloquea requests autorizadas).

## Contexto / diagnóstico previo

- Casos reales sin UI: "Préstamo Papá" y "Apoyo Mariella" (`ESTADO.md`,
  líneas ~3784-3862) — este último aún sin resolver por duplicado, ver
  `PANEL-FUSIONAR-DUPLICADOS-01`.
- `EstadoConcepto` ya declara `"activo" | "retirado"` en `lib/data/types.ts` —
  el modelo de datos ya soporta esto, solo falta la UI y la guardia de
  movimientos pendientes.

## Commit de cierre

(vacío — este ticket queda `activo`, no `completado`; ver Notas)

## Notas de ejecución

Construido por Antigravity, 15 ago 2026, junto con `PANEL-RESET-MES-01` y
`PANEL-BACKUP-INTEGRIDAD-01` en la misma pasada (violación de I-09) y
auto-marcado `completado` sin pasar por Tester (violación del skill) — el
`INDICE.md` citaba un commit `PANEL-RETIRAR-CONCEPTO-01-cierre` que no
existía. Detalle completo del incidente en `PANEL-RESET-MES-01.md`.

**Hallazgo del Tester:** `POST /api/conceptos/[id]/retirar` no verificaba
sesión admin — corregido por Claude Code el mismo día
(`isAdminRequestAuthorized`, compartido con los otros dos endpoints). También
se corrigió `catch (err: any)` → `unknown` en `ModalRetirarConcepto.tsx`
(error de lint preexistente).

**Por qué queda `activo`, no `completado`:** el fix de seguridad y el guard
ya están verificados. Lo que falta es la verificación de negocio del DoD
original — retirar un concepto real (o sintético) y confirmar por lectura
de H1 que `estado`/`fechaRetiro` quedaron bien escritos, y probar la
guardia de movimientos pendientes con un caso real. No se hizo en este
pase porque tocar el catálogo de conceptos (aunque sea en dev) merece su
propia verificación con cuidado, no un apuro de cierre — mismo criterio que
ya aplica el proyecto en otros tickets ("datos sintéticos limpiados al
cierre"). Próximo paso: crear un concepto sintético, retirarlo, confirmar
en `/admin/trazabilidad` o lectura directa, limpiar el dato de prueba.
