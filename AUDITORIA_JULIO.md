# Auditoría de totales — Julio 2026

**Fecha:** 2026-06-26  
**Auditor:** Claude Sonnet 4.6 (sesión de diagnóstico — sin código escrito)  
**Sheet auditado:** producción `1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`

---

## 1. Motor de cálculo identificado

### Archivo y función principal

**`components/MesM1Desktop.tsx`** — función `balancePlanificacion` (línea 474)  
y `totalComprometido` (línea 467).

Ruta de datos server-side: `app/mes/[mes]/page.tsx` → `MesM1ClientWrapper` → `MesM1Desktop`

### Pestañas leídas

| Dato | Fuente | Rango |
|---|---|---|
| Conceptos (montos, estado, frecuencia) | H1 | `H1!A:L` |
| Movimientos julio (semana asignada, estado) | H2 | `H2!A:Y` |
| Ingreso Camilo | H4A | `H4!A:G` |
| Aportes Angie | H4B | `H4!I:N` |

### Fórmula de comprometido mensual

```
conceptosActivosMes = conceptos donde:
  estado === "activo"
  Y NOT (todos sus movs en H2-julio son no_aplica o pospuesto_mes_siguiente)
  Y si bimestral: nombre_mes en mes_activo_bimestral

totalComprometido = Σ conceptosActivosMes.monto × (semanal ? 4 : 1)
```

**Fuente del monto**: siempre H1 `monto_referencia` actual — NO H2 `monto_presupuestado`.  
Esto es intencional: el `monto_presupuestado` en H2 puede quedar obsoleto si se edita H1 después de la inicialización del mes.

### Fórmula de flujo semanal y arrastre

```
remanente ← ingresoCamiloNum

por cada semana S en [S1, S2, S3, S4]:
  aporteAngie ← H4B.monto donde semana === S (o 0 si no hay fila)
  
  comprometidoS ← Σ conceptosActivosMes donde:
    - si c.frecuencia === "semanal": siempre incluido (monto H1)
    - si no: incluido solo si mov.semana === S   ← usa H2, NO H1 semanaDefault
  
  disponible ← remanente + aporteAngie
  flujo ← disponible − comprometidoS
  remanente ← flujo               ← el arrastre
```

**Nota de diseño**: los conceptos semanales se incluyen en TODAS las semanas
con su monto semanal. Los conceptos fijos se ubican según la semana asignada en H2
(que puede diferir del H1 `semana_default` si fue reasignada).

### Estados incluidos / excluidos en las sumas

| Estado en H2 | ¿Cuenta en comprometido? |
|---|---|
| `pendiente` | Sí |
| `ejecutado` | Sí (el balance planificación no filtra por ejecutado) |
| `no_aplica` | Solo excluye el concepto si TODOS sus movimientos en el mes tienen este estado |
| `pospuesto_mes_siguiente` | Ídem anterior |

---

## 2. Datos crudos leídos

Script: `scripts/auditoria-julio.mjs` apuntando al Sheet de producción.

| Fuente | Filas totales | Filas Julio 2026 | ¿Truncamiento? |
|---|---|---|---|
| H1 (conceptos) | 62 | — (catálogo maestro) | No |
| H2 (movimientos) | 142 (todos los meses) | **69 filas** (61 pendiente, 8 no_aplica) | No |
| H4A (ingreso Camilo) | — | **1 fila** | No |
| H4B (aportes Angie) | — | **4 filas** | No |

### H2 Julio — estados verificados

```
pendiente: 61 filas
no_aplica:  8 filas
```

**Conceptos excluidos de conceptosActivosMes** (todos sus movimientos en julio son no_aplica):

| Concepto | Monto H1 | Impacto en comprometido |
|---|---|---|
| Disney+ | 60,000 | −60,000 |
| Game Pass | 50,000 | −50,000 |
| El País | 45,000 | −45,000 |
| CDT NU | 100,000 | −100,000 |
| Apoyo Mariella | 100,000 | −100,000 |
| Seguros de vida Camilo | 100,000 | −100,000 |
| Prestamo Papa | 100,000 | −100,000 |

Total excluido: **555,000**

### Ingreso Camilo confirmado

```
INGRESO_CAM_1782506981870 | 2026-07 | $11,450,000 | confirmado
```

### Aportes Angie confirmados

