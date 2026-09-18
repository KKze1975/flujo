---
ticket_id: SEC-EXPOSICION-PUBLICA-01
orden: 36
estado: propuesto
tier: B
agente_ejecucion: claude-code
dependencias: ninguna
rol_activo: manager
necesita_aprobacion: alta
halt_criterio: 7
---

# SEC-EXPOSICION-PUBLICA-01 — Cerrar la exposición pública de la app (toda la superficie, no solo `/api/admin/*`)

> **Estado: `propuesto` — NO aprobado para construir.** Este ticket documenta el
> diagnóstico y las opciones; la elección entre (A), (B) y (C), y la autorización
> de la mitigación (D), son decisión exclusiva de Camilo. Ningún Coder debe
> tomarlo hasta que pase a `aprobado`. `halt_criterio: 7` — ticket nuevo abierto
> sin autonomía declarada.

## Goal completo

La app está publicada en internet sin ninguna capa de identidad. Cualquiera con la
URL (`flujo-dun.vercel.app` y las otras tres, incluida la vista previa de `dev`)
lee los datos financieros reales de la familia y —por lectura de código— puede
además escribir en la hoja: crear conceptos, ejecutar/posponer movimientos,
registrar consumos, cerrar semanas y sobrescribir ingresos y saldos. La
verificación completa, con evidencia, está en `ESTADO.md`, entrada del 11 sept
2026.

El objetivo es cerrar esa exposición: que un visitante sin credencial no pueda
leer ni escribir nada de la app, sin romper el uso diario de Camilo y Angie desde
el móvil ni las dos rutas de cron.

**No cubre:**
- La visibilidad del repo en GitHub. Decisión ya tomada por Camilo el 11 sept
  2026: **se queda público por ahora**, como riesgo aceptado y explícito (ver
  `ESTADO.md`, misma entrada). Fuera del alcance de este ticket.
- Rediseñar el modelo de identidad a usuarios/roles reales (Camilo vs. Angie vs.
  invitado). Este ticket busca cerrar la puerta, no modelar actores — si la opción
  elegida obliga a distinguir actores, eso es un ticket aparte.
- Los 2 hallazgos menores de `PANEL-LOG-EVENTOS-01` (race condition en purga,
  `ensureH9` sin reparación de headers) — deuda ya documentada, sin relación.
- Investigar si hubo acceso real. No hay instrumentación de lecturas; decidir si
  vale la pena investigarlo es una pregunta abierta para Camilo, no parte de este
  alcance.

## Definition of Done

**Fase diagnóstico (Tier B) — cerrada, sin fix propuesto:**
- [x] Inventario completo de las 26 rutas de `app/api/**/route.ts` y las 2 páginas
      de `app/admin`, por método, con mecanismo de identidad, lectura/escritura y
      hoja afectada — tabla completa en `ESTADO.md`, entrada del 11 sept 2026.
- [x] Exposición de lectura confirmada con `curl` (solo `GET`) contra
      `flujo-dun.vercel.app`: 16 rutas en 200 sin sesión, 2 en 401.
- [x] Confirmado que no existe `middleware.ts` ni `proxy.ts` (Next.js 16.2.6
      renombró la convención `middleware` → `proxy`).
- [ ] **HALT — Camilo elige entre (A), (B) y (C), y decide si se aplica (D)
      mientras tanto.** Sin esa decisión no se construye nada.

**Fase construcción (solo tras aprobación explícita) — DoD ejecutable,
verificable por un tercero:**
- [ ] `curl -s -o /dev/null -w '%{http_code}' https://flujo-dun.vercel.app/api/ingresos/camilo/2026-08`
      sin ninguna cookie ni cabecera → **401** (o 302 a una pantalla de login, si
      la opción elegida es de plataforma). Hoy: 200.
- [ ] Lo mismo, con el mismo resultado, para: `/api/conceptos`, `/api/meses`,
      `/api/mes/2026-08`, `/api/mes/2026-08/saldos`, `/api/mes/2026-08/semana/S1`,
      `/api/mes/2026-08/consumos/S1`, `/api/ingresos/angie/2026-08`.
- [ ] Lo mismo para las páginas renderizadas server-side, que hoy sirven los datos
      dentro del HTML: `/`, `/meses`, `/mes/2026-08`, `/mes/2026-08/semana`,
      `/registro`, `/admin/trazabilidad`.
- [ ] Mismo resultado contra la vista previa de `dev`
      (`flujo-git-dev-camilo-s-projects10.vercel.app`) — hoy está tan abierta como
      producción.
