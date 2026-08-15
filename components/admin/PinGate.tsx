"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";

export default function PinGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError("PIN incorrecto");
        setPin("");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="t-calido screen-anim">
      <div className="fl-appbar">
        <div className="fl-topnav">
          <button className="fl-back" type="button" onClick={() => router.push("/")}>
            <Icon name="back" size={17} />
          </button>
        </div>
        <p className="eyebrow">Flujo · Administración</p>
        <h1 style={{ fontSize: 22 }}>Panel de administración</h1>
      </div>

      <div className="fl-body">
        <form
          className="fl-card"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={handleSubmit}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="ic" style={{
              width: 46, height: 46, borderRadius: 14, flex: "none",
              display: "grid", placeItems: "center",
              background: "var(--primary-soft)", color: "var(--primary)",
            }}>
              <Icon name="lock" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>PIN requerido</p>
              <p className="fl-faint" style={{ margin: "3px 0 0" }}>Acceso restringido</p>
            </span>
          </div>

          <div className="fl-field">
            <input
              className="fl-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
            />
          </div>

          {error && <p className="fl-neg" style={{ fontSize: 13, margin: 0 }}>{error}</p>}

          <button className="fl-btn primary block" type="submit" disabled={loading || !pin}>
            {loading ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
