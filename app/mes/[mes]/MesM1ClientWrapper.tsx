"use client";

import { useState, useEffect } from "react";
import type { Movimiento, Concepto, IngresoCamilo, IngresoAngie, SaldoCuenta, CierreSemana, Semana } from "@/lib/data/types";
import MesM1Mobile from "@/components/MesM1Mobile";
import MesM1Desktop from "@/components/MesM1Desktop";

type ViewMode = "mobile" | "desktop";

export default function MesM1ClientWrapper({
  mes,
  movimientos,
  conceptos,
  ingresoCamilo,
  ingresosAngie,
  cierresSemana,
  gastosSinClasificarInit,
  saldosInit,
  saldosBrutos,
  gastoH3PorCuenta = { nu_camilo: 0, nu_angie: 0, arq: 0, en_mano: 0 },
  gastoH3PorSemana = { S1: 0, S2: 0, S3: 0, S4: 0 },
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  cierresSemana: CierreSemana[];
  gastosSinClasificarInit: Record<Semana, number>;
  saldosInit: SaldoCuenta[];
  saldosBrutos: SaldoCuenta[];
  gastoH3PorCuenta?: Record<string, number>;
  gastoH3PorSemana?: Record<string, number>;
}) {
  // Default to mobile; corrected by effect before first paint on client
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");

  useEffect(() => {
    const detect = () => setViewMode(window.innerWidth < 768 ? "mobile" : "desktop");
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  if (viewMode === "desktop") {
    return (
      <MesM1Desktop
        mes={mes}
        movimientos={movimientos}
        conceptos={conceptos}
        saldos={saldosInit}
        saldosBrutos={saldosBrutos}
        ingresoCamilo={ingresoCamilo}
        ingresosAngie={ingresosAngie}
        cierresSemana={cierresSemana}
        gastosSinClasificar={gastosSinClasificarInit}
        gastoH3PorCuenta={gastoH3PorCuenta}
        gastoH3PorSemana={gastoH3PorSemana}
        onSwitchToMobile={() => setViewMode("mobile")}
      />
    );
  }

  return (
    <MesM1Mobile
      mes={mes}
      movimientos={movimientos}
      conceptos={conceptos}
      ingresoCamilo={ingresoCamilo}
      ingresosAngie={ingresosAngie}
      cierresSemana={cierresSemana}
      gastosSinClasificarInit={gastosSinClasificarInit}
      saldosInit={saldosInit}
      onSwitchToDesktop={() => setViewMode("desktop")}
    />
  );
}
