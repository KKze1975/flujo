---
ticket_id: FIX-FALTAPAGAR-MENSUAL-01
orden: 18
estado: activo
tier: B
dependencias: [FIX-BOLSILLO-MENSUAL-01]
---

# FIX-FALTAPAGAR-MENSUAL-01 — "Falta por pagar" duplica bolsillos mensuales en cada semana

## Goal completo

El indicador agregado de "falta por pagar" en `VistaSemanal` suma el monto
completo restante de los bolsillos `pago_fraccionado` con `frecuencia:
mensual` (**Mercado mensual**, **Frida**, **Fondo transporte**) en **cada**
semana visitada (S1-S4), en vez de contarlo una sola vez a lo largo del mes.
Efecto secundario directo de `FIX-BOLSILLO-MENSUAL-01`, que correctamente
hizo que el detalle por-bolsillo (tarjeta individual) mostrara el acumulado
de todo el mes de forma idéntica en las 4 semanas — pero el mismo listado
sin filtrar también alimenta el total agregado, que nunca recibió la
exclusión de "contar una sola vez".

**No cubre:** el detalle por-bolsillo (tarjeta individual, saldo acumulado)
— sin cambios, sigue mostrando el mismo acumulado en las 4 semanas por
diseño. Tampoco cubre los bolsillos semanales (Frutas y verduras, Víveres y
otros, Entretenimiento, Imprevistos) — sin cambios de comportamiento.

## Definition of Done

- [x] DoD de `FIX-BOLSILLO-MENSUAL-01` (Parte A y B) re-verificado contra
      código real — ambas correctamente implementadas, nada que corregir
      ahí (ver Notas de ejecución).
- [x] Causa raíz documentada con cita exacta de archivo/línea.
- [x] "Falta por pagar" de cada semana ya no duplica Mercado mensual, Frida
      ni Fondo transporte a lo largo del mes — verificado por lectura
      directa en dev.
- [x] Prueba de regresión de bolsillos semanales: sin cambios.
- [x] `tsc --noEmit` limpio.
- [x] `tickets/INDICE.md` regenerado.
- [ ] PR creado contra `main` — sin mergear.

## Contexto / diagnóstico previo

### Excepción al WIP limit (I-09) — documentada explícitamente

`tickets/INDICE.md` tenía `TICKET-B-GUARDIA-01` (`orden: 11`) como
`estado: activo` al momento de abrir este ticket — no `FIX-BOLSILLO-MENSUAL-01`
(ya `completado`). El protocolo normal de este ticket exige HALT ante
cualquier ticket activo que no sea la dependencia directa. **Camilo
autorizó explícitamente proceder de todas formas** (decisión tomada en el
chat antes de iniciar la fase de construcción), como excepción puntual —
no se reinterpreta I-09 de forma general, solo se documenta esta instancia.

### Causa raíz — confirmada contra código real

`components/VistaSemanal.tsx`:

1. Líneas 1005-1024: `idsBolsillosMensuales` (Set de `conceptoId` con
   `tipo === "pago_fraccionado" && frecuencia === "mensual"`) se usa para
   construir `bolsillos` mezclando `bolsillosSemanaScoped` (de
   `movimientos`, scoped a la semana visible) con
   `bolsillosMensualesDelMes` (de `movimientosMesInit`, **todo el mes**,
   fetched una vez por carga de página, nunca re-scoped al navegar entre
   semanas). Este mix es correcto y deseado — es lo que permite que el
   bolsillo mensual aparezca/acumule en las 4 semanas (Parte B de
   `FIX-BOLSILLO-MENSUAL-01`, sin regresión).
2. Líneas 1211-1225: `bolsillosDedup`/`bolsillosPendientes` se construyen
   desde ese mismo `bolsillos` mixto, sin ningún filtro por semana.
3. **Bug — líneas 1230-1235 (antes del fix):**
   ```ts
   const totalFaltaBolsillos  = bolsillosPendientes.reduce((s, b) => {
     const gastado = gastadoBolsillo(b.conceptoId);
     return s + Math.max(0, b.montoPresupuestado - gastado);
   }, 0);
   const totalFaltaPagar = totalFaltaPendientes + totalFaltaBolsillos;
   ```
   Como un bolsillo mensual está presente en `bolsillosPendientes`
   independientemente de `semanaVisible`, su saldo restante completo se
   suma a `totalFaltaPagar` en S1, S2, S3 y S4 por igual.
4. **Mismo bug en el desglose del popover — líneas ~1450-1461 (antes del
   fix):** recalcula el mismo listado desde `bolsillosPendientes` sin
   filtro, así que también lista el bolsillo mensual como línea pendiente
   en cada semana.

### Fix aplicado — análogo directo al patrón ya aprobado en FIX-BOLSILLO-MENSUAL-01

Se reutiliza el mismo `Set idsBolsillosMensuales` ya existente, aplicado en
un sitio nuevo: un bolsillo mensual solo contribuye a `totalFaltaBolsillos`
(y aparece en el desglose del popover) cuando `b.semana === semanaVisible`
(su semana ancla en H2). En cualquier otra semana contribuye `0` — sigue
visible en su tarjeta de detalle (sin cambios), solo se excluye del total
"falta por pagar" fuera de su semana ancla.

No requiere cambio de esquema ni nuevo prop — mismo patrón, mismo tipo de
exclusión ya usado en `VistaSemanal.tsx:1011,1019,1022`, por lo que se
procedió sin HALT adicional (excepción de punto 6 del prompt original,
misma decisión de diseño ya aprobada).

