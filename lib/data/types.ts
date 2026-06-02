// ── Enums ──────────────────────────────────────────────────────────────────

export type Semana = "S1" | "S2" | "S3" | "S4";
export type Actor = "camilo" | "angie";
export type TipoConcepto = "fijo" | "bolsillo" | "discrecional";
export type Frecuencia = "mensual" | "bimestral" | "semanal";
export type EstadoConcepto = "activo" | "retirado";
export type EstadoMovimiento = "pendiente" | "ejecutado" | "pospuesto" | "no_aplica" | "pospuesto_mes_siguiente";
export type EstadoIngresoCamilo = "pendiente" | "confirmado";
export type Confianza = "alta" | "media" | "baja";
export type Categoria =
  | "Casa"
  | "Servicios Públicos"
  | "Membresías y Suscripciones"
  | "Educación"
  | "Salud"
  | "Mercado y Alimentación"
  | "Compromisos Financieros"
  | "Recreación"
  | "Transporte"
  | "Metas Familiares"
  | "Frida"
  | "Hijos"
  | "Servicio Domestico";
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
  id: string;                        // id_movimiento — MOV_{unix_timestamp}
  conceptoId: string;                // id_concepto — FK a H1
  mes: string;                       // "2026-05"
  nombreSnapshot: string;            // copia inmutable del nombre de H1
  categoriaSnapshot: Categoria;      // copia inmutable de categoria
  tipoSnapshot: TipoConcepto;        // copia inmutable de tipo
  semana: Semana | null;             // null si semana_default = variable
  montoPresupuestado: number;        // monto_referencia de H1, incluyendo 0
  montoEjecutado: number | null;     // null si no ejecutado
  desviacion: number | null;         // null si no ejecutado
  estado: EstadoMovimiento;
  ejecutor: Actor | null;
  fuenteEnMano: boolean;
  fuenteNequi: boolean;
  fuenteCamilo: boolean;
  fuenteAngie: boolean;
  fechaEjecucion: string | null;
  razonDesviacion: string | null;
  razonPostergacion: string | null;
  comprobanteUrl: string | null;
  pendienteAprobacion: boolean;
  notas: string | null;
}

// ── H3 ─────────────────────────────────────────────────────────────────────

export interface ConsumoH3 {
  id: string;
  bolsilloId: string;
  mes: string;
  semana: Semana;
  descripcion: string;
  monto: number;
  ejecutor: Actor;
  fuenteEnMano: boolean;
  fuenteNequi: boolean;
  fuenteCamilo: boolean;
  fuenteAngie: boolean;
  fecha: string;
  comprobanteUrl: string | null;
  clasificado: boolean;
}

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

export type CuentaDestino = "en_mano" | "nequi" | "camilo" | "angie";
export type CuentaH4C = "nu_camilo" | "nu_angie" | "arq" | "en_mano";

export type CuentaDestinoAngie = "nu_angie" | "en_mano";

export interface RecargaAngie {
  id: string;
  mes: string;
  semana: Semana;
  monto: number;
  fecha: string;
  registradoPor: string;
  cuentaDestino: CuentaDestinoAngie;
  notas: string | null;
}

export interface SaldoCuenta {
  id: string;
  mes: string;                  // "2026-05"
  cuenta: CuentaH4C;
  saldoInicial: number;         // COP
  fechaConfirmacion: string;    // "2026-05-01"
}

export interface IngresoCamilo {
  id: string;
  mes: string;                  // "2026-05"
  montoCop: number;             // COP
  cuentaDestino: CuentaDestino;
  estado: EstadoIngresoCamilo;  // "pendiente" | "confirmado"
  fechaConfirmacion: string | null;
  notas: string | null;
}

export interface IngresoAngie {
  id: string;
  mes: string;     // "2026-05"
  semana: Semana;
  monto: number;
  fecha: string;
  notas: string | null;
}

// ── H5 ─────────────────────────────────────────────────────────────────────

export interface CierreSemana {
  id: string;                         // CIERRE_{unix_timestamp}
  mes: string;                        // "2026-05"
  semana: Semana;
  fechaCierre: string;                // "2026-05-07"
  totalPresupuestado: number;
  totalEjecutado: number;
  desviacionTotal: number;
  remanenteAngie: number;
  ubicacionRemanenteAngie: string;
  conceptosPospuestos: number;
  conceptosNoAplica: number;
  gastosSinClasificar: number;
  cerradoPor: Actor;
  notas: string | null;
}

export interface PlanSemana {
  id: string;
  mes: string;                   // "2026-05"
  semana: Semana;                // semana planificada (siguiente al cierre)
  fechaPlan: string;             // "2026-05-07"
  aporteAngiePlaneado: number;
  remanenteAngieArrastrado: number;
  totalComprometido: number;
  balanceProyectado: number;
  notas: string | null;
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
