import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { TriageImpacto, TriageEsfuerzo } from "@/lib/data/types";

const SYSTEM_PROMPT = `Eres un asistente que ayuda a priorizar el backlog de ideas de
features de Flujo, una app de finanzas familiares para la familia Villamil en Colombia.

Tu tarea es triagear UNA idea de feature nueva. La métrica de éxito del proyecto es:
"mayor adopción de nuevos features con impacto real en la cultura financiera y las
finanzas de la familia" — usa esa métrica, no tu propia opinión de qué es interesante,
como criterio para estimar el impacto.

Devuelve SOLO un objeto JSON válido, sin texto adicional, sin markdown, sin bloques de
código, con exactamente esta forma:
{"triage_impacto": "alto" | "medio" | "bajo", "triage_esfuerzo": "S" | "M" | "L", "triage_alineacion": "texto corto"}

- triage_impacto: qué tanto acerca la idea a la métrica de éxito de arriba (alto/medio/bajo).
- triage_esfuerzo: heurística de esfuerzo de ingeniería a partir de la descripción — S
  (pequeño), M (mediano) o L (grande). Es una heurística, no una estimación real.
- triage_alineacion: máximo ~15 palabras, qué invariante u objetivo de negocio del
  proyecto toca la idea, si aplica. Si no aplica ninguno, dilo brevemente.

No inventes campos adicionales. No agregues explicación fuera del JSON.`;

const IMPACTO_SCORE: Record<TriageImpacto, number> = { alto: 3, medio: 2, bajo: 1 };
const ESFUERZO_SCORE: Record<TriageEsfuerzo, number> = { S: 3, M: 2, L: 1 };

function calcularPrioridadScore(impacto: TriageImpacto, esfuerzo: TriageEsfuerzo): number {
  // Fórmula determinística (documentada en Notas de ejecución del ticket IDEAS-TRIAGE-01):
  // impacto_score * 2 - esfuerzo_score. Impacto alto + esfuerzo bajo (S) da el score más
  // favorable; impacto bajo + esfuerzo alto (L) da el score menos favorable.
  return IMPACTO_SCORE[impacto] * 2 - ESFUERZO_SCORE[esfuerzo];
}

function esImpactoValido(v: unknown): v is TriageImpacto {
  return v === "alto" || v === "medio" || v === "bajo";
}

function esEsfuerzoValido(v: unknown): v is TriageEsfuerzo {
  return v === "S" || v === "M" || v === "L";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const provider = getProvider();

  const ideasNuevas = await provider.getIdeas({ estado: "nueva" });
  const idea = ideasNuevas.find((i) => i.id === id);
  if (!idea) {
    return Response.json(
      { error: `Idea ${id} no encontrada en estado "nueva".` },
      { status: 404 }
    );
  }

  let triageImpacto: TriageImpacto;
  let triageEsfuerzo: TriageEsfuerzo;
  let triageAlineacion: string;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Idea propuesta:\nDescripción: "${idea.descripcion}"\nCaso de uso: "${idea.casoDeUso}"\nMotivo de importancia: "${idea.motivoImportancia}"`,
      }],
    });
    const text = (response.content[0]?.type === "text" ? response.content[0].text : "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Haiku devolvió JSON inválido. La idea queda sin triagear." },
        { status: 502 }
      );
    }

    const obj = parsed as Record<string, unknown>;
    if (!esImpactoValido(obj.triage_impacto) || !esEsfuerzoValido(obj.triage_esfuerzo) || typeof obj.triage_alineacion !== "string" || !obj.triage_alineacion.trim()) {
      return Response.json(
        { error: "Haiku devolvió campos de triage con formato inesperado. La idea queda sin triagear." },
        { status: 502 }
      );
    }

    triageImpacto = obj.triage_impacto;
    triageEsfuerzo = obj.triage_esfuerzo;
    triageAlineacion = obj.triage_alineacion.trim();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error llamando a Haiku.";
    return Response.json(
      { error: `Triage falló: ${msg}. La idea queda sin triagear.` },
      { status: 502 }
    );
  }

  // prioridad_score: SIEMPRE calculado server-side, nunca por el modelo.
  const prioridadScore = calcularPrioridadScore(triageImpacto, triageEsfuerzo);

  try {
    const actualizada = await provider.updateIdea(id, {
      triageImpacto,
      triageEsfuerzo,
      triageAlineacion,
      prioridadScore,
      estado: "priorizada",
    });
    return Response.json({ ok: true, idea: actualizada });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error actualizando H10";
    return Response.json({ error: msg }, { status: 500 });
  }
}
