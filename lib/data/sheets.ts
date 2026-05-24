import { google } from "googleapis";
import type { IDataProvider } from "./index";
import type {
  Semana,
  Categoria,
  SemanaDefault,
  TipoConcepto,
  Frecuencia,
  EstadoConcepto,
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

export class SheetsDataProvider implements IDataProvider {
  private readonly sheets;

  constructor() {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  // ── H1 ───────────────────────────────────────────────────────────────────
  async getConceptos(): Promise<Concepto[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H1!A:L",
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) return [];

    const [headers, ...dataRows] = rows;
    const col = (row: string[], name: string) => row[headers.indexOf(name)] ?? "";

    return dataRows
      .filter((row) => row.length > 0 && col(row, "id_concepto"))
      .map((row) => ({
        id: col(row, "id_concepto"),
        nombre: col(row, "nombre"),
        categoria: col(row, "categoria") as Categoria,
        tipo: col(row, "tipo") as TipoConcepto,
        frecuencia: col(row, "frecuencia") as Frecuencia,
        mesActivoBimestral: col(row, "mes_activo_bimestral") || null,
        monto: Number(col(row, "monto_referencia")) || 0,
        semanaDefault: col(row, "semana_default") as SemanaDefault,
        requiereAprobacion: col(row, "requiere_aprobacion").toUpperCase() === "TRUE",
        estado: col(row, "estado_concepto") as EstadoConcepto,
        fechaRetiro: col(row, "fecha_retiro") || null,
        notas: col(row, "notas") || null,
      }));
  }

  getConceptoById(_id: string): Promise<Concepto | null> {
    throw new Error("Not implemented yet");
  }
  createConcepto(_data: Omit<Concepto, "id">): Promise<Concepto> {
    throw new Error("Not implemented yet");
  }
  updateConcepto(_id: string, _data: Partial<Omit<Concepto, "id">>): Promise<Concepto> {
    throw new Error("Not implemented yet");
  }
  retirarConcepto(_id: string): Promise<Concepto> {
    throw new Error("Not implemented yet");
  }

  // ── H2 ───────────────────────────────────────────────────────────────────
  getMovimientos(_mes?: number): Promise<Movimiento[]> {
    throw new Error("Not implemented yet");
  }
  getMovimientosByMesYSemana(_mes: number, _semana: Semana): Promise<Movimiento[]> {
    throw new Error("Not implemented yet");
  }
  createMovimiento(_data: Omit<Movimiento, "id">): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }
  updateMovimiento(_id: string, _data: Partial<Omit<Movimiento, "id">>): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }
  ejecutarMovimiento(_id: string): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }
  posponerMovimiento(_id: string): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }

  // ── H3 ───────────────────────────────────────────────────────────────────
  getBolsillos(): Promise<Bolsillo[]> {
    throw new Error("Not implemented yet");
  }
  getSaldoBolsillo(_id: string): Promise<number> {
    throw new Error("Not implemented yet");
  }
  getSaldoBolsilloAngie(): Promise<number> {
    throw new Error("Not implemented yet");
  }
  createConsumo(_data: Omit<Consumo, "id">): Promise<Consumo> {
    throw new Error("Not implemented yet");
  }
  updateConsumo(_id: string, _data: Partial<Omit<Consumo, "id">>): Promise<Consumo> {
    throw new Error("Not implemented yet");
  }
  getConsumos(_bolsilloId?: string): Promise<Consumo[]> {
    throw new Error("Not implemented yet");
  }

  // ── H4 ───────────────────────────────────────────────────────────────────
  getIngresoCamilo(_mes: number): Promise<IngresoCamilo[]> {
    throw new Error("Not implemented yet");
  }
  createIngresoCamilo(_data: Omit<IngresoCamilo, "id">): Promise<IngresoCamilo> {
    throw new Error("Not implemented yet");
  }
  updateIngresoCamilo(_id: string, _data: Partial<Omit<IngresoCamilo, "id">>): Promise<IngresoCamilo> {
    throw new Error("Not implemented yet");
  }
  getIngresosAngie(_mes: number): Promise<IngresoAngie[]> {
    throw new Error("Not implemented yet");
  }
  createIngresoAngie(_data: Omit<IngresoAngie, "id">): Promise<IngresoAngie> {
    throw new Error("Not implemented yet");
  }

  // ── H5 ───────────────────────────────────────────────────────────────────
  getCierreSemana(_mes: number, _semana: Semana): Promise<CierreSemana | null> {
    throw new Error("Not implemented yet");
  }
  createCierreSemana(_data: Omit<CierreSemana, "id">): Promise<CierreSemana> {
    throw new Error("Not implemented yet");
  }
  getPlanSemana(_mes: number, _semana: Semana): Promise<PlanSemana | null> {
    throw new Error("Not implemented yet");
  }
  createPlanSemana(_data: Omit<PlanSemana, "id">): Promise<PlanSemana> {
    throw new Error("Not implemented yet");
  }
  updatePlanSemana(_id: string, _data: Partial<Omit<PlanSemana, "id">>): Promise<PlanSemana> {
    throw new Error("Not implemented yet");
  }

  // ── H6 ───────────────────────────────────────────────────────────────────
  getCierresMensuales(): Promise<CierreMensual[]> {
    throw new Error("Not implemented yet");
  }
  getCierreMensual(_mes: number, _año: number): Promise<CierreMensual | null> {
    throw new Error("Not implemented yet");
  }
  createCierreMensual(_data: Omit<CierreMensual, "id">): Promise<CierreMensual> {
    throw new Error("Not implemented yet");
  }
}
