import { createHash } from "crypto";

export interface ViajeUber {
  montoTotal: number;
  tipoServicio: string;
  horaRecogida: string;
  direccionRecogida: string;
  horaDestino: string;
  direccionDestino: string;
  conductor: string;
  pagoConError: boolean;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMontoCOP(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ""), 10);
}

// Correos reales de Uber (noreply@uber.com) traen una plantilla estable:
// "Total $ <monto>" cerca del inicio, luego "Detalles del arrendamiento|viaje
// <tipo> <km> kilómetros, <n> minutes" seguido del par hora+dirección de
// recogida y destino (repetido dos veces en el cuerpo — versión resumen y
// versión detallada), y "Viajaste con <nombre>" o "Entregado por <nombre>".
// Verificado contra 4 correos reales (Uber Black x3, ver tickets/UBER-01.md
// para Flash Moto) durante la fase de planeación de UBER-04.
export function extraerViajeDeCuerpo(html: string): ViajeUber | null {
  const text = stripHtml(html);

  // Plantillas verificadas con correos reales: "Total $ 19.657" (reciente,
  // viajes en carro) y "Total 6.333 COP" (plantilla más antigua, entregas
  // Flash Moto) — signo $ y sufijo COP son ambos opcionales.
  const totalMatch = text.match(/Total\s*\$?\s*([\d.,]+)(?:\s*COP)?/i);
  if (!totalMatch) return null;
  const montoTotal = parseMontoCOP(totalMatch[1]);

  const detalleMatch = text.match(/Detalles del (?:arrendamiento|viaje)\s+(.+?)\s+[\d.,]+\s*kil[oó]metros/i);
  if (!detalleMatch) return null;
  const tipoServicio = detalleMatch[1].trim();

  const conductorMatch = text.match(/(?:Viajaste con|Entregado por)\s+(.+?)\s+\d+\.\d+/);
  if (!conductorMatch) return null;
  const conductor = conductorMatch[1].trim();

  // Tramo entre el marcador de distancia/tiempo y "Viajaste con"/"Entregado por"
  // contiene 2 pares (hora, dirección) repetidos dos veces — se usa la primera
  // ocurrencia de cada uno.
  const tramoStart = detalleMatch.index !== undefined ? detalleMatch.index + detalleMatch[0].length : -1;
  const tramoEnd = conductorMatch.index ?? -1;
  if (tramoStart < 0 || tramoEnd < 0 || tramoEnd <= tramoStart) return null;
  const tramo = text.slice(tramoStart, tramoEnd);

  // Plantilla reciente usa 12h con am/pm ("6:45 p. m."); plantilla más
  // antigua (Flash Moto, 2025) usa 24h sin marcador ("09:04") — el sufijo
  // am/pm es opcional para cubrir ambas, verificado con correos reales.
  const TIME_RE = /\d{1,2}:\d{2}(?:\s*[ap]\.\s*m\.)?/g;
  const horas = [...tramo.matchAll(TIME_RE)];
  if (horas.length < 2) return null;

  const horaRecogida = horas[0][0].trim();
  const horaDestino = horas[1][0].trim();
  const direccionRecogida = tramo
    .slice((horas[0].index ?? 0) + horas[0][0].length, horas[1].index ?? 0)
    .trim();
  const direccionDestinoEnd = horas.length >= 3 ? (horas[2].index ?? tramo.length) : tramo.length;
  const direccionDestino = tramo
    .slice((horas[1].index ?? 0) + horas[1][0].length, direccionDestinoEnd)
    .trim();
  if (!direccionRecogida || !direccionDestino) return null;

  const pagoConError = /error en el pago|pago pendiente/i.test(text);

  return {
    montoTotal,
    tipoServicio,
    horaRecogida,
    direccionRecogida,
    horaDestino,
    direccionDestino,
    conductor,
    pagoConError,
  };
}

// Llave de identidad de un viaje (no de un mensaje/correo) — dos correos
// distintos pueden ser reintentos del mismo viaje (mismo threadId incluso),
// y dos viajes distintos pueden compartir threadId (Uber reutiliza el mismo
// asunto genérico). Ver tickets/UBER-04.md, hallazgo verificado con correos
// reales: threadId de Gmail NO es una llave de dedup segura para Uber.
export function llaveDedupViaje(viaje: ViajeUber): string {
  const base = [
    viaje.direccionRecogida,
    viaje.horaRecogida,
    viaje.direccionDestino,
    viaje.horaDestino,
    viaje.conductor,
  ].join("|");
  return createHash("sha256").update(base).digest("hex").slice(0, 8);
}
