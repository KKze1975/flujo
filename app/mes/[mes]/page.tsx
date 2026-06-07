export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import MesM1ClientWrapper from "./MesM1ClientWrapper";

export default async function MesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;
  const provider = getProvider();

  const [movimientos, conceptos, ingresoCamiloList, ingresosAngie, cierresSemana, gastosSinClasificar, saldosCuenta, recargasAngie, consumosH3] = await Promise.all([
    provider.getMovimientos(mes),
    provider.getConceptos(),
    provider.getIngresoCamilo(mes).catch(() => []),
    provider.getIngresosAngie(mes).catch(() => []),
    provider.getCierresSemana(mes).catch(() => []),
    provider.getGastosSinClasificarPorSemana(mes).catch(() => ({ S1: 0, S2: 0, S3: 0, S4: 0 })),
    provider.getSaldosCuenta(mes).catch(() => []),
    provider.getRecargasAngie(mes).catch(() => []),
    provider.getConsumosByMes(mes).catch(() => []),
  ]);

  const gastoH3PorCuenta = {
    nu_camilo: consumosH3.filter(c => c.fuenteCamilo).reduce((s, c) => s + c.monto, 0),
    nu_angie:  consumosH3.filter(c => c.fuenteAngie).reduce((s, c) => s + c.monto, 0),
    arq:       consumosH3.filter(c => c.fuenteNequi).reduce((s, c) => s + c.monto, 0),
    en_mano:   consumosH3.filter(c => c.fuenteEnMano).reduce((s, c) => s + c.monto, 0),
  };

  const cuentaToFuente = {
    en_mano: "fuenteEnMano",
    nu_camilo: "fuenteCamilo",
    nu_angie: "fuenteAngie",
    arq: null,
  } as const;

  const saldosConDescuento = saldosCuenta.map(s => {
    const fuenteKey = cuentaToFuente[s.cuenta];
    if (!fuenteKey) return s;
    const ejecutado = movimientos
      .filter(m => m.estado === "ejecutado" && m[fuenteKey])
      .reduce((sum, m) => sum + (m.montoEjecutado ?? m.montoPresupuestado), 0);
    return { ...s, saldoInicial: Math.max(0, s.saldoInicial - ejecutado) };
  });

  if (movimientos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">El mes {mes} no ha sido inicializado.</p>
      </div>
    );
  }

  return (
    <MesM1ClientWrapper
      mes={mes}
      movimientos={movimientos}
      conceptos={conceptos}
      ingresoCamilo={ingresoCamiloList[0] ?? null}
      ingresosAngie={ingresosAngie}
      recargasAngie={recargasAngie}
      cierresSemana={cierresSemana}
      gastosSinClasificarInit={gastosSinClasificar}
      saldosInit={saldosConDescuento}
      saldosBrutos={saldosCuenta}
      gastoH3PorCuenta={gastoH3PorCuenta}
    />
  );
}
