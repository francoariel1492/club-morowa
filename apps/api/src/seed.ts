import { Store } from "./store";
import { demoState } from "./fixtures";
async function seed() {
  const store = new Store();
  try {
    await store.init();
    await store.tx(async (s) => {
      if (s.users.length || s.customers.length)
        throw new Error(
          "La base ya tiene datos. El seed no sobrescribe información existente.",
        );
      const demo = await demoState(
        new Date().toISOString(),
        process.env.SEED_PASSWORD || "MorowaDemo2026!",
      );
      Object.assign(s, demo);
    });
    console.log(
      "Datos ficticios creados. Admin: admin@morowa.local · Vendedora: vendedora@morowa.local · Clienta: 30412887. Contraseña: la configurada en SEED_PASSWORD.",
    );
  } finally {
    await store.close();
  }
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
