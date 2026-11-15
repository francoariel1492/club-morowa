import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  newCustomer,
  purchase,
  gift,
  accountStatus,
} from "../apps/api/src/domain";
import { reportRows } from "../apps/api/src/reports";
const now = "2026-11-15T15:00:00.000Z";
test("período argentino incluye compras de la madrugada UTC del día siguiente", () => {
  const s = emptyState(),
    c = newCustomer(
      s,
      { name: "Ana", email: "ana@example.invalid" },
      now,
      "active",
    );
  purchase(
    s,
    { id: "a", role: "admin" },
    { customerId: c.id, pdv: "0001", number: "1", amount: 10000 },
    "2026-11-16T01:00:00.000Z",
  );
  const rows = reportRows(
    s,
    "summary",
    "2026-11-15T00:00:00-03:00",
    "2026-11-15T23:59:59-03:00",
    now,
  );
  assert.equal(rows[0].Valor, 10000);
  assert.throws(() => reportRows(s, "summary", "invalid", now, now));
});
test("vouchers se cuentan por emisión y uso reales", () => {
  const s = emptyState(),
    c = newCustomer(
      s,
      { name: "Ana", email: "ana@example.invalid" },
      now,
      "active",
    );
  gift(s, c, "welcome", now);
  s.vouchers[0].status = "redeemed";
  s.vouchers[0].redeemedAt = "2026-12-01T15:00:00.000Z";
  const r = reportRows(
    s,
    "vouchers",
    "2026-11-01T00:00:00Z",
    "2026-11-30T23:59:59Z",
    now,
  ).find((r: any) => r.Tipo === "welcome")!;
  assert.equal(r.Emitidos, 1);
  assert.equal(r["Usados en el período"], 0);
});
test("bloqueo de club no altera estado de cuenta corriente", () => {
  const s = emptyState(),
    c = newCustomer(
      s,
      { name: "Ana", email: "ana@example.invalid" },
      now,
      "active",
    );
  c.hasAccount = true;
  c.status = "blocked";
  assert.equal(accountStatus(c), "Activa");
  c.account.bands[4] = 100;
  assert.equal(accountStatus(c), "Vencida");
});
