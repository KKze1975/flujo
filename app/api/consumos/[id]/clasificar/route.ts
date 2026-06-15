import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales de la familia Villamil en Colombia.
Dado una descripción de un gasto y una lista de conceptos disponibles, indica cuál concepto se ajusta mejor.
Devuelve SOLO el nombre exacto del concepto tal como aparece en la lista, o la palabra NULL si ninguno aplica.
Sin comillas, sin explicación, solo el nombre o NULL.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { descripcion: string; mes: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const provider = getProvider();

  const conceptos = await provider.getConceptos();
  const activos = conceptos.filter((c) => c.estado === "activo");
  const conceptosList = activos.map((c) => c.nombre).join("\n");

  let bolsilloId: string | undefined;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Gasto: "${body.descripcion}"\n\nConceptos disponibles:\n${conceptosList}`,
      }],
    });
    const text = (response.content[0]?.type === "text" ? response.content[0].text : "").trim();
    if (text && text !== "NULL") {
      const matched = activos.find(
        (c) => c.nombre.toLowerCase() === text.toLowerCase()
          || text.toLowerCase().includes(c.nombre.toLowerCase())
          || c.nombre.toLowerCase().includes(text.toLowerCase())
      );
      if (matched) bolsilloId = matched.id;
    }
  } catch {
    // clasificación fallida — continuar sin bolsilloId
  }

  try {
    await provider.updateConsumoH3(id, {
      ...(bolsilloId ? { bolsilloId } : { imprevisto: true }),
      clasificado: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error actualizando H3";
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ ok: true, bolsilloId: bolsilloId ?? null });
}
