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

**Mecanismo (rediseñado 22 jul 2026 — cerrado, no queda a criterio de
quien ejecute el ticket):**

- Vercel Cron invocando un endpoint propio (`/api/admin/backup-sheet`).
- El endpoint usa EXCLUSIVAMENTE Sheets API — nunca Drive API:
  1. `spreadsheets.create` — crea un Sheet nuevo, título
     `flujo-backup-{YYYY-MM-DD}`.
  2. `spreadsheets.values.get` sobre cada tab del Sheet de producción.
  3. `spreadsheets.values.update` sobre el Sheet nuevo, un rango por tab,
     con los valores leídos.
  4. El Sheet de producción nunca recibe ninguna llamada de escritura
     en ningún punto — solo `values.get`.
- Tabs a respaldar: **`H1, H2, H3, H4, H5, H5B`** — verificado por
  lectura directa de metadata (`spreadsheets.get`) contra el Sheet de
  producción real el 22 jul 2026, no por la lista de nombres lógicos de
  `CLAUDE.md`/`sheet-safety` (`H3B`, `H4A/B/C`, `H5A`, `H6`). Esos son
  nombres de *tipo de dato* o de rango de columnas dentro de un tab
  físico compartido (p.ej. `H4A`/`H4B`/`H4C` son bloques de columnas
  `A:G`/`I:N`/`P:V` dentro del único tab físico `H4`), no tabs
  independientes — copiar por el nombre lógico literal habría fallado
  en crear tabs vacíos/incorrectos y silenciosamente perdido datos
  reales de `H4`. `H4D` no existe como tab físico (no hay riesgo I-05
  de lectura accidental). `H5A` y `H6` tampoco existen como tabs (el
  cierre semanal vive físicamente en el tab `H5`, y H6 aún no está
  implementado en `lib/data/sheets.ts` — `throw new Error("Not
  implemented yet")`).
- No se copian fórmulas ni formato — solo valores. Aceptable: H1-H6 son
  tablas de datos operativos, no hojas con fórmulas de negocio.
- **Limpieza de backups >14 días: BLOQUEADA por diseño, no implementada
  en este rediseño.** La API de Sheets (`sheets_v4`) no tiene ningún
  método para borrar un archivo de spreadsheet completo — `spreadsheets.
  delete` no existe; borrar un archivo (sea Sheet o cualquier otro tipo)
  es exclusivamente una operación de Drive API (`drive_v3.files.delete`).
  Ningún índice propio mantenido por la app cambia este hecho — un
  índice permite *saber cuáles* backups son viejos, pero no permite
  *borrarlos* sin Drive API. Ver "Notas de ejecución" para la disyuntiva
  completa presentada a Camilo, pendiente de decisión antes de
  implementar cualquier mecanismo de limpieza.

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
      patrón que I-04/I-08.
- [ ] El código no importa ni llama a ningún método de la Drive API
      (googleapis `drive_v3`, `drive.files.*`) — solo `sheets_v4`.
      Verificable por lectura del código y de los imports.
- [ ] El scope de la credencial usado por el endpoint sigue siendo
      exclusivamente `https://www.googleapis.com/auth/spreadsheets` (el
      mismo que ya usa el resto de la app) — sin ampliación.
- [ ] Backup de prueba de hace más de 14 días (creado sintéticamente
      para la prueba) se elimina correctamente al correr la limpieza.
      **BLOQUEADO — ver "Mecanismo" arriba: sin Drive API no existe
      ningún método de Sheets API para borrar un archivo de spreadsheet.
      No verificable ni implementable hasta decisión de Camilo.**

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

---

## Rediseño — 22 jul 2026 (Sheets API only, sin Drive API)

**Anchor-guard de esta sesión:** el prompt de rediseño asumía `estado:
aprobado` vigente; el estado real leído era `estado: bloqueado`
(inalterado desde el commit `320aafa`). Mismatch reportado a Camilo antes
de tocar el archivo — Camilo confirmó por elección explícita: "tratar
este prompt como la aprobación". `estado` se actualiza a `activo` como
parte de este cambio.

