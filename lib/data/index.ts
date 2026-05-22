import type {
  Semana,
  Concepto,
  Movimiento,
  Bolsillo,
  Consumo,
  IngresoCamilo,
  IngresoAngie,
  CierreSemana,
  PlanSemana,
  CierreMensual,
} from "./types";

export interface IDataProvider {
  // ── H1 ───────────────────────────────────────────────────────────────────
  getConceptos(): Promise<Concepto[]>;
  getConceptoById(id: string): Promise<Concepto | null>;
  createConcepto(data: Omit<Concepto, "id">): Promise<Concepto>;
  updateConcepto(id: string, data: Partial<Omit<Concepto, "id">>): Promise<Concepto>;
  retirarConcepto(id: string): Promise<Concepto>;

  // ── H2 ───────────────────────────────────────────────────────────────────
  getMovimientos(mes?: number): Promise<Movimiento[]>;
  getMovimientosByMesYSemana(mes: number, semana: Semana): Promise<Movimiento[]>;
  createMovimiento(data: Omit<Movimiento, "id">): Promise<Movimiento>;
  updateMovimiento(id: string, data: Partial<Omit<Movimiento, "id">>): Promise<Movimiento>;
  ejecutarMovimiento(id: string): Promise<Movimiento>;
  posponerMovimiento(id: string): Promise<Movimiento>;

  // ── H3 ───────────────────────────────────────────────────────────────────
  getBolsillos(): Promise<Bolsillo[]>;
  getSaldoBolsillo(id: string): Promise<number>;
  getSaldoBolsilloAngie(): Promise<number>;
  createConsumo(data: Omit<Consumo, "id">): Promise<Consumo>;
  updateConsumo(id: string, data: Partial<Omit<Consumo, "id">>): Promise<Consumo>;
  getConsumos(bolsilloId?: string): Promise<Consumo[]>;

  // ── H4 ───────────────────────────────────────────────────────────────────
  getIngresoCamilo(mes: number): Promise<IngresoCamilo[]>;
  createIngresoCamilo(data: Omit<IngresoCamilo, "id">): Promise<IngresoCamilo>;
  updateIngresoCamilo(id: string, data: Partial<Omit<IngresoCamilo, "id">>): Promise<IngresoCamilo>;
  getIngresosAngie(mes: number): Promise<IngresoAngie[]>;
  createIngresoAngie(data: Omit<IngresoAngie, "id">): Promise<IngresoAngie>;

  // ── H5 ───────────────────────────────────────────────────────────────────
  getCierreSemana(mes: number, semana: Semana): Promise<CierreSemana | null>;
  createCierreSemana(data: Omit<CierreSemana, "id">): Promise<CierreSemana>;
  getPlanSemana(mes: number, semana: Semana): Promise<PlanSemana | null>;
  createPlanSemana(data: Omit<PlanSemana, "id">): Promise<PlanSemana>;
  updatePlanSemana(id: string, data: Partial<Omit<PlanSemana, "id">>): Promise<PlanSemana>;

  // ── H6 ───────────────────────────────────────────────────────────────────
  getCierresMensuales(): Promise<CierreMensual[]>;
  getCierreMensual(mes: number, año: number): Promise<CierreMensual | null>;
  createCierreMensual(data: Omit<CierreMensual, "id">): Promise<CierreMensual>;
}

export type { Semana, Concepto, Movimiento, Bolsillo, Consumo, IngresoCamilo, IngresoAngie, CierreSemana, PlanSemana, CierreMensual };
export * from "./types";
