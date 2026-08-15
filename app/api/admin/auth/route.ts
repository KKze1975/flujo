import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createSessionCookie,
  verifyPin,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!pin || !verifyPin(pin)) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, createSessionCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
