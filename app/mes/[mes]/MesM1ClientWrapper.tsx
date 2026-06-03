"use client";

import { useState, useEffect } from "react";
import type { Movimiento, Concepto, IngresoCamilo, IngresoAngie, RecargaAngie, SaldoCuenta, CierreSemana, Semana } from "@/lib/data/types";
import MesM1Mobile from "@/components/MesM1Mobile";
import MesM1Desktop from "@/components/MesM1Desktop";

type ViewMode = "mobile" | "desktop";

export default function MesM1ClientWrapper({
  mes,
  movimientos,
  conceptos,
  ingresoCamilo,
  ingresosAngie,
  recargasAngie,
  cierresSemana,
  gastosSinClasificarInit,
  saldosInit,
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  recargasAngie: RecargaAngie[];
  cierresSemana: CierreSemana[];
  gastosSinClasificarInit: Record<Semana, number>;
  saldosInit: SaldoCuenta[];
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
        ingresoCamilo={ingresoCamilo}
        ingresosAngie={ingresosAngie}
        recargasAngie={recargasAngie}
        cierresSemana={cierresSemana}
        gastosSinClasificar={gastosSinClasificarInit}
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
      recargasAngie={recargasAngie}
      cierresSemana={cierresSemana}
      gastosSinClasificarInit={gastosSinClasificarInit}
      saldosInit={saldosInit}
      onSwitchToDesktop={() => setViewMode("desktop")}
    />
  );
}
