import assert from "node:assert/strict";
const root = process.env.TEST_API_URL || "http://127.0.0.1:4010/api/";
async function call(path, body, cookie) {
  const r = await fetch(root + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: process.env.TEST_API_URL ? new URL(root).origin : "http://localhost:4010",
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const admin = await call("login", {
  login: "admin@morowa.local",
  password: "MorowaDemo2026!",
});
assert.equal(admin.status, 201);
assert.equal(
  (await call("state", undefined, admin.cookie)).data.demo,
  true,
  "Solo ejecutar en demo",
);
const seller = await call("login", {
  login: "vendedora@morowa.local",
  password: "MorowaDemo2026!",
});
assert.equal(seller.status, 201);
const n = Date.now(),
  email = `test${n}@example.invalid`,
  password = "DemoNuevaClave123!";
const registered = await call("register", {
  firstName: "ana",
  lastName: "pérez " + n,
  email,
  area: "0261",
  phone: "155551234",
  birthday: "2/4",
  password,
  accepted: true,
});
assert.equal(registered.status, 201, JSON.stringify(registered.data));
const pending = await call("login", { login: email, password });
assert.match(pending.data.message, /revisión/);
const c = (await call("state", undefined, admin.cookie)).data.customers.find(
  (c) => c.email === email,
);
const registrationOutbox = (await call("state", undefined, admin.cookie)).data
  .outbox;
assert.equal(
  registrationOutbox.filter(
    (o) =>
      o.to === email && o.subject === "Recibimos tu solicitud al Club Morowa",
  ).length,
  1,
);
assert.equal(c.phone, "5492615551234");
assert.equal(c.birthday, "02/04");
assert.equal(c.hasAccount, false);
assert.equal(
  (
    await call(
      "command",
      { action: "registration.approve", input: { customerId: c.id } },
      seller.cookie,
    )
  ).status,
  400,
);
assert.equal(
  (
    await call(
      "command",
      {
        action: "registration.approve",
        input: { customerId: c.id, hasAccount: true },
      },
      admin.cookie,
    )
  ).status,
  201,
);
const login = await call("login", { login: email, password });
assert.equal(login.status, 201);
assert.equal(login.data.mustChange, false);
const view = (await call("state", undefined, login.cookie)).data;
assert.equal(view.customers[0].status, "active");
assert.equal(view.vouchers.filter((v) => v.kind === "welcome").length, 1);
const approvedState = (await call("state", undefined, admin.cookie)).data;
assert.equal(approvedState.outbox.filter((o) => o.to === email && /Bienvenida/i.test(o.subject)).length, 1);
assert.equal(
  (await call("login", { login: "30412887", password: "MorowaDemo2026!" }))
    .status,
  401,
);
for (const e of [email, "missing@example.invalid"]) {
  const recovery = await call("recover", { email: e });
  assert.equal(recovery.status, 201);
  assert.match(recovery.data.message, /Modo demostración.*no se envían correos reales/);
}
const recoveryState = (await call("state", undefined, admin.cookie)).data;
const recoveryMail = recoveryState.outbox.find((o) => o.to === email && /Recuperá tu acceso/.test(o.subject));
assert.ok(recoveryMail, "La recuperación debe generar un correo para la clienta");
// Admin state deliberately hides email bodies/tokens. Exercise the same reset
// endpoint with a separate demo account and the authorized copy-link action.
const resetFixture = recoveryState.customers.find((x) => x.status === "active" && x.email === "clienta0@example.invalid");
assert.ok(resetFixture);
const resetLink = await call("invite", { customerId: resetFixture.id, reset: true, copyOnly: true }, admin.cookie);
assert.equal(resetLink.status, 201);
const recoveryToken = resetLink.data.link.split("#activar/")[1];
assert.ok(recoveryToken);
const newPassword = "ClaveRenovadaPrueba123!";
assert.equal((await call("activate", { token: recoveryToken, password: newPassword })).status, 201);
assert.equal((await call("login", { login: resetFixture.email, password: "MorowaDemo2026!" })).status, 401);
assert.equal((await call("login", { login: resetFixture.email, password: newPassword })).status, 201);
assert.equal((await call("activate", { token: recoveryToken, password: newPassword })).status, 400);
const preloaded = await call(
  "command",
  {
    action: "customer.create",
    input: { name: "Gómez, María " + n, email: `pre${n}@example.invalid` },
  },
  admin.cookie,
);
assert.equal(preloaded.status, 201, JSON.stringify(preloaded.data));
// A copy-link intentionally rotates the previous token; create via import-like account without auto-invite for this check using a fixture pending account.
const fixture = (
  await call("state", undefined, admin.cookie)
).data.customers.find((c) => c.status === "pending" && !c.lastInvite);
assert.ok(fixture);
const link = await call(
  "invite",
  { customerId: fixture.id, copyOnly: true },
  admin.cookie,
);
assert.equal(link.status, 201);
const token = link.data.link.split("#activar/")[1];
assert.equal((await call("activation-info", { token })).status, 201);
assert.equal(
  (await call("activate", { token, password, accepted: false })).status,
  400,
);
const activated = await call("activate", { token, password, accepted: true });
assert.equal(activated.status, 201, JSON.stringify(activated.data));
assert.equal(activated.data.mustChange, false);
assert.equal(
  (await call("activate", { token, password, accepted: true })).status,
  400,
);
assert.equal((await call("team", undefined, seller.cookie)).status, 400);
assert.equal(
  (await call("ticket/photo?id=missing", undefined, login.cookie)).status,
  400,
);
assert.equal((await call("reports", undefined, login.cookie)).status, 400);
console.log(
  "Email, registro, aprobación por rol, bienvenida única, activación sin email, enlace de un uso, permisos y recuperación neutral: OK",
);
