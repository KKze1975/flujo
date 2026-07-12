# SessionStart hook: inyecta el contexto de entorno que historicamente causo round-trips.
# Lo que salga por stdout se agrega al contexto de la sesion.
@"
Contexto de entorno Flujo (inyectado por hook, verificado 2026-07):
- Shell: PowerShell en Windows Server (WorkSpace). No usar bash para rutas Windows ni heredocs.
- El dev server corre EN ESTA maquina (localhost:3000). El navegador del usuario puede estar
  en otra maquina (Chromebook) — nunca abrir localhost con Start-Process "para que el usuario lo vea".
- Para levantar el dev server: tarea en background nativa, no Start-Process + Start-Sleep.
- Google Sheets es la DB. Antes de tocar un Sheet: declarar DEV vs PRODUCCION y el tab
  (H1..H6 son TABS, no celdas). H4D es legacy: prohibido. Ver skill sheet-safety.
- Leer ESTADO.md antes de actuar. Un solo ticket abierto a la vez (I-09).
- tsc --noEmit limpio antes de cada commit. main protegida: todo via dev.
- Nunca reportar una escritura a Sheet/DB como hecha sin leerla de vuelta como evidencia.
"@
exit 0
