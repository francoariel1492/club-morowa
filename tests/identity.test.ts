import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, Customer } from "../apps/api/src/domain";
import { customerForEmail } from "../apps/api/src/identity";

test("legacy invitations do not shadow the unique activated account", () => {
  const s = emptyState();
  s.customers = ["pending", "active", "pending"].map((status, i) => ({id: String(i), email: "test@example.com", status}) as Customer);
  assert.equal(customerForEmail(s, "TEST@example.com")?.id, "1");
  s.customers.reverse();
  assert.equal(customerForEmail(s, "test@example.com")?.id, "1");
});
test("ambiguous activated accounts fail closed and unknown email stays unknown", () => {
  const s = emptyState();
  s.customers = ["active", "active"].map((status, i) => ({id: String(i), email: "test@example.com", status}) as Customer);
  assert.throws(() => customerForEmail(s, "test@example.com"), /duplicadas/);
  assert.equal(customerForEmail(s, "unknown@example.com"), undefined);
});
