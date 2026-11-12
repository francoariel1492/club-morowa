import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { hash } from "bcryptjs";
import { Store } from "./store";
import { State, id, ensure, audit } from "./domain";
async function main() {
  const [action, arg, role] = process.argv.slice(2);
  const store = new Store();
  try {
    await store.init();
    ensure(
      !store.demo,
      "El mantenimiento requiere una base MySQL, no el modo demo.",
    );
    if (action === "backup") {
      ensure(arg, "Indicá el archivo de destino.");
      const snapshot = await store.tx((s) => ({
        ...structuredClone(s),
        sessions: [],
      }));
      await mkdir(dirname(arg), { recursive: true });
      await writeFile(
        arg,
        JSON.stringify(
          {
            format: "morowa-backup-v1",
            createdAt: new Date().toISOString(),
            state: snapshot,
          },
          null,
          2,
        ),
        { flag: "wx", mode: 0o600 },
      );
      console.log("Respaldo creado. Guardalo cifrado en un lugar privado.");
    } else if (action === "restore") {
      ensure(arg, "Indicá el archivo de respaldo.");
      const backup = JSON.parse(await readFile(arg, "utf8"));
      ensure(
        backup.format === "morowa-backup-v1" &&
          backup.state?.config &&
          Array.isArray(backup.state.users),
        "Formato de respaldo inválido.",
      );
      await store.tx((s) => {
        ensure(
          !s.users.length && !s.customers.length && !s.purchases.length,
          "La restauración requiere una base vacía. No se sobrescriben datos existentes.",
        );
        Object.assign(s, backup.state as State);
        s.sessions = [];
      });
      console.log(
        "Respaldo restaurado. Verificá el ingreso, las cantidades y los saldos antes de usarlo.",
      );
    } else if (action === "user") {
      ensure(
        arg && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(arg),
        "Indicá un email válido.",
      );
      ensure(["admin", "seller"].includes(role), "Rol: admin o seller.");
      const terminal = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const password = await terminal.question(
        "Contraseña inicial (se verá en esta terminal; mínimo 12 caracteres): ",
      );
      terminal.close();
      ensure(password.length >= 12, "Mínimo 12 caracteres.");
      const passwordHash = await hash(password, 12);
      await store.tx((s) => {
        ensure(
          !s.users.some((u) => u.login === arg.toLowerCase()),
          "Ya existe un usuario con ese email.",
        );
        const uid = id();
        s.users.push({
          id: uid,
          login: arg.toLowerCase(),
          passwordHash,
          role: role as "admin" | "seller",
          mustChange: false,
          createdAt: new Date().toISOString(),
          failures: 0,
        });
        audit(
          s,
          { id: "maintenance", role: "admin" },
          "staff.created",
          uid,
          { role },
          new Date().toISOString(),
        );
      });
      console.log("Usuario del equipo creado.");
    } else
      throw new Error(
        "Uso: maintenance.ts backup archivo | restore archivo | user email admin|seller",
      );
  } finally {
    await store.close();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