- [ ] Las rutas de escritura quedan cerradas, verificado **sin ejecutar la
      escritura**: una llamada sin credencial debe cortarse en la verificación de
      identidad y devolver 401 **antes** de tocar la hoja. Prueba admitida: contra
      el ambiente de **dev**, con un `mes` sintético inexistente (patrón ya usado
      en `TICKET-B-GUARDIA-01` y `PANEL-RETIRAR-CONCEPTO-01`), confirmando por
      lectura de la hoja que no se creó ni modificó ninguna fila. Cero llamadas de
      escritura contra producción.
- [ ] El cron sigue funcionando: la corrida siguiente de
      `/api/admin/backup-sheet` (`0 9 * * *`) y de `/api/cron/uber-parser`
      (`0 11 * * *`) se ve **exitosa en los logs de Vercel**, con evidencia pegada
      (no "debería seguir funcionando"). Vercel invoca el cron con `GET` contra la
      URL de producción y manda `CRON_SECRET` en la cabecera `Authorization`
      (documentación de Vercel, "Securing cron jobs") — cualquier capa nueva debe
      dejar pasar ese caso, o usar el mecanismo de bypass que corresponda a la
      opción elegida.
- [ ] `CRON_SECRET` deja de ser fail-open: el patrón actual `if (cronSecret) {…}`
      pasa a `if (!cronSecret || header !== …) return 401` (el patrón exacto que
      recomienda la documentación de Vercel). Verificado con una llamada sin
      cabecera → 401, **sin ejecutar el job**.
- [ ] Camilo entra desde su móvil, ve el mes y registra un gasto de prueba en dev
      — confirmado por él, no inferido.
- [ ] Angie entra desde su móvil y registra un ingreso de prueba en dev —
      confirmado por ella, no inferido. **Este ítem es el que más restringe la
      elección de opción**: ver (A) abajo.
- [ ] `ADMIN_PANEL_PIN` rotado en todos los ambientes (el valor anterior quedó
      transcrito en claro en `ESTADO.md`, archivo de un repo público — debe
      considerarse quemado), y resuelta la discrepancia
      `ADMIN_SESSION_SECRET` (código) vs. `ADMIN_SESSION_KEY` (Vercel), con las
      dos variables presentes en **Production**, no solo en Preview.
- [ ] `npx tsc --noEmit` limpio (I-07).
- [ ] Si la opción elegida agrega env vars nuevas: declarado explícitamente que se
      propagaron al ambiente de Vercel correspondiente, verificado en Vercel — no
      solo en `.env.local` (candidato a invariante del 16 ago 2026, ya con dos
      incidentes a favor).
- [ ] Decisión sobre `public/kanban.html` aplicada y verificada (ver sección
      propia abajo).
- [ ] Merge a `main` solo con sign-off explícito de Angie como QA approver (I-17)
      y vía PR desde `dev` (I-11).

## Opciones evaluadas — sin elegir

### (A) Protección de despliegues de Vercel (sin tocar código)

Se activa en Settings → Deployment Protection del proyecto.

- **Qué cubre según la documentación oficial** (verificado el 11 sept 2026, no de
  memoria): *"Vercel Authentication: Restricts access to only Vercel users with
  suitable access rights. **Available on all plans**"*. Las otras dos —Password
  Protection y Trusted IPs— son de Enterprise (password, además, como add-on de
  pago en Pro): **no están disponibles en Hobby**.
- **¿Alcanza el dominio de producción? Dato en conflicto en la propia
  documentación de Vercel, y no lo puedo resolver desde aquí:**
  - La página `/docs/deployment-protection` (última actualización 28 ago 2026)
    dice: *"On the Hobby plan, Vercel Authentication with Standard Protection is
    available. This protects your preview deployments and deployment URLs, but
    your production domain remains publicly accessible. To protect production
    domains, you need a Pro or Enterprise plan."* Y lista **All Deployments** como
    *"Available on Pro and Enterprise plans"*.
  - El changelog del **9 sept 2026** (dos días antes de este ticket) dice lo
    contrario: *"Vercel Authentication can now protect all deployments in a
    project, including production, at no additional cost on every plan."*
  - **Conclusión honesta:** el changelog es posterior a la página de docs, así que
    lo más probable es que en Hobby ya se pueda proteger producción — pero es un
    conflicto no resuelto en la fuente. **Se confirma mirando el selector real en
    Settings → Deployment Protection del proyecto** (si aparece "All Deployments"
    seleccionable, está disponible). Esa comprobación no se hizo en esta sesión:
    el despacho prohibía tocar configuración de Vercel. Si resulta que en esta
    cuenta solo hay "Standard Protection", **la opción (A) no cierra el hueco**,
    porque `flujo-dun.vercel.app` es el dominio de producción — que es justamente
    donde están los datos reales.
