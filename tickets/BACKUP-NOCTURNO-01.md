---
ticket_id: BACKUP-NOCTURNO-01
orden: 1
estado: aprobado
tier: A
dependencias: ninguna
---

# BACKUP-NOCTURNO-01 — Backup automático nocturno del Sheet de producción

## Goal completo

Implementar un endpoint de backup del Sheet de producción
(`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`), invocado por **Vercel
Cron**, que copie su contenido completo a un Sheet nuevo, separado,
nombrado `flujo-backup-{YYYY-MM-DD}`, uno por día. El mismo job elimina
backups de más de 14 días de antigüedad. El Sheet de producción nunca
recibe una escritura en ningún punto del proceso.

**No cubre:** restauración automática desde backup, backups de ningún
otro recurso del proyecto (código, env vars, etc.) — solo el Sheet de
producción.

**Mecanismo (cerrado, no queda a criterio de quien ejecute el ticket):**

- Vercel Cron invocando un endpoint propio (`/api/admin/backup-sheet` o
  equivalente) — sin dependencia nueva, ya estás en ese stack.
- Configuración del cron en `vercel.json`, horario nocturno (definir hora
  exacta contra baja actividad de la app — de madrugada, hora Colombia).
- Limpieza de backups >14 días como parte del mismo job, no un ticket
  aparte.

## Definition of Done

**Verificable dentro del mismo loop (`/goal-a`):**

- [ ] El endpoint existe, compila (`tsc --noEmit` limpio).
- [ ] Invocado manualmente una vez durante la sesión, crea
      `flujo-backup-{fecha de hoy}` con contenido que, leído de vuelta,
      coincide con el Sheet de producción al momento de la invocación
      (verificación por lectura, no por código de respuesta HTTP).
- [ ] `vercel.json` declara el cron con el horario correcto — verificado
      leyendo el archivo, no asumido.
- [ ] El código del endpoint no contiene ninguna llamada de escritura
      (`batchUpdate`, `values.append`, `values.update`, etc.) contra el
      Sheet ID de producción — verificable por lectura del código, mismo
      patrón que I-04/I-08. Esta es la restricción real de "solo lectura
      sobre prod": vive en el código, no en el scope de la credencial
      (la service account ya tiene permisos de escritura sobre prod para
      la operación normal de la app; no se modifica ese scope en este
      ticket).
- [ ] Backup de prueba de hace más de 14 días (creado sintéticamente
      para la prueba) se elimina correctamente al correr la limpieza.

**NO verificable dentro del loop — pendiente de confirmación humana al
día siguiente, documentada como tal, no fingida como parte del DoD
automático:**

- [ ] La ejecución nocturna real (disparada por Vercel Cron, no invocada
      manualmente) ocurrió a la hora esperada. Camilo confirma esto
      revisando el Sheet `flujo-backup-{fecha}` al día siguiente — este
      punto queda explícitamente abierto en el ticket hasta esa
      confirmación, el ticket no pasa a `completado` sin ella.

## Contexto / diagnóstico previo

Es el ticket prerrequisito para que cualquier `/goal` futuro pueda tener
autonomía sobre el Sheet de producción — sin un backup verificado,
ningún ticket que escriba en prod puede ejecutarse sin HALT manual, sin
importar su tier. Decidido en sesión de diseño con Camilo, 21 jul 2026.

**Excepción al cierre estándar de `/goal-a`:** este ticket NO pasa a
`estado: completado` al final del loop, aunque los 5 puntos verificables
del DoD pasen. Pasa a `estado: pendiente_confirmacion_humana` — el sexto
punto (ejecución nocturna real) solo lo puede cerrar Camilo, al día
siguiente, cambiando el estado a `completado` manualmente. `/goal-a` debe
reportar esto explícitamente al terminar, no como un fallo sino como el
comportamiento esperado de este ticket en particular.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda
técnica encontrada, criterios de parada activados)
