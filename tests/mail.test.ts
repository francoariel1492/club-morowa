import { test } from "node:test";
import assert from "node:assert/strict";
import { mailConfigured, requireMail, deliver } from "../apps/api/src/mail";
import type { Outbox } from "../apps/api/src/domain";
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
