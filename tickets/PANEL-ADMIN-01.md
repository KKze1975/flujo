---
ticket_id: PANEL-ADMIN-01
orden: 28
estado: completado
tier: B
agente_ejecucion: claude-code
dependencias: ninguna
---

# PANEL-ADMIN-01 — Fundación del panel de administración (vista + autenticación por PIN)

## Goal completo

Construir la base de la que dependen los demás tickets `PANEL-*`: una vista
contenedora `/admin/panel` protegida por un PIN, siguiendo el sistema visual
`fl-*` existente (ver `design-handoff/panel-admin-brief.md`, ya escrito).

Hoy no existe ningún mecanismo de autenticación por PIN en el código (verificado
por grep completo del repo, cero resultados) — esto es superficie nueva, no
reutilización de algo existente.

**Tier B con HALT ya resuelto (aprobado por Camilo, 11 ago 2026)** — se deja el
tier en B porque el patrón de este proyecto es no reclasificar tickets que ya
pasaron por diagnóstico, aunque la decisión esté tomada (ver `DT-M1M4-NULL-01`
como precedente: quedó tier B después de aprobado y construido).

**Decisión aprobada — mecanismo de PIN:**
- **Storage:** variable de entorno nueva `ADMIN_PANEL_PIN` (`.env.local` en dev,
  variable de Vercel en prod) — mismo patrón que `GOOGLE_SHEET_ID`/`CRON_SECRET`,
  nunca hardcodeado (I-04/I-08).
- **Sesión:** cookie firmada (HttpOnly, Secure, SameSite=Strict) tras validar el
  PIN una vez, expiración de 12h — no se re-pide en cada acción del panel.
  Firmada con HMAC usando un segundo secreto nuevo (`ADMIN_SESSION_SECRET`), la
  cookie nunca contiene el PIN en claro. Verificada server-side en cada ruta
  `/admin/panel/*` y en cada endpoint `/api/admin/*` que el panel invoque.
- **Comparación del PIN:** `crypto.timingSafeEqual`, no `===` — evita timing
  attacks, coherente con el estándar de seguridad mínimo que este proyecto ya
  se exige (mismo espíritu que `SEC-AUTH-ADMIN-RESET-01`).
- **Alcance:** Camilo-only, confirmado explícitamente — un solo PIN, sin
  distinción de actor. Angie no tiene acceso al panel.

**No cubre:**
- El contenido de cada tarjeta de acción (reset, retirar concepto, etc.) — cada
  una es su propio ticket `PANEL-*`, dependiente de este.
- Migrar o modificar `admin/trazabilidad` — sigue existiendo tal cual, es
  herramienta de debugging separada, no se fusiona con el panel nuevo.

## Definition of Done

**Fase diagnóstico/diseño (Tier B):**
- [x] Presentado a Camilo con recomendación concreta por cada punto — aprobado
      11 ago 2026 (ver "Decisión aprobada" arriba). Ninguna pregunta abierta
      restante — este ticket ya puede tomarse para construcción directamente
      (`/goal-a PANEL-ADMIN-01`).

**Fase construcción:**
- [x] `tsc --noEmit` limpio.
- [x] `npx graphify update .` — no aplica, `graphify-out/` no existe en este repo.
- [x] `ADMIN_PANEL_PIN` y `ADMIN_SESSION_SECRET` documentadas en `.env.local`
      (dev) — nunca commiteadas, nunca con valor de ejemplo hardcodeado en
      código.
