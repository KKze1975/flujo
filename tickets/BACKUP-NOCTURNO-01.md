---
ticket_id: BACKUP-NOCTURNO-01
orden: 1
estado: aprobado
tier: A
dependencias: ninguna
---

# BACKUP-NOCTURNO-01 — Backup automático nocturno del Sheet de producción

## Goal completo

Implementar un backup automático nocturno del Sheet de producción
(`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`), copiando su contenido a
un Sheet o archivo de respaldo con timestamp, sin modificar el Sheet de
producción en ningún punto del proceso (operación de solo lectura sobre
prod, escritura únicamente en el destino del backup).

**No cubre:** restauración automática desde backup, retención/rotación
de backups antiguos más allá de lo mínimo necesario para que el
mecanismo sea verificable, ni backups de ningún otro recurso del
proyecto (código, env vars, etc.) — solo el Sheet de producción.

## Definition of Done

- [ ] Mecanismo corre de forma automática y programada (cron job, Vercel
      Cron, o GitHub Action — decidir el mecanismo más simple disponible
      en el stack actual, documentarlo en el ticket).
- [ ] El backup generado se puede leer de vuelta y su contenido coincide
      con el Sheet de producción al momento de ejecutarse (verificación
      por lectura, no solo "corrió sin error").
- [ ] Ninguna escritura toca el Sheet de producción.
- [ ] Credenciales de acceso a prod usadas solo para lectura — documentar
      explícitamente qué scope de la service account se usa.

## Contexto / diagnóstico previo

Es el ticket prerrequisito para que cualquier `/goal` futuro pueda tener
autonomía sobre el Sheet de producción — sin un backup verificado,
ningún ticket que escriba en prod puede ejecutarse sin HALT manual, sin
importar su tier. Decidido en sesión de diseño con Camilo, 21 jul 2026.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda
técnica encontrada, criterios de parada activados)
