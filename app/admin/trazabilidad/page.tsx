"use client";

import { useState } from "react";
import type { Movimiento, ConsumoH3, RecargaAngie, SaldoCuenta } from "@/lib/data/types";

type Snapshot = {
  h2: Movimiento[];
  h3b: ConsumoH3[];
  h4d: RecargaAngie[];
  h4c: SaldoCuenta[];
};

type FilaModificada = { id: string; campo: string; antes: unknown; despues: unknown };
type ImpactoItem = { id: string; regla: string; ok: boolean; detalle: string };
type HojaDiff = {
  nuevas: Record<string, unknown>[];
  modificadas: FilaModificada[];
  impacto: ImpactoItem[];
};
type DiffResult = { h2: HojaDiff; h3b: HojaDiff; h4d: HojaDiff; h4c: HojaDiff };

async function capturar(mes: string): Promise<Snapshot> {
  const [h2Res, c1, c2, c3, c4, r1, r2, r3, r4, h4cRes] = await Promise.all([
    fetch(`/api/mes/${mes}`).then((r) => r.json()),
    fetch(`/api/mes/${mes}/consumos/S1`).then((r) => r.json()),
    fetch(`/api/mes/${mes}/consumos/S2`).then((r) => r.json()),
    fetch(`/api/mes/${mes}/consumos/S3`).then((r) => r.json()),
    fetch(`/api/mes/${mes}/consumos/S4`).then((r) => r.json()),
    fetch(`/api/ingresos/angie/${mes}/recargas/S1`).then((r) => r.json()),
    fetch(`/api/ingresos/angie/${mes}/recargas/S2`).then((r) => r.json()),
    fetch(`/api/ingresos/angie/${mes}/recargas/S3`).then((r) => r.json()),
    fetch(`/api/ingresos/angie/${mes}/recargas/S4`).then((r) => r.json()),
    fetch(`/api/mes/${mes}/saldos`).then((r) => r.json()),
  ]);
  return {
    h2: Array.isArray(h2Res) ? (h2Res as Movimiento[]) : [],
    h3b: [
      ...(c1.consumos ?? []),
      ...(c2.consumos ?? []),
      ...(c3.consumos ?? []),
      ...(c4.consumos ?? []),
    ] as ConsumoH3[],
    h4d: [
      ...(r1.recargas ?? []),
      ...(r2.recargas ?? []),
      ...(r3.recargas ?? []),
      ...(r4.recargas ?? []),
    ] as RecargaAngie[],
    h4c: Array.isArray(h4cRes) ? (h4cRes as SaldoCuenta[]) : [],
  };
}

function diffHoja<T extends { id: string }>(
  before: T[],
  after: T[]
): { nuevas: T[]; modificadas: FilaModificada[] } {
  const beforeMap = new Map(before.map((r) => [r.id, r]));
  const nuevas: T[] = [];
  const modificadas: FilaModificada[] = [];

  for (const row of after) {
    const prev = beforeMap.get(row.id);
    if (!prev) {
      nuevas.push(row);
    } else {
      for (const key of Object.keys(row) as (keyof T)[]) {
        const vAfter = row[key];
        const vBefore = prev[key];
        if (JSON.stringify(vAfter) !== JSON.stringify(vBefore)) {
          modificadas.push({
            id: row.id,
            campo: String(key),
            antes: vBefore,
            despues: vAfter,
          });
        }
      }
    }
  }

  return { nuevas, modificadas };
}

function calcImpactoH2(
  modificadas: FilaModificada[],
  afterMap: Map<string, Movimiento>
): ImpactoItem[] {
  const items: ImpactoItem[] = [];
  const estadoCambios = modificadas.filter(
    (m) => m.campo === "estado" && m.despues === "ejecutado"
  );
  const fuenteAngieCambios = modificadas.filter(
    (m) => m.campo === "fuenteAngie" && m.despues === true
  );

  for (const { id } of estadoCambios) {
    const row = afterMap.get(id);
    if (!row) continue;
    const montoOk = (row.montoEjecutado ?? 0) > 0;
    const fuenteOk =
      row.fuenteEnMano || row.fuenteNequi || row.fuenteCamilo || row.fuenteAngie;
    const fechaOk = row.fechaEjecucion != null;
    const ok = montoOk && fuenteOk && fechaOk;
    const detalles = [
      montoOk ? "monto OK" : `monto=${row.montoEjecutado ?? 0}`,
      fuenteOk ? "fuente OK" : "fuente no seteada",
      fechaOk ? "fecha OK" : "fechaEjecucion null",
    ];
    items.push({ id, regla: "estado→ejecutado", ok, detalle: detalles.join(", ") });
  }

  const fuenteAngieIds = new Set(fuenteAngieCambios.map((m) => m.id));
  for (const id of fuenteAngieIds) {
    const row = afterMap.get(id);
    if (!row) continue;
    const ok = row.idRecargaOrigen != null;
    items.push({
      id,
      regla: "fuenteAngie=true",
      ok,
      detalle: ok ? `idRecargaOrigen=${row.idRecargaOrigen}` : "idRecargaOrigen es null",
    });
  }

  return items;
}

