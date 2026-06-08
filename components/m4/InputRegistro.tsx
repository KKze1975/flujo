"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/Icon";

type FuentePago = "en_mano" | "nequi" | "camilo" | "angie";
type Actor = "camilo" | "angie";

type BaseFields = { monto: number; ejecutor: Actor; fuente: FuentePago };
type PayloadTexto = BaseFields & { tipo: "texto"; contenido: string };
type PayloadImagen = BaseFields & { tipo: "imagen"; base64: string; mimeType: string };
export type Payload = PayloadTexto | PayloadImagen;

interface Props {
  onSubmit: (payload: Payload) => void;
}

const FUENTES: { value: FuentePago; label: string }[] = [
  { value: "en_mano", label: "En mano" },
  { value: "nequi",   label: "Nequi"   },
  { value: "camilo",  label: "NU Camilo" },
  { value: "angie",   label: "NU Angie"  },
];

export default function InputRegistro({ onSubmit }: Props) {
  const [tab, setTab] = useState<"texto" | "imagen">("texto");
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [monto, setMonto] = useState("");
  const [ejecutor, setEjecutor] = useState<Actor>("camilo");
  const [fuente, setFuente] = useState<FuentePago>("en_mano");
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
    const montoNum = Number(monto);
    if (montoNum <= 0) return;
    const base: BaseFields = { monto: montoNum, ejecutor, fuente };
    if (tab === "texto") {
      if (!texto.trim()) return;
      onSubmit({ tipo: "texto", contenido: texto.trim(), ...base });
    } else {
      if (!imagen) return;
      onSubmit({ tipo: "imagen", base64: imagen.base64, mimeType: imagen.mimeType, ...base });
    }
  }

  const puedeEnviar = Number(monto) > 0 && (tab === "texto" ? texto.trim().length > 0 : imagen !== null);

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
            placeholder={'Describe el gasto… p. ej. "mercado en el Jumbo"'}
            rows={2}
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
      </div>

      {/* Monto */}
      <div className="fl-field">
        <label>Monto (COP)</label>
        <input
          type="number"
          value={monto}
          min={0}
          onChange={(e) => setMonto(e.target.value)}
          className="fl-input"
          placeholder="0"
          style={{ fontFeatureSettings: '"tnum" 1', fontWeight: 600 }}
        />
      </div>

      {/* Ejecutor + Fuente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="fl-field">
          <label>¿Quién pagó?</label>
          <div className="fl-tabs">
            {(["camilo", "angie"] as Actor[]).map((a) => (
              <button
                key={a}
                type="button"
                className={`fl-tab${ejecutor === a ? " on" : ""}`}
                onClick={() => setEjecutor(a)}
              >
                <span className={`fl-person ${a === "camilo" ? "c" : "a"}`}>
                  {a === "camilo" ? "C" : "A"}
                </span>
                {a === "camilo" ? "Camilo" : "Angie"}
              </button>
            ))}
          </div>
        </div>
        <div className="fl-field">
          <label>Fuente</label>
          <select
            value={fuente}
            onChange={(e) => setFuente(e.target.value as FuentePago)}
            className="fl-input"
            style={{ appearance: "auto" }}
          >
            {FUENTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        className="fl-btn primary block"
        onClick={handleSubmit}
        disabled={!puedeEnviar}
      >
        <Icon name="send" size={14} /> Registrar
      </button>
    </div>
  );
}