- **Impacto en el acceso de Angie — es el punto crítico.** Con Vercel
  Authentication, *"Visitors must sign in with a Vercel account that has access to
  the project"*. Angie tendría que (i) crear cuenta en Vercel y pedir acceso —
  pero la documentación dice *"Those on the Hobby plan can only have one external
  user per account"* (le alcanza para ella sola, no para nadie más), o (ii) entrar
  por un **Shareable Link**, teniendo en cuenta que *"The authentication token
  sent as a cookie is restricted to one URL and isn't transferable"*. En cualquier
  caso es fricción nueva en el uso diario desde el móvil, no transparente.
- **Impacto en el cron:** la documentación advierte que *"Deployment Protection
  requires authentication for all requests"*. No encontré en la documentación leída
  una frase que confirme que las invocaciones de cron de la propia Vercel quedan
  exentas — **no lo puedo afirmar**. El mecanismo previsto para este caso es
  *Protection Bypass for Automation* (cabecera `x-vercel-protection-bypass`), pero
  el cron lo dispara Vercel, no nosotros, así que no podemos agregarle la cabecera.
  **Riesgo concreto: activar (A) podría dejar el backup nocturno y el parser de
  Uber devolviendo 401 en silencio** — hay precedente exacto de ese modo de falla
  en este proyecto (28 ago: env vars solo en Preview, panel roto sin error
  visible). Si se elige (A), el DoD del cron de arriba deja de ser una formalidad.
- **A favor:** es lo único que cierra el hueco **hoy mismo**, sin escribir una
  línea de código, y cubre también las páginas SSR y `kanban.html` de un solo
  golpe.

### (B) Autenticación propia en la app

Un `proxy.ts` en la raíz (Next.js 16 renombró `middleware` → `proxy`; corre en
runtime Node por defecto, así que el HMAC de `lib/admin-auth.ts` funciona ahí) con
un `matcher` sobre `/api/:path*`, `/admin/:path*` y las páginas que renderizan
datos (`/`, `/meses`, `/mes/:path*`, `/registro`), que exige una cookie de sesión
válida y deja pasar explícitamente `/api/cron/:path*`, `/api/admin/backup-sheet`
(gateados por `CRON_SECRET`, corregido a fail-closed) y la ruta de login.

- **Reuso de `lib/admin-auth.ts`:** el mecanismo ya existe y está probado —
  cookie HMAC firmada, HttpOnly/Secure/SameSite=Strict, 12h,
  `crypto.timingSafeEqual`. Lo que hoy protege solo el panel admin puede
  generalizarse a una sesión de app. **Decisión de producto abierta:** ¿un solo
  PIN compartido para toda la familia (barato, pero borra la distinción de actor
  que la app ya usa para Camilo/Angie), o un PIN por persona? No lo resuelvo yo.
- **Advertencia de la documentación de Next.js, aplicable aquí:** *"Always verify
  authentication and authorization inside each Server Function rather than relying
  on Proxy alone"* — un `matcher` mal escrito, o un refactor que mueva una ruta,
  quita la cobertura en silencio. Si se elige (B), el DoD de arriba (probar ruta
  por ruta, no "confiar en el matcher") es el control que evita ese error
  silencioso.
- **A favor:** transparente para Angie (entra una vez, 12h), no depende del plan
  de Vercel, protege igual producción y preview, y no interfiere con el cron.
  **En contra:** hay que construirlo y verificarlo; mientras tanto la exposición
  sigue abierta. Riesgo de PIN forzable por fuerza bruta si no se agrega límite de
  intentos —hoy `/api/admin/auth` no tiene ninguno—; esa carencia no es teórica,
  el endpoint de login quedaría expuesto a internet igual que hoy.
- **Sobre tier y agente:** por la regla del Arquitecto, un ticket cuyo criterio
  textual es "autenticación" corresponde a `claude-code`, no a Antigravity — de ahí
  el `agente_ejecucion` del frontmatter (mismo criterio que `PANEL-ADMIN-01`).

### (C) Combinación

(A) ahora como contención inmediata, (B) después como solución estable, y al
terminar (B) se decide si (A) se mantiene como segunda capa o se retira.

- **A favor:** corta la exposición hoy sin esperar a que se construya nada.
- **En contra:** hereda los dos riesgos de (A) durante la ventana intermedia —
  posible 401 del cron y fricción para Angie— y exige recordar la decisión
  pendiente al final. Ojo con una trampa documentada: *"Disabling Vercel
  Authentication renders all existing deployments unprotected"* — apagar (A) al
  final es instantáneo y total, así que solo debe apagarse con (B) ya verificado.

### (D) Mitigación inmediata mientras se construye

