---
ticket_id: INVARIANTS-GAP-01
orden: 10
estado: completado
tier: A
dependencias: ninguna
---

# INVARIANTS-GAP-01 — Cerrar numeración faltante en INVARIANTS.md (I-13, I-14, I-16)

## Goal completo

`ESTADO.md` referencia I-13, I-14 e I-16 como invariantes candidatos o ya
"formalizados" en varias sesiones (patrón `ensureHeaders` debe verificar
completitud de esquema — candidato a I-13; mes/semana activo desde
`new Date()` — referenciado como I-14 en una sesión pero la nomenclatura
correcta resultó ser I-01, según corrección explícita del 26 jun 2026;
estado derivado de ausencia de valor sin fuente única — candidato a I-16).
`INVARIANTS.md` real no contiene estos números — hay una discrepancia de
nomenclatura documentada y nunca cerrada formalmente.

**Este ticket es puramente documental — no toca código de la aplicación.**

**No cubre:**
- Ningún fix de código — solo consolidar y numerar correctamente
  `INVARIANTS.md`.
- Corregir referencias históricas dentro de `ESTADO.md` (es append-only,
  no se edita retroactivamente) — solo el archivo `INVARIANTS.md` en sí.

## Definition of Done

- [x] Leer `INVARIANTS.md` real completo (no la copia del proyecto Claude —
      ya hubo un incidente de trabajar sobre una copia desactualizada,
      documentado en la sesión T54 del 29 jun 2026).
- [x] Confirmar cuáles invariantes candidatos mencionados en `ESTADO.md`
      (patrón `ensureHeaders`, patrón de tabs físicos vs. nombres lógicos,
      "estado por ausencia de valor") ya fueron promovidos formalmente y
      cuáles siguen como candidatos sin número asignado.
- [x] Para cada candidato aprobado explícitamente por Camilo en su sesión de
      origen (verificar contra el texto exacto de `ESTADO.md`, no asumir),
      asignar el siguiente número disponible real en `INVARIANTS.md` y
      redactarlo siguiendo el criterio de admisión ya vigente (solo reglas
      cuya violación produce error silencioso, dato corrupto, o
      comportamiento incorrecto no detectado automáticamente).
- [x] No promover ningún candidato que no tenga aprobación explícita
      registrada — dejarlo como pendiente, documentado en las Notas de
      ejecución de este ticket, no inventar aprobación.
- [x] Commit único, solo `INVARIANTS.md` modificado.

## Contexto / diagnóstico previo

- Corrección de nomenclatura ya hecha una vez (sesión DEBUGGING 26 jun
  2026): "el invariante vigente es I-01. No existe I-14 en el archivo
  formal" — pero eso resolvió solo un caso puntual, no un barrido completo.
- Múltiples sesiones (BL-10, T54, Ticket B del 3 jul) dejaron candidatos
  "pendientes de aprobación explícita antes de convertirse en invariante
  numerado, siguiendo la misma regla que ya aplica a I-16" — sin cerrar
  el ciclo completo.

## Commit de cierre

`INVARIANTS-GAP-01: formalizar I-16 y consolidar candidatos en INVARIANTS.md`

## Notas de ejecución

- Se leyó `INVARIANTS.md` y `ESTADO.md` completo para auditoría de candidatos.
- **I-16 ("Estados derivados por ausencia de valor")**: Confirmada aprobación explícita de Camilo en `ESTADO.md` (líneas 4877 y 4956). Promovido formalmente como **I-16**.
- **I-14**: Confirmado en `ESTADO.md` (26 jun 2026) que era un error de nomenclatura para **I-01**. Documentado en la sección de candidatos como obsoleto/cubierto.
- **I-13 (`ensureHeaders` completitud)** y los demás candidatos (`batchUpdate` vs `values.append`, pipe-tests para reglas externas, ampliación de scope de credenciales, tabs físicos vs lógicos, verificación de ancho al limpiar esquemas): No tienen registro de aprobación explícita por Camilo. Se mantienen como candidatos en la sección inferior de `INVARIANTS.md`.
