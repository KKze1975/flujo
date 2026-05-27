import Link from "next/link";

export default function RegistroPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <p className="text-lg font-semibold text-gray-700">Registro rápido — próximamente</p>
      <Link href="/" className="text-sm text-[#1e3a5f] hover:underline">
        ← Volver al inicio
      </Link>
    </div>
  );
}
