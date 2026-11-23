import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
import {
  mailConfigured,
  requireMail,
  deliver,
  processMailQueue,
  queueAccessEmail,
} from "../apps/api/src/mail";
import { emptyState, publicView, type Outbox } from "../apps/api/src/domain";
const item: Outbox = {
  id: "email-test",
  to: "recipient@example.com",
  subject: "Recuperación",
  text: "Enlace de prueba",
  status: "pending",
  attempts: 0,
  createdAt: "2026-11-12T12:00:00Z",
};
test("no declara envío disponible sin proveedor y remitente", () => {
  assert.equal(mailConfigured({}), false);
  assert.equal(mailConfigured({ RESEND_API_KEY: "test" }), false);
  assert.throws(() => requireMail({}), /todavía no está habilitada/);
  assert.equal(
    mailConfigured({
      RESEND_API_KEY: "test",
      MAIL_FROM: "onboarding@resend.dev",
    }),
    true,
  );
});
test("Resend usa HTTPS e idempotencia estable y devuelve ID", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(
      (options!.headers as Record<string, string>)["Idempotency-Key"],
      "morowa-email-test",
    );
    assert.equal(JSON.parse(String(options!.body)).to[0], item.to);
    return new Response(JSON.stringify({ id: "provider-123" }), {
      status: 200,
    });
  };
  assert.equal(
    await deliver(
      item,
      { RESEND_API_KEY: "test", MAIL_FROM: "onboarding@resend.dev" },
      transport,
    ),
    "provider-123",
  );
  assert.equal(calls, 1);
});
test("error del proveedor no se confunde con email aceptado", async () => {
  const transport: typeof fetch = async () =>
    new Response(JSON.stringify({ message: "Domain not verified" }), {
      status: 403,
    });
  await assert.rejects(
    deliver(
      item,
      { RESEND_API_KEY: "test", MAIL_FROM: "onboarding@resend.dev" },
      transport,
    ),
    /Domain not verified/,
  );
  assert.equal(item.status, "pending");
});
test("una configuración Resend incompleta no desplaza un SMTP completo", async () => {
  const original = nodemailer.createTransport;
  const calls: unknown[] = [];
  nodemailer.createTransport = ((options: unknown) => {
    calls.push(options);
    return {
      sendMail: async () => ({ messageId: "smtp-123" }),
    };
  }) as typeof nodemailer.createTransport;
  try {
    const transport: typeof fetch = async () => {
      throw new Error("No debería utilizar Resend");
    };
    assert.equal(
      await deliver(
        item,
        {
          RESEND_API_KEY: "test",
          SMTP_HOST: "smtp.example.com",
          SMTP_FROM: "sender@example.com",
        },
        transport,
      ),
      "smtp-123",
    );
    assert.equal(calls.length, 1);
  } finally {
    nodemailer.createTransport = original;
  }
});
test("emails ficticios no se transmiten al proveedor", async () => {
  const transport: typeof fetch = async () => {
    throw new Error("No debería llamarse");
  };
  await assert.rejects(
    deliver(
      { ...item, to: "clienta@example.invalid" },
      { RESEND_API_KEY: "test", MAIL_FROM: "onboarding@resend.dev" },
      transport,
    ),
    /Email ficticio/,
  );
});

test("modo prueba entrega solo a la casilla configurada e identifica el destinatario original", async () => {
  let payload: any;
  const transport: typeof fetch = async (_u, o) => {
    payload = JSON.parse(String(o!.body));
    return new Response(JSON.stringify({ id: "sandbox" }), { status: 200 });
  };
  await deliver(
    { ...item, to: "clienta@example.invalid" },
    {
      RESEND_API_KEY: "test",
      MAIL_FROM: "onboarding@resend.dev",
      MAIL_TEST_MODE: "true",
      MAIL_TEST_RECIPIENT: "owner@example.com",
    },
    transport,
  );
  assert.deepEqual(payload.to, ["owner@example.com"]);
  assert.match(payload.subject, /PRUEBA MOROWA/);
  assert.match(payload.text, /clienta@example.invalid/);
  assert.match(payload.text, /Enlace de prueba/);
});
test("modo prueba sin destinatario falla cerrado", async () => {
  await assert.rejects(
    deliver(item, {
      RESEND_API_KEY: "test",
      MAIL_FROM: "onboarding@resend.dev",
      MAIL_TEST_MODE: "true",
    }),
    /destinatario de prueba/,
  );
});

