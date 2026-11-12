import { spawn } from "node:child_process";
const executable = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(executable, ["run", "dev"], {
  stdio: "inherit",
  env: { ...process.env, MOROWA_DEMO: "true", NODE_ENV: "development" },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
