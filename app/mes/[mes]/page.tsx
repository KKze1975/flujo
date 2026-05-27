export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import MesM1 from "@/components/MesM1";

export default async function MesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;
  const provider = getProvider();

  const [movimientos, conceptos, ingresoCamiloList, ingresosAngie] = await Promise.all([
    provider.getMovimientos(mes),
    provider.getConceptos(),
    provider.getIngresoCamilo(mes).catch(() => []),
    provider.getIngresosAngie(mes).catch(() => []),
  ]);

  if (movimientos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">El mes {mes} no ha sido inicializado.</p>
      </div>
    );
  }

  return (
    <MesM1
      mes={mes}
      movimientos={movimientos}
      conceptos={conceptos}
      ingresoCamilo={ingresoCamiloList[0] ?? null}
      ingresosAngie={ingresosAngie}
    />
  );
}
