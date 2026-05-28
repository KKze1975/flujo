"use client";

interface Resultado {
  nombreConcepto: string | null;
  clasificado: boolean;
}

interface Props {
  resultado: Resultado;
  onNuevoRegistro: () => void;
}

export default function ConfirmacionExito({ resultado, onNuevoRegistro }: Props) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
      <div className="text-4xl mb-3">✓</div>
      <p className="text-base font-semibold text-green-800 mb-1">
        {resultado.clasificado ? "Gasto registrado" : "Gasto guardado"}
      </p>
      <p className="text-sm text-green-700">
        {resultado.clasificado && resultado.nombreConcepto
          ? `"${resultado.nombreConcepto}" marcado como ejecutado en H2.`
          : "Guardado como pendiente de clasificación en H3."}
      </p>
      <button
        onClick={onNuevoRegistro}
        className="mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white"
        style={{ background: "#1e3a5f" }}
      >
        + Nuevo registro
      </button>
    </div>
  );
}
