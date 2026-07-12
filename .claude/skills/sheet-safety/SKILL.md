---
name: sheet-safety
description: Protocolo obligatorio antes de cualquier lectura o escritura de Google Sheets en Flujo — usar SIEMPRE que se vaya a tocar un Sheet (directo por API, por script de scripts/, o vía endpoints que escriben H1-H6)
---

# Protocolo de seguridad para Google Sheets

Flujo usa Google Sheets como única base de datos. Errores de target son la fricción #1
histórica de este proyecto. Antes de CUALQUIER operación sobre un Sheet:

## 1. Declarar el target y esperar confirmación (escrituras) o declararlo (lecturas)

Formato obligatorio antes de la primera operación:

```
Target: [DEV | PRODUCCIÓN]
Sheet ID: <id — de dónde salió: .env.local, prompt del usuario, etc.>
Tab: <H1 Conceptos | H2 Movimientos | H3B ConsumoH3 | H4B IngresoAngie | H4C SaldoCuenta | H5A CierreSemana | H5B PlanSemana | H6 CierreMensual>
Operación: [lectura | append | update | delete]
```

- Para **escrituras**: espera confirmación explícita del usuario antes de ejecutar.
- Si el usuario no especificó dev o prod, **pregunta — no asumas**. El default histórico de
  los scripts es DEV; el usuario suele referirse a PRODUCCIÓN cuando habla de sus datos reales.

## 2. Reglas de interpretación

- `H2`, `H3B`, `H4C`, etc. son **nombres de tabs**, nunca referencias de celda.
- El Sheet ID viene de `GOOGLE_SHEET_ID` en `.env.local` — nunca hardcodeado.
- **H4D es legacy: prohibido leer o escribir** (invariante I-05).
- `bolsilloId` en H3B es el `id_concepto` de H1, NO el `id_movimiento` de H2 (I-03).

## 3. Verificación post-escritura

Después de escribir, lee de vuelta la fila/rango afectado y pega el contenido real como
evidencia. Nunca reportes "actualizado" basándote solo en que la llamada no lanzó error.
Para escrituras vía API de la app, `/admin/trazabilidad` es la herramienta canónica de diff.

## 4. Operaciones destructivas

Update o delete de filas existentes: además de la confirmación del paso 1, muestra el
contenido ACTUAL de las filas que vas a modificar antes de tocarlas.
