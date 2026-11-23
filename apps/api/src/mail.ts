import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
import { days, id } from "./domain";
import type { Outbox, State } from "./domain";
export function testMailRecipient(env: NodeJS.ProcessEnv = process.env) {
  if (env.MAIL_TEST_MODE !== "true") return undefined;
  const recipient = String(env.MAIL_TEST_RECIPIENT || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
    throw new Error(
      "Configurá el destinatario de prueba antes de habilitar emails.",
    );
  return recipient;
}
export function mailConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(
    (env.RESEND_API_KEY && env.MAIL_FROM) || (env.SMTP_HOST && env.SMTP_FROM),
  );
}
export function requireMail(env: NodeJS.ProcessEnv = process.env) {
  if (!mailConfigured(env))
    throw new Error(
      "La recuperación por email todavía no está habilitada. Contactá al administrador para configurar el envío.",
    );
}
export function queueAccessEmail(
  s: State,
  to: string,
  subject: string,
  text: string,
  createdAt: string,
) {
  s.outbox.push({
    id: id(),
    to,
    subject,
    text,
    status: "pending",
    attempts: 0,
    createdAt,
  });
}
export async function deliver(
  item: Outbox,
  env: NodeJS.ProcessEnv = process.env,
  send: typeof fetch = fetch,
): Promise<string> {
  requireMail(env);
  const testRecipient = testMailRecipient(env);
  const recipient = testRecipient || item.to;
  const subject = testRecipient
    ? `[PRUEBA MOROWA] ${item.subject}`
    : item.subject;
  const bodyText = testRecipient
    ? `Correo de prueba. Destinatario original: ${item.to}\nNo se envió a esa dirección.\n\n${item.text}`
    : item.text;
  if (
    !testRecipient &&
    (/@(.*\.)?(invalid|example|test|localhost)$/i.test(item.to) ||
      /@ejemplo\.com$/i.test(item.to))
  )
    throw new Error(
      "Email ficticio: actualizá la dirección registrada antes de enviar.",
    );
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `morowa-${item.id}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [recipient],
        subject,
        text: bodyText,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await response.json()) as { id?: string; message?: string };
    if (!response.ok || !body.id)
      throw new Error(
        body.message || `Proveedor de email: HTTP ${response.status}`,
      );
    return body.id;
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_PORT === "465",
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
  const result = await transport.sendMail({
    from: env.SMTP_FROM,
    to: recipient,
    subject,
    text: bodyText,
    messageId: `<${item.id}@morowa.local>`,
  });
  return result.messageId;
}

export async function processMailQueue(
  s: State,
  now: string,
  env: NodeJS.ProcessEnv = process.env,
  send: (item: Outbox) => Promise<string> = (item) => deliver(item, env),
) {
  const items = s.outbox
    .filter(
      (item) =>
        ["pending", "failed"].includes(item.status) &&
        (env.MAIL_TEST_MODE !== "true" ||
          !env.MAIL_TEST_START_AT ||
          item.createdAt >= env.MAIL_TEST_START_AT) &&
        item.attempts < 5 &&
        (!item.nextAttempt || item.nextAttempt <= now),
    )
    .slice(0, 10);
  for (const item of items) {
    try {
      const token = item.text.match(/\/#activar\/([a-f0-9]{64})(?![a-f0-9])/i)?.[1];
      if (token) {
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const user = s.users.find((u) => u.tokenHash === tokenHash);
        if (!user || user.disabled || !user.tokenExpires || user.tokenExpires <= now) {
          item.attempts = 4;
          throw new Error(
            "El enlace de acceso venció o fue reemplazado. Solicitá uno nuevo.",
          );
        }
      }
      item.providerId = await send(item);
      item.status = "sent";
      item.error = undefined;
      item.nextAttempt = undefined;
    } catch (e) {
      item.status = "failed";
      item.error =
        e instanceof Error ? e.message : "Error del proveedor de email";
      item.nextAttempt = days(now, 5 / 1440);
    }
    item.attempts++;
  }
  return items.length;
}
