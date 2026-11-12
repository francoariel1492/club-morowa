import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  newCustomer,
  pointsFor,
  purchase,
  request,
  cancel,
  balance,
  pendingPoints,
  days,
  months,
  daily,
  execute,
  publicView,
  annul,
  gift,
  normalized,
  Actor,
  State,
} from "../apps/api/src/domain";
const now = "2026-11-03T15:00:00.000Z";
const admin: Actor = { id: "a", role: "admin" },
  seller: Actor = { id: "s", role: "seller" };
function setup(points = 450) {
  const s = emptyState();
  const c = newCustomer(
    s,
    {
      name: "Florencia Prueba",
      dni: "30412887",
      phone: "2615550142",
      email: "flor@example.invalid",
    },
    days(now, -5),
    "active",
  );
  if (points)
    purchase(
      s,
      admin,
      { customerId: c.id, pdv: "0001", number: "1", amount: points * 1000 },
      days(now, -1),
    );
  return { s, c, a: { id: "c", role: "customer", customerId: c.id } as Actor };
}
function sale(
  s: State,
  cid: string,
  amount: number,
  number = "2",
  voucherId?: string,
) {
  return purchase(
    s,
    admin,
    { customerId: cid, pdv: "0001", number, amount, voucherId },
    now,
  );
}
function atomic(s: State, fn: (draft: State) => unknown) {
  const draft = structuredClone(s);
  const result = fn(draft);
  Object.assign(s, draft);
  return result;
}
test("redondeo: 24.500→25; 500→1; 499→0; 1.499→1; 1.500→2", () => {
  const s = emptyState();
  [24500, 500, 499, 1499, 1500].forEach((a, i) =>
    assert.equal(pointsFor(a, s.config), [25, 1, 0, 1, 2][i]),
  );
});
test("cambio de mes mantiene fin de mes", () =>
  assert.equal(
    months("2026-08-31T15:00:00.000Z", 6),
    "2027-02-28T15:00:00.000Z",
  ));