Cosas que se pueden apagar ya, sin romper el uso diario. Ninguna se ejecutó:

1. **Proteger la vista previa de `dev`** (`flujo-git-dev-…`) con Vercel
   Authentication en modo Standard Protection: según la documentación, Standard
   Protection *"Protects all deployments **except** production domains"* y está
   disponible en todos los planes. Cubre preview sin tocar producción, y **sin
   riesgo para el cron**, porque el cron corre contra el despliegue de producción
   (*"Vercel makes an HTTP GET request to your project's production deployment
   URL"*). Camilo y Angie no usan el preview a diario. **Es la mitigación de menor
   costo y menor riesgo de las cuatro.**
2. **`CRON_SECRET` a fail-closed** en las dos rutas (cambio de 2 líneas): no
   reduce la exposición principal, pero quita la dependencia silenciosa de que la
   env var exista.
3. **Quitar `public/kanban.html`** del despliegue (ver abajo).
4. **Sacar `/admin/trazabilidad` de producción** o ponerlo detrás de la misma
   sesión que `/admin/panel`: hoy es una página pública con un botón "Reset
   completo". El botón ya está cerrado en el servidor (`/api/admin/reset-mes`
   responde 401 sin sesión), así que el riesgo real es de exposición de datos y de
   confusión, no de destrucción — pero es la superficie más llamativa para quien
   encuentre la URL.

**Lo que la mitigación no puede hacer:** nada de esto cierra la lectura y escritura
anónima sobre el dominio de producción. Solo (A) con alcance "All Deployments" —si
está disponible en esta cuenta— o (B) construido logran eso.

## Qué hacer con `public/kanban.html`

Hoy se sirve público (200, 63 KB) y publica el backlog interno, con textos de deuda
del tipo "requiere autenticación real — post go-live" — es un mapa de dónde
apuntar. Opciones, sin elegir:

1. **Sacarlo del directorio público** y dejarlo como artefacto local
   (`tickets/kanban.html`, ignorado por git o no): `scripts/generate-kanban.mjs`
   cambia de destino, y Camilo lo abre desde el disco. Es la opción que más
   superficie quita y no afecta a nadie más, porque el tablero es de uso interno.
2. **Dejarlo donde está**, si queda cubierto por la opción (A)/(B) elegida: cuando
   toda la app exige sesión, el archivo estático también. Nota: si la cobertura
   resulta ser solo Standard Protection, en producción seguiría público.
3. **Dejar de generarlo.** Hoy `CLAUDE.md` lo pide como paso después de cada
   trabajo de tickets; si se retira, hay que actualizar esa instrucción en el mismo
   cambio, o el paso queda apuntando a un archivo fantasma.

En cualquier caso: el archivo ya está en el historial de un repo público. Quitarlo
del despliegue reduce la exposición en vivo, no la histórica — coherente con el
riesgo ya aceptado sobre la visibilidad del repo.

## Contexto / diagnóstico previo

- `ESTADO.md`, entrada del **11 sept 2026** — evidencia completa: tabla de `curl`
  (solo `GET`), inventario de las 26 rutas y las 2 páginas admin, hallazgos
  adicionales (cron fail-open, login sin rate limiting, PIN quemado en un archivo
  público) y la decisión de Camilo sobre la visibilidad del repo como riesgo
  aceptado.
- `SEC-AUTH-ADMIN-RESET-01` (orden 9, `propuesto`) — mismo problema, alcance
  limitado a un endpoint. Enunció el principio que este ticket generaliza: *"todo
  endpoint nuevo declara su política de acceso antes de cerrar el ticket — 'sin
  autenticación' es válido solo si es consciente, no una omisión"*. Nunca se
  promovió a invariante. **Pregunta para Camilo:** ¿se absorbe en este ticket y se
  marca `descartado`, o sigue vivo por separado? Su estado final ya estaba
  pendiente de decisión desde el 15 ago.
- 15 ago 2026 — el Tester encontró que los 3 endpoints nuevos del panel no
  verificaban sesión server-side; se corrigió con `isAdminRequestAuthorized()` y la
  regla se movió a `coder.md`. Ese arreglo cubrió `/api/admin/*` y solo eso; los
  cierres posteriores registraron "Seguridad: sin pendientes abiertos" sin que
  nadie revisara el resto de la superficie.
- Documentación consultada el 11 sept 2026: `/docs/deployment-protection`,
  `/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication`,
  `/docs/cron-jobs` y `/docs/cron-jobs/manage-cron-jobs` de Vercel; y
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
  + `.../02-guides/authentication.md` de Next.js 16.2.6.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena el agente de ejecución al cerrar: decisiones tomadas, deuda
técnica encontrada, criterios de parada activados)
