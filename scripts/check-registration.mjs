import assert from "node:assert/strict";
const base = process.env.TEST_API_URL || "http://127.0.0.1:4002/api/";
async function call(path, body, cookie) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
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
assert.equal(
  (await call("state", undefined, admin.cookie)).data.demo,
  true,
  "Solo ejecutar en demo aislada",
);
const dni = String(Date.now()).slice(-8),
  password = "PruebaRegistro!234";
const input = {
  dni,
  name: "Prueba registro " + dni,
  phone: "2615551234",
  email: "registro@example.invalid",
  accepted: true,
};
assert.equal(
  (await call("register", { ...input, accepted: false })).status,
  400,
);
assert.equal((await call("register", input)).status, 201);
assert.equal((await call("login", { login: dni, password: dni })).status, 401);
let state = (await call("state", undefined, admin.cookie)).data;
const customer = state.customers.find((c) => c.name === input.name);
assert.ok(customer);
assert.equal(
  (
    await call(
      "command",
      { action: "registration.approve", input: { customerId: customer.id } },
      admin.cookie,
    )
  ).status,
  201,
);
const session = await call("login", { login: dni, password: dni });
assert.equal(session.status, 201);
assert.equal(session.data.mustChange, true);
assert.equal(
  (
    await call(
      "onboard",
      { email: input.email, password, accepted: true },
      session.cookie,
    )
  ).status,
  201,
);
assert.equal(
  (await call("state", undefined, session.cookie)).data.customers[0].status,
  "active",
);
assert.equal((await call("login", { login: dni, password: dni })).status, 401);
assert.equal((await call("login", { login: dni, password })).status, 201);
const oldDni = String(Number(dni) + 1);
const created = await call(
  "command",
  {
    action: "customer.create",
    input: { ...input, dni: oldDni, name: "Primer ingreso anterior" },
  },
  admin.cookie,
);
assert.equal(created.status, 201);
const legacy = await call("login", { login: oldDni, password: oldDni });
assert.equal(legacy.status, 201);
assert.equal(legacy.data.mustChange, true);
assert.equal(
  (
    await call(
      "onboard",
      { email: input.email, password, accepted: true },
      legacy.cookie,
    )
  ).status,
  201,
);
console.log(
  "Registro, bloqueo previo a aprobación, DNI inicial y cambio de contraseña, activación y primer ingreso anterior: OK",
);
