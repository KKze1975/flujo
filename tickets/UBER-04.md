---
ticket_id: UBER-04
orden: 15
estado: bloqueado
tier: A
dependencias: UBER-01, UBER-03
---

# UBER-04 — Ingesta, parser y escritura a H3B

## Goal completo

Gmail API (OAuth2) detecta correos de Uber casi en tiempo real, extrae
monto/fecha/origen/destino, y escribe el consumo al bolsillo Transporte
estándar en H3B (`TRANSPORTE_1748100037`, migrado a `pago_fraccionado` por
`UBER-03`) — **sin distinguir** viajes de trabajo vs. personales. Camilo
hace esa separación manualmente, fuera de Flujo (decisión explícita,
`UBER-02` descartado por este motivo).

**Cambio de alcance tras `UBER-02` (descartado):** el Goal original incluía
clasificación `[Personal]`/`[Business]` y un indicador de dos colores
(trabajo/casa) en el bolsillo Transporte — ambos ya no aplican. Todo monto
de Uber detectado se trata igual, como cualquier otro consumo del bolsillo
Transporte.

Tipo de trabajo: construcción, loop autónomo una vez desbloqueado por
`UBER-01` y `UBER-03`.

**No cubre:** reporte a Zoho Expense — fuera de alcance, no construir.
Clasificación trabajo/personal — descartada, ver arriba.

## Definition of Done

- [ ] Correo real de Uber dispara el parseo sin intervención manual.
- [ ] Monto, fecha y origen/destino extraídos correctamente de al menos 2
      tipos de servicio Uber reales (ver evidencia de `UBER-01`: Black y
      Flash Moto tienen estructura de cuerpo distinta).
- [ ] Consumo escrito en H3B con `bolsilloId = TRANSPORTE_1748100037`, sin
      afectar otros bolsillos.
- [ ] Deduplicación por `threadId` de Gmail (mismo patrón que School Bot
      T8-hotfix).

## Contexto / diagnóstico previo

Bloqueado por `UBER-01` (supuestos de parseo) y `UBER-03` (migración de
Fondo transporte a `pago_fraccionado`) — ambos deben cerrar antes de abrir
construcción, por WIP limit (I-09). `UBER-02` ya no es dependencia —
descartado, ver `UBER-02.md`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
