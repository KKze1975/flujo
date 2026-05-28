"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import RegistroRapido from "@/components/m4/RegistroRapido";

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

export interface HubMetricas {
  totalEjecutado: number;
  totalPresupuestado: number;
  pctEjecutado: number;
  semanasCerradas: number;
  disponibleSemana: number;
}

export default function HomeHub({
  mesActivo,
  semanaActiva,
  metricas,
}: {
  mesActivo: string | null;
  semanaActiva: string;
  metricas: HubMetricas | null;
}) {
  const router = useRouter();
  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalDinero, setModalDinero] = useState(false);

  const destSemana = mesActivo ? `/mes/${mesActivo}/semana` : "/meses";

  return (
    <div
      className={`min-h-screen flex flex-col ${inter.className}`}
      style={{ background: "#f0f4f8" }}
    >
      {/* Header */}
      <header
        className="px-5 pt-12 pb-8 text-white"
        style={{ background: "#1e3a5f" }}
      >
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
          Flujo · Salud financiera familiar
        </p>
        <h1 className="text-2xl font-semibold text-white leading-tight">
          {mesActivo ? formatMes(mesActivo) : "Sin mes activo"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          Semana activa: <span className="font-medium text-white">{semanaActiva}</span>
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 pt-6 pb-28 space-y-5 max-w-lg mx-auto w-full">

        {/* Acciones principales */}
        <div className="space-y-3">

          {/* Esta semana */}
          <button
            type="button"
            onClick={() => router.push(destSemana)}
            className="w-full rounded-2xl bg-white shadow-sm px-5 py-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div>
              <p className="font-semibold text-gray-900 text-base">Esta semana</p>
              <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
                {semanaActiva} · Gastos y registro diario
              </p>
            </div>
            <span className="text-2xl ml-3">📅</span>
          </button>

          {/* Inicio de mes */}
          <button
            type="button"
            onClick={() => router.push("/meses")}
            className="w-full rounded-2xl bg-white shadow-sm px-5 py-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div>
              <p className="font-semibold text-gray-900 text-base">Inicio de mes</p>
              <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
                Planificación · Ejecución M1
              </p>
            </div>
            <span className="text-2xl ml-3">📋</span>
          </button>

          {/* Historial */}
          <button
            type="button"
            onClick={() => router.push("/meses?modo=historial")}
            className="w-full rounded-2xl bg-white shadow-sm px-5 py-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div>
              <p className="font-semibold text-gray-900 text-base">Historial</p>
              <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
                Meses anteriores · solo lectura
              </p>
            </div>
            <span className="text-2xl ml-3">🗂️</span>
          </button>

        </div>

        {/* Métricas del mes activo */}
        {metricas && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#9ca3af" }}
            >
              Mes activo · contexto
            </p>
            <div
              className="rounded-2xl bg-white shadow-sm px-5 py-4 space-y-3"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >

              {/* Barra ejecutado */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm" style={{ color: "#6b7280" }}>Ejecutado</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {metricas.pctEjecutado}% · {COP(metricas.totalEjecutado)}
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: "#e5e7eb" }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(metricas.pctEjecutado, 100)}%`,
                      background: "#1e3a5f",
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  de {COP(metricas.totalPresupuestado)} presupuestado
                </p>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: "1px solid #f3f4f6" }} />

              {/* Disponible semana */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "#6b7280" }}>
                  Disponible {semanaActiva}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: metricas.disponibleSemana >= 0 ? "#137333" : "#c5221f" }}
                >
                  {metricas.disponibleSemana >= 0 ? "" : "−"}
                  {COP(Math.abs(metricas.disponibleSemana))}
                </span>
              </div>

              {/* Semanas cerradas */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "#6b7280" }}>Semanas cerradas</span>
                <span className="text-sm font-medium text-gray-700">
                  {metricas.semanasCerradas === 0 ? "ninguna aún" : `${metricas.semanasCerradas} / 4`}
                </span>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FABs — apilados, esquina inferior derecha */}
      <div className="fixed bottom-6 right-5 flex flex-col gap-3 items-center z-40">
        {/* FAB relámpago (arriba) — registro rápido de compra */}
        <button
          type="button"
          onClick={() => setModalRegistro(true)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl text-white active:scale-95 transition-transform"
          style={{ background: "#1e3a5f" }}
          aria-label="Registro rápido de compra"
        >
          ⚡
        </button>
        {/* FAB dinero (abajo) — próximamente */}
        <button
          type="button"
          onClick={() => setModalDinero(true)}
          className="w-12 h-12 rounded-full shadow-md flex items-center justify-center text-lg text-white active:scale-95 transition-transform"
          style={{ background: "#2d5a8e" }}
          aria-label="Ingreso a bolsillo"
        >
          💰
        </button>
      </div>

      {/* Modal — Registro rápido */}
      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          {/* Tap fuera cierra */}
          <div className="flex-1" onClick={() => setModalRegistro(false)} />
          <div className="bg-white rounded-t-3xl overflow-y-auto max-h-[92vh]">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #f3f4f6" }}
            >
              <h2 className="font-semibold text-gray-800">Registro rápido</h2>
              <button
                type="button"
                onClick={() => setModalRegistro(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600"
                style={{ background: "#f3f4f6" }}
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-5">
              <RegistroRapido onClose={() => setModalRegistro(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal — Dinero (próximamente) */}
      {modalDinero && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setModalDinero(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-6 py-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-4xl mb-3">💰</p>
            <p className="text-base font-semibold text-gray-800 mb-1">Ingreso a bolsillo</p>
            <p className="text-sm" style={{ color: "#6b7280" }}>Próximamente — T17</p>
            <button
              type="button"
              onClick={() => setModalDinero(false)}
              className="mt-8 text-sm underline"
              style={{ color: "#9ca3af" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
