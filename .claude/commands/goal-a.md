Ejecuta el ticket Tier A indicado como argumento (`$ARGUMENTS` = ticket_id).

1. Lee `tickets/{ticket_id}.md`. Si `estado` no es `aprobado`, DETENTE — no
   ejecutes tickets propuestos sin aprobación explícita de Camilo.
2. Verifica que `GOOGLE_SHEET_ID` en `.env.local` apunta al Sheet de DEV
   (`1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`). Si apunta a
   producción, DETENTE — nunca ejecutes un /goal-a contra el Sheet de
   producción sin importar el ticket.
3. Marca `estado: activo` en el archivo del ticket y commitea ese cambio
   solo (`[ticket_id]-inicio: marca activo`).
4. Si el ticket implica escritura en Sheet: lee el rango real ANTES de
   escribir (no asumas el esquema documentado — I-12 extendido a Sheets).
5. Implementa. Corre `tsc --noEmit` — si falla, DETENTE, no uses
   `--no-verify`, documenta el error exacto en el ticket.
6. Si el ticket escribe en Sheet: tras escribir, vuelve a leer el mismo
   rango y compara contra lo esperado (conteo de filas, contenido). Si el
   diff no coincide con el DoD, DETENTE — no continúes ni hagas commit del
   resultado, documenta el diff observado vs. esperado.
7. Si todo el DoD verifica: actualiza el ticket con `estado: completado`,
   commit hash de cierre, notas de ejecución. Commit final:
   `[ticket_id]-cierre: DoD verificado`.
8. Actualiza `tickets/INDICE.md` con el nuevo estado.
9. No crees PR. No mergees. Reporta el resultado y detente — no continúes
   con el siguiente ticket sin que Camilo lo indique.
