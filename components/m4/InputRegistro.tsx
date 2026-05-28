"use client";

import { useState, useRef, useEffect } from "react";

type PayloadTexto = { tipo: "texto"; contenido: string };
type PayloadImagen = { tipo: "imagen"; base64: string; mimeType: string };
type Payload = PayloadTexto | PayloadImagen;

interface Props {
  onSubmit: (payload: Payload) => void;
}

export default function InputRegistro({ onSubmit }: Props) {
  const [tab, setTab] = useState<"texto" | "imagen">("texto");
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cameraRef.current?.setAttribute("capture", "environment");
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      setImagen({ base64, mimeType, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (tab === "texto") {
      if (!texto.trim()) return;
      onSubmit({ tipo: "texto", contenido: texto.trim() });
    } else {
      if (!imagen) return;
      onSubmit({ tipo: "imagen", base64: imagen.base64, mimeType: imagen.mimeType });
    }
  }

  const puedeEnviar = tab === "texto" ? texto.trim().length > 0 : imagen !== null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["texto", "imagen"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: tab === t ? "#1e3a5f" : "#6b7280",
              borderBottom: tab === t ? "2px solid #1e3a5f" : "2px solid transparent",
              background: "none",
            }}
          >
            {t === "texto" ? "✏️ Texto" : "📷 Foto de factura"}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "texto" ? (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: pagué el mercado 87mil en efectivo"
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none"
            style={{ focusRingColor: "#1e3a5f" } as React.CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSubmit();
            }}
          />
        ) : (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            {imagen ? (
              <div className="relative">
                <img
                  src={imagen.previewUrl}
                  alt="Factura"
                  className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => { setImagen(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 shadow text-sm border border-gray-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-200 py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                >
                  <span className="text-3xl">📸</span>
                  <span className="text-sm font-medium">Tomar foto</span>
                  <span className="text-xs">Abre la cámara</span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-lg border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Seleccionar imagen existente
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!puedeEnviar}
          className="mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity"
          style={{ background: "#1e3a5f", opacity: puedeEnviar ? 1 : 0.4 }}
        >
          Interpretar gasto
        </button>
        {tab === "texto" && (
          <p className="mt-1 text-center text-xs text-gray-400">Ctrl + Enter para enviar</p>
        )}
      </div>
    </div>
  );
}