test("199 puntos no alcanzan; 200 sí", () => {
  const a = setup(199);
  assert.throws(() =>
    request(a.s, a.c, { catalogIndex: 0, accepted: true }, now),
  );
  const b = setup(200);
  request(b.s, b.c, { catalogIndex: 0, accepted: true }, now);
  assert.equal(balance(b.s, b.c.id, now), 0);
});
test("rechaza canje sin aceptar condiciones", () => {
  const { s, c } = setup();
  assert.throws(() => request(s, c, { catalogIndex: 0, accepted: false }, now));
});
test("reserva puntos y cancelar devuelve a lotes originales", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.equal(balance(s, c.id, now), 250);
  assert.equal(pendingPoints(s, c.id), 200);
  cancel(s, v, now);
  assert.equal(balance(s, c.id, now), 450);
});
test("solo una solicitud al reemplazar", () => {
  const { s, c } = setup();
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  request(s, c, { catalogIndex: 1, accepted: true }, now);
  assert.equal(s.vouchers.filter((v) => v.status === "requested").length, 1);
  assert.equal(balance(s, c.id, now), 50);
});
test("reemplazo imposible mantiene solicitud original", () => {
  const { s, c } = setup(250);
  const old = request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.throws(() => request(s, c, { catalogIndex: 1, accepted: true }, now));
  assert.equal(old.status, "requested");
  assert.equal(balance(s, c.id, now), 50);
});
test("regalo reemplaza solicitud de puntos sin pérdida", () => {
  const { s, c } = setup();
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  const g = gift(s, c, "birthday", now);
  request(s, c, { voucherId: g.id, accepted: true }, now);
  assert.equal(balance(s, c.id, now), 450);
  assert.equal(g.status, "requested");
});
test("puntos reemplazan regalo y lo dejan disponible", () => {
  const { s, c } = setup();
  const g = gift(s, c, "birthday", now);
  request(s, c, { voucherId: g.id, accepted: true }, now);
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.equal(g.status, "available");
});
test("mínimo antes del voucher y puntos sobre lo pagado", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.throws(() => sale(s, c.id, 49999, "2", v.id));
  const p = sale(s, c.id, 50000, "2", v.id);
  assert.equal(p.paid, 45000);
  assert.equal(p.points, 45);
});
test("voucher menor al importe y nunca reutilizable", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  sale(s, c.id, 50000, "2", v.id);
  assert.throws(() => sale(s, c.id, 100000, "3", v.id));
});
test("usar cumpleaños en caja conserva pedido por puntos", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  const g = gift(s, c, "birthday", now);
  sale(s, c.id, 150000, "2", g.id);
  assert.equal(v.status, "requested");
  assert.equal(pendingPoints(s, c.id), 200);
});
test("solicitud vence sin extender regalo", () => {
  const { s, c } = setup();
  const g = gift(s, c, "birthday", now);
  request(s, c, { voucherId: g.id, accepted: true }, days(now, 14));
  assert.equal(g.requestExpires, g.expires);
  daily(s, days(now, 16));
  assert.equal(g.status, "expired");
});
test("vencimiento devuelve puntos solamente si lote sigue vigente", () => {
  const { s, c } = setup();
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  daily(s, days(now, 16));
  assert.equal(balance(s, c.id, days(now, 16)), 450);
});
test("puntos que vencen retenidos no reaparecen", () => {
  const { s, c } = setup();
  s.lots[0].expires = days(now, 5);
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  daily(s, days(now, 16));
  assert.equal(balance(s, c.id, days(now, 16)), 0);
});
test("FIFO por fecha de vencimiento", () => {
  const { s, c } = setup(150);
  sale(s, c.id, 150000);
  s.lots[0].expires = days(now, 2);
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.equal(s.lots[0].remaining, 0);
  assert.equal(s.lots[1].remaining, 100);
});
test("aviso de vencimiento no se duplica", () => {
  const { s } = setup();
  s.lots[0].expires = days(now, 20);
  daily(s, now);
  daily(s, days(now, 1));
  assert.equal(s.messages.filter((m) => m.tag === "expiry").length, 1);
});
test("cumpleaños se genera una vez al año", () => {
  const { s, c } = setup();
  c.birthday = "03/11";
  daily(s, now);
  daily(s, now);
  assert.equal(s.vouchers.filter((v) => v.kind === "birthday").length, 1);
});
test("pendientes y bloqueadas no reciben cumpleaños", () => {
  for (const status of ["pending", "blocked"] as const) {
    const { s, c } = setup();
    c.status = status;
    c.birthday = "03/11";
    daily(s, now);
    assert.equal(s.vouchers.length, 0);
  }
});
test("bloqueada no suma ni solicita ni canjea", () => {
  const { s, c } = setup();
  const v = gift(s, c, "birthday", now);
  c.status = "blocked";
  assert.equal(sale(s, c.id, 100000).points, 0);
  assert.throws(() => request(s, c, { voucherId: v.id, accepted: true }, now));
  assert.throws(() => sale(s, c.id, 150000, "3", v.id));
});
test("penalización también elimina puntos retenidos", () => {
  const { s, c } = setup();
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  execute(
    s,
    admin,
    "customer.block",
    { customerId: c.id, blocked: true, penalty: true, reason: "Revisión" },
    now,
  );
  assert.equal(balance(s, c.id, now), 0);
  assert.equal(pendingPoints(s, c.id), 0);
  assert.equal(s.vouchers[0].status, "cancelled");
});
test("bloqueo sin penalización conserva puntos", () => {
  const { s, c } = setup();
  execute(
    s,
    admin,
    "customer.block",
    { customerId: c.id, blocked: true, penalty: false, reason: "Revisión" },
    now,
  );
  assert.equal(balance(s, c.id, now), 450);
});
test("vendedora no puede bloquear ni editar configuración", () => {
  const { s, c } = setup();
  assert.throws(() =>
    execute(
      s,
      seller,
      "customer.block",
      { customerId: c.id, blocked: true, reason: "test" },
      now,
    ),
  );
  assert.throws(() => execute(s, seller, "config.save", s.config, now));
});
test("clienta no puede registrar compras", () => {
  const { s, c, a } = setup();
  assert.throws(() =>
    execute(
      s,
      a,
      "purchase.create",
      { customerId: c.id, pdv: "0001", number: "3", amount: 100000 },
      now,
    ),
  );
});
test("anulación de vendedora con voucher requiere aprobación", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  const p = sale(s, c.id, 50000, "2", v.id);
  annul(s, seller, p, "Error de carga", now);
  assert.equal(p.status, "annul_pending");
  annul(s, admin, p, "Error de carga", now, true);
  assert.equal(p.status, "annulled");
  assert.equal(v.status, "available");
});
test("anulación de puntos gastados puede generar saldo negativo", () => {
  const { s, c } = setup(200);
  request(s, c, { catalogIndex: 0, accepted: true }, now);
  annul(s, admin, s.purchases[0], "Ticket erróneo", now);
  assert.equal(balance(s, c.id, now), -200);
});
test("anulación fuera de plazo rechazada", () => {
  const { s } = setup();
  assert.throws(() =>
    annul(s, admin, s.purchases[0], "Error de carga", days(now, 8)),
  );
});
test("ticket duplicado rechazado; anulado se reutiliza", () => {
  const { s, c } = setup();
  assert.throws(() => sale(s, c.id, 50000, "1"));
  annul(s, admin, s.purchases[0], "Error de carga", now);
  sale(s, c.id, 50000, "1");
  assert.equal(s.purchases.length, 2);
});
test("mismo número en otro punto de venta es válido", () => {
  const { s, c } = setup();
  purchase(
    s,
    admin,
    { customerId: c.id, pdv: "0005", number: "1", amount: 50000 },
    now,
  );
  assert.equal(s.purchases.length, 2);
});
test("rechaza ticket con letras, largo y montos inválidos", () => {
  for (const number of ["abc", "123456789", ""]) {
    const { s, c } = setup();
    assert.throws(() => sale(s, c.id, 10000, number));
  }
  for (const amount of [0, -1, NaN, Infinity]) {
    const { s, c } = setup();
    assert.throws(() => sale(s, c.id, amount));
  }
});
test("campañas coincidentes usan el mayor multiplicador", () => {
  const { s, c } = setup();
  s.campaigns.push(
    ...[2, 3].map((multiplier) => ({
      id: String(multiplier),
      name: "Campaña",
      from: days(now, -1),
      to: days(now, 1),
      multiplier,
      paused: false,
      body: "Test",
    })),
  );
  assert.equal(sale(s, c.id, 10000).points, 30);
});
test("DNI normalizado evita duplicados", () => {
  const { s } = setup();
  assert.throws(() =>
    newCustomer(
      s,
      { name: "Duplicada", dni: "30.412.887", phone: "2615550142" },
      now,
    ),
  );
});
test("catálogo con cero puntos no se solicita", () => {
  const { s, c } = setup();
  s.config.catalog[0].points = 0;
  assert.throws(() => request(s, c, { catalogIndex: 0, accepted: true }, now));
});
test("portal no expone DNI, deuda, notas, auditoría ni otras clientas", () => {
  const { s, c, a } = setup();
  newCustomer(
    s,
    { name: "Otra Clienta", dni: "35220145", phone: "2615550198" },
    now,
  );
  c.account.bands = [10000, 0, 0, 0, 0];
  const v = publicView(s, a, now);
  assert.equal(v.customers.length, 1);
  assert.equal("dni" in v.customers[0], false);
  assert.equal("bands" in v.customers[0].account, false);
  assert.equal("notes" in v.customers[0], false);
  assert.deepEqual(v.audit, []);
});
test("lectura es explícita e idempotente", () => {
  const { s, c, a } = setup();
  gift(s, c, "welcome", now);
  const m = s.messages[0];
  assert.equal(m.readAt, undefined);
  execute(s, a, "message.read", { id: m.id }, now);
  execute(s, a, "message.read", { id: m.id }, days(now, 1));
  assert.equal(m.readAt, now);
});
test("una clienta no cancela vouchers ajenos", () => {
  const { s, c } = setup();
  const v = request(s, c, { catalogIndex: 0, accepted: true }, now);
  assert.throws(() =>
    execute(
      s,
      { id: "other", role: "customer", customerId: "other" },
      "portal.cancel",
      { id: v.id },
      now,
    ),
  );
});
test("fallo de compra con canje directo revierte toda la transacción", () => {
  const { s, c } = setup();
  assert.throws(() =>
    atomic(s, (draft) =>
      purchase(
        draft,
        admin,
        {
          customerId: c.id,
          pdv: "0001",
          number: "2",
          amount: 100,
          catalogIndex: 0,
          accepted: true,
        },
        now,
      ),
    ),
  );
  assert.equal(balance(s, c.id, now), 450);
  assert.equal(s.vouchers.length, 0);
});
test("cruce de nombres ignora orden, tildes y marca BLOQUEADA", () =>
  assert.equal(normalized("GOMEZ LAURA BLOQUEADA"), normalized("Laura Gómez")));
