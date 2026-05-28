"use client";

interface Props {
  mensaje: string | null;
  confianza: "alta" | "media" | "baja";
  onContinuar: () => void;
}

export default function AclaracionBanner({ mensaje, confianza, onContinuar }: Props) {
  const texto = mensaje ?? (
    confianza === "baja"
      ? "La descripción es un poco ambigua. Podés continuar y ajustar los campos manualmente."
      : "Hay algo que no quedó claro. Revisá los campos antes de confirmar."
  );

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 mb-1">Aclaración sugerida</p>
          <p className="text-sm text-amber-700">{texto}</p>
        </div>
      </div>
      <button
        onClick={onContinuar}
        className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white"
        style={{ background: "#1e3a5f" }}
      >
        Continuar y revisar →
      </button>
    </div>
  );
}
