import { getProvider } from "@/lib/data/provider";

export async function GET() {
  const conceptos = await getProvider().getConceptos();
  return Response.json(conceptos);
}
