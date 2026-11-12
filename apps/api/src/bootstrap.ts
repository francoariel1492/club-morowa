import { hash } from "bcryptjs";
import { Store } from "./store";
import { demoState } from "./fixtures";
import { id, audit } from "./domain";
export async function bootstrap(store: Store) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL,
    password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (
    !email ||
    !password ||
    password.length < 16 ||
    password === "MorowaDemo2026!" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new Error(
      "Configurá BOOTSTRAP_ADMIN_EMAIL y una contraseña privada de 16 caracteres o más.",
    );
  await store.tx(async (s) => {
    if (s.users.length) return;
    const now = new Date().toISOString();
    if (process.env.SEED_DEMO_ON_EMPTY === "true") {
      Object.assign(s, await demoState(now, password));
      const admin = s.users.find((u) => u.role === "admin")!;
      admin.login = email.toLowerCase();
    } else
      s.users.push({
        id: id(),
        login: email.toLowerCase(),
        role: "admin",
        passwordHash: await hash(password, 12),
        mustChange: false,
        createdAt: now,
        failures: 0,
      });
    audit(
      s,
      { id: "bootstrap", role: "admin" },
      "environment.initialized",
      "",
      { demoFixtures: process.env.SEED_DEMO_ON_EMPTY === "true" },
      now,
    );
  });
}
