---
ticket_id: UBER-03
orden: 14
estado: completado
tier: A
dependencias: ninguna
---

# UBER-03 — Migración de Fondo transporte a pago_fraccionado

## Goal completo

`TRANSPORTE_1748100037` cambia de tipo: `fijo` / `semana_default: S4` a
tipo: `pago_fraccionado` con seguimiento semanal. Monto sin cambio
($350.000). Requiere el mismo cambio de esquema en Sheet dev y prod (I-10)
antes de mergear.

Puede construirse en paralelo a `UBER-01` — no depende del parser de Uber.

## Definition of Done

- [x] Cambio aplicado y verificado en Sheet dev.
- [x] Cambio aplicado y verificado en Sheet prod (I-10) — completado en
      sesión posterior (27 jul 2026, durante `UBER-04`), ver Notas de
      ejecución.
- [x] Bolsillo Transporte con seguimiento correcto — verificado no por
      preview URL visual (Claude-in-Chrome seguía sin poder conectarse al
      Workspace correcto), sino por evidencia funcional más fuerte: 17
      consumos reales de Uber de julio 2026 escritos en H3 prod durante
      `UBER-04`, con `mes`/`semana` calculados correctamente — lo cual
      solo funciona si H1 prod ya reconoce el concepto como
      `pago_fraccionado`.

## Contexto / diagnóstico previo

Prepara el terreno para `UBER-04` (parser Uber → H3B), pero es
independiente en construcción y puede cerrarse antes de que exista el
parser.

## Commit de cierre

`UBER-03-parcial: dev aplicado y verificado, prod y preview pendientes`
(ver historial de `dev`) — parte prod aplicada directamente vía script
puntual en sesión de `UBER-04` (27 jul 2026), sin commit propio (fue una
escritura de datos en Sheet, no un cambio de código).

## Notas de ejecución

**Decisión de diseño resuelta en sesión de chat, no asumida:** el ticket
mencionaba "seguimiento semanal" sin especificar si `frecuencia` debía
cambiar a `"semanal"`. Verifiqué contra código real
(`app/api/mes/[mes]/iniciar/route.ts:123-126`) que `frecuencia: "semanal"`
genera **4 movimientos, cada uno con el monto completo** (no dividido) —
cambiarlo habría inflado el presupuesto de $350.000 a $1.400.000/mes,
violando "Monto sin cambio" del propio ticket. `frecuencia` se dejó en
`"mensual"`.

Para `semana_default`, encontré 2 precedentes reales ya activos en H1 dev
con `tipo: pago_fraccionado` + `frecuencia: mensual`: "Mercado mensual" y
"Frida", ambos con `semana_default: S1`. Presenté esto a Camilo, quien
confirmó seguir ese precedente en vez de dejarlo en `S4` o usar
`variable` (ninguno de los dos con precedente real).

**Cambio aplicado y verificado en H1 dev** (lectura antes/después, no solo
código de respuesta):
```
Antes:   tipo=fijo,            semana_default=S4
Después: tipo=pago_fraccionado, semana_default=S1
```
`frecuencia: mensual` y `monto_referencia: 350000` sin cambio, confirmado
en la misma lectura.

**Bloqueo de verificación (no relacionado a este cambio):** al intentar
verificar el bolsillo en preview URL, el dev server preexistente (PID
9576, no levantado por esta sesión) devolvía 500 en todas las rutas,
incluida la home. Su log (`.next/dev/logs/next-development.log`) muestra
`"Jest worker encountered 2 child process exceptions, exceeding retry
limit"` — crash del worker de Turbopack por tiempo de actividad, no un
error introducido por este cambio (que solo tocó datos de Sheet, cero
código). Camilo pidió no tocar ese proceso; la verificación visual queda
pendiente de que él la haga manualmente.

**Diferido explícitamente:** escritura en Sheet de producción — instrucción
previa de Camilo en esta misma sesión ("solo dev por ahora, prod después
por separado"). Este ticket no cierra como `completado` hasta que ese paso
y la verificación visual se completen.

Cero cambios de código. Única escritura: 2 celdas (`tipo`, `semana_default`)
en la fila de `TRANSPORTE_1748100037`, H1 dev.

**Cierre de la parte prod (27 jul 2026, sesión de `UBER-04`):** Camilo
autorizó explícitamente escribir en producción. Se leyó primero el estado
real de H1 prod (confirmando `tipo: fijo`, `semana_default: S4`, idéntico
al estado pre-migración de dev), y se aplicó el mismo cambio de 2 celdas,
verificado por lectura antes/después:
```
Antes:   tipo=fijo,             semana_default=S4
Después: tipo=pago_fraccionado, semana_default=S1
```
`frecuencia: mensual` y `monto_referencia: 350000` sin cambio. Sin esto,
los consumos de Uber escritos por `UBER-04` en H3 prod habrían quedado
huérfanos (bolsillo no reconocido como `pago_fraccionado`) o mal
contabilizados en la UI real. Camilo confirmó que el cliente OAuth2 de
Gmail (`GMAIL_CLIENT_ID`/`SECRET`/`REFRESH_TOKEN`) ya está configurado en
Vercel producción — el cron diario de `UBER-04` puede correr ahí sin pasos
manuales adicionales.
