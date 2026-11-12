import nodemailer from "nodemailer";
import type { Outbox } from "./domain";
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
export async function deliver(
  item: Outbox,
  env: NodeJS.ProcessEnv = process.env,
  send: typeof fetch = fetch,
): Promise<string> {
  requireMail(env);
  if (
    /@(.*\.)?(invalid|example|test|localhost)$/i.test(item.to) ||
    /@ejemplo\.com$/i.test(item.to)
  )
    throw new Error(
      "Email ficticio: actualizá la dirección registrada antes de enviar.",
    );
  if (env.RESEND_API_KEY) {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `morowa-${item.id}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [item.to],
        subject: item.subject,
        text: item.text,
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
    to: item.to,
    subject: item.subject,
    text: item.text,
    messageId: `<${item.id}@morowa.local>`,
  });
  return result.messageId;
}
