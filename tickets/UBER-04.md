---
ticket_id: UBER-04
orden: 15
estado: bloqueado
tier: A
dependencias: UBER-01, UBER-02, UBER-03
---

# UBER-04 — Ingesta, parser, clasificación y escritura a H3B

## Goal completo

Gmail API (OAuth2) detecta correos de Uber casi en tiempo real, extrae
monto/fecha/origen/destino, clasifica vía prefijo `[Personal]`/`[Business]`
del asunto, y escribe a H3B según el esquema decidido en `UBER-02`.
Indicador de bolsillo Transporte muestra desglose de dos colores
(trabajo/casa).

Tipo de trabajo: construcción, loop autónomo una vez desbloqueado por
`UBER-01`, `UBER-02` y `UBER-03`.

**No cubre:** reporte a Zoho Expense — fuera de alcance, no construir.

## Definition of Done

- [ ] Correo real de Uber dispara el parseo sin intervención manual.
- [ ] Clasificación correcta verificada con al menos 1 caso `[Personal]` y
      1 caso `[Business]` reales.
- [ ] Monto aparece en H3B según el esquema de `UBER-02`, sin afectar otros
      bolsillos.
- [ ] Indicador de dos colores refleja correctamente ambos montos en
      preview URL.
- [ ] Deduplicación por `threadId` de Gmail (mismo patrón que School Bot
      T8-hotfix).

## Contexto / diagnóstico previo

Bloqueado por `UBER-01` (supuestos de parseo), `UBER-02` (esquema H3B) y
`UBER-03` (migración de Fondo transporte) — los tres deben cerrar antes de
abrir construcción, por WIP limit (I-09).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
