---
ticket_id: INVARIANTS-GAP-01
orden: 10
estado: aprobado
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

- [ ] Leer `INVARIANTS.md` real completo (no la copia del proyecto Claude —
      ya hubo un incidente de trabajar sobre una copia desactualizada,
      documentado en la sesión T54 del 29 jun 2026).
- [ ] Confirmar cuáles invariantes candidatos mencionados en `ESTADO.md`
      (patrón `ensureHeaders`, patrón de tabs físicos vs. nombres lógicos,
      "estado por ausencia de valor") ya fueron promovidos formalmente y
      cuáles siguen como candidatos sin número asignado.
- [ ] Para cada candidato aprobado explícitamente por Camilo en su sesión de
      origen (verificar contra el texto exacto de `ESTADO.md`, no asumir),
      asignar el siguiente número disponible real en `INVARIANTS.md` y
      redactarlo siguiendo el criterio de admisión ya vigente (solo reglas
      cuya violación produce error silencioso, dato corrupto, o
      comportamiento incorrecto no detectado automáticamente).
- [ ] No promover ningún candidato que no tenga aprobación explícita
      registrada — dejarlo como pendiente, documentado en las Notas de
      ejecución de este ticket, no inventar aprobación.
- [ ] Commit único, solo `INVARIANTS.md` modificado.

## Contexto / diagnóstico previo

- Corrección de nomenclatura ya hecha una vez (sesión DEBUGGING 26 jun
  2026): "el invariante vigente es I-01. No existe I-14 en el archivo
  formal" — pero eso resolvió solo un caso puntual, no un barrido completo.
- Múltiples sesiones (BL-10, T54, Ticket B del 3 jul) dejaron candidatos
  "pendientes de aprobación explícita antes de convertirse en invariante
  numerado, siguiendo la misma regla que ya aplica a I-16" — sin cerrar
  el ciclo completo.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
