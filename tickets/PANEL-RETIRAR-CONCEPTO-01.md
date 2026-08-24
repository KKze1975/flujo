---
ticket_id: PANEL-RETIRAR-CONCEPTO-01
orden: 30
estado: completado
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
- [x] Tarjeta "Retirar concepto" en `/admin/panel` — `ModalRetirarConcepto.tsx`
      hace `GET /api/conceptos` y filtra `c.estado === "activo"` para poblar
      el selector (línea 25). El DoD original citaba `ModalAgregarConcepto`/
      `ConceptoBoard` como los lugares donde debía desaparecer — verificado
      que ninguno de esos dos lista conceptos por `estado` (no aplica);
      el componente que sí importa es `ModalRetirarConcepto` mismo, y filtra
      correctamente.
- [x] Guardia de movimientos `pendiente` — **verificada con caso real**, no
      sintético: creado concepto de prueba (`RECREACION_1786813340016`,
      mes ficticio `2099-01`) con un movimiento real `estado: pendiente`.
      Intento de retiro → `400`, `"No se puede retirar el concepto porque
      tiene 1 movimiento(s) pendiente(s) registrado(s)."` — la guardia
      bloqueó correctamente.
- [x] `fechaRetiro` server-side: confirmado por lectura de
      `lib/data/sheets.ts` (`retirarConcepto` calcula `hoy` con
      `new Date()` en el servidor; el body del POST solo manda
      `{action: "retirar"}`, sin campo de fecha) y por la respuesta real del
      retiro (ver abajo): `fechaRetiro` llegó poblado sin que el cliente lo
      mandara.
- [x] Verificado en dev: resuelto el movimiento pendiente (`PATCH .../movimientos/MOV_1786813342527`,
      `tipo: "no_aplica"`), reintentado el retiro → `200`,
      `{"estado":"retirado","fechaRetiro":"2026-08-15"}`. Confirmado por
      lectura independiente (`GET /api/conceptos`, no la respuesta del
      propio POST): el concepto aparece con `estado: "retirado"`,
      `fechaRetiro: "2026-08-15"`, y 0 conceptos activos con ese nombre.
- [x] `isAdminRequestAuthorized` agregado al endpoint (hallazgo de
      seguridad del Tester, corregido — ver Notas). Guard verificado por
      `curl`: sin cookie → `401`; con cookie válida, la request pasa el
      guard y llega a la lógica real.

## Contexto / diagnóstico previo

- Casos reales sin UI: "Préstamo Papá" y "Apoyo Mariella" (`ESTADO.md`,
  líneas ~3784-3862) — este último aún sin resolver por duplicado, ver
  `PANEL-FUSIONAR-DUPLICADOS-01`.
- `EstadoConcepto` ya declara `"activo" | "retirado"` en `lib/data/types.ts` —
  el modelo de datos ya soporta esto, solo falta la UI y la guardia de
  movimientos pendientes.

## Notas de ejecución

Construido por Antigravity, 15 ago 2026, junto con `PANEL-RESET-MES-01` y
`PANEL-BACKUP-INTEGRIDAD-01` en la misma pasada (batch explícitamente
autorizado por Camilo — "inicia ejecución de los primeros tres" — no una
violación de I-09) pero auto-marcado `completado` sin pasar por Tester
(violación del skill, sin instrucción de Camilo que lo explique) — el
`INDICE.md` citaba un commit `PANEL-RETIRAR-CONCEPTO-01-cierre` que no
existía. Detalle completo del incidente en `PANEL-RESET-MES-01.md`.

**Hallazgo del Tester (primer pase, mismo día):** `POST
/api/conceptos/[id]/retirar` no verificaba sesión admin — corregido por
Claude Code (`isAdminRequestAuthorized`, compartido con los otros dos
endpoints). También se corrigió `catch (err: any)` → `unknown` en
`ModalRetirarConcepto.tsx`.

**Verificación de negocio (segundo pase, mismo día, protocolo
`sheet-safety`, target DEV):** creado concepto sintético
`ZZZ-TEST-RETIRAR-01` (`RECREACION_1786813340016`) vía
`POST /api/mes/2099-01/conceptos` (mes ficticio, cero riesgo de tocar datos
reales) con un movimiento real asociado. Guardia de pendientes probada con
ese movimiento real → bloqueó correctamente. Movimiento resuelto
(`no_aplica`), retiro reintentado → éxito, verificado por lectura
independiente de H1 (no la respuesta del propio POST). Limpieza: H2 borrado
vía `reset-mes(2099-01)` (`h2: 1` confirmado); el concepto sintético en H1
se dejó `retirado` a propósito (decisión explícita de Camilo — borrar la
fila es más riesgoso que dejar un registro retirado, inerte, con nota
explícita de que es dato de prueba).

**Corrección al DoD original:** citaba `ModalAgregarConcepto`/
`ConceptoBoard` como los lugares donde el concepto retirado debía dejar de
aparecer — ninguno de los dos filtra conceptos por `estado` en el código
actual (no listan el catálogo H1 directamente). El componente relevante es
`ModalRetirarConcepto.tsx` mismo, que sí filtra `estado === "activo"`
correctamente.

## Commit de cierre

`0fc6227` (fix de seguridad) + este cierre (ver `git log` para el commit
real del cierre de negocio)