test("procesa lotes sin perder mensajes posteriores y respeta los reintentos", async () => {
  const s = emptyState();
  s.outbox = Array.from({ length: 12 }, (_, i) => ({
    ...item,
    id: `mail-${i}`,
  }));
  s.outbox.push({
    ...item,
    id: "waiting",
    status: "failed",
    nextAttempt: "2026-11-12T12:05:00.000Z",
  });
  const sent: string[] = [];
  const send = async (mail: Outbox) => {
    sent.push(mail.id);
    if (mail.id === "mail-0") throw new Error("Domain not verified");
    return `provider-${mail.id}`;
  };
  assert.equal(await processMailQueue(s, item.createdAt, {}, send), 10);
  assert.equal(s.outbox[0].status, "failed");
  assert.equal(s.outbox[0].error, "Domain not verified");
  assert.equal(s.outbox[0].nextAttempt, "2026-11-12T12:05:00.000Z");
  assert.equal(await processMailQueue(s, item.createdAt, {}, send), 2);
  assert.equal(sent.length, 12);
  assert.equal(s.outbox[11].providerId, "provider-mail-11");
  assert.equal(s.outbox[12].attempts, 0);
});

test("el modo prueba no envía mensajes anteriores al inicio configurado", async () => {
  const s = emptyState();
  s.outbox = [{ ...item }];
  assert.equal(
    await processMailQueue(
      s,
      item.createdAt,
      { MAIL_TEST_MODE: "true", MAIL_TEST_START_AT: "2026-11-13T00:00:00Z" },
      async () => {
        throw new Error("No debería enviarse");
      },
    ),
    0,
  );
  assert.equal(s.outbox[0].status, "pending");
});

test("enlaces de acceso solo se guardan en la cola de email", () => {
  const s = emptyState();
  const link = `https://club.example/#activar/${"a".repeat(64)}`;
  queueAccessEmail(s, item.to, item.subject, link, item.createdAt);
  assert.equal(s.outbox[0].text, link);
  assert.equal(s.messages.length, 0);
});

test("no envía enlaces vencidos o reemplazados en la cola", async () => {
  const s = emptyState();
  const token = "b".repeat(64);
  const link = `https://club.example/#activar/${token}`;
  queueAccessEmail(s, item.to, item.subject, link, item.createdAt);
  s.users.push({
    id: "user",
    login: item.to,
    role: "customer",
    passwordHash: "hash",
    mustChange: false,
    createdAt: item.createdAt,
    failures: 0,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    tokenExpires: "2026-11-12T12:01:00Z",
  });
  let calls = 0;
  const send = async () => {
    calls++;
    return "sent";
  };
  await processMailQueue(s, "2026-11-12T12:02:00Z", {}, send);
  assert.equal(calls, 0);
  assert.equal(s.outbox[0].attempts, 5);
  assert.match(s.outbox[0].error!, /venció o fue reemplazado/);
  s.outbox[0].attempts = 0;
  s.outbox[0].nextAttempt = undefined;
  s.users[0].tokenExpires = "2026-11-12T13:00:00Z";
  await processMailQueue(s, item.createdAt, {}, send);
  assert.equal(calls, 1);
  assert.equal(s.outbox[0].status, "sent");
});

test("oculta enlaces de acceso antiguos en el historial del personal y la clienta", () => {
  const s = emptyState();
  const link = `https://club.example/#activar/${"a".repeat(64)}`;
  s.messages.push({
    id: "legacy",
    customerId: "customer",
    title: "Recuperación",
    body: `Abrí ${link}.`,
    tag: "service",
    createdAt: item.createdAt,
  });
  for (const actor of [
    { id: "admin", role: "admin" as const },
    { id: "seller", role: "seller" as const },
    { id: "customer", role: "customer" as const, customerId: "customer" },
  ]) {
    const body = publicView(s, actor, item.createdAt).messages[0].body;
    assert.doesNotMatch(body, /a{64}/);
    assert.match(body, /enlace privado/);
  }
  assert.match(s.messages[0].body, /a{64}/);
});
