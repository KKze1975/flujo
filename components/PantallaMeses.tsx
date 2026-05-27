"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [year, monthStr] = mes.split("-");
  return `${MESES_FULL[Number(monthStr)]} ${year}`;
}

function mesSiguiente(meses: string[]): string {
  if (meses.length === 0) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  const ultimo = meses[meses.length - 1];
  const [yearStr, monthStr] = ultimo.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export interface ResumenMes {
  mes: string;
  totalPresupuestado: number;
  totalEjecutado: number;
  superavit: number;
  totalIngresos: number;
  ingresoCamilo: number;
  ingresoAngie: number;
  totalPendiente: number;
  totalMovimientos: number;
}

export default function PantallaMeses({
  resúmenes: init,
}: {
  resúmenes: ResumenMes[];
}) {
  const router = useRouter();
  const [resúmenes, setResúmenes] = useState(init);
  const [inicializando, setInicializando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesesExistentes = resúmenes.map((r) => r.mes);
  const próximo = mesSiguiente(mesesExistentes);

  const handleInicializar = async () => {
    setInicializando(true);
    setError(null);
    try {
      const res = await fetch(`/api/mes/${próximo}/iniciar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al inicializar");

      // Fetch resumen del nuevo mes
      const resRes = await fetch("/api/meses");
      const resData = await resRes.json();
      if (resRes.ok) setResúmenes(resData.meses);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setInicializando(false);
    }
  };

  const másReciente = mesesExistentes[mesesExistentes.length - 1];

  return (
    <div className={`min-h-screen bg-gray-50 ${inter.className}`}>

      {/* ── Header ── */}
      <header className="bg-[#1e3a5f] px-6 py-4 shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Flujo</h1>
            <p className="text-xs text-white/60">Salud financiera familiar</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleInicializar}
              disabled={inicializando}
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#1e3a5f] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inicializando ? "Inicializando…" : `Inicializar ${formatMes(próximo)}`}
            </button>
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-10">

        {/* ── Meses activos ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Meses activos
          </h2>
          {resúmenes.length === 0 ? (
            <p className="text-sm text-gray-400">No hay meses activos. Inicializa el primero.</p>
          ) : (
            <div className="space-y-3">
              {[...resúmenes].reverse().map((r) => {
                const esMásReciente = r.mes === másReciente;
                const superavitPos = r.superavit >= 0;
                return (
                  <div
                    key={r.mes}
                    onClick={() => router.push(`/mes/${r.mes}`)}
                    className="cursor-pointer rounded-xl border bg-white px-6 py-5 shadow-sm transition hover:shadow-md"
                    style={esMásReciente ? { borderColor: "#1e3a5f", borderWidth: 2 } : {}}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Título y badge */}
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">{formatMes(r.mes)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {r.totalPendiente > 0
                              ? `${r.totalPendiente} pendientes`
                              : "Sin pendientes"}
                          </p>
                        </div>
                        {esMásReciente && (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: "#1e3a5f" }}
                          >
                            Activo
                          </span>
                        )}
                      </div>

                      {/* Métricas */}
                      <div className="flex gap-8 text-right text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Ingresos</p>
                          <p className="font-medium text-gray-700">{COP(r.totalIngresos)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Presupuestado</p>
                          <p className="font-medium text-gray-700">{COP(r.totalPresupuestado)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Ejecutado</p>
                          <p className="font-medium text-gray-700">{COP(r.totalEjecutado)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Superávit / Déficit</p>
                          <p
                            className="font-semibold"
                            style={{ color: superavitPos ? "#137333" : "#c5221f" }}
                          >
                            {superavitPos ? "+" : ""}{COP(r.superavit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Historial ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Historial
          </h2>
          <p className="text-sm text-gray-400">
            Los meses cerrados aparecerán aquí.
          </p>
        </section>

      </main>
    </div>
  );
}
