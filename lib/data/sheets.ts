import { google } from "googleapis";
import type { IDataProvider } from "./index";
import type {
  Semana,
  Categoria,
  SemanaDefault,
  TipoConcepto,
  Frecuencia,
  EstadoConcepto,
  EstadoMovimiento,
  Actor,
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

  private readonly H2_HEADERS = [
    "id_movimiento", "id_concepto", "mes", "nombre_snapshot",
    "categoria_snapshot", "tipo_snapshot", "semana",
    "monto_presupuestado", "monto_ejecutado", "desviacion", "estado",
    "ejecutor", "fuente_en_mano", "fuente_nequi", "fuente_camilo", "fuente_angie",
    "fecha_ejecucion", "razon_desviacion", "razon_postergacion",
    "comprobante_url", "pendiente_aprobacion", "notas",
  ];

  private rowToMovimiento(row: string[], headers: string[]): Movimiento {
    const col = (name: string) => row[headers.indexOf(name)] ?? "";
    return {
      id: col("id_movimiento"),
      conceptoId: col("id_concepto"),
      mes: col("mes"),
      nombreSnapshot: col("nombre_snapshot"),
      categoriaSnapshot: col("categoria_snapshot") as Categoria,
      tipoSnapshot: col("tipo_snapshot") as TipoConcepto,
      semana: (col("semana") || null) as Semana | null,
      montoPresupuestado: Number(col("monto_presupuestado")) || 0,
      montoEjecutado: col("monto_ejecutado") ? Number(col("monto_ejecutado")) : null,
      desviacion: col("desviacion") ? Number(col("desviacion")) : null,
      estado: col("estado") as EstadoMovimiento,
      ejecutor: (col("ejecutor") || null) as Actor | null,
      fuenteEnMano: col("fuente_en_mano").toUpperCase() === "TRUE",
      fuenteNequi: col("fuente_nequi").toUpperCase() === "TRUE",
      fuenteCamilo: col("fuente_camilo").toUpperCase() === "TRUE",
      fuenteAngie: col("fuente_angie").toUpperCase() === "TRUE",
      fechaEjecucion: col("fecha_ejecucion") || null,
      razonDesviacion: col("razon_desviacion") || null,
      razonPostergacion: col("razon_postergacion") || null,
      comprobanteUrl: col("comprobante_url") || null,
      pendienteAprobacion: col("pendiente_aprobacion").toUpperCase() === "TRUE",
      notas: col("notas") || null,
    };
  }

  private movimientoToRow(id: string, m: Omit<Movimiento, "id">): string[] {
    return [
      id,
      m.conceptoId,
      m.mes,
      m.nombreSnapshot,
      m.categoriaSnapshot,
      m.tipoSnapshot,
      m.semana ?? "",
      String(m.montoPresupuestado),
      m.montoEjecutado != null ? String(m.montoEjecutado) : "",
      m.desviacion != null ? String(m.desviacion) : "",
      m.estado,
      m.ejecutor ?? "",
      m.fuenteEnMano ? "TRUE" : "FALSE",
      m.fuenteNequi ? "TRUE" : "FALSE",
      m.fuenteCamilo ? "TRUE" : "FALSE",
      m.fuenteAngie ? "TRUE" : "FALSE",
      m.fechaEjecucion ?? "",
      m.razonDesviacion ?? "",
      m.razonPostergacion ?? "",
      m.comprobanteUrl ?? "",
      m.pendienteAprobacion ? "TRUE" : "FALSE",
      m.notas ?? "",
    ];
  }

  private async ensureH2Headers(): Promise<void> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H2!A1",
      });
      if (res.data.values?.[0]?.[0] === "id_movimiento") return;
    } catch {
      // H2 tab might not exist — write will create it if the tab exists
    }
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H2!A1",
      valueInputOption: "RAW",
      requestBody: { values: [this.H2_HEADERS] },
    });
  }

  async getMovimientos(mes?: string): Promise<Movimiento[]> {
    let rows: string[][];
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H2!A:V",
      });
      rows = (res.data.values ?? []) as string[][];
    } catch {
      return [];
    }
    if (rows.length < 2) return [];
    const [headers, ...dataRows] = rows;
    const mesIdx = headers.indexOf("mes");
    return dataRows
      .filter((row) => row.length > 0 && row[0])
      .filter((row) => !mes || row[mesIdx] === mes)
      .map((row) => this.rowToMovimiento(row, headers));
  }

  async crearMovimientosMes(movimientos: Omit<Movimiento, "id">[]): Promise<Movimiento[]> {
    await this.ensureH2Headers();
    const base = Date.now();
    const rows = movimientos.map((m, i) =>
      this.movimientoToRow(`MOV_${base + i}`, m)
    );
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H2!A:V",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
    return movimientos.map((m, i) => ({ id: `MOV_${base + i}`, ...m }));
  }

  getMovimientosByMesYSemana(_mes: string, _semana: Semana): Promise<Movimiento[]> {
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
