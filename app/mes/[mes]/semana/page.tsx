import Link from "next/link";

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [year, monthStr] = mes.split("-");
  return `${MESES_FULL[Number(monthStr)]} ${year}`;
}

export default async function SemanaPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        className="flex items-center gap-3 px-4 py-4 text-white"
        style={{ background: "#1e3a5f" }}
      >
        <Link href="/" className="text-white/50 hover:text-white text-sm leading-none">←</Link>
        <div>
          <h1 className="text-sm font-semibold">Esta semana</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{formatMes(mes)}</p>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">📅</p>
        <p className="text-base font-semibold text-gray-700">Vista semanal</p>
        <p className="text-sm text-gray-400">Próximamente — T17</p>
      </main>
    </div>
  );
}
