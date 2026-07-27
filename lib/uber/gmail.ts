import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { extraerViajeDeCuerpo, llaveDedupViaje, type ViajeUber } from "./parser";

const UBER_SENDER = "noreply@uber.com";

export interface CredencialesGmail {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function getGmailClient({ clientId, clientSecret, refreshToken }: CredencialesGmail): gmail_v1.Gmail {
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oAuth2Client });
}

interface MensajeUber {
  id: string;
  threadId: string;
  internalDate: number;
  viaje: ViajeUber;
}

function findPart(payload: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string | null {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data;
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = findPart(part, mimeType);
      if (found) return found;
    }
  }
  return null;
}

function extractHtmlBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  const html = findPart(payload, "text/html");
  if (!html) return "";
  return Buffer.from(html, "base64").toString("utf-8");
}

// Busca correos de Uber sin leer, extrae el viaje de cada uno, y agrupa por
// llave de dedup de viaje (no por threadId — ver lib/uber/parser.ts: un
// mismo threadId de Gmail puede contener varios viajes distintos, y un mismo
// viaje puede generar varios mensajes de reintento de pago). Para cada
// grupo, se usa el mensaje más reciente; si ese mensaje aún reporta error de
// pago, el grupo se omite esta corrida (se reintenta en la siguiente).
export interface ViajeDetectado {
  dedupeKey: string;
  viaje: ViajeUber;
  fechaCorreo: Date;
  idsMensajes: string[];
}

export async function buscarViajesNuevos(gmail: gmail_v1.Gmail): Promise<ViajeDetectado[]> {
  const list = await gmail.users.messages.list({
    userId: "me",
    q: `from:${UBER_SENDER} is:unread`,
    maxResults: 50,
  });
  const refs = list.data.messages ?? [];
  if (refs.length === 0) return [];

  const mensajes: MensajeUber[] = [];
  for (const ref of refs) {
    if (!ref.id) continue;
    const detail = await gmail.users.messages.get({ userId: "me", id: ref.id, format: "full" });
    const html = extractHtmlBody(detail.data.payload);
    const viaje = extraerViajeDeCuerpo(html);
    if (!viaje) continue; // correo de Uber que no es un recibo de viaje parseable
    mensajes.push({
      id: ref.id,
      threadId: detail.data.threadId ?? ref.id,
      internalDate: parseInt(detail.data.internalDate ?? "0", 10),
      viaje,
    });
  }

  const grupos = new Map<string, MensajeUber[]>();
  for (const m of mensajes) {
    const key = llaveDedupViaje(m.viaje);
    const existing = grupos.get(key);
    if (existing) existing.push(m);
    else grupos.set(key, [m]);
  }

  const resultado: ViajeDetectado[] = [];
  for (const [dedupeKey, msgs] of grupos) {
    msgs.sort((a, b) => b.internalDate - a.internalDate);
    const masReciente = msgs[0];
    if (masReciente.viaje.pagoConError) continue; // aun sin resolver, reintentar en la proxima corrida
    resultado.push({
      dedupeKey,
      viaje: masReciente.viaje,
      fechaCorreo: new Date(masReciente.internalDate),
      idsMensajes: msgs.map(m => m.id),
    });
  }
  return resultado;
}

export async function marcarComoLeidos(gmail: gmail_v1.Gmail, messageIds: string[]): Promise<void> {
  for (const id of messageIds) {
    await gmail.users.messages.modify({ userId: "me", id, requestBody: { removeLabelIds: ["UNREAD"] } });
  }
}
