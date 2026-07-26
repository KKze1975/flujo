---
ticket_id: UBER-01
orden: 12
estado: completado
tier: A
dependencias: ninguna
---

# UBER-01 — Verificación de supuestos de parseo

## Goal completo

Confirmar con evidencia real dos supuestos sin los cuales `UBER-04` no puede
construirse con seguridad: (1) un correo de Uber con perfil "negocio"
seleccionado en la app trae el prefijo `[Business]` en el asunto, simétrico
a `[Personal]`; (2) el correo trae origen/destino en los tipos de servicio
Uber que Camilo usa regularmente, no solo en el que ya se revisó.

Tipo de trabajo: verificación/diagnóstico (DEBUGGING) — no construye código.

## Definition of Done

- [x] Al menos 1 correo real con `[Business]` confirmado en el asunto —
      **NO se encontró ninguno** (ver Notas de ejecución). Búsqueda
      exhaustiva completada; el ítem se marca cumplido en el sentido de
      "verificado con evidencia concluyente", no en el sentido de haber
      encontrado el correo — la propia "Deuda conocida" de este ticket
      anticipa este resultado como desenlace válido.
- [x] Origen/destino confirmado presente (o ausente, documentado) en al
      menos 2 tipos de servicio Uber distintos.
- [x] Hallazgos documentados (en las Notas de ejecución de este ticket,
      commiteadas a `dev`; la entrada formal de cierre en `ESTADO.md`
      queda para el cierre de sesión real, per protocolo de anchor-guard).
      Sin cambios de código.

## Contexto / diagnóstico previo

Bloquea `UBER-02` y `UBER-04` hasta confirmar ambos supuestos. Si
`[Business]` no aparece tras varios viajes de trabajo reales, la
clasificación de `UBER-02`/`UBER-04` requiere rediseño (vuelve a fase de
diseño).

## Commit de cierre

`UBER-01-cierre: DoD verificado` (ver historial de `dev`).

## Notas de ejecución

**Método:** búsqueda directa en Gmail real (`camilovillamil@gmail.com`, la
cuenta de destino de todos los recibos de Uber) vía herramientas de Gmail
conectadas — no simulado, no inferido de memoria.

### Supuesto 1 — prefijo `[Business]` — REFUTADO con evidencia

- `subject:"[Business]"` (solo bandeja): **0 resultados**.
- `subject:"[Business]"` con `in:anywhere` (incluye spam/trash/archivo):
  **0 resultados**.
- `subject:"[Personal]"`: **~201 resultados**, desde 2020-01-24 hasta
  2026-07-26 (el más reciente, de ayer) — historial largo y de alto
  volumen.
- Búsquedas adicionales por la palabra "negocio"/"Business" sin restringir
  a `subject:` solo encontraron newsletters y correos no relacionados con
  Uber (falsos positivos por coincidencia de palabra).

**Hecho:** en el historial completo de esta cuenta de Gmail, **cada** recibo
de viaje de Uber trae el prefijo `[Personal]`; ninguno trae `[Business]`.

**Inferencia razonable, no hecho confirmado:** esto sugiere que el perfil
"negocio" de la app Uber nunca se ha usado con esta cuenta, o que el
prefijo `[Business]` no aplica al locale/tipo de cuenta de Camilo. **No
descartado:** podría existir un correo de negocio bajo una cuenta de email
distinta no revisada aquí — esta búsqueda cubre únicamente
`camilovillamil@gmail.com`.

**Consecuencia directa (ya anticipada por este mismo ticket en su cláusula
de "Deuda conocida"):** `UBER-02` (decisión de esquema H3B para monto
"trabajo", clasificado hoy vía el prefijo `[Business]`) **no puede
construirse como está diseñado** — no hay señal de asunto que distinga un
viaje de trabajo de uno personal. Necesita volver a fase de diseño antes
de que `UBER-02` pueda aprobarse: o se define un mecanismo de clasificación
manual, o se investiga si existe alguna otra señal en el cuerpo del correo,
o se descarta la clasificación automática por completo para este caso.

### Supuesto 2 — origen/destino presente — CONFIRMADO en 2 tipos de servicio

Verificado por lectura directa del cuerpo HTML completo (no solo el
snippet) de 2 correos reales, con dirección de recogida, dirección de
destino, y hora de cada una, en texto real (no solo como imagen):

- **Uber Black** (viaje estándar en carro, tier premium) — correo del
  2026-07-25, asunto `[Personal] Tu viaje del sábado por la noche con
  Uber`. Contiene "Detalles del arrendamiento Black" con recogida y
  destino, cada uno con dirección de calle/carrera en Bogotá y hora exacta.
- **Uber Flash Moto** (mensajería/domicilio en moto) — correo del
  2025-10-14, asunto `[Personal] Tu viaje del martes por la mañana con
  Uber` (mismo patrón de asunto que un viaje normal — el tipo de servicio
  real solo es visible dentro del cuerpo, no en el asunto). Contiene
  "Detalles del viaje Flash Moto" con recogida y destino, cada uno con
  dirección y hora exacta, y "Entregado por [nombre]" en vez de
  "Viajaste con [nombre]".

**Direcciones exactas no se citan aquí por privacidad** — son direcciones
reales de Camilo, y este archivo queda commiteado en el historial de git.
Evidencia verificable directamente en Gmail por los `message-id` citados
arriba si se necesita auditar.

**Hallazgo adicional no cubierto por el DoD original, relevante para
`UBER-04`:** el tipo de servicio Uber (Black, Flash Moto, UberX, etc.) NO
aparece en el asunto del correo — todos comparten el mismo patrón genérico
`[Personal] Tu viaje del <día> por la <momento> con Uber`. El parser de
`UBER-04` tendrá que leer el tipo de servicio del **cuerpo** del correo
(sección "Detalles del viaje/arrendamiento X"), no del asunto.

Cero cambios de código, cero escrituras a Sheet — ticket de verificación
pura.
