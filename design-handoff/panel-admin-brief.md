# Brief de diseño — Panel de Administración de Flujo

Rol: Diseñador/Integrador (`​.claude/agents/disenador-integrador.md`). Paso 1 de 2 —
este documento es el brief para Antigravity/Stitch. La integración (paso 2) ocurre
cuando Camilo trae de vuelta el HTML/diseño generado.

## Por qué existe este panel

Seis acciones administrativas que hoy solo puede ejecutar un agente vía script de
Node o llamada directa a la API (nunca Camilo desde la app): resetear un mes,
retirar un concepto del catálogo, fusionar conceptos duplicados, revertir un cierre
de semana accidental, ver un log de eventos, y verificar la integridad del backup
nocturno. Detalle completo y evidencia por acción en los tickets `PANEL-*`
(`tickets/PANEL-ADMIN-01.md` y siguientes).

## Flujo to-be

1. **Gate de PIN** — pantalla previa a cualquier contenido del panel. Un solo campo
   numérico, sin label decorativo de más — igual de austero que el resto de Flujo.
   Falla → mensaje de error inline, nunca alert() del navegador. No existe hoy
   ningún mecanismo de PIN en el código — es superficie nueva completa.
2. **Home del panel** (`/admin/panel`) — grilla de tarjetas, una por acción
   disponible, con el mismo lenguaje visual que `HomeHub` (que ya es el patrón de
   "grilla de accesos" del resto de la app — reusar su estructura antes de inventar
   una nueva).
3. **Cada acción abre su propia vista o modal** — las destructivas (reset de mes,
   fusionar duplicados, revertir cierre) exigen confirmación explícita de dos pasos,
   nunca un solo click. Ninguna usa `window.confirm()` — ese patrón ya existe en
   `admin/trazabilidad/page.tsx` pero es exactamente el que NO se debe imitar (ver
   "Qué no copiar" abajo).

## Sistema visual a reusar — NO inventar tokens nuevos

Fuente: `design-handoff/flujo-inline-extracted/flujos-app/project/themes.css`,
ya migrado a `app/globals.css` y en uso en `MesM1`, `VistaSemanal`, `HomeHub`.

**Variables CSS ya definidas** (varían por tema activo — `t-preciso`/`t-vivo`/otro,
la app soporta multi-tema, el panel debe heredar el tema activo, no fijar uno):
`--surface`, `--surface-2`, `--ink`, `--ink-soft`, `--ink-faint`, `--line`,
`--primary`, `--pos`, `--neg`, `--neg-soft`, `--radius-card`, `--radius-inner`,
`--radius-btn`, `--radius-chip`, `--font-display`, `--font-num`, `--font-body`.

**Clases ya construidas, listas para reusar:**
- `.fl-appbar` + `.fl-topnav` + `.fl-back` — cabecera con botón volver, mismo patrón
  que usan todas las vistas internas de la app.
- `.fl-card` — contenedor base de cualquier bloque (usar para cada tarjeta de
  acción en el home del panel).
- `.fl-action` (`.ic` + `.txt .t` + `.txt .d` + `.chev`) — es EXACTAMENTE el patrón
  de "fila de acción con ícono, título, descripción y chevron" que necesita cada
  tarjeta del home del panel. No rediseñar esto, es un calce directo.
- `.fl-metric` — para la tarjeta de integridad de backup (mostrar última fecha
  verificada, cantidad de tabs, como métricas).
- `.fl-row`, `.fl-divider`, `.fl-muted`, `.fl-faint` — para el log de eventos
  (lista de filas con timestamp + descripción).
- `.fl-neg` / `--neg` / `--neg-soft` — para el estado visual de acciones
  destructivas (reset de mes, fusionar/eliminar) — mismo rojo que ya usa la app
  para desviaciones negativas, no un rojo nuevo inventado para "admin".

## Qué NO copiar

`app/admin/trazabilidad/page.tsx` es la única pantalla "admin" que existe hoy y
usa estilos inline crudos (`fontFamily: "sans-serif"`, `border: "1px solid #999"`,
`window.confirm()`) — no toca el sistema `fl-*` para nada. Es una herramienta de
debugging interna, no un precedente de diseño. El panel nuevo NO hereda su
estética ni su patrón de confirmación por `confirm()`.

## Pantallas/componentes a producir

1. `PinGate` — input numérico + validación, tema heredado.
2. `PanelHome` — grilla de `.fl-action` dentro de `.fl-card`, una por acción
   (reset de mes, retirar concepto, fusionar duplicados, revertir cierre, log de
   eventos, integridad de backup).
3. `ModalConfirmacionDestructiva` — genérico, reusado por las 3 acciones
   destructivas, dos pasos (ej. re-escribir el mes/nombre antes de habilitar el
   botón final) — mismo criterio de fricción intencional que ya usa
   `admin/trazabilidad` para el reset (aunque ahí el paso de confirmación sí está
   bien resuelto, solo el estilo visual no).
4. `VistaLogEventos` — lista con `.fl-row`/`.fl-divider`, filtro simple por tipo de
   evento y rango de fecha.
5. `TarjetaIntegridadBackup` — `.fl-metric` con última verificación, tabs
   encontrados, semáforo OK/alerta.

## No cubre

- Contenido/lógica de cada acción (eso vive en el DoD de cada ticket `PANEL-*`).
- Definición del mecanismo exacto de validación del PIN en backend (eso es del
  ticket `PANEL-ADMIN-01`, Tier B, HALT pendiente).
