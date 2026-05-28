import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { CuentaH4C } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const CUENTAS: CuentaH4C[] = ["nu_camilo", "nu_angie", "arq", "en_mano"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }
  try {
    const saldos = await getProvider().getSaldosCuenta(mes);
    return Response.json(saldos);
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

type Body = { cuenta: CuentaH4C; saldoInicial: number }[];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!Array.isArray(body) || body.length === 0) {
    return Response.json({ error: "Se esperan los 4 saldos." }, { status: 400 });
  }

  for (const { cuenta, saldoInicial } of body) {
    if (!CUENTAS.includes(cuenta)) {
      return Response.json({ error: `Cuenta inválida: ${cuenta}` }, { status: 400 });
    }
    if (typeof saldoInicial !== "number" || isNaN(saldoInicial)) {
      return Response.json({ error: `Saldo inválido para ${cuenta}` }, { status: 400 });
    }
  }

  try {
    const saldos = await getProvider().upsertSaldosCuenta(mes, body);
    return Response.json(saldos);
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
