"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import type { BackupIntegrityStatus } from "@/app/api/admin/backup-status/route";

export default function TarjetaIntegridadBackup() {
  const [data, setData] = useState<BackupIntegrityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/backup-status");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Error al cargar estado de backup.");
        }
      } catch {
        setError("Error de conexión al cargar backup.");
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="fl-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="ic"><Icon name="check" /></span>
        <span className="txt">
          <p className="t">Integridad de backup</p>
          <p className="d">Verificando pestañas y fechas nocturnas…</p>
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fl-card" style={{ borderColor: "var(--neg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ic" style={{ color: "var(--neg)" }}><Icon name="alert" /></span>
          <div>
            <p className="t" style={{ fontWeight: 700, margin: 0 }}>Integridad de backup</p>
            <p className="fl-faint" style={{ margin: "2px 0 0", fontSize: 13, color: "var(--neg)" }}>
              {error || "No fue posible verificar la integridad."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOk = data.ok;

  return (
    <div
      className="fl-card screen-anim"
      style={{
        borderColor: isOk ? "var(--pos)" : "var(--neg)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ic" style={{ color: isOk ? "var(--pos)" : "var(--neg)" }}>
            <Icon name={isOk ? "check" : "alert"} />
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Integridad de Backup Nocturno</h3>
            <p className="fl-faint" style={{ margin: "2px 0 0", fontSize: 13 }}>
              {data.mensaje}
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: "var(--radius-chip)",
            backgroundColor: isOk ? "var(--pos-soft)" : "var(--neg-soft)",
            color: isOk ? "var(--pos)" : "var(--neg)",
          }}
        >
          {isOk ? "AL DÍA" : "REVISAR"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: "var(--radius-inner)",
        }}
      >
        <div>
          <p className="fl-faint" style={{ margin: 0, fontSize: 11, textTransform: "uppercase" }}>Pestañas</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{data.totalTabs}</p>
        </div>
        <div>
          <p className="fl-faint" style={{ margin: 0, fontSize: 11, textTransform: "uppercase" }}>Fechas (14d)</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{data.fechasContadas}</p>
        </div>
        <div>
          <p className="fl-faint" style={{ margin: 0, fontSize: 11, textTransform: "uppercase" }}>Última Fecha</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            {data.ultimaFecha || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
