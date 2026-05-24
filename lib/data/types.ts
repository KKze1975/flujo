// ── Enums ──────────────────────────────────────────────────────────────────

export type Semana = "S1" | "S2" | "S3" | "S4";
export type Actor = "camilo" | "angie";
export type TipoConcepto = "fijo" | "bolsillo" | "discrecional";
export type Frecuencia = "mensual" | "bimestral" | "semanal";
export type EstadoConcepto = "activo" | "retirado";
export type EstadoMovimiento = "pendiente" | "ejecutado" | "pospuesto" | "no_aplica";
export type EstadoIngresoCamilo = "pendiente" | "confirmado";
export type Confianza = "alta" | "media" | "baja";
export type Categoria =
  | "Casa"
  | "Servicios"
  | "Transporte"
  | "Mercado y Alimentación"
  | "Salud"
  | "Compromisos Financieros"
  | "Recreación"
  | "Metas Familiares";
export type SemanaDefault = "S1" | "S2" | "S3" | "S4" | "variable";

// ── H1 ─────────────────────────────────────────────────────────────────────

export interface Concepto {
  id: string;                        // id_concepto
  nombre: string;
  categoria: Categoria;
  tipo: TipoConcepto;
  frecuencia: Frecuencia;
  mesActivoBimestral: string | null; // solo bimestral — null en otros casos
  monto: number;                     // monto_referencia COP
  semanaDefault: SemanaDefault;
  requiereAprobacion: boolean;
  estado: EstadoConcepto;
  fechaRetiro: string | null;
  notas: string | null;
}

// ── H2 ─────────────────────────────────────────────────────────────────────

export interface Movimiento {
  id: string;
  conceptoId: string;
  mes: number;
  semana: Semana;
  monto: number;
  estado: EstadoMovimiento;
  notas?: string;
  fechaEjecucion?: string;
}

// ── H3 ─────────────────────────────────────────────────────────────────────

export interface Bolsillo {
  id: string;
  nombre: string;
  actor: Actor;
  saldo: number;
  meta?: number;
}

export interface Consumo {
  id: string;
  bolsilloId: string;
  actor: Actor;
  mes: number;
  semana: Semana;
  monto: number;
  descripcion?: string;
  fecha?: string;
}

// ── H4 ─────────────────────────────────────────────────────────────────────

export interface IngresoCamilo {
  id: string;
  mes: number;
  semana: Semana;
  monto: number;
  concepto: string;
  estado: EstadoIngresoCamilo;
  confianza?: Confianza;
  notas?: string;
}

export interface IngresoAngie {
  id: string;
  mes: number;
  semana: Semana;
  monto: number;
  concepto: string;
  notas?: string;
}

// ── H5 ─────────────────────────────────────────────────────────────────────

export interface CierreSemana {
  id: string;
  mes: number;
  semana: Semana;
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  saldoFinal: number;
  notas?: string;
}

export interface PlanSemana {
  id: string;
  mes: number;
  semana: Semana;
  montoPlaneado: number;
  categorias?: Record<string, number>;
  notas?: string;
}

// ── H6 ─────────────────────────────────────────────────────────────────────

export interface CierreMensual {
  id: string;
  mes: number;
  año: number;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  notas?: string;
}