```
INGRESO_ANG_1782506992121 | 2026-07 | S1 | $2,000,000
INGRESO_ANG_1782506992823 | 2026-07 | S2 | $2,000,000
INGRESO_ANG_1782506993252 | 2026-07 | S3 | $2,000,000
INGRESO_ANG_1782506993564 | 2026-07 | S4 | $2,000,000
TOTAL ANGIE: $8,000,000
```

---

## 3. Tabla comparativa — App vs recálculo independiente

Los valores de la app son presentación compacta (redondeada). Los recalculados son exactos.

| Métrica | App (presentación) | Recalculado (exacto) | Delta | ¿Coincide? |
|---|---|---|---|---|
| Comprometido mensual | $19,016,211 | $19,016,211 | $0 | ✅ Sí |
| Ingreso Camilo | $11,450,000 | $11,450,000 | $0 | ✅ Sí |
| Aportes Angie | $8,000,000 | $8,000,000 | $0 | ✅ Sí |
| Total disponible | $19,450,000 | $19,450,000 | $0 | ✅ Sí |
| Diferencia mensual | +$433,789 | +$433,789 | $0 | ✅ Sí |
| Flujo S1 | −$95K | −$95,223 | −$223 | ✅ Sí (redondeo compacto) |
| Flujo S2 | −$265K | −$265,219 | −$219 | ✅ Sí (redondeo compacto) |
| Flujo S3 | +$130K | +$129,785 | −$215 | ✅ Sí (redondeo compacto) |
| Flujo S4 | +$434K | +$433,789 | −$211 | ✅ Sí (redondeo compacto) |

**Los flujos semanales difieren en ≤223 pesos** — diferencia puramente de presentación. La UI usa `COP(value, { compact: true })` que redondea al K más cercano. El motor calcula los valores exactos correctamente.

### Desglose S1 comprometido (verificación manual)

| Tipo | Conceptos | Subtotal |
|---|---|---|
| Semanales (×1 cada semana) | Emma+Lucas+Mireyita+Chucherías+Entretenimiento+Frutas+Víveres+Imprevistos | $969,996 |
| Fijos asignados a S1 en H2 | Arriendo, Agua, Energía, Gas, Internet, Cel Camilo, Netflix, Spotify, Google One, Claude Pro, Prime Video, NY Times, Colegio, EPS/ARL, Plan comp, Mercado mensual, Préstamo Leonardo, Ropa, Ayuda mama servicios | $12,575,227 |
| **S1 comprometido** | | **$13,545,223** |

13,545,223 + 2,169,996 + 1,604,996 + 1,695,996 = **$19,016,211** ✓ cierra contra el mensual.

### Coincidencia S4_flujo = Diferencia mensual: ESTRUCTURAL

La última semana siempre cierra contra el total porque:
- `totalComprometido = Σ comprometidoS` para S1–S4 (por construcción del algoritmo)
- `S4_flujo = disponibleMensual − totalComprometido = Diferencia mensual`

No es casualidad. Es una propiedad algebraica del encadenamiento.

---

## 4. Divergencias encontradas

**No se encontraron divergencias en el motor de cálculo.**

Los 5 totales mensuales coinciden exactamente. Los 4 flujos semanales coinciden con la exactitud de presentación compacta del UI.

### Anomalías en H2 identificadas (no afectan el motor de balance)

#### A. Entretenimiento — H2 monto_presupuestado desalineado con H1

| | H1 monto_referencia | H2 monto_presupuestado (julio) |
|---|---|---|
| Entretenimiento | **150,000** | **550,000** (stale) |
| Imprevistos | **0** | **250,000** (stale) |
| Fondo de emergencia | **0** | **200,000** (stale) |

El motor de balance Planificación usa H1 → correcto.  
La vista de Ejecución usa H2 `monto_presupuestado` para mostrar "por ejecutar" → mostraría 550,000 en Entretenimiento y 250,000 en Imprevistos aunque el plan diga 150,000 y 0. **No es un bug del balance, pero puede confundir la vista de Ejecución.**

#### B. Entretenimiento — anomalía estructural en H2 julio

Las 4 filas de Entretenimiento en julio son:
```
semana=S4 | pendiente    ← duplicado S4
semana=S2 | pendiente
semana=S3 | pendiente
semana=S4 | no_aplica   ← segundo S4
```

Falta la fila S1. Hay dos filas S4 (una pendiente, una no_aplica). El `balancePlanificacion` no es afectado (semanales ignoran `mov.semana`). El concepto permanece activo porque 3 de 4 filas son pendiente.  
**Causa probable**: script de corrección o edición manual que creó un S4 extra y dejó S1 sin generar.

