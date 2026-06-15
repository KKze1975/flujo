"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";

const ITEMS = [
  { id: "home",     href: "/",      label: "Inicio",   icon: "home"    },
  { id: "semana",   href: "",       label: "Semana",   icon: "calendar" },
  { id: "fab" },
  { id: "mes",      href: "/meses", label: "Mes",      icon: "list"    },
  { id: "historial",href: "/meses?modo=historial", label: "Historial", icon: "archive" },
] as const;

export default function BottomNav({
  onFabClick,
  semanaHref = "/",
  active,
  hideFab = false,
}: {
  onFabClick?: () => void;
  semanaHref?: string;
  active?: "home" | "semana" | "mes" | "historial";
  hideFab?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(id: string) {
    if (active) return active === id;
    if (id === "home") return pathname === "/";
    if (id === "semana") return pathname.includes("/semana");
    if (id === "mes") return pathname.startsWith("/mes") && !pathname.includes("/semana");
    return false;
  }

  return (
    <nav className="fl-bottomnav">
      {ITEMS.map((item) => {
        if (item.id === "fab") {
          return (
            <button
              key="fab"
              className="fl-fab"
              onClick={onFabClick}
              aria-label="Registrar gasto"
              type="button"
              style={hideFab ? { opacity: 0, pointerEvents: "none" } : undefined}
            >
              <Icon name="bolt" size={24} fill />
            </button>
          );
        }
        const href = item.id === "semana" ? semanaHref : item.href;
        return (
          <button
            key={item.id}
            className={`fl-navitem${isActive(item.id) ? " on" : ""}`}
            onClick={() => router.push(href)}
            type="button"
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
