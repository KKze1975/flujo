import Link from "next/link";
import RegistroRapido from "@/components/m4/RegistroRapido";

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="flex items-center gap-3 px-4 py-4 text-white"
        style={{ background: "#1e3a5f" }}
      >
        <Link href="/" className="text-white/60 hover:text-white text-sm leading-none">←</Link>
        <h1 className="text-sm font-semibold">Registro rápido</h1>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        <RegistroRapido />
      </main>
    </div>
  );
}