- [x] Vista `/admin/panel` implementada usando las clases `fl-appbar`,
      `fl-topnav`, `fl-card`, `fl-action` del brief de diseño — sin estilos
      inline crudos (patrón explícitamente prohibido, ver brief, sección "Qué
      no copiar").
- [x] Cookie de sesión firmada con HMAC (`ADMIN_SESSION_SECRET`), HttpOnly,
      Secure, SameSite=Strict, expiración 12h — nunca contiene el PIN en claro.
- [x] Comparación del PIN con `crypto.timingSafeEqual`.
- [x] Acceso sin PIN válido → bloqueado, verificado con intento real (PIN
      incorrecto y sin PIN) antes de dar el DoD por cumplido.
- [x] Acceso con PIN válido → panel visible, cookie de sesión persiste 12h,
      verificado que expira correctamente.
- [x] Verificado visualmente contra preview de Vercel (`flujo-git-dev-camilo-s-projects10.vercel.app`,
      tema `t-calido`) — coherencia visual con el resto de la app confirmada
      por screenshot.
- [x] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Sesión de vault, 11 ago 2026: análisis de historial (scripts/, ESTADO.md,
  SESSION_LOG.md) confirmó 6 acciones administrativas sin UI hoy, todas
  resueltas históricamente vía script ad-hoc o edición directa del Sheet.
  Decisión de Camilo: reducir alcance (excluir métricas de Vercel/Google Sheets
  de v1) y proceder con el resto.
- `design-handoff/panel-admin-brief.md` — brief de diseño ya escrito (rol
  Diseñador/Integrador), pendiente de generar el HTML vía Antigravity/Stitch e
  integrarlo.
- Relacionado, no duplicado: `SEC-AUTH-ADMIN-RESET-01` (auditoría
  `AUDIT-FABLE-01`) propone autenticación específica para `reset-mes` — una vez
  este panel exista con PIN, `PANEL-RESET-MES-01` cubre ese mismo objetivo por
  otra vía. Ver nota cruzada en ambos tickets.

## Notas de ejecución

Construido 15 ago 2026 (sesión de vault, root `work/flujo`). Archivos nuevos:
`lib/admin-auth.ts` (firma/verifica cookie HMAC-SHA256 + compara PIN con
`crypto.timingSafeEqual`), `app/api/admin/auth/route.ts` (POST, setea cookie
`flujo_admin_session`), `app/admin/panel/page.tsx` (server component, decide
`PinGate` vs `PanelHome` leyendo la cookie), `components/admin/PinGate.tsx`,
`components/admin/PanelHome.tsx` (grilla con las 6 tarjetas de `PANEL-*`,
deshabilitadas — contenido fuera de alcance de este ticket).

`ADMIN_PANEL_PIN` y `ADMIN_SESSION_SECRET` generados y agregados a
`.env.local` (dev) — no commiteados, no hardcodeados en código. PIN
comunicado a Camilo fuera de este archivo.

Verificado por curl contra dev server local (`npm run dev`, puerto 3000):
- Sin cookie → `PinGate` (contiene "PIN requerido").
- PIN incorrecto → `401`.
- PIN correcto → `200`, `Set-Cookie` con `HttpOnly; Secure; SameSite=Strict;
  Max-Age=43200`.
- Con cookie válida → `PanelHome` (contiene "Resetear mes" y las otras 5
  tarjetas).
- Cookie con `expires` en el pasado (firmada manualmente con el mismo
  secreto) → rechazada, vuelve a `PinGate`. Expiración verificada por
  construcción del payload, no esperando 12h reales.
- Cero llamadas a Sheets/producción — este ticket no toca `IDataProvider`.

Camilo confirmó explícitamente: commit solo con los archivos de este ticket,
push a `dev` para verificación visual en preview de Vercel. Push desplegado
(`Vercel` check `success` sobre `6d7a6ad`), preview en
`flujo-git-dev-camilo-s-projects10.vercel.app`. Verificado por curl (gate de
PIN sirve `200`/"PIN requerido" sin cookie) y visualmente por screenshot en
Chrome: `PinGate` hereda `t-calido`, usa `fl-appbar`/`fl-card`/`fl-input`/
`fl-btn primary`, ícono de candado — coherente con el resto de la app.

Nota: PIN correcto devuelve `401` en el preview porque `ADMIN_PANEL_PIN`/
`ADMIN_SESSION_SECRET` solo existen en `.env.local` (dev), no están
configuradas como env vars de Vercel — paso manual pendiente, fuera de
alcance de este ticket (requiere acceso a Vercel que hoy no está resuelto
para esta sesión, ver North Star.md).

Deuda/decisión abierta que no bloquea este ticket: el árbol de trabajo tenía
cambios sin commitear de una sesión previa (11 ago 2026) al empezar esta
sesión — ver `ESTADO.md`/nota de Camilo. No se mezclaron con el commit de
este ticket; se dejan para que Camilo decida su alcance por separado.

## Commit de cierre

`6d7a6ad` — "Construye PANEL-ADMIN-01: fundación del panel de administración
(PIN)" — pusheado a `origin/dev`, 15 ago 2026.
