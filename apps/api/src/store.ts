import { createPool, Pool, RowDataPacket } from "mysql2/promise";
import { config } from "dotenv";
import { resolve } from "node:path";
import { emptyState, State } from "./domain";
import { demoState } from "./fixtures";
config({ path: resolve(__dirname, "../../../.env") });
const tables = [
  "customers",
  "lots",
  "vouchers",
  "purchases",
  "messages",
  "campaigns",
  "audit",
  "outbox",
  "users",
  "sessions",
] as const;
export class Store {
  pool!: Pool;
  private memory?: State;
  private queue: Promise<unknown> = Promise.resolve();
  readonly demo =
    process.env.MOROWA_DEMO === "true" && process.env.NODE_ENV !== "production";
  constructor() {
    if (this.demo) return;
    if (!process.env.DATABASE_URL)
      throw new Error("Falta DATABASE_URL. Copiá .env.example a .env.");
    this.pool = createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5,
      timezone: "Z",
      decimalNumbers: true,
      ...(process.env.DATABASE_SSL === "true"
        ? {
            ssl: {
              rejectUnauthorized: true,
              ...(process.env.DATABASE_CA_PEM
                ? { ca: process.env.DATABASE_CA_PEM.replace(/\\n/g, "\n") }
                : {}),
            },
          }
        : {}),
    });
  }
  async init() {
    if (this.demo) {
      this.memory = await demoState();
      return;
    }
    await this.pool.query(
      "CREATE TABLE IF NOT EXISTS app_config (id INT PRIMARY KEY, payload JSON NOT NULL) ENGINE=InnoDB",
    );
    await this.pool.query("INSERT IGNORE INTO app_config VALUES (1, ?)", [
      JSON.stringify(emptyState().config),
    ]);
    for (const name of tables)
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS ${name} (id VARCHAR(64) PRIMARY KEY, payload JSON NOT NULL) ENGINE=InnoDB`,
      );
  }
  async tx<T>(fn: (s: State) => Promise<T> | T): Promise<T> {
    if (this.demo) {
      const operation = this.queue.then(async () => {
        const draft = structuredClone(this.memory!);
        const result = await fn(draft);
        this.memory = draft;
        return result;
      });
      this.queue = operation.catch(() => {});
      return operation;
    }
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const [cfg] = await c.query<RowDataPacket[]>(
        "SELECT payload FROM app_config WHERE id=1 FOR UPDATE",
      );
      const s = emptyState();
      const parse = (v: any) => (typeof v === "string" ? JSON.parse(v) : v);
      s.config = parse(cfg[0].payload);
      for (const name of tables) {
        const [rows] = await c.query<RowDataPacket[]>(
          `SELECT payload FROM ${name}`,
        );
        (s[name] as any) = rows.map((r) => parse(r.payload));
      }
      const before = new Map(
        tables.map((name) => [
          name,
          new Map(s[name].map((x: any) => [x.id, JSON.stringify(x)])),
        ]),
      );
      const result = await fn(s);
      await c.query("UPDATE app_config SET payload=? WHERE id=1", [
        JSON.stringify(s.config),
      ]);
      for (const name of tables) {
        const old = before.get(name)!;
        for (const row of s[name]) {
          const json = JSON.stringify(row);
          if (old.get(row.id) !== json)
            await c.query(
              `INSERT INTO ${name} (id,payload) VALUES (?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)`,
              [row.id, json],
            );
          old.delete(row.id);
        }
        for (const key of old.keys())
          await c.query(`DELETE FROM ${name} WHERE id=?`, [key]);
      }
      await c.commit();
      return result;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async close() {
    if (this.pool) await this.pool.end();
  }
}
