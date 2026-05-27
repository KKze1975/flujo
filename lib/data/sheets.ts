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
  EstadoIngresoCamilo,
  CuentaDestino,
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

  // ── H1 helpers ───────────────────────────────────────────────────────────

  private readonly H1_HEADERS = [
    "id_concepto", "nombre", "categoria", "tipo", "frecuencia",
    "mes_activo_bimestral", "monto_referencia", "semana_default",
    "requiere_aprobacion", "estado_concepto", "fecha_retiro", "notas",
  ];

  private rowToConcepto(row: string[], headers: string[]): Concepto {
    const col = (name: string) => row[headers.indexOf(name)] ?? "";
    return {
      id: col("id_concepto"),
      nombre: col("nombre"),
      categoria: col("categoria") as Categoria,
      tipo: col("tipo") as TipoConcepto,
      frecuencia: col("frecuencia") as Frecuencia,
      mesActivoBimestral: col("mes_activo_bimestral") || null,
      monto: Number(col("monto_referencia")) || 0,
      semanaDefault: col("semana_default") as SemanaDefault,
      requiereAprobacion: col("requiere_aprobacion").toUpperCase() === "TRUE",
      estado: col("estado_concepto") as EstadoConcepto,
      fechaRetiro: col("fecha_retiro") || null,
      notas: col("notas") || null,
    };
  }

  private conceptoToRow(c: Concepto): string[] {
    return [
      c.id, c.nombre, c.categoria, c.tipo, c.frecuencia,
      c.mesActivoBimestral ?? "", String(c.monto), c.semanaDefault,
      c.requiereAprobacion ? "TRUE" : "FALSE", c.estado,
      c.fechaRetiro ?? "", c.notas ?? "",
    ];
  }

  // ── H1 ───────────────────────────────────────────────────────────────────

  async getConceptos(): Promise<Concepto[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H1!A:L",
    });
    const rows = res.data.values as string[][] | undefined;
    if (!rows || rows.length < 2) return [];
    const [headers, ...dataRows] = rows;
    return dataRows
      .filter((row) => row.length > 0 && row[headers.indexOf("id_concepto")])
      .map((row) => this.rowToConcepto(row, headers));
  }

  getConceptoById(_id: string): Promise<Concepto | null> {
    throw new Error("Not implemented yet");
  }
  async createConcepto(data: Omit<Concepto, "id">): Promise<Concepto> {
    const categoriaKey = data.categoria
      .normalize("NFD").replace(/\p{Mn}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_");
    const id = `${categoriaKey}_${Date.now()}`;
    const concepto: Concepto = { id, ...data };
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H1!A:L",
      valueInputOption: "RAW",
      requestBody: { values: [this.conceptoToRow(concepto)] },
    });
    return concepto;
  }

  async updateConcepto(id: string, data: Partial<Omit<Concepto, "id">>): Promise<Concepto> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H1!A:L",
    });
    const rows = (res.data.values ?? []) as string[][];
    if (rows.length < 2) throw new Error("H1 vacía");
    const [headers, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex(
      (row) => row[headers.indexOf("id_concepto")] === id
    );
    if (rowIndex === -1) throw new Error(`Concepto ${id} no encontrado`);
    const existing = this.rowToConcepto(dataRows[rowIndex], headers);
    const updated: Concepto = { ...existing, ...data, id };
    const sheetRow = rowIndex + 2;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H1!A${sheetRow}:L${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [this.conceptoToRow(updated)] },
    });
    return updated;
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

  async getMeses(): Promise<string[]> {
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
    const seen = new Set<string>();
    for (const row of dataRows) {
      const m = row[mesIdx];
      if (m) seen.add(m);
    }
    return Array.from(seen).sort();
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

  async getMovimientosByMesYSemana(mes: string, semana: Semana): Promise<Movimiento[]> {
    const todos = await this.getMovimientos(mes);
    return todos.filter((m) => m.semana === semana);
  }
  createMovimiento(_data: Omit<Movimiento, "id">): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }
  async updateMovimiento(id: string, data: Partial<Omit<Movimiento, "id">>): Promise<Movimiento> {
    let rows: string[][];
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H2!A:V",
      });
      rows = (res.data.values ?? []) as string[][];
    } catch {
      throw new Error("Error al leer H2");
    }

    if (rows.length < 2) throw new Error("H2 vacía o sin datos");

    const [headers, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex(
      (row) => row[headers.indexOf("id_movimiento")] === id
    );
    if (rowIndex === -1) throw new Error(`Movimiento ${id} no encontrado`);

    const existing = this.rowToMovimiento(dataRows[rowIndex], headers);
    const updated: Movimiento = { ...existing, ...data, id };
    const newRow = this.movimientoToRow(id, updated);

    const sheetRow = rowIndex + 2; // +1 header row, +1 for 1-based indexing
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H2!A${sheetRow}:V${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });

    return updated;
  }
  ejecutarMovimiento(_id: string): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }
  posponerMovimiento(_id: string): Promise<Movimiento> {
    throw new Error("Not implemented yet");
  }

  // ── H4 helpers ───────────────────────────────────────────────────────────

  private readonly H4A_HEADERS = [
    "id_ingreso", "mes", "monto_cop", "cuenta_destino",
    "estado", "fecha_confirmacion", "notas",
  ];

  private readonly H4B_HEADERS = [
    "id_ingreso", "mes", "semana", "monto", "fecha", "notas",
  ];

  private rowToIngresoCamilo(row: string[], headers: string[]): IngresoCamilo {
    const col = (name: string) => row[headers.indexOf(name)] ?? "";
    return {
      id: col("id_ingreso"),
      mes: col("mes"),
      montoCop: Number(col("monto_cop")) || 0,
      cuentaDestino: col("cuenta_destino") as CuentaDestino,
      estado: col("estado") as EstadoIngresoCamilo,
      fechaConfirmacion: col("fecha_confirmacion") || null,
      notas: col("notas") || null,
    };
  }

  private ingresoCamiloToRow(id: string, ic: Omit<IngresoCamilo, "id">): string[] {
    return [
      id, ic.mes, String(ic.montoCop), ic.cuentaDestino,
      ic.estado, ic.fechaConfirmacion ?? "", ic.notas ?? "",
    ];
  }

  private rowToIngresoAngie(row: string[], headers: string[]): IngresoAngie {
    const col = (name: string) => row[headers.indexOf(name)] ?? "";
    return {
      id: col("id_ingreso"),
      mes: col("mes"),
      semana: col("semana") as Semana,
      monto: Number(col("monto")) || 0,
      fecha: col("fecha"),
      notas: col("notas") || null,
    };
  }

  private ingresoAngieToRow(id: string, ia: Omit<IngresoAngie, "id">): string[] {
    return [id, ia.mes, ia.semana, String(ia.monto), ia.fecha, ia.notas ?? ""];
  }

  private async ensureH4Headers(): Promise<void> {
    let needsCreate = false;
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H4!A1",
      });
      if (res.data.values?.[0]?.[0] === "id_ingreso") return;
    } catch {
      needsCreate = true;
    }
    if (needsCreate) {
      try {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          requestBody: {
            requests: [{ addSheet: { properties: { title: "H4" } } }],
          },
        });
      } catch {
        // Tab ya existe
      }
    }
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: "H4!A1:G1", values: [this.H4A_HEADERS] },
          { range: "H4!I1:N1", values: [this.H4B_HEADERS] },
        ],
      },
    });
  }

  // ── H4 ───────────────────────────────────────────────────────────────────

  async getIngresoCamilo(mes: string): Promise<IngresoCamilo[]> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H4!A:G",
      });
      const rows = (res.data.values ?? []) as string[][];
      if (rows.length < 2) return [];
      const [headers, ...dataRows] = rows;
      const mesIdx = headers.indexOf("mes");
      return dataRows
        .filter((row) => row.length > 0 && row[0] && row[mesIdx] === mes)
        .map((row) => this.rowToIngresoCamilo(row, headers));
    } catch {
      return [];
    }
  }

  async createIngresoCamilo(data: Omit<IngresoCamilo, "id">): Promise<IngresoCamilo> {
    await this.ensureH4Headers();
    const id = `INGRESO_CAM_${Date.now()}`;
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H4!A:G",
      valueInputOption: "RAW",
      requestBody: { values: [this.ingresoCamiloToRow(id, data)] },
    });
    return { id, ...data };
  }

  async updateIngresoCamilo(id: string, data: Partial<Omit<IngresoCamilo, "id">>): Promise<IngresoCamilo> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H4!A:G",
    });
    const rows = (res.data.values ?? []) as string[][];
    if (rows.length < 2) throw new Error("H4 Range A vacía");
    const [headers, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex((row) => row[headers.indexOf("id_ingreso")] === id);
    if (rowIndex === -1) throw new Error(`IngresoCamilo ${id} no encontrado`);
    const existing = this.rowToIngresoCamilo(dataRows[rowIndex], headers);
    const updated: IngresoCamilo = { ...existing, ...data, id };
    const sheetRow = rowIndex + 2;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H4!A${sheetRow}:G${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [this.ingresoCamiloToRow(id, updated)] },
    });
    return updated;
  }

  async getIngresosAngie(mes: string): Promise<IngresoAngie[]> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "H4!I:N",
      });
      const rows = (res.data.values ?? []) as string[][];
      if (rows.length < 2) return [];
      const [headers, ...dataRows] = rows;
      const mesIdx = headers.indexOf("mes");
      return dataRows
        .filter((row) => row.length > 0 && row[0] && row[mesIdx] === mes)
        .map((row) => this.rowToIngresoAngie(row, headers));
    } catch {
      return [];
    }
  }

  async createIngresoAngie(data: Omit<IngresoAngie, "id">): Promise<IngresoAngie> {
    await this.ensureH4Headers();
    const id = `INGRESO_ANG_${Date.now()}`;
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H4!I:N",
      valueInputOption: "RAW",
      requestBody: { values: [this.ingresoAngieToRow(id, data)] },
    });
    return { id, ...data };
  }

  async updateIngresoAngie(id: string, data: Partial<Omit<IngresoAngie, "id">>): Promise<IngresoAngie> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H4!I:N",
    });
    const rows = (res.data.values ?? []) as string[][];
    if (rows.length < 2) throw new Error("H4 Range B vacía");
    const [headers, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex((row) => row[headers.indexOf("id_ingreso")] === id);
    if (rowIndex === -1) throw new Error(`IngresoAngie ${id} no encontrado`);
    const existing = this.rowToIngresoAngie(dataRows[rowIndex], headers);
    const updated: IngresoAngie = { ...existing, ...data, id };
    const sheetRow = rowIndex + 2;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H4!I${sheetRow}:N${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [this.ingresoAngieToRow(id, updated)] },
    });
    return updated;
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

  // ── H5 ───────────────────────────────────────────────────────────────────

  private readonly H5_HEADERS = [
    "id_cierre", "mes", "semana", "fecha_cierre",
    "total_presupuestado", "total_ejecutado", "desviacion_total",
    "remanente_angie", "ubicacion_remanente_angie",
    "conceptos_pospuestos", "conceptos_no_aplica", "gastos_sin_clasificar",
    "cerrado_por", "notas",
  ];

  private cierreSemanaToRow(c: CierreSemana): string[] {
    return [
      c.id, c.mes, c.semana, c.fechaCierre,
      String(c.totalPresupuestado), String(c.totalEjecutado), String(c.desviacionTotal),
      String(c.remanenteAngie), c.ubicacionRemanenteAngie,
      String(c.conceptosPospuestos), String(c.conceptosNoAplica), String(c.gastosSinClasificar),
      c.cerradoPor, c.notas ?? "",
    ];
  }

  private async ensureH5(): Promise<void> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    const exists = meta.data.sheets?.some(s => s.properties?.title === "H5");
    if (!exists) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: "H5" } } }] },
      });
    }
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H5!A1",
      valueInputOption: "RAW",
      requestBody: { values: [this.H5_HEADERS] },
    });
  }

  getCierreSemana(_mes: string, _semana: Semana): Promise<CierreSemana | null> {
    throw new Error("Not implemented yet");
  }

  async createCierreSemana(data: Omit<CierreSemana, "id">): Promise<CierreSemana> {
    await this.ensureH5();
    const id = `CIERRE_${Date.now()}`;
    const cierre: CierreSemana = { id, ...data };
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H5!A:N",
      valueInputOption: "RAW",
      requestBody: { values: [this.cierreSemanaToRow(cierre)] },
    });
    return cierre;
  }

  getPlanSemana(_mes: string, _semana: Semana): Promise<PlanSemana | null> {
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
