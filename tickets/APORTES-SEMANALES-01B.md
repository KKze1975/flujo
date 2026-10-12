---
ticket_id: APORTES-SEMANALES-01B
orden: 46
estado: propuesto
tier: A
agente_ejecucion: claude-code
dependencias: APORTES-SEMANALES-01A
actualizado_en: 2026-09-30
---

# APORTES-SEMANALES-01B — Aportes del emprendimiento en Ejecución M1 y disponible NU Camilo

Ticket 2 de 4 de `specs/APORTES-SEMANALES-01.md`. Diseño aprobado: brief §2 (filas de ejecución) y
§7 punto 2 (línea "+ Emprendimiento"), mock sección 2. **Tipo: código ejecutable.**
`agente_ejecucion: claude-code`: toca `MesM1Desktop` y la lógica de saldos por cuenta que consume
varias vistas.

## Goal completo

1. **Ejecución, "Por semana":** chip `E:$monto` junto al `A:`, en `--primary`. Nunca lleva `✓` ni
   `(plan)` (no hay confirmación de llegada, F4).
2. **Botón "Aporte emprendimiento"** (`.fl-btn ghost sm`, badge "E") hermano de "Aporte Angie" en la
   barra de ejecución; abre el mismo modal por semana (`ModalAporteAngie`: parametrizarlo con
   título/endpoint o copiarlo, lo que sea más simple sin duplicar lógica de validación) y guarda vía
   `PUT /api/ingresos/adicionales/[mes]` (de `-01A`). Refresca los totales sin recargar la página
   completa, igual que Angie.
3. **Disponible NU Camilo (opción (b), aprobada por Camilo, spec F6):** `disponiblePorCuenta("nu_camilo")`
   suma Σ aportes del emprendimiento de las **semanas ya iniciadas**, sin confirmar llegada. La
   semana activa la calcula el **servidor** (I-01) y llega como prop; nunca `new Date()` en el
   cliente. Regla por mes (verificar con `lib/utils/fecha.ts`; `semanaActivaDeMes` devuelve la
   última semana para cualquier mes ≠ actual, **incluidos meses futuros, lo cual sería incorrecto
   aquí**): mes pasado → todas las semanas; mes actual → semanas ≤ semana de hoy; mes futuro →
   ninguna. Implementar como helper único en `lib/utils/fecha.ts` (p. ej. `semanasIniciadasDe(mes)`),
   con casos de prueba en el script de verificación. Solo `nu_camilo` cambia; `nu_angie`, `arq`,
   `en_mano` quedan idénticos.
4. **Línea visible "+ Emprendimiento (S1–Sx)"** en Saldos, bajo NU Camilo, con el monto que suma al
   disponible (decisión de Camilo, brief §7 punto 2; solo se muestra si el monto > 0 o siempre, según
   el mock: seguir el mock). El total "disponible cuentas" sube en ese monto.
5. El disponible de NU Camilo en `MesM1Mobile` (l.~204) usa el mismo helper y la misma prop (mismo
   valor que escritorio; el resto de móvil va en `-01D`).

**Fuera de alcance:** confirmar que el aporte llegó o monto real; vincular pagos a aportes; `VistaSemanal`
(`-01C`); Home, `/meses`, resto de móvil (`-01D`); cambios al aporte de Angie o a H4A.

## Definition of Done

Rama `dev`, Sheet **DEV**; datos sintéticos limpiados al cierre.

- [ ] Ejecución: chip `E:` visible junto a `A:` en "Por semana", sin `✓`/`(plan)` (captura pegada). Semana sin aporte muestra `E:$0`.
- [ ] Botón "Aporte emprendimiento" abre el modal por semana, guarda un monto en S2 y `GET /api/ingresos/adicionales/2026-10` lo devuelve (respuesta pegada); la vista refleja el cambio (captura).
- [ ] F4: ejecutar un pago en S2 no pide confirmar el aporte ni cambia su fila (GET antes/después idéntico, pegados). La entidad no tiene estado `pendiente/confirmado`.
- [ ] F6, con saldo inicial NU Camilo X, aporte adicional S1 = A y S3 = B, estando en S2 (semana activa server-side): disponible NU Camilo = X + A − pagos NU Camilo − gasto H3, **sin incluir B**, en escritorio y móvil (valores pegados, cálculo de la cuenta mostrado).
- [ ] Helper de semanas iniciadas con casos verificados por script (salida pegada): mes pasado (todas), mes actual en S1/S3/última semana, mes futuro (ninguna).
- [ ] Línea "+ Emprendimiento (S1–Sx)" visible con el monto correcto; el total "disponible cuentas" sube en A (valor antes/después pegado).
- [ ] `nu_angie`, `arq`, `en_mano` sin cambio (valores antes/después pegados).
- [ ] La semana activa usada proviene de una prop calculada en el servidor; `grep` pegado: sin `new Date()` nuevo en componentes de cliente para esto (I-01).
- [ ] Sin regresión: totales de planificación de `-01A` iguales (Σ `diferencia` por semana == `ingresoTotal − totalComprometido`, valores pegados).
- [ ] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos (salida pegada); `graphify update .`.
- [ ] Rama propia, PR contra `dev`, sin merge (I-11/I-17). Tester como subagente aparte.

## Contexto / diagnóstico previo

- Spec H10: `disponiblePorCuenta` = saldo inicial bruto − ejecutado H2 con esa fuente − gasto H3;
  hoy no suma ningún ingreso intra-mes (ni aportes de Angie a `nu_angie`). Esta es una desviación
  deliberada de Camilo respecto de Angie (spec §1 "Tu cuenta NU"): si un aporte no llega, el
  disponible se ve de más hasta que Camilo corra pagos.
- Ubicaciones aproximadas (ubicar por grep, no por número de línea): `MesM1Desktop.tsx` ~l.392 y
  ~l.832-862; `MesM1Mobile.tsx` ~l.204.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena el Coder al cerrar)
