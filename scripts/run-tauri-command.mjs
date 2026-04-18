import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const command = process.argv[2];

if (command !== "build" && command !== "dev") {
  console.error("Usage: node scripts/run-tauri-command.mjs <build|dev>");
  process.exit(1);
}

const currentFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(currentFile);
const checkScript = path.join(scriptDir, "check-tauri-prereqs.mjs");

const nodeBinary = process.execPath;
const checkResult = spawnSync(nodeBinary, [checkScript], {
  stdio: "inherit"
});

if (checkResult.status !== 0) {
  process.exit(checkResult.status ?? 1);
}

const npxBinary = process.platform === "win32" ? "npx.cmd" : "npx";
const tauriResult = spawnSync(npxBinary, ["tauri", command], {
  stdio: "inherit"
});

process.exit(tauriResult.status ?? 1);