function calcImpactoH3b(nuevas: ConsumoH3[]): ImpactoItem[] {
  return nuevas.map((row) => {
    const clasificadoOk = row.clasificado === true;
    const bolsilloOk = !!row.bolsilloId;
    const ok = clasificadoOk && bolsilloOk;
    const detalles = [
      clasificadoOk ? "clasificado OK" : "clasificado=false",
      bolsilloOk ? `bolsillo=${row.bolsilloId}` : "bolsilloId ausente",
    ];
    return { id: row.id, regla: "nueva fila H3B", ok, detalle: detalles.join(", ") };
  });
}

function calcImpactoH4d(nuevasH4d: RecargaAngie[], h4cDiff: HojaDiff): ImpactoItem[] {
  const h4cTieneModif = h4cDiff.modificadas.length > 0 || h4cDiff.nuevas.length > 0;
  return nuevasH4d.map((row) => ({
    id: row.id,
    regla: "nueva recarga H4D",
    ok: h4cTieneModif,
    detalle: h4cTieneModif ? "H4C tiene modificación" : "H4C sin cambios",
  }));
}

function calcDiff(before: Snapshot, after: Snapshot): DiffResult {
  const { nuevas: h2Nuevas, modificadas: h2Mod } = diffHoja(before.h2, after.h2);
  const { nuevas: h3bNuevas, modificadas: h3bMod } = diffHoja(before.h3b, after.h3b);
  const { nuevas: h4dNuevas, modificadas: h4dMod } = diffHoja(before.h4d, after.h4d);
  const { nuevas: h4cNuevas, modificadas: h4cMod } = diffHoja(before.h4c, after.h4c);

  const h2AfterMap = new Map(after.h2.map((r) => [r.id, r]));
  const h4cDiff: HojaDiff = {
    nuevas: h4cNuevas as unknown as Record<string, unknown>[],
    modificadas: h4cMod,
    impacto: [],
  };

  return {
    h2: {
      nuevas: h2Nuevas as unknown as Record<string, unknown>[],
      modificadas: h2Mod,
      impacto: calcImpactoH2(h2Mod, h2AfterMap),
    },
    h3b: {
      nuevas: h3bNuevas as unknown as Record<string, unknown>[],
      modificadas: h3bMod,
      impacto: calcImpactoH3b(h3bNuevas),
    },
    h4d: {
      nuevas: h4dNuevas as unknown as Record<string, unknown>[],
      modificadas: h4dMod,
      impacto: calcImpactoH4d(h4dNuevas, h4cDiff),
    },
    h4c: h4cDiff,
  };
}

function snapLabel(snap: Snapshot): string {
  return `${snap.h2.length} mov / ${snap.h3b.length} consumos / ${snap.h4d.length} recargas / ${snap.h4c.length} saldos`;
}

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "4px 8px",
  verticalAlign: "top",
  fontFamily: "monospace",
  fontSize: 12,
};
const thStyle: React.CSSProperties = { ...tdStyle, background: "#f0f0f0", fontWeight: "bold" };

