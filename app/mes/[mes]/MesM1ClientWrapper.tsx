"use client";

import { useState } from "react";
import type { Movimiento, Concepto, IngresoCamilo, IngresoAngie, SaldoCuenta, CierreSemana, Semana } from "@/lib/data/types";
import MesM1 from "@/components/MesM1";
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
}: {
  mes: string;
  movimientos: Movimiento[];
  conceptos: Concepto[];
  ingresoCamilo: IngresoCamilo | null;
  ingresosAngie: IngresoAngie[];
  cierresSemana: CierreSemana[];
  gastosSinClasificarInit: Record<Semana, number>;
  saldosInit: SaldoCuenta[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");

  if (viewMode === "desktop") {
    return (
      <MesM1Desktop
        mes={mes}
        movimientos={movimientos}
        conceptos={conceptos}
        saldos={saldosInit}
        ingresoCamilo={ingresoCamilo}
        ingresosAngie={ingresosAngie}
        onSwitchToMobile={() => setViewMode("mobile")}
      />
    );
  }

  return (
    <MesM1
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
