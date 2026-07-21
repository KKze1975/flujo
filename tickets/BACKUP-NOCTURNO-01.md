---
ticket_id: BACKUP-NOCTURNO-01
orden: 1
estado: bloqueado
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

(vacío — bloqueado, no cierra en esta sesión)

## Notas de ejecución

### Implementado

- **`app/api/admin/backup-sheet/route.ts`** — handler `GET` (Vercel Cron invoca
  siempre con `GET`). Protegido con `CRON_SECRET` opcional vía header
  `Authorization: Bearer <secret>` (patrón estándar de Vercel Cron — si la env
  var no está seteada, el endpoint queda abierto para pruebas locales).
  - Fecha del backup calculada en servidor con `Intl.DateTimeFormat` fijado a
    `America/Bogota` — nunca inferida por el cliente ni por IA (HG SDD: dato
    operativo determinista → lo calcula el servidor).
  - Fuente: `process.env.PROD_GOOGLE_SHEET_ID` (nunca `GOOGLE_SHEET_ID`, nunca
    hardcodeado) — mismo patrón ya usado en `scripts/captura-julio.mjs`.
  - Mecanismo: `drive.files.copy({ fileId: prodSheetId, ... })` — copia el
    archivo completo (todas las tabs, fórmulas, formato) en una sola llamada.
    Esta llamada **no modifica el archivo origen**: crea un archivo nuevo
    separado. El código no contiene ninguna llamada `values.update`,
    `values.append` ni `batchUpdate` contra `prodSheetId` — verificable
    leyendo el archivo completo (DoD punto 4).
  - Compartido opcional del backup con `BACKUP_OWNER_EMAIL` (solo lectura,
    `role: reader`) para que Camilo pueda abrirlo en Drive — decisión propia,
    no especificada en el ticket original; documentada aquí como tal. Env var
    no existe todavía en `.env.local` ni en Vercel — pendiente de decisión de
    Camilo (ver bloqueo abajo).
  - Verificación por lectura: compara `H1!A:L` de prod contra el backup recién
    creado (no confía en el código de respuesta HTTP).
  - Limpieza: `drive.files.list` filtrando por nombre `flujo-backup-*`, calcula
    edad parseando la fecha del propio nombre del archivo (no `createdTime` de
    Drive — más determinista y fácil de probar con archivos sintéticos), borra
    los que superan 14 días con `drive.files.delete`.
  - Scope de la credencial: `https://www.googleapis.com/auth/drive` (no solo
    `spreadsheets`) — `files.copy` y `permissions.create` son operaciones de
    Drive, no de Sheets. Coincide con la aclaración del ticket: la restricción
    de solo-lectura-sobre-prod vive en el código (ausencia de llamadas de
    escritura contra `prodSheetId`), no en el scope de la credencial.
- **`vercel.json`** — cron `0 9 * * *` (UTC) = 4:00 a.m. hora Bogotá
  (UTC-5, sin horario de verano) → horario de baja actividad, como pide el
  ticket.
- `tsc --noEmit` limpio.

### Criterio de parada activado — BLOQUEADO

Al invocar el endpoint manualmente contra prod (`GET
http://localhost:3000/api/admin/backup-sheet`, dev server local, sin
`CRON_SECRET` seteado), la llamada `drive.files.copy` devolvió **403
PERMISSION_DENIED**:

```
Error: Google Drive API has not been used in project 986023439689 before
or it is disabled. Enable it by visiting
https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=986023439689
then retry. If you enabled this API recently, wait a few minutes for the
action to propagate to our systems and retry.
```

La service account (`psibot@psibot-495119.iam.gserviceaccount.com`) tiene
scope de Sheets API habilitado (usado en toda la app), pero el proyecto GCP
asociado (`986023439689`) nunca habilitó la **Google Drive API**. Habilitar
una API en Google Cloud Console requiere una sesión humana autenticada con
rol de owner/editor sobre el proyecto — no es algo que pueda resolver desde
este entorno.

No se pudo verificar ningún punto del DoD que dependa de `drive.files.copy`
(puntos 2, 3 parcial —vercel.json sí se verificó—, 5) ni completar la
invocación manual real. `verificarContraProd` y `limpiarBackupsAntiguos`
tampoco corrieron — dependen del `backupId` que nunca se generó.

**DoD verificado hasta el bloqueo:**
- [✓] El endpoint existe, compila (`tsc --noEmit` limpio)
- [✗] Invocado manualmente — falló en el primer paso (`drive.files.copy`), no
      se creó ningún backup
- [✓] `vercel.json` declara el cron `0 9 * * *` UTC (4 a.m. Bogotá)
- [✓] El código no contiene `batchUpdate`/`values.append`/`values.update`
      contra `prodSheetId` — verificable leyendo `route.ts` completo
- [✗] Limpieza de backups >14 días — no probado, depende de `files.list`
      (misma API bloqueada)

**Para desbloquear (acción de Camilo, no de Claude Code):**
1. Habilitar Google Drive API en
   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=986023439689
   (o `gcloud services enable drive.googleapis.com --project=psibot-495119`).
2. Esperar unos minutos a que se propague (mensaje del propio error de
   Google).
3. Decidir si se quiere compartir el backup con `camilovillamil@gmail.com`
   vía `BACKUP_OWNER_EMAIL` (env var nueva, no crítica para el DoD — sin
   ella el backup se crea igual, solo queda sin compartir automáticamente).
4. Retomar con `/goal-a BACKUP-NOCTURNO-01` — el ticket sigue en `estado:
   bloqueado`, no `aprobado`, así que hay que revisar el flag de `/goal-a`
   paso 1 (exige `aprobado`) antes de reinvocar, o ejecutar la verificación
   manualmente.

### Decisión no cubierta por el ticket original

Compartir el backup con el email de Camilo (`BACKUP_OWNER_EMAIL`) no estaba
en el ticket — lo agregué porque el DoD del sexto punto ("Camilo confirma
esto revisando el Sheet ... al día siguiente") implica que Camilo necesita
poder abrir el archivo, y los backups quedan en el Drive propio de la
service account por defecto. Es opcional (`if (ownerEmail)`), no bloquea el
resto del DoD si se deja sin configurar.
