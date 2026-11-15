import { spawn } from "node:child_process";
const port = process.env.TEST_PORT || "4010";
console.log(
  `Prueba aislada: http://localhost:${port} — datos ficticios en memoria, sin correos reales.`,
);
const child = spawn(process.execPath, ["apps/api/dist/main.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    MOROWA_DEMO: "true",
    NODE_ENV: "development",
    SERVE_WEB: "true",
    PORT: port,
    HOST: "0.0.0.0",
    WEB_ORIGIN: `http://localhost:${port}`,
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
