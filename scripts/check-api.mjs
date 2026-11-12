import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:3001/api/";
let checks = 0;
async function call(path, body, cookie) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
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
const ok = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log("OK", label);
};
const admin = await call("login", {
  login: "admin@morowa.local",
  password: "MorowaDemo2026!",
});
ok(admin.status === 201, "Ingreso admin");
let state = await call("state", undefined, admin.cookie);
assert.equal(
  state.data.demo,
  true,
  "Este script solo funciona contra el modo demo, nunca contra datos reales.",
);
const c = state.data.customers[0];
ok((await call("state")).status === 401, "Sin sesión no accede a datos");
const customer = await call("login", {
  login: "30412887",
  password: "MorowaDemo2026!",
});
const view = (await call("state", undefined, customer.cookie)).data;
ok(
  view.customers.length === 1 &&
    !("bands" in view.customers[0].account) &&
    !("dni" in view.customers[0]),
  "Portal aislado sin deuda ni DNI",
);
ok(
  (await call("command", { action: "config.save", input: {} }, customer.cookie))
    .status === 400,
  "Clienta no cambia configuración",
);
const seller = await call("login", {
  login: "vendedora@morowa.local",
  password: "MorowaDemo2026!",
});
ok(
  (
    await call(
      "command",
      {
        action: "customer.block",
        input: { customerId: c.id, blocked: true, reason: "Prueba" },
      },
      seller.cookie,
    )
  ).status === 400,
  "Vendedora no bloquea cuentas",
);
const number = String(Date.now()).slice(-8);
const order = {
  action: "purchase.create",
  input: { customerId: c.id, pdv: "0001", number, amount: 50000 },
};
const concurrent = await Promise.all([
  call("command", order, admin.cookie),
  call("command", order, admin.cookie),
]);
ok(
  concurrent.filter((r) => r.status === 201).length === 1 &&
    concurrent.filter((r) => r.status === 400).length === 1,
  "Doble envío concurrente registra una sola compra",
);
const original = (await call("state", undefined, admin.cookie)).data;
const invalid = await call(
  "command",
  {
    action: "purchase.create",
    input: {
      customerId: c.id,
      pdv: "0001",
      number: String(Number(number) + 1),
      amount: 100,
      catalogIndex: 0,
      accepted: true,
    },
  },
  admin.cookie,
);
ok(invalid.status === 400, "Canje directo menor a mínima rechazado");
const after = (await call("state", undefined, admin.cookie)).data;
ok(
  after.customers[0].points === original.customers[0].points &&
    after.vouchers.length === original.vouchers.length,
  "Rollback conserva puntos y vouchers",
);
for (const [kind, file] of [
  ["master", "maestro-clientas.xlsx"],
  ["balances", "saldos-ninox.xlsx"],
]) {
  const base64 = (
    await readFile(new URL("../examples/" + file, import.meta.url))
  ).toString("base64");
  const preview = await call("import/preview", { kind, base64 }, admin.cookie);
  ok(
    preview.status === 201 && preview.data.rows.length > 0,
    "Revisión de archivo " + kind,
  );
  if (kind === "balances") {
    ok(preview.data.rows.length === 20, "Ignora fila TOTALES y hoja Notas");
    ok(
      preview.data.rows.find((r) => r.name.includes("SOSA")).data.bands[4] ===
        40500,
      "Tramo +90 correcto en archivo de ejemplo",
    );
  }
}
const noOrigin = await fetch(base + "login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ login: "30412887", password: "MorowaDemo2026!" }),
});
ok(noOrigin.status === 403, "Protección de origen en escrituras");
console.log(`\n${checks} comprobaciones HTTP aprobadas.`);