#### C. Discrepancia H1 semanaDefault vs H2 semana para conceptos fijos

Conceptos donde la semana en H2 difiere del H1 semanaDefault:

| Concepto | H1 semanaDefault | H2 semana (julio) |
|---|---|---|
| Celular Angie | S1 | **S3** |
| Spotify | S2 | **S1** |
| Google One | S2 | **S1** |
| EPS / ARL / Pensión | S2 | **S1** |
| Plan complementario | S2 | **S1** |
| Provisión Mireyita | S3 | **S3** ✓ |

El motor de Planificación usa `mov.semana` (H2) para ubicar fijos en la semana correcta — **este comportamiento es correcto** (H2 refleja la planificación real para el mes activo, H1 es solo el default).  
Sin embargo, EPS/ARL y Plan complementario aparecen en **S1** en H2 pero H1 dice S2. Esto podría ser una reasignación intencional de Camilo al planificar julio, o un arrastre del comportamiento de junio. No es un error del motor.

---

## 5. Veredicto sobre los cambios deliberados

### Entretenimiento modificado

- H1 `monto_referencia` actual: **150,000** (semanal → 150,000 × 4 = **600,000 al mes**)
- El motor aplica exactamente este valor al comprometido
- En la vista "Por semana", cada semana incluye 150,000 de Entretenimiento en el comprometido
- **No rompe ningún cálculo.** El zero/no-cero de H2 no importa para el balance planificación

### Imprevistos en cero

- H1 `monto_referencia` actual: **0** (semanal → 0 × 4 = **0 al mes**)
- El concepto está activo (4 movimientos pendientes en H2 julio)
- Contribuye exactamente **$0** al comprometido mensual y a cada flujo semanal
- `0 × 4 = 0` no produce NaN, no divide por cero, no contamina la suma
- **No rompe nada.** El motor maneja monto=0 correctamente.

---

## 6. Solución propuesta (NO implementada)

No se encontró un bug en el motor de balance. No hay corrección de motor a proponer.

### Observación técnica documentada (no urgente)

Los `monto_presupuestado` en H2 julio para Entretenimiento ($550K), Imprevistos ($250K) y Fondo de emergencia ($200K) quedaron desalineados con sus H1 `monto_referencia` actuales. Si se decide que H2 debe reflejar el monto planeado real:

**Corrección sugerida si se desea alinear**: Al inicializar un mes (o antes de que comience la ejecución), sincronizar `monto_presupuestado` en H2 con el H1 `monto_referencia` actual para conceptos que hayan sido editados post-inicialización. Esto sería un script de sincronización opcional — **no es urgente** porque el balance Planificación ya usa H1.

**Corrección para el S1 faltante de Entretenimiento y el S4 duplicado**: si la vista de Ejecución necesita 4 filas correctas de Entretenimiento en Julio (S1, S2, S3, S4), hay que borrar el S4 duplicado y crear el S1. Esto no afecta el balance planificación pero sí la vista de ejecución.

Pendiente de "aprobado para construir" si Camilo lo considera prioritario.

---

## 7. Conclusión

**Los totales que muestra la app son CONFIABLES. El motor de cálculo suma correctamente.**

- Los 5 totales mensuales (comprometido, ingreso Camilo, aportes Angie, disponible, diferencia) son exactos al peso.
- Los 4 flujos semanales son exactos al peso; la diferencia de ≤$223 entre lo que el usuario ve y el recálculo es presentación compacta del UI, no error de cálculo.
- Entretenimiento (150K semanal) e Imprevistos (0) se reflejan correctamente en el motor.
- La coincidencia entre S4 flujo (+$433,789) y la Diferencia mensual (+$433,789) es estructural por diseño.

**La desconfianza no tiene fundamento en el motor.** Los números son correctos.

### Nota sobre I-14

El prompt hace referencia a **I-14** pero `INVARIANTS.md` solo define invariantes hasta **I-11**. La preocupación que I-14 describiría (que el mes activo se derive de `new Date()` server-side) está cubierta por I-01 e I-02. En la vista de Planificación Julio, el `mes` proviene del parámetro de URL (`/mes/2026-07`), no de `new Date()` — es correcto navegar julio desde junio.

---

*Script de auditoría en `scripts/auditoria-julio.mjs`. No commitear a main.*
