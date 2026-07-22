Ejecuta la fase de DIAGNÓSTICO del ticket Tier B indicado como argumento
(`$ARGUMENTS` = ticket_id). Este comando NUNCA escribe código de fix —
solo diagnostica y propone.

1. Lee `tickets/{ticket_id}.md`. Si `estado` no es `aprobado`, DETENTE.
2. Reúne evidencia: lee el código relevante, corre las lecturas de Sheet
   necesarias (dev), reproduce el síntoma si es reproducible.
3. Escribe en el ticket, bajo una sección nueva `## Diagnóstico
   (Tier B — pendiente de aprobación del plan)`:
   - Causa raíz, con hecho/inferencia/especulación distinguidos
     explícitamente.
   - Plan de fix propuesto, con los archivos/funciones que tocaría.
   - Caso de falla a inyectar en la prueba (no solo camino feliz — lección
     de Consultorio Sesión 5: aislar el caso de fallo expone bugs que el
     camino feliz no detecta).
4. Marca `estado: diagnostico_listo` (NO `aprobado` — ese cambio de estado
   lo hace Camilo, no este comando).
5. DETENTE. No implementes nada. Reporta el diagnóstico y espera.

Una vez Camilo apruebe el plan explícitamente (cambia el ticket a
`estado: aprobado_para_fix`), se invoca `/goal-a {ticket_id}` para
ejecutar el fix ya diagnosticado — el fix en sí corre con la misma
disciplina de Tier A (lectura antes/después, HALT si el diff no coincide).
