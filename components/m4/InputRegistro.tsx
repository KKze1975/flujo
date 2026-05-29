"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/Icon";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Tabs */}
      <div className="fl-tabs">
        {(["texto", "imagen"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`fl-tab${tab === t ? " on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "texto" ? <><Icon name="pencil" size={14} /> Texto</> : <><Icon name="camera" size={14} /> Foto</>}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-inner)",
        border: "1px solid var(--line)", padding: 14,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {tab === "texto" ? (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Escribe el gasto como hablas… p. ej. "mercado 64 mil en el Jumbo"'}
            rows={3}
            style={{
              border: "none", resize: "none", outline: "none", background: "transparent",
              fontFamily: "inherit", fontSize: 15, color: "var(--ink)", lineHeight: 1.45,
              width: "100%",
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
          />
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <input ref={cameraRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            {imagen ? (
              <div style={{ position: "relative" }}>
                <img
                  src={imagen.previewUrl}
                  alt="Factura"
                  style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 12, border: "1px solid var(--line)" }}
                />
                <button
                  type="button"
                  onClick={() => { setImagen(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="icon-btn"
                  style={{ position: "absolute", top: 8, right: 8 }}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  style={{
                    borderRadius: 14, border: "2px dashed var(--line)", padding: "28px 0",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: "var(--surface-2)", color: "var(--ink-faint)", cursor: "pointer",
                  }}
                >
                  <Icon name="camera" size={30} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>Tomar foto del recibo</span>
                  <span style={{ fontSize: 12 }}>Abre la cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="fl-btn ghost sm"
                  style={{ width: "100%" }}
                >
                  Seleccionar imagen existente
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {tab === "texto" ? (
            <span className="fl-faint">Ctrl + Enter para enviar</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={handleSubmit}
            disabled={!puedeEnviar}
          >
            <Icon name="send" size={14} /> Interpretar
          </button>
        </div>
      </div>
    </div>
  );
}
