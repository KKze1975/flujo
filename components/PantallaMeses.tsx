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

export interface MetricasMes {
  semana: string;
  disponibleSemana: number;
  totalEjecutado: number;
  totalPresupuestado: number;
  pctEjecutado: number;
  semanasCerradas: number;
  mes: string;
  recaudoSemana: number;
  ejecutadoSemana: number;
  disponibleSemanaSnapshot: number;
}

export default function PantallaMeses({
  resúmenes: init,
  metricas,
}: {
  resúmenes: ResumenMes[];
  metricas: MetricasMes | null;
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/registro")}
              className="rounded-lg bg-white/15 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/25 border border-white/20"
            >
              + Registro rápido
            </button>
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
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-10">

        {/* ── Métricas ── */}
        {metricas && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {formatMes(metricas.mes)} · {metricas.semana}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">

              {/* M1: Disponible esta semana */}
              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Disponible {metricas.semana}</p>
                <p
                  className="text-2xl font-semibold"
                  style={{ color: metricas.disponibleSemana >= 0 ? "#137333" : "#c5221f" }}
                >
                  {metricas.disponibleSemana >= 0 ? "" : "-"}
                  {COP(Math.abs(metricas.disponibleSemana))}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ingreso semana menos pendientes
                </p>
              </div>

              {/* M2: Ejecutado vs presupuestado */}
              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Ejecutado vs presupuestado</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {metricas.pctEjecutado}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {COP(metricas.totalEjecutado)} / {COP(metricas.totalPresupuestado)}
                </p>
              </div>

              {/* M3: Semanas cerradas */}
              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Semanas cerradas</p>
                {metricas.semanasCerradas === 0 ? (
                  <p className="text-sm text-gray-400 mt-2">sin cierres aún</p>
                ) : (
                  <p className="text-2xl font-semibold text-gray-800">
                    {metricas.semanasCerradas} / 4
                  </p>
                )}
              </div>

            </div>

            {/* ── Snapshot semana activa ── */}
            <h3 className="mt-5 mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Semana activa — snapshot {metricas.semana}
            </h3>
            <div className="grid grid-cols-3 gap-4">

              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Recaudo {metricas.semana}</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {COP(metricas.recaudoSemana)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {metricas.semana === "S1" ? "Angie + Camilo" : "Angie"}
                </p>
              </div>

              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Ejecutado {metricas.semana}</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {COP(metricas.ejecutadoSemana)}
                </p>
                <p className="text-xs text-gray-400 mt-1">pagos confirmados</p>
              </div>

              <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Disponible {metricas.semana}</p>
                <p
                  className="text-2xl font-semibold"
                  style={{ color: metricas.disponibleSemanaSnapshot >= 0 ? "#137333" : "#c5221f" }}
                >
                  {metricas.disponibleSemanaSnapshot >= 0 ? "" : "-"}
                  {COP(Math.abs(metricas.disponibleSemanaSnapshot))}
                </p>
                <p className="text-xs text-gray-400 mt-1">recaudo menos ejecutado</p>
              </div>

            </div>
          </section>
        )}

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
