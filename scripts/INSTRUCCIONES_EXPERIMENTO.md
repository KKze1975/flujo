# Instrucciones del experimento — Reset Julio

## Cómo correr una captura

Desde PowerShell, en la raíz del proyecto (`D:\Users\camilo\flujo`):

    node scripts/captura-julio.mjs "descripción de lo que acabo de hacer"

Correr UNA captura después de CADA acción en la app, antes de hacer la siguiente.
La descripción debe ser específica: no "cambié algo" sino "moví Entretenimiento de S1 a S2".

## Cuándo capturar

- Después de hacer clic en "activar siguiente mes" → captura 001 (el baseline ya fue generado antes de que inicies; este sería el 002)
- Después de cada cambio de monto en un concepto → captura inmediata
- Después de mover un concepto entre semanas → captura inmediata
- Después de cualquier otra acción que toque el presupuesto → captura inmediata

## Qué mirar en el output

El script imprime en consola el comprometido total y el desglose por semana.
Si un valor cambió inesperadamente, ahí se ve. Los archivos JSON en
`scripts/capturas/` guardan el detalle completo para análisis posterior.

Si una captura muestra una advertencia ("monto_presupuestado no parseable"),
anótala — ese tipo de contaminación fue candidata como causa de los bugs.

## Si algo se ve raro

No sigas. Anota qué viste y cuál fue la última captura.
Trae el número del snapshot a la sesión de Claude Code para analizarlo.

## Primer paso del experimento (después de que Code termine esta sesión)

1. Abre la app — verifica que muestra Junio 2026 como mes activo.
2. Verifica que aparece el botón "activar siguiente mes" apuntando a Julio.
3. Haz clic en el botón.
4. Corre en PowerShell:
   ```
   node scripts/captura-julio.mjs "generé Julio desde el botón activar siguiente mes"
   ```
5. Reporta en Claude Code el output de consola de esa primera captura.

## Estado del Sheet al inicio del experimento

Snapshot 001 (baseline post-reset) — generado el 2026-06-26:
- H2 julio: 0 filas
- H3B julio: 0 filas
- H4 julio: 0 filas
- Comprometido total: $0

## Dónde quedan los archivos

- Capturas: `scripts/capturas/snapshot-NNN-<slug>.json`
- Backup del estado defectuoso previo al reset: `scripts/backup-julio-defectuoso.json`

Ninguno de estos archivos se commitea (están en .gitignore).
