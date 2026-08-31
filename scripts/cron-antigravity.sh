#!/usr/bin/env bash
# Wrapper del cron de Antigravity (Coder) para Flujo.
#
# Diseñado para correr fuera de una sesión de Claude Code — el propio
# clasificador de Auto Mode de Claude Code bloquea `--dangerously-skip-
# permissions` por diseño (verificado en vivo, 16 ago 2026), así que este
# script lo instala y corre Camilo (crontab de su máquina), nunca Claude
# Code. Ver ARQUITECTURA_MULTIAGENTE.md §12.16 del vault para el diseño
# completo y el marco de límites que este script implementa.
#
# Defensa en profundidad: los gates de abajo son deterministas y corren
# ANTES de invocar al agente — no dependen de que el propio agente se
# autolimite. Un solo ticket por corrida (I-09/WIP=1), nunca hace loop
# interno — la cadencia la da el scheduler externo (cron/systemd), no
# este script.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

LOG="$DIR/scripts/cron-antigravity.log"
PAUSE_FLAG="$DIR/scripts/.cron-antigravity-pausado"

log() { echo "$(date -Iseconds) $*" >>"$LOG"; }

# 1. Kill switch manual, sin tocar crontab ni matar procesos:
#      touch scripts/.cron-antigravity-pausado   # pausa
#      rm scripts/.cron-antigravity-pausado       # reanuda
if [ -f "$PAUSE_FLAG" ]; then
  log "PAUSADO manualmente ($PAUSE_FLAG existe) — no se hace nada."
  exit 0
fi

# 2. Informativo, NO bloqueante (decisión de Camilo, 16 ago 2026) — commits
#    de cierre fabricados (incidente real, ver ARQUITECTURA_MULTIAGENTE.md
#    §12.13 "Corrección posterior"). --audit-cierres escanea TODO el
#    historial, no solo cierres nuevos — con 6 tickets viejos ya conocidos
#    y aceptados como baja prioridad (ver ESTADO.md), bloquear en base a
#    esto pausaría el cron para siempre sin que hubiera nada nuevo que
#    revisar. Se loguea igual, por si aparece un caso nuevo, pero no pausa.
node scripts/check-ticket.mjs --audit-cierres >>"$LOG" 2>&1 || log "AUDIT-CIERRES: hay sospechosos (ver arriba) — informativo, no pausa el cron."

# 3. Circuit breaker — ticket "pendiente de Tester" sin Tester despachado
#    (§12.15). Redundante con el WIP=1 del paso 5, pero explícito.
if ! node scripts/check-ticket.mjs --audit-tester-gate >>"$LOG" 2>&1; then
  log "AUDIT-TESTER-GATE sospechoso — pausando el cron hasta revisión manual."
  touch "$PAUSE_FLAG"
  exit 1
fi

# 4. Circuit breaker — cualquier ticket no terminal con un HALT disparado
#    (necesita_aprobacion: alta, §12.12). El cron nunca decide un HALT por
#    su cuenta — se detiene y espera a Camilo.
if grep -l "necesita_aprobacion: alta" tickets/*.md >/dev/null 2>&1; then
  log "HALT activo en al menos un ticket — pausando el cron hasta revisión manual."
  touch "$PAUSE_FLAG"
  exit 1
fi

# 5. ¿Hay ticket listo para Antigravity ahora mismo? (WIP=1, dependencias,
#    Tier B con HALT resuelto — todo ya evaluado por check-ticket.mjs.)
NEXT_OUTPUT="$(node scripts/check-ticket.mjs --next antigravity 2>&1 || true)"
if ! echo "$NEXT_OUTPUT" | grep -q "Siguiente ticket para"; then
  log "Nada listo para antigravity ahora: $(echo "$NEXT_OUTPUT" | tr '\n' ' ')"
  exit 0
fi

TICKET_ID="$(echo "$NEXT_OUTPUT" | grep -oP '(?<=Siguiente ticket para "antigravity": )[A-Z0-9-]+')"
if [ -z "$TICKET_ID" ]; then
  log "No se pudo parsear el ticket_id de la salida de --next: $NEXT_OUTPUT"
  exit 1
fi

log "Despachando Antigravity para $TICKET_ID"

# 6. Invocación real — un ticket, timeout acotado, sandbox + skip-permissions.
#    check-ticket.mjs <ID> puntual (paso 3 del skill) queda como defensa en
#    profundidad DENTRO del propio prompt, no confía solo en el --next de
#    arriba por si el estado cambió entre el paso 5 y este.
timeout 20m agy -p "Ejecuta el ticket $TICKET_ID siguiendo el skill ejecutar-ticket-antigravity — ya confirmado como tu próximo ticket vía check-ticket.mjs --next antigravity. Corré igual el paso 1 y 3 del skill (defensa en profundidad) antes de tocar código. Nunca marques el ticket como completado — eso lo hace el Tester." \
  --dangerously-skip-permissions \
  --sandbox \
  --mode accept-edits \
  --output-format text \
  --print-timeout 15m \
  >>"$LOG" 2>&1

log "Corrida de $TICKET_ID terminada — ver log arriba para detalle."
