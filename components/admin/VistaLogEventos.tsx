"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import type { EventoLog, TipoEventoLog } from "@/lib/data/types";

export default function VistaLogEventos({ onClose }: { onClose: () => void }) {
  const [eventos, setEventos] = useState<EventoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [limpiando, setLimpiando] = useState(false);
  const [mensajePurga, setMensajePurga] = useState<string | null>(null);

  async function cargarEventos() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tipoFiltro !== "todos") params.append("tipoEvento", tipoFiltro);
      if (mesFiltro.trim()) params.append("mes", mesFiltro.trim());

      const res = await fetch(`/api/admin/eventos-log?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener log de eventos");
      }
      const data = await res.json();
      setEventos(data.eventos || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error cargando logs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarEventos();
  }, [tipoFiltro, mesFiltro]);

  async function handlePurga14Dias() {
    setLimpiando(true);
    setMensajePurga(null);
    try {
      const res = await fetch("/api/admin/eventos-log", { method: "DELETE" });
      if (!res.ok) throw new Error("Error realizando purga");
      const data = await res.json();
      setMensajePurga(`Se purgaron ${data.eliminados} eventos anteriores a 14 días.`);
      cargarEventos();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error purging logs";
      setMensajePurga(msg);
    } finally {
      setLimpiando(false);
    }
  }

  return (
    <div className="fl-card screen-anim" style={{ marginTop: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ic" style={{ color: "var(--accent)" }}>
            <Icon name="book" />
          </span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Log de eventos H9</h3>
        </div>
        <button
          className="fl-btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <p className="fl-faint" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Eventos de auditoría registrados cronológicamente. Retención automática de 14 días.
      </p>

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, display: "block", color: "var(--faint)", marginBottom: 2 }}>
            Tipo de Evento
          </label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              background: "var(--bg-card)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <option value="todos">Todos los eventos</option>
            <option value="movimiento_ejecutar">Movimiento: Ejecutar</option>
            <option value="movimiento_posponer">Movimiento: Posponer</option>
            <option value="movimiento_mover_mes_siguiente">Movimiento: Trasladar mes</option>
            <option value="movimiento_revertir_mes_siguiente">Movimiento: Revertir traslado</option>
            <option value="movimiento_revertir_ejecucion">Movimiento: Revertir ejecución</option>
            <option value="movimiento_reasignar_semana">Movimiento: Reasignar semana</option>
            <option value="clasificacion_haiku">Clasificación Haiku</option>
            <option value="cierre_semana">Cierre de semana</option>
            <option value="revertir_cierre_semana">Revertir cierre semana</option>
            <option value="reset_mes">Reset de mes</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, display: "block", color: "var(--faint)", marginBottom: 2 }}>
            Mes (YYYY-MM)
          </label>
          <input
            type="text"
            placeholder="ej. 2026-08"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              background: "var(--bg-card)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          className="fl-btn-secondary"
          style={{ fontSize: 12 }}
          onClick={cargarEventos}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Refrescar"}
        </button>
        <button
          className="fl-btn-secondary"
          style={{ fontSize: 12, color: "var(--warn)" }}
          onClick={handlePurga14Dias}
          disabled={limpiando}
        >
          {limpiando ? "Purgando..." : "Limpiar >14 días"}
        </button>
      </div>

      {mensajePurga && (
        <p style={{ fontSize: 12, color: "var(--accent)", margin: "0 0 10px" }}>{mensajePurga}</p>
      )}

      {error && <p style={{ fontSize: 13, color: "var(--neg)" }}>{error}</p>}

      {/* Lista de eventos */}
      <div style={{ maxHeight: 350, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {eventos.length === 0 && !loading ? (
          <p className="fl-faint" style={{ fontSize: 13, textAlign: "center", margin: "20px 0" }}>
            No hay eventos registrados con este filtro.
          </p>
        ) : (
          eventos.map((evt) => (
            <div
              key={evt.id}
              style={{
                background: "var(--bg-subtle)",
                borderRadius: 6,
                padding: "8px 10px",
                borderLeft: "3px solid var(--accent)",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ color: "var(--fg)" }}>{evt.tipoEvento}</strong>
                <span className="fl-faint" style={{ fontSize: 11 }}>
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="fl-faint" style={{ fontSize: 11, marginBottom: 4 }}>
                Mes: {evt.mes} | Entidad: {evt.entidadId}
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  background: "var(--bg-card)",
                  padding: 6,
                  borderRadius: 4,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {evt.detalle}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
