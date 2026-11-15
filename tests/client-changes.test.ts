import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  newCustomer,
  execute,
  activateCustomer,
  purchase,
  days,
  balance,
  daily,
  id,
  request,
  annul,
} from "../apps/api/src/domain";
import {
  argentinaPhone,
  birthdayInput,
  acceptTerms,
} from "../apps/api/src/identity";
import { extensionCommand } from "../apps/api/src/extensions";
const now = "2026-11-15T15:00:00.000Z",
  admin = { id: "admin", role: "admin" as const },
  seller = { id: "seller", role: "seller" as const };
function fixture(status: "pending" | "active" = "active") {
  const s = emptyState(),
    c = newCustomer(
      s,
      { name: "Gómez, Ana", email: "ana@example.invalid" },
      now,
      status,
    );
  return { s, c };
}
test("normaliza teléfono argentino y cumpleaños real", () => {
  assert.equal(argentinaPhone("0261", "155551234"), "5492615551234");
  assert.equal(birthdayInput("2/4"), "02/04");
  assert.equal(birthdayInput("2902"), "29/02");
  assert.throws(() => birthdayInput("31/02"));
  assert.throws(() => argentinaPhone("261", "123"));
});
test("email único sin distinguir mayúsculas y DNI opcional", () => {
  const { s, c } = fixture();
  assert.equal(c.dni, "");
  assert.throws(() =>
    newCustomer(s, { name: "Otra", email: "ANA@example.invalid" }, now),
  );
});
test("aprobación de autoregistro activa y emite una sola bienvenida", () => {
  const { s, c } = fixture();
  c.status = "approval";
  c.registrationKind = "self";
  acceptTerms(s, c, { accepted: true }, now);
  assert.throws(() =>
    execute(s, seller, "registration.approve", { customerId: c.id }, now),
  );
  execute(s, admin, "registration.approve", { customerId: c.id }, now);
  assert.equal(c.status, "active");
  assert.equal(s.vouchers.length, 1);
  activateCustomer(s, c, now);
  assert.equal(s.vouchers.length, 1);
});
test("puntos de precargada se acreditan al activar dentro de 30 días", () => {
  const { s, c } = fixture("pending");
  const p = purchase(
    s,
    admin,
    { customerId: c.id, pdv: "0001", number: "572", amount: 100000 },
    now,
  );
  assert.equal(balance(s, c.id, now), 0);
  activateCustomer(s, c, days(now, 5));
  assert.equal(balance(s, c.id, days(now, 5)), 100);
  assert.equal(s.lots[0].createdAt, p.createdAt);
});
test("precarga pierde puntos pendientes al superar 30 días", () => {
  const { s, c } = fixture("pending");
  purchase(
    s,
    admin,
    { customerId: c.id, pdv: "0001", number: "1", amount: 100000 },
    now,
  );
  activateCustomer(s, c, days(now, 31));
  assert.equal(balance(s, c.id, days(now, 31)), 0);
});
test("cuenta corriente solo admin y no se habilita por defecto", () => {
  const { s, c } = fixture();
  assert.equal(c.hasAccount, false);
  assert.throws(() =>
    execute(
      s,
      seller,
      "account.toggle",
      { customerId: c.id, enabled: true },
      now,
    ),
  );
  execute(s, admin, "account.toggle", { customerId: c.id, enabled: true }, now);
  assert.equal(c.hasAccount, true);
});
test("duplicado informa clienta y conserva puntos de venta distintos", () => {
  const { s, c } = fixture();
  purchase(
    s,
    admin,
    { customerId: c.id, pdv: "0001", number: "572", amount: 1000 },
    now,
  );
  assert.throws(
    () =>
      purchase(
        s,
        admin,
        { customerId: c.id, pdv: "0001", number: "00000572", amount: 1000 },
        now,
      ),
    /Gómez, Ana/,
  );
  purchase(
    s,
    admin,
    { customerId: c.id, pdv: "0005", number: "572", amount: 1000 },
    now,
  );
  assert.equal(s.purchases.length, 2);
});
test("ticket pendiente reserva número y no acredita puntos hasta aprobar", () => {
  const { s, c } = fixture();
  const a = { id: "u", role: "customer" as const, customerId: c.id };
  const photo =
    "data:image/png;base64," +
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0]).toString(
      "base64",
    );
  extensionCommand(
    s,
    a,
    "ticket.submit",
    { pdv: "0001", number: "10", amount: 50000, date: "2026-11-14", photo },
    now,
  );
  assert.equal(balance(s, c.id, now), 0);
  assert.throws(
    () =>
      purchase(
        s,
        admin,
        { customerId: c.id, pdv: "0001", number: "10", amount: 50000 },
        now,
      ),
    /reservado/,
  );
  extensionCommand(
    s,
    seller,
    "ticket.resolve",
    { id: s.submissions[0].id, resolution: "approved" },
    now,
  );
  assert.equal(balance(s, c.id, now), 50);
  assert.equal(s.lots[0].createdAt, "2026-11-14T15:00:00.000Z");
  assert.throws(() =>
    extensionCommand(
      s,
      seller,
      "ticket.resolve",
      { id: s.submissions[0].id, resolution: "approved" },
      now,
    ),
  );
});
test("mensajes siempre quedan en portal y servicio no requiere consentimiento", () => {
  const { s, c } = fixture();
  execute(
    s,
    seller,
    "message.send",
    { customerId: c.id, title: "Hola", body: "Mensaje", email: true },
    now,
  );
  assert.equal(s.messages.length, 1);
  assert.equal(s.outbox.length, 0);
  c.status = "approval";
  execute(s, admin, "registration.reject", { customerId: c.id }, now);
  assert.equal(s.outbox.length, 1);
});
test("campaña bonus es idempotente y respeta límite mensual", () => {
  const { s, c } = fixture();
  execute(
    s,
    admin,
    "campaign.save",
    {
      name: "Bono",
      body: "Hola {nombre}",
      type: "bonus",
      bonus: 100,
      from: days(now, -1),
      to: days(now, 2),
    },
    now,
  );
  daily(s, now);
  daily(s, now);
  assert.equal(balance(s, c.id, now), 100);
  assert.equal(s.messages.filter((m) => m.tag === "campaign").length, 1);
  for (let i = 0; i < 6; i++)
    execute(
      s,
      seller,
      "message.send",
      { title: "Promo", body: "Hola", email: true },
      now,
    );
  assert.equal(
    s.messages.filter((m) => ["campaign", "notice"].includes(m.tag)).length,
    4,
  );
});

test("unificación conserva movimientos y rechaza saldos sin conciliar", () => {
  const { s, c } = fixture();
  const source = newCustomer(
    s,
    { name: c.name, email: "duplicate@example.invalid" },
    now,
  );
  const p = purchase(
    s,
    admin,
    { customerId: source.id, pdv: "0001", number: "88", amount: 50000 },
    now,
  );
  source.account.bands[0] = 100;
  assert.throws(
    () =>
      extensionCommand(
        s,
        admin,
        "customer.merge",
        { source: source.id, target: c.id },
        now,
      ),
    /conciliación/,
  );
  source.account.bands[0] = 0;
  extensionCommand(
    s,
    admin,
    "customer.merge",
    { source: source.id, target: c.id },
    now,
  );
  assert.equal(s.customers.length, 1);
  assert.equal(p.customerId, c.id);
  assert.equal(balance(s, c.id, now), 50);
});
