import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store";
import { newCustomer, id } from "../apps/api/src/domain";
import {
  migrateClientChanges,
  CLIENT_CHANGES_MIGRATION,
} from "../apps/api/src/migration";
async function run() {
  assert.match(
    process.env.DATABASE_URL || "",
    /127\.0\.0\.1:3307\/morowa_upgrade_test$/,
  );
  const s = new Store();
  await s.init();
  const cid = await s.tx((x) => {
    const c = newCustomer(
      x,
      {
        name: "Migración ficticia",
        email: `migration-${id()}@example.invalid`,
      },
      new Date().toISOString(),
      "active",
    );
    delete c.hasAccount;
    c.account.bands[0] = 1200;
    return c.id;
  });
  await s.tx(migrateClientChanges, CLIENT_CHANGES_MIGRATION);
  await s.tx((x) => {
    const c = x.customers.find((c) => c.id === cid)!;
    assert.equal(c.hasAccount, true);
    assert.equal(c.account.bands[0], 1200);
    assert.ok(x.config.templates.recovery);
    assert.ok(Array.isArray(x.submissions));
  });
  const [rows]: any = await s.pool.query(
    "SELECT payload FROM app_migration_backups WHERE id=?",
    [CLIENT_CHANGES_MIGRATION],
  );
  assert.equal(rows.length, 1);
  const before = JSON.stringify(rows[0].payload);
  await s.tx(migrateClientChanges, CLIENT_CHANGES_MIGRATION);
  const [after]: any = await s.pool.query(
    "SELECT payload FROM app_migration_backups WHERE id=?",
    [CLIENT_CHANGES_MIGRATION],
  );
  assert.equal(JSON.stringify(after[0].payload), before);
  await s.close();
  console.log(
    "MySQL: migración conserva saldo, guarda respaldo una vez y puede repetirse: OK",
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
