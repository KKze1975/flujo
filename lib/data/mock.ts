import type { IDataProvider } from "./index";
import type {
  Semana,
  Concepto,
  Movimiento,
  Bolsillo,
  Consumo,
  ConsumoH3,
  IngresoCamilo,
  IngresoAngie,
  SaldoCuenta,
  CierreSemana,
  PlanSemana,
  CierreMensual,
} from "./types";

export class MockDataProvider implements IDataProvider {
  // ── H1 ───────────────────────────────────────────────────────────────────
  getConceptos(): Promise<Concepto[]> {
    return Promise.resolve([]);
  }
  getConceptoById(_id: string): Promise<Concepto | null> {
    return Promise.resolve(null);
  }
  createConcepto(_data: Omit<Concepto, "id">): Promise<Concepto> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updateConcepto(_id: string, _data: Partial<Omit<Concepto, "id">>): Promise<Concepto> {
    return Promise.resolve(null as unknown as Concepto);
  }
  retirarConcepto(_id: string): Promise<Concepto> {
    return Promise.resolve(null as unknown as Concepto);
  }

  // ── H2 ───────────────────────────────────────────────────────────────────
  getMeses(): Promise<string[]> {
    return Promise.resolve([]);
  }
  getMovimientos(_mes?: string): Promise<Movimiento[]> {
    return Promise.resolve([]);
  }
  getMovimientosByMesYSemana(_mes: string, _semana: Semana): Promise<Movimiento[]> {
    return Promise.resolve([]);
  }
  crearMovimientosMes(_movimientos: Omit<Movimiento, "id">[]): Promise<Movimiento[]> {
    return Promise.resolve([]);
  }
  createMovimiento(_data: Omit<Movimiento, "id">): Promise<Movimiento> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updateMovimiento(_id: string, _data: Partial<Omit<Movimiento, "id">>): Promise<Movimiento> {
    return Promise.resolve(null as unknown as Movimiento);
  }
  ejecutarMovimiento(_id: string): Promise<Movimiento> {
    return Promise.resolve(null as unknown as Movimiento);
  }
  posponerMovimiento(_id: string): Promise<Movimiento> {
    return Promise.resolve(null as unknown as Movimiento);
  }

  // ── H3 ───────────────────────────────────────────────────────────────────
  getBolsillos(): Promise<Bolsillo[]> {
    return Promise.resolve([]);
  }
  getSaldoBolsillo(_id: string): Promise<number> {
    return Promise.resolve(0);
  }
  getSaldoBolsilloAngie(): Promise<number> {
    return Promise.resolve(0);
  }
  createConsumo(_data: Omit<Consumo, "id">): Promise<Consumo> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updateConsumo(_id: string, _data: Partial<Omit<Consumo, "id">>): Promise<Consumo> {
    return Promise.resolve(null as unknown as Consumo);
  }
  getConsumos(_bolsilloId?: string): Promise<Consumo[]> {
    return Promise.resolve([]);
  }
  getGastosSinClasificarPorSemana(_mes: string): Promise<Record<Semana, number>> {
    return Promise.resolve({ S1: 0, S2: 0, S3: 0, S4: 0 });
  }
  getConsumosByMes(_mes: string): Promise<ConsumoH3[]> {
    return Promise.resolve([]);
  }
  getConsumosByMesYSemana(_mes: string, _semana: Semana): Promise<ConsumoH3[]> {
    return Promise.resolve([]);
  }
  updateConsumoH3(_id: string, _data: Partial<Omit<ConsumoH3, "id">>): Promise<ConsumoH3> {
    return Promise.resolve(null as unknown as ConsumoH3);
  }
  deleteConsumoH3(_id: string): Promise<void> {
    return Promise.resolve();
  }

  // ── H4 ───────────────────────────────────────────────────────────────────
  getIngresoCamilo(_mes: string): Promise<IngresoCamilo[]> {
    return Promise.resolve([]);
  }
  createIngresoCamilo(_data: Omit<IngresoCamilo, "id">): Promise<IngresoCamilo> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updateIngresoCamilo(_id: string, _data: Partial<Omit<IngresoCamilo, "id">>): Promise<IngresoCamilo> {
    return Promise.resolve(null as unknown as IngresoCamilo);
  }
  getIngresosAngie(_mes: string): Promise<IngresoAngie[]> {
    return Promise.resolve([]);
  }
  createIngresoAngie(_data: Omit<IngresoAngie, "id">): Promise<IngresoAngie> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updateIngresoAngie(_id: string, _data: Partial<Omit<IngresoAngie, "id">>): Promise<IngresoAngie> {
    return Promise.resolve(null as unknown as IngresoAngie);
  }
  getSaldosCuenta(_mes: string): Promise<SaldoCuenta[]> {
    return Promise.resolve([]);
  }
  upsertSaldosCuenta(_mes: string, _saldos: { cuenta: SaldoCuenta["cuenta"]; saldoInicial: number }[]): Promise<SaldoCuenta[]> {
    return Promise.resolve([]);
  }

  // ── H5 ───────────────────────────────────────────────────────────────────
  getCierreSemana(_mes: string, _semana: Semana): Promise<CierreSemana | null> {
    return Promise.resolve(null);
  }
  getCierresSemana(_mes: string): Promise<CierreSemana[]> {
    return Promise.resolve([]);
  }
  createCierreSemana(_data: Omit<CierreSemana, "id">): Promise<CierreSemana> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  getPlanSemana(_mes: string, _semana: Semana): Promise<PlanSemana | null> {
    return Promise.resolve(null);
  }
  createPlanSemana(_data: Omit<PlanSemana, "id">): Promise<PlanSemana> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
  updatePlanSemana(_id: string, _data: Partial<Omit<PlanSemana, "id">>): Promise<PlanSemana> {
    return Promise.resolve(null as unknown as PlanSemana);
  }

  // ── H6 ───────────────────────────────────────────────────────────────────
  getCierresMensuales(): Promise<CierreMensual[]> {
    return Promise.resolve([]);
  }
  getCierreMensual(_mes: number, _año: number): Promise<CierreMensual | null> {
    return Promise.resolve(null);
  }
  createCierreMensual(_data: Omit<CierreMensual, "id">): Promise<CierreMensual> {
    return Promise.resolve({ id: "mock-1", ..._data });
  }
}
