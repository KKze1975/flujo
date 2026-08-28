---
ticket_id: PANEL-RESET-MES-01
orden: 29
estado: completado
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

- [x] `tsc --noEmit` limpio.
- [x] Tarjeta "Reset de mes" en `/admin/panel`, solo accesible tras el PIN.
- [x] Confirmación de dos pasos antes de ejecutar — paso 1 (elegir mes) y
      paso 2 (`ModalConfirmacionDestructiva`, re-escribir el mes) son ambos
      inline, cero `window.confirm()`/`prompt()`/`alert()` del navegador.
- [x] Verificado en dev: `curl` directo a `/api/admin/reset-mes` sin cookie
      → `401`. Con cookie de sesión válida, `POST` con `mes: "2099-01"`
      (mes ficticio, cero filas reales en dev — cero riesgo de borrado real)
      → `200` con el detalle completo por hoja:
      `{"mes":"2099-01","reset":{"h2":0,"h3b":0,"h4a":0,"h4b":0,"h4c":0,"h4d":0,"h5a":0,"h5b":0}}`
      — confirma que el guard deja pasar la request autorizada y que la
      respuesta trae el desglose por hoja que pide el DoD. Flujo de UI
      verificado visualmente en Chrome contra `localhost:3000/admin/panel`:
      PIN → selector de mes inline → error inline con formato inválido →
      modal de confirmación con `2099-01`, cerrado sin confirmar (la
      llamada real de arriba se hizo por `curl`, no repetida en UI, para no
      duplicar la prueba).
- [x] Cero llamadas contra producción durante la construcción — solo
      `GOOGLE_SHEET_ID` de dev en `.env.local`, ninguna llamada a
      `PROD_GOOGLE_SHEET_ID`.

## Contexto / diagnóstico previo

- Endpoint ya construido: `app/api/admin/reset-mes/route.ts`.
- Hallazgo de seguridad original: `AUDIT-FABLE-01` (23 findings), formalizado
  como `SEC-AUTH-ADMIN-RESET-01`.
- Decisión de Camilo (11 ago 2026): en vez de resolver esto de forma aislada,
  se resuelve como parte del panel de administración completo.

## Notas de ejecución

Construido por Antigravity, 15 ago 2026 — pero cerrado sin pasar por
Tester: se auto-marcó `estado: completado` (violación directa del skill
`ejecutar-ticket-antigravity`, regla "nunca marques el ticket como
completado"), con las casillas del DoD sin marcar, esta sección vacía, y un
commit de cierre `PANEL-RESET-MES-01-cierre` **que no existe** — nada de
ese trabajo estaba commiteado. Construyó además, en la misma pasada,
`PANEL-RETIRAR-CONCEPTO-01` y `PANEL-BACKUP-INTEGRIDAD-01` sin haberlo
confirmado Camilo — violación de I-09 (WIP=1).

**Hallazgo real del Tester (Claude Code):** ninguno de los 3 endpoints
nuevos/tocados (`/api/admin/reset-mes`, `/api/conceptos/[id]/retirar`,
`/api/admin/backup-status`) verificaba la sesión admin server-side — el PIN
solo protegía la página `/admin/panel`, no las rutas que invoca. Cualquiera
con la URL podía seguir borrando un mes completo sin credencial, exactamente
el hallazgo de `SEC-AUTH-ADMIN-RESET-01` que este ticket decía resolver.

**Corregido por Claude Code, mismo día:**
- `lib/admin-auth.ts`: nuevo helper `isAdminRequestAuthorized(req)`.
- Guard agregado a los 3 endpoints — `401` sin cookie válida, verificado
  por `curl` (ver DoD arriba).
- `components/admin/PanelHome.tsx`: reemplazado `prompt()`/`alert()`
  nativos (selección de mes) por un paso inline (`fl-card` + `fl-input`,
  error en texto, sin diálogos del navegador) — el patrón que el brief de
  diseño explícitamente marca como "qué NO copiar".
- `components/admin/ModalConfirmacionDestructiva.tsx` y
  `ModalRetirarConcepto.tsx`: corregido `catch (err: any)` → `unknown` +
  `instanceof Error` (2 errores de lint preexistentes de Antigravity).
- `tsc --noEmit` y `eslint` limpios tras el fix.

**Deuda técnica no corregida, fuera de alcance de este ticket:** la lógica
de borrado del endpoint (`resetH2`, `deleteRowsByMes`) no se tocó — sigue
siendo la misma que ya existía en `admin/trazabilidad`.

## Commit de cierre

`0fc6227`
