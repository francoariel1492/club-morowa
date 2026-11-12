import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { emptyState, newCustomer } from "../apps/api/src/domain";
import { parseWorkbook, applyImport } from "../apps/api/src/imports";
const now = "2026-11-12T15:00:00.000Z";
async function file(rows: unknown[][]) {
  const w = new ExcelJS.Workbook();
  w.addWorksheet("Datos").addRows(rows);
  return Buffer.from(await w.xlsx.writeBuffer()).toString("base64");
}
const headers = [
  "Cliente",
  "Saldo",
  "15 dias",
  "30 dias",
  "60 dias",
  "90 dias",
  "+90 dias",
];
test("importación distingue 90 días de +90 y cruza nombre sin orden", async () => {
  const s = emptyState();
  const c = newCustomer(
    s,
    { name: "Laura Gómez", dni: "30412887", phone: "2615550142" },
    now,
    "active",
  );
  const b = await file([
    headers,
    ["GOMEZ LAURA", 100, 0, 0, 0, 30, 70],
    ["TOTALES", 100, 0, 0, 0, 30, 70],
  ]);
  const r = await parseWorkbook(b, "balances", s);
  assert.equal(r.length, 1);
  assert.equal(r[0].customerId, c.id);
  assert.deepEqual(r[0].data.bands, [0, 0, 0, 30, 70]);
  assert.deepEqual(c.account.bands, [0, 0, 0, 0, 0]);
  applyImport(
    s,
    { id: "a", role: "admin" },
    r,
    "balances",
    [{ row: 2 }],
    "2026-11-12",
    false,
    now,
  );
  assert.deepEqual(c.account.bands, [0, 0, 0, 30, 70]);
});
test("TOTALES incorrectos rechazan importación", async () => {
  const b = await file([
    headers,
    ["Laura", 100, 0, 0, 0, 0, 100],
    ["TOTALES", 200, 0, 0, 0, 0, 100],
  ]);
  await assert.rejects(parseWorkbook(b, "balances", emptyState()));
});
test("maestro detecta duplicados normalizados y email inválido", async () => {
  const b = await file([
    ["Nombre y apellido", "DNI", "Celular", "Email"],
    ["Ana Pérez", "30.412.887", "2615550142", "ana@example.com"],
    ["Ana Pérez", "30412887", "2615550142", "ana@example"],
    ["Sin teléfono", "30412888", "", ""],
  ]);
  const r = await parseWorkbook(b, "master", emptyState());
  assert.equal(r[0].status, "ready");
  assert.match(r[1].error!, /duplicado/);
  assert.match(r[1].error!, /Email/);
  assert.match(r[2].error!, /celular/);
});
test("importe argentino como texto y bloqueo persistente", async () => {
  const s = emptyState();
  const c = newCustomer(
    s,
    { name: "Laura Gómez", dni: "30412887", phone: "2615550142" },
    now,
    "active",
  );
  const b = await file([
    headers,
    ["GOMEZ LAURA BLOQUEADA", "1.000", 0, 0, 0, 0, "1.000"],
  ]);
  const r = await parseWorkbook(b, "balances", s);
  assert.equal(r[0].data.total, 1000);
  applyImport(
    s,
    { id: "a", role: "admin" },
    r,
    "balances",
    [{ row: 2 }],
    "2026-11-12",
    false,
    now,
  );
  assert.equal(c.status, "blocked");
  const r2 = await parseWorkbook(
    await file([headers, ["Laura Gómez", 0, 0, 0, 0, 0, 0]]),
    "balances",
    s,
  );
  applyImport(
    s,
    { id: "a", role: "admin" },
    r2,
    "balances",
    [{ row: 2 }],
    "2026-11-12",
    false,
    now,
  );
  assert.equal(c.status, "blocked");
});
test("no acepta dos filas asignadas a la misma clienta", async () => {
  const s = emptyState();
  const c = newCustomer(
    s,
    { name: "Laura Gómez", dni: "30412887", phone: "2615550142" },
    now,
    "active",
  );
  const rows = await parseWorkbook(
    await file([
      headers,
      ["Laura Gómez", 1, 1, 0, 0, 0, 0],
      ["Gómez Laura", 2, 2, 0, 0, 0, 0],
    ]),
    "balances",
    s,
  );
  assert.throws(() =>
    applyImport(
      s,
      { id: "a", role: "admin" },
      rows,
      "balances",
      [
        { row: 2, customerId: c.id },
        { row: 3, customerId: c.id },
      ],
      "2026-11-12",
      false,
      now,
    ),
  );
});
