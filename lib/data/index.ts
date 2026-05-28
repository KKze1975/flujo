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
  getMeses(): Promise<string[]>;
  getMovimientos(mes?: string): Promise<Movimiento[]>;
  getMovimientosByMesYSemana(mes: string, semana: Semana): Promise<Movimiento[]>;
  crearMovimientosMes(movimientos: Omit<Movimiento, "id">[]): Promise<Movimiento[]>;
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
  getGastosSinClasificarPorSemana(mes: string): Promise<Record<Semana, number>>;

  // ── H4 ───────────────────────────────────────────────────────────────────
  getIngresoCamilo(mes: string): Promise<IngresoCamilo[]>;
  createIngresoCamilo(data: Omit<IngresoCamilo, "id">): Promise<IngresoCamilo>;
  updateIngresoCamilo(id: string, data: Partial<Omit<IngresoCamilo, "id">>): Promise<IngresoCamilo>;
  getIngresosAngie(mes: string): Promise<IngresoAngie[]>;
  createIngresoAngie(data: Omit<IngresoAngie, "id">): Promise<IngresoAngie>;
  updateIngresoAngie(id: string, data: Partial<Omit<IngresoAngie, "id">>): Promise<IngresoAngie>;

  // ── H5 ───────────────────────────────────────────────────────────────────
  getCierreSemana(mes: string, semana: Semana): Promise<CierreSemana | null>;
  getCierresSemana(mes: string): Promise<CierreSemana[]>;
  createCierreSemana(data: Omit<CierreSemana, "id">): Promise<CierreSemana>;
  getPlanSemana(mes: string, semana: Semana): Promise<PlanSemana | null>;
  createPlanSemana(data: Omit<PlanSemana, "id">): Promise<PlanSemana>;
  updatePlanSemana(id: string, data: Partial<Omit<PlanSemana, "id">>): Promise<PlanSemana>;

  // ── H6 ───────────────────────────────────────────────────────────────────
  getCierresMensuales(): Promise<CierreMensual[]>;
  getCierreMensual(mes: number, año: number): Promise<CierreMensual | null>;
  createCierreMensual(data: Omit<CierreMensual, "id">): Promise<CierreMensual>;
}

export type { Semana, Concepto, Movimiento, Bolsillo, Consumo, IngresoCamilo, IngresoAngie, CierreSemana, PlanSemana, CierreMensual };
export * from "./types";
