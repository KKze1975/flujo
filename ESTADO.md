# ESTADO DEL PROYECTO — FLUJO

Fase: Construcción — Ticket 2 cerrado

---

## Estado técnico

| Componente | Estado |
|---|---|
| Next.js proyecto | ✅ Corriendo localmente en http://localhost:3000 |
| lib/data/types.ts | ✅ Creado — 8 tipos + 10 interfaces |
| lib/data/index.ts | ✅ Creado — IDataProvider con 23 métodos |
| lib/data/sheets.ts | ✅ Creado — SheetsDataProvider vacío |
| lib/data/mock.ts | ✅ Creado — MockDataProvider con respuestas vacías |

---

## Deuda técnica conocida

- 2 vulnerabilidades moderadas en dependencias npm — pendiente npm audit después del MVP
- Rama local master diverge de main en GitHub — alinear con git branch -m master main en próxima sesión
- Claude Code auto-update failed — resolver con npm i -g @anthropic-ai/claude-code
- lib/data/provider.ts (singleton) no creado — pendiente para cuando se conecte Sheets real

---

## Decisiones tomadas

| Fecha | Decisión | Razón |
|---|---|---|
| Mayo 2026 | Stack: Next.js 16.2.6 + TypeScript + Tailwind + App Router | Camino B requiere API Routes — Next.js las provee sin servidor separado |
| Mayo 2026 | Deploy: Vercel | Cero configuración para Next.js — free tier suficiente para MVP |
| Mayo 2026 | Turbopack activo en desarrollo | Default de create-next-app — sin impacto en producción |
| Mayo 2026 | Repo anterior descartado — proyecto nuevo desde cero | 44 objetos sin archivos rastreados |
| Mayo 2026 | Autenticación MVP: PIN simple | actor: camilo o angie — Google OAuth como feature futura |
| Mayo 2026 | Registro rápido: Claude API | JSON estructurado con campo confianza — costo menor a $0.20 USD/mes |
| Mayo 2026 | Escrituras compuestas: batchUpdate | Falla completa o no falla — reduce ventana de inconsistencia |
| Mayo 2026 | Bolsillo Angie: saldo calculado en tiempo real desde H3 | Sin campos calculados en H4 |
| Mayo 2026 | Fuentes de pago: columnas booleanas | Filtrable directamente — no string con comas |
| Mayo 2026 | Snapshots en H2 | Nombre, categoría y tipo copiados de H1 al crear — historial inmutable |
| Mayo 2026 | H5: registro de cierres | Snapshot del domingo — no vista calculada |
| Mayo 2026 | H6: columna por categoría | 8 columnas cat_* — no JSON en celda |
| Mayo 2026 | estado_concepto reemplaza activo boolean | Enum activo/retirado + fecha_retiro |

---

## Prompt de apertura de próxima sesión

```
Tipo de sesión: [CONSTRUCCIÓN]
Objetivo: Ticket 3 — conectar Google Sheets API e implementar SheetsDataProvider para H1
Prerequisito: resolver rama master vs main antes de iniciar
```
