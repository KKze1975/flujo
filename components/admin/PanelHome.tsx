import Link from "next/link";
import Icon from "@/components/ui/Icon";

const ACCIONES: { icon: Parameters<typeof Icon>[0]["name"]; title: string; desc: string }[] = [
  { icon: "wallet", title: "Resetear mes", desc: "PANEL-RESET-MES-01 · pendiente" },
  { icon: "list", title: "Retirar concepto", desc: "PANEL-RETIRAR-CONCEPTO-01 · pendiente" },
  { icon: "archive", title: "Fusionar duplicados", desc: "PANEL-FUSIONAR-DUPLICADOS-01 · pendiente" },
  { icon: "clock", title: "Revertir cierre de semana", desc: "PANEL-REVERTIR-CIERRE-01 · pendiente" },
  { icon: "book", title: "Log de eventos", desc: "PANEL-LOG-EVENTOS-01 · pendiente" },
  { icon: "check", title: "Integridad de backup", desc: "PANEL-BACKUP-INTEGRIDAD-01 · pendiente" },
];

export default function PanelHome() {
  return (
    <div className="t-calido screen-anim">
      <div className="fl-appbar">
        <div className="fl-topnav">
          <Link href="/" className="fl-back">
            <Icon name="back" size={17} />
          </Link>
        </div>
        <p className="eyebrow">Flujo · Administración</p>
        <h1 style={{ fontSize: 22 }}>Panel de administración</h1>
      </div>

      <div className="fl-body">
        <p className="fl-faint">
          Fundación del panel (PANEL-ADMIN-01). Cada tarjeta se habilita en su propio ticket.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ACCIONES.map((a) => (
            <div
              key={a.title}
              className="fl-action"
              style={{ opacity: 0.55, cursor: "default" }}
            >
              <span className="ic"><Icon name={a.icon} /></span>
              <span className="txt">
                <p className="t">{a.title}</p>
                <p className="d">{a.desc}</p>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
