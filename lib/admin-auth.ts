import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "flujo_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — I-04/I-08: secretos solo por env, nunca hardcode
export const ADMIN_SESSION_MAX_AGE = SESSION_TTL_MS / 1000;

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET no está configurado");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionCookie(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [scope, expiresStr, sig] = parts;
  if (scope !== "admin") return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return safeEqual(sig, sign(`${scope}.${expiresStr}`));
}

export function verifyPin(candidate: string): boolean {
  const real = process.env.ADMIN_PANEL_PIN;
  if (!real) return false;
  return safeEqual(candidate, real);
}

// PANEL-ADMIN-01 exige esta verificación en cada ruta /api/admin/* que el
// panel invoque (y, por extensión, cualquier endpoint solo alcanzable
// desde ahí) — el PIN de la página no protege el endpoint por sí solo.
// Origen: hallazgo real del Tester, 15 ago 2026 — PANEL-RESET-MES-01,
// PANEL-RETIRAR-CONCEPTO-01 y PANEL-BACKUP-INTEGRIDAD-01 se construyeron
// sin este chequeo, dejando los endpoints tan abiertos como antes.
export function isAdminRequestAuthorized(req: NextRequest): boolean {
  return verifySessionCookie(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
