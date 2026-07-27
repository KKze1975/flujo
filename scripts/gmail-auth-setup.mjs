// Script de uso único — genera el refresh_token de Gmail OAuth2 necesario
// para UBER-04 (ver tickets/UBER-04.md, sección "Prerrequisito manual").
//
// Antes de correr esto, Camilo debe haber creado en Google Cloud Console:
//   1. Un proyecto con la Gmail API habilitada.
//   2. Un OAuth Client ID tipo "Desktop app".
//   3. Agregar camilovillamil@gmail.com como test user (si la app no está
//      publicada/verificada).
//
// Uso:
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth-setup.mjs
//
// El script imprime una URL de consentimiento, Camilo la abre en su navegador,
// autoriza el acceso, y pega el código de vuelta aquí. El refresh_token
// resultante se imprime para copiar a .env.local (dev) y a Vercel (prod) —
// nunca se escribe a disco automáticamente.

import { google } from "googleapis";
import readline from "readline";

const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Faltan GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET en el entorno.");
  console.error("Uso: GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth-setup.mjs");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // fuerza que Google emita un refresh_token nuevo
  scope: SCOPES,
});

console.log("Abre este URL en tu navegador y autoriza el acceso:\n");
console.log(authUrl);
console.log("");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Pega el código de autorización aquí: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\n--- Listo. Guarda esto en .env.local (dev) y en Vercel (prod), nunca lo hardcodees ---\n");
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("");
  } catch (e) {
    console.error("Error generando el token:", e.message ?? e);
    process.exit(1);
  }
});