### Corrección — lista de tabs

El prompt de rediseño listaba `H1, H2, H3B, H4A/B/C/D, H5A, H5B, H6` como
los tabs a respaldar (nombres lógicos de `CLAUDE.md`/`sheet-safety`).
Verificado por lectura directa de metadata (`spreadsheets.get`, sin
`values.get`, target PRODUCCIÓN) contra el Sheet real antes de escribir
ningún código — los tabs físicos son exactamente:
`H1, H2, H3, H4, H5, H5B` (6 tabs, confirmado por `properties.title` de
cada uno). `H3B`, `H4A`, `H4B`, `H4C`, `H4D`, `H5A`, `H6` no existen como
tabs independientes: son nombres de tipo de dato o rangos de columnas
dentro de tabs físicos compartidos (p.ej. `H4A`/`H4B`/`H4C` son las
columnas `A:G`/`I:N`/`P:V` del único tab `H4`, ver `lib/data/sheets.ts`).
Usar la lista literal del prompt habría creado tabs de backup vacíos con
esos nombres y silenciosamente perdido los datos reales de `H3`, `H4` y
`H5` (el 90%+ del contenido del Sheet). El endpoint reimplementado usa la
lista verificada, no la del prompt.

### Disyuntiva bloqueante — P3, limpieza de backups >14 días

**No hay ninguna forma de borrar un archivo de spreadsheet completo
usando exclusivamente Sheets API (`sheets_v4`).** `spreadsheets.delete`
no existe como método — eliminar un archivo (de cualquier tipo, Sheet
incluido) es exclusivamente una operación de Drive API
(`drive_v3.files.delete`). Esto es independiente de cómo se resuelva el
*listado* de backups viejos: mantener un índice propio (tab "meta",
convención de nombre, lo que sea) resuelve "saber cuáles son viejos"
pero no resuelve "borrarlos" — ese segundo paso siempre requiere Drive
API, sin excepción, con cualquier diseño de índice.

**No implementado. Opciones para que Camilo decida** (ninguna elegida
por iniciativa propia, tal como pide el ticket):

1. **Sin limpieza automática.** Los backups se acumulan indefinidamente
   (uno por día, ~365/año). Costo: nada — Sheets es gratis dentro de
   cuota de Drive normal, y datos H1-H6 son pequeños (no hay costo real
   de almacenamiento en la práctica). Camilo borra manualmente desde
   Drive cuando quiera. Cero superficie de ataque nueva.
2. **Vaciar contenido en vez de borrar el archivo** (`spreadsheets.
   values.clear` sobre backups >14 días, dejando el archivo vacío pero
   existente). Mismo problema de acumulación de archivos en Drive
   (clutter en la lista de archivos), solo evita que tengan datos
   dentro. No parece resolver realmente el problema original.
3. **Ampliar scope a `drive.file`** (no `drive` completo) exclusivamente
   para `files.delete` sobre los backups que la propia app creó.
   Advertencia: **no verificado** si `drive.file` efectivamente cubre
   archivos creados vía Sheets API (`spreadsheets.create`) con la misma
   service account — la documentación de Google describe `drive.file`
   en términos de "archivos creados o abiertos por la app" sin
   confirmar si eso aplica cuando la creación ocurrió por el endpoint de
   Sheets API en vez del de Drive API. Habría que probarlo empíricamente
   antes de confiar en él. Además, reintroduce exactamente el tipo de
   dependencia (scope de Drive) que este rediseño buscaba eliminar —
   aunque acotado, no es el mismo "cero Drive API" que pedía la decisión
   de Camilo del 22 jul.
4. **Cron separado, tier C, 100% manual** que Camilo ejecuta o aprueba
   caso por caso para borrar backups viejos vía Drive UI o un script
   `node scripts/*.mjs` con scope Drive ejecutado bajo su propia sesión
   — nunca vía endpoint automático ni credencial de producción de la
   app.