function HojaDiffView({ label, hoja }: { label: string; hoja: HojaDiff }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 6, borderBottom: "1px solid #999", paddingBottom: 4 }}>
        {label}
      </h3>

      <p style={{ margin: "4px 0" }}>
        <strong>Nuevas ({hoja.nuevas.length})</strong>
      </p>
      {hoja.nuevas.length === 0 ? (
        <p style={{ color: "#888", margin: "2px 0 8px" }}>—</p>
      ) : (
        <table style={{ borderCollapse: "collapse", marginBottom: 8, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>id</th>
              {Object.keys(hoja.nuevas[0]).map((k) => (
                <th key={k} style={thStyle}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hoja.nuevas.map((row) => (
              <tr key={String(row.id)}>
                <td style={tdStyle}>{String(row.id)}</td>
                {Object.values(row).map((v, i) => (
                  <td key={i} style={tdStyle}>
                    {JSON.stringify(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ margin: "4px 0" }}>
        <strong>Modificadas ({hoja.modificadas.length})</strong>
      </p>
      {hoja.modificadas.length === 0 ? (
        <p style={{ color: "#888", margin: "2px 0 8px" }}>—</p>
      ) : (
        <table style={{ borderCollapse: "collapse", marginBottom: 8, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>id</th>
              <th style={thStyle}>campo</th>
              <th style={thStyle}>antes</th>
              <th style={thStyle}>después</th>
            </tr>
          </thead>
          <tbody>
            {hoja.modificadas.map((m, i) => (
              <tr key={i}>
                <td style={tdStyle}>{m.id}</td>
                <td style={tdStyle}>{m.campo}</td>
                <td style={{ ...tdStyle, color: "#c00" }}>{JSON.stringify(m.antes)}</td>
                <td style={{ ...tdStyle, color: "#070" }}>{JSON.stringify(m.despues)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hoja.impacto.length > 0 && (
        <>
          <p style={{ margin: "4px 0" }}>
            <strong>Impacto ({hoja.impacto.length})</strong>
          </p>
          <table style={{ borderCollapse: "collapse", marginBottom: 8, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>estado</th>
                <th style={thStyle}>id</th>
                <th style={thStyle}>regla</th>
                <th style={thStyle}>detalle</th>
              </tr>
            </thead>
            <tbody>
              {hoja.impacto.map((item, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{item.ok ? "✅" : "❌"}</td>
                  <td style={tdStyle}>{item.id}</td>
                  <td style={tdStyle}>{item.regla}</td>
                  <td style={tdStyle}>{item.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export default function TrazabilidadPage() {
  const [mes, setMes] = useState("2026-06");
  const [snapBefore, setSnapBefore] = useState<Snapshot | null>(null);
  const [snapAfter, setSnapAfter] = useState<Snapshot | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapturar(target: "before" | "after") {
    setLoading(true);
    setError(null);
    try {
      const snap = await capturar(mes);
      if (target === "before") {
        setSnapBefore(snap);
        setSnapAfter(null);
        setDiff(null);
      } else {
        setSnapAfter(snap);
        setDiff(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al capturar");
    } finally {
      setLoading(false);
    }
  }

  function handleDiff() {
    if (!snapBefore || !snapAfter) return;
    setDiff(calcDiff(snapBefore, snapAfter));
  }

  function handleLimpiar() {
    setSnapBefore(null);
    setSnapAfter(null);
    setDiff(null);
    setError(null);
  }

  const btnStyle: React.CSSProperties = {
    padding: "6px 14px",
    marginRight: 8,
    cursor: loading ? "not-allowed" : "pointer",
    border: "1px solid #999",
    borderRadius: 4,
    background: "#f8f8f8",
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 16 }}>Trazabilidad — Admin</h1>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <label htmlFor="mes-input">Mes:</label>
        <input
          id="mes-input"
          type="text"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          placeholder="2026-06"
          style={{ padding: "4px 8px", border: "1px solid #999", borderRadius: 4, width: 100 }}
        />
        <button
          style={btnStyle}
          disabled={loading}
          onClick={() => handleCapturar("before")}
        >
          Capturar ANTES
        </button>
        <button
          style={{ ...btnStyle, opacity: snapBefore ? 1 : 0.5 }}
          disabled={loading || !snapBefore}
          onClick={() => handleCapturar("after")}
        >
          Capturar DESPUÉS
        </button>
        <button
          style={{ ...btnStyle, opacity: snapBefore && snapAfter ? 1 : 0.5 }}
          disabled={!snapBefore || !snapAfter}
          onClick={handleDiff}
        >
          Ver diff
        </button>
        <button style={btnStyle} onClick={handleLimpiar}>
          Limpiar
        </button>
        {loading && <span style={{ color: "#888" }}>Cargando…</span>}
      </div>

      <div style={{ marginBottom: 16, fontSize: 13, color: "#444" }}>
        <strong>ANTES:</strong>{" "}
        {snapBefore ? (
          <span style={{ color: "#070" }}>✓ {snapLabel(snapBefore)}</span>
        ) : (
          <span style={{ color: "#888" }}>pendiente</span>
        )}
        {"  |  "}
        <strong>DESPUÉS:</strong>{" "}
        {snapAfter ? (
          <span style={{ color: "#070" }}>✓ {snapLabel(snapAfter)}</span>
        ) : (
          <span style={{ color: "#888" }}>pendiente</span>
        )}
      </div>

      {error && (
        <p style={{ color: "#c00", background: "#fee", padding: "8px 12px", borderRadius: 4 }}>
          Error: {error}
        </p>
      )}

      {diff && (
        <div>
          <HojaDiffView label="H2 — Movimientos" hoja={diff.h2} />
          <HojaDiffView label="H3B — Consumos" hoja={diff.h3b} />
          <HojaDiffView label="H4D — Recargas Angie" hoja={diff.h4d} />
          <HojaDiffView label="H4C — Saldos" hoja={diff.h4c} />
        </div>
      )}
    </div>
  );
}
