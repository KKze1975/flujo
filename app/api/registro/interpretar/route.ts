import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";

export type FuentePago = "en_mano" | "nequi" | "camilo" | "angie";

export interface InterpretacionM4 {
  descripcion: string;
  monto: number;
  categoria: string;
  concepto_sugerido: string;
  semana: "S1" | "S2" | "S3" | "S4";
  fuente: FuentePago;
  confianza: "alta" | "media" | "baja";
  aclaracion_necesaria: string | null;
}

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales de la familia Villamil en Colombia.
Recibís una descripción de un gasto o una imagen de factura.
Devolvés SOLO JSON con este esquema exacto, sin texto adicional, sin markdown:
{
  "descripcion": "descripción breve del gasto",
  "monto": 87000,
  "categoria": "Mercado y Alimentación",
  "concepto_sugerido": "Mercado semanal",
  "semana": "S1",
  "fuente": "en_mano",
  "confianza": "alta",
  "aclaracion_necesaria": null
}

Categorías válidas (exactamente como están escritas):
Casa / Servicios Públicos / Membresías y Suscripciones / Educación / Salud / Mercado y Alimentación / Compromisos Financieros / Recreación / Transporte / Metas Familiares / Frida

Reglas de inferencia:
- monto: número entero en COP (sin puntos, sin signos). "87mil" → 87000, "87.000" → 87000, "1.2M" → 1200000
- fuente: "en efectivo" / "en mano" / "cash" → "en_mano"; "Nequi" → "nequi"; "tarjeta Camilo" / "cuenta Camilo" → "camilo"; "tarjeta Angie" / "cuenta Angie" → "angie"; sin mención → "en_mano"
- semana: si se menciona semana o fecha relativa, deriva S1-S4. Sin referencia temporal → "S1"
- confianza "alta": monto, categoría y fuente claros
- confianza "media": monto aproximado o categoría incierta
- confianza "baja": descripción ambigua, monto no mencionado, o gasto no reconocible
- aclaracion_necesaria: pregunta puntual y breve si hay ambigüedad importante, null si todo es claro`;

type InputTexto = { tipo: "texto"; contenido: string; conceptosH2?: string[] };
type InputImagen = { tipo: "imagen"; base64: string; mimeType: string; conceptosH2?: string[] };

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (raw.tipo !== "texto" && raw.tipo !== "imagen") {
    return Response.json({ error: "tipo debe ser 'texto' o 'imagen'." }, { status: 400 });
  }

  const client = new Anthropic();

  let userMessage: Anthropic.MessageParam;

  const conceptosH2: string[] = Array.isArray(raw.conceptosH2) ? (raw.conceptosH2 as string[]) : [];
  const conceptosSection = conceptosH2.length > 0
    ? `\n\nConceptos disponibles en H2 (usá EXACTAMENTE uno de estos nombres en concepto_sugerido):\n${conceptosH2.map((c) => `- ${c}`).join("\n")}`
    : "";

  if (raw.tipo === "texto") {
    const payload = raw as unknown as InputTexto;
    if (!payload.contenido?.trim()) {
      return Response.json({ error: "contenido requerido." }, { status: 400 });
    }
    userMessage = { role: "user", content: payload.contenido };
  } else {
    const payload = raw as unknown as InputImagen;
    if (!payload.base64 || !payload.mimeType) {
      return Response.json({ error: "base64 y mimeType requeridos." }, { status: 400 });
    }
    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type ValidMime = (typeof validMimeTypes)[number];
    const mimeType = validMimeTypes.includes(payload.mimeType as ValidMime)
      ? (payload.mimeType as ValidMime)
      : "image/jpeg";

    userMessage = {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: payload.base64,
          },
        },
        {
          type: "text",
          text: "Analiza esta factura o comprobante de pago y extrae la información del gasto.",
        },
      ],
    };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT + conceptosSection,
      messages: [userMessage],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Claude no devolvió JSON válido." }, { status: 500 });
    }

    const interpretacion = JSON.parse(jsonMatch[0]) as InterpretacionM4;
    return Response.json(interpretacion);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