## Commit de cierre

(pendiente — ver historial de `dev`)

## Notas de ejecución

**Re-verificación de `FIX-BOLSILLO-MENSUAL-01` (Parte A y B) contra código
real:** ambas correctamente implementadas, sin regresión ni pendiente.
- Parte A confirmada en `app/api/mes/[mes]/cerrar-semana/route.ts:124-129`
  (excluye `frecuenciaPorConcepto.get(m.conceptoId) !== "mensual"` del loop
  que marca `ejecutado`).
- Parte B confirmada en `components/VistaSemanal.tsx:1005-1024` y en
  `app/mes/[mes]/semana/page.tsx` (props `movimientosMesInit`,
  `consumosMesInit`, `conceptosCatalogo` correctamente pasados desde fetches
  de todo el mes).

**Fix aplicado:** dos sitios en `components/VistaSemanal.tsx` — el reduce
de `totalFaltaBolsillos` (~línea 1231) y el `.map` del desglose del popover
"falta por pagar" (~línea 1457) — ambos ahora excluyen la contribución de
un bolsillo mensual cuando `b.semana !== semanaVisible`.

`tsc --noEmit` limpio tras el cambio (confirmado 2 veces: inmediatamente
tras el fix y de nuevo al cerrar).

**Bug lateral encontrado y NO corregido (fuera de alcance, deuda técnica
documentada):** `app/api/admin/reset-mes/route.ts`, función `resetH2`
(líneas 60-79). A diferencia de `deleteRowsByMes` (usada para H3B/H4A-D/H5A/H5B),
que filtra por `mes`, borra, y **reescribe las filas de otros meses**,
`resetH2` calcula `antes` (conteo de filas del mes) pero luego hace
`values.clear({ range: "H2!A2:Y10000" })` **sin filtrar por mes y sin
reescribir las filas de los demás meses** — un `POST /api/admin/reset-mes`
real borraría el H2 completo (todos los meses), no solo el mes pedido. Por
esto este ticket **no usó ese endpoint** para limpiar sus datos de prueba;
se usó un script puntual con el mismo patrón seguro de `deleteRowsByMes`
(filtra por mes, preserva el resto). No se abre ticket nuevo por esto (fuera
de alcance/restricción explícita de este ticket) — queda señalado aquí para
que se abra un ticket propio cuando corresponda.

**Prueba en dev — evidencia real (no solo visual):** Chrome conectado vía
Claude-in-Chrome resultó estar en un dispositivo `ChromeOS` no local
(`isLocal: false`) — el mismo tipo de desalineación de máquina ya visto en
`FIX-BOLSILLO-MENSUAL-01`, así que no servía para verificar contra
`localhost` de este Workspace. En su lugar se verificó reproduciendo la
lógica exacta de `totalFaltaBolsillos`/`totalFaltaPagar` (antes y después
del fix) contra datos reales del Sheet dev, vía fetch directo a los
endpoints ya existentes (`/api/conceptos`, `/api/mes/2027-11`,
`/api/mes/2027-11/consumos/{semana}`, `/api/mes/2027-11/semana/{semana}`).

Mes de prueba `2027-11` (inicializado vía `POST /api/mes/2027-11/iniciar`,
77 movimientos generados), sembrado con consumos reales vía H3:
$50.000 contra Fondo transporte en S1, $30.000 contra Fondo transporte en
S2, $100.000 contra Entretenimiento en S1.

- **Antes del fix (bug reproducido):** `totalFaltaPagar` = 13.967.223 (S1),
  5.448.996 (S2), 3.794.996 (S3), 4.189.996 (S4) — el remanente combinado de
  Mercado mensual ($600.000), Fondo transporte ($270.000) y Frida ($900.000)
  = $1.770.000 aparecía sumado en las 4 semanas por igual.
- **Después del fix:** `totalFaltaPagar` = 13.967.223 (S1, sin cambio — es
  la semana ancla), 3.678.996 (S2), 2.024.996 (S3), 2.419.996 (S4) — la
  diferencia exacta en S2/S3/S4 es $1.770.000 menos que antes del fix en
  cada una, confirmando que el remanente mensual ya no se duplica fuera de
  su semana ancla.
- **Regresión de bolsillos semanales — verificada sin cambios:**
  Entretenimiento (semanal) tiene su propio `Movimiento` por semana
  (`semana: "S1"` en S1, `"S2"` en S2, etc., $250.000 cada una,
  `estado: "pendiente"` en las 4) — no pertenece a `idsBolsillosMensuales`,
  así que la nueva condición del fix nunca se activa para él; su
  contribución a `totalFaltaBolsillos` es idéntica antes y después del fix
  en las 4 semanas.

Datos de prueba (77 filas H2 + 3 filas H3 del mes `2027-11`) eliminados
después vía script con el mismo patrón seguro de `deleteRowsByMes`
(filtra por mes, preserva otros meses) — verificado por lectura de vuelta:
`GET /api/mes/2027-11` vuelve a responder `"El mes no ha sido
inicializado."`, y el cleanup reportó 221 filas de otros meses preservadas
en H2 y 10 en H3.

Cero llamadas contra producción durante la construcción — Sheet ID leído
de `.env.local` en todo momento, target declarado DEV explícitamente antes
de cada escritura.

**Iteraciones:** 1 — el fix funcionó en el primer intento, sin necesidad de
ajustes adicionales.

**Cierre:** `estado: completado` una vez creado el PR (ver más abajo).