**Recomendación no vinculante:** opción 1 (sin limpieza automática) es
la que más se alinea con la decisión original de Camilo de eliminar
Drive API por completo — el volumen real (~365 archivos/año, datos
pequeños) no parece justificar reabrir la superficie de ataque para
resolver un problema de "orden" más que de costo o seguridad. Pero es
decisión de Camilo, no implementada por iniciativa propia.

### Bloqueo nuevo, más severo — descubierto en P4 (invocación manual real)

Con el código reimplementado (`route.ts`, solo Sheets API, scope
`spreadsheets` sin ampliar) corriendo contra el dev server local,
`GET /api/admin/backup-sheet` devolvió **500**. Log exacto del server
(`next dev`):

```
⨯ Error: The caller does not have permission
    at async crearBackup (app\api\admin\backup-sheet\route.ts:49:15)
    at async GET (app\api\admin\backup-sheet\route.ts:123:20)
...
    status: 403,
    [cause]: {
      message: 'The caller does not have permission',
      code: 403,
      status: 'PERMISSION_DENIED',
    }
```

Falla en `sheets.spreadsheets.create` — el primer paso del mecanismo
rediseñado, no la limpieza. Diagnóstico aislado con script standalone
(mismo error, cuerpo completo):

```json
{"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}
```

**Causa raíz (verificada contra documentación pública, no asumida):**
desde el 1 jun 2023 Google asigna **0 GB de cuota de almacenamiento de
Drive** a service accounts sin Google Workspace asociado — y esto
bloquea la creación de *cualquier* archivo respaldado por Drive
(Sheets, Docs, Slides) sin importar si la llamada se hace vía Sheets
API o Drive API, salvo que el archivo se cree dentro de una Shared
Drive (requiere Workspace de pago) o el service account impersone a un
usuario real con cuota vía domain-wide delegation (también requiere
Workspace — no disponible con una cuenta Gmail personal como
`camilovillamil@gmail.com`). `psibot@psibot-495119.iam.gserviceaccount.com`
es un service account de proyecto GCP estándar sin Workspace asociado
— exactamente el caso que produce este bloqueo.

**Esto invalida `spreadsheets.create` como mecanismo, no solo la
limpieza.** El rediseño "Sheets API only" resuelve la restricción de
scope (I-05 y la decisión de eliminar Drive API), pero choca con una
restricción distinta e independiente: crear un archivo nuevo, sin
importar la API usada, requiere que *alguien* con cuota lo posea.

**Opción de rediseño candidata, NO implementada — decisión de Camilo:**
en vez de "un Sheet nuevo por día", usar **un único Sheet contenedor,
creado una sola vez manualmente por Camilo** (vía Drive UI, igual que
el Sheet de producción) y compartido con el service account como
Editor. El endpoint entonces:
- Crea un **tab nuevo** dentro de ese archivo por cada
  `{tabProd}_{fecha}` (ej. `H1_2026-07-22`) vía `batchUpdate`
  (`addSheet`) — esto SÍ es 100% Sheets API y NO requiere cuota de
  Drive del service account, porque el archivo contenedor ya existe y
  no le pertenece a él.
- La limpieza >14 días se vuelve `batchUpdate` (`deleteSheet`) sobre
  los tabs viejos — también 100% Sheets API, sin Drive API. **Esto
  resolvería el bloqueo de P3 de paso**, como efecto colateral de
  resolver este bloqueo nuevo.
- Costo: un paso manual único de setup (Camilo crea+comparte un Sheet,
  nueva env var `BACKUP_SHEET_ID`), y hasta 6 tabs/día × 14 días = 84
  tabs en el peor caso — dentro del límite práctico de Sheets API.

No implementado por iniciativa propia — es un cambio de arquitectura
respecto al Goal original ("un Sheet nuevo, separado... uno por día"),
no una corrección de detalle como la lista de tabs. Pendiente decisión
de Camilo antes de tocar código otra vez.

**`estado` revertido a `bloqueado`** — ningún backup real se pudo crear
en esta sesión (el DoD punto 2, invocación manual, no pasó). El
`estado: activo` de la aprobación inicial de esta sesión no se sostiene
frente a este hallazgo.
