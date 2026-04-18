import { spawnSync } from "node:child_process";

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore"
  });

  return result.status === 0;
}

function printInstallHelp() {
  console.error("Tauri desktop build prerequisites are not ready.");
  console.error("");
  console.error("Missing required toolchain:");
  console.error("- Rust/Cargo");
  console.error("");
  console.error("Install the Rust toolchain first, then restart your terminal.");
  console.error("Official Tauri docs: https://v2.tauri.app/start/prerequisites/");
  console.error("Rust install command:");
  console.error("  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh");
  console.error("");
  console.error("After installation, verify these commands work:");
  console.error("  cargo --version");
  console.error("  rustc --version");
  console.error("");
  console.error("Linux desktop builds also need Tauri system packages.");
  console.error("On Debian/Ubuntu, Tauri docs currently list:");
  console.error("  sudo apt update");
  console.error(
    "  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev"
  );
}

const hasCargo = commandExists("cargo");
const hasRustc = commandExists("rustc");

if (!hasCargo || !hasRustc) {
  printInstallHelp();
  process.exit(1);
}

if (!commandExists("python3")) {
  console.error("`python3` is not available on PATH.");
  console.error("The current desktop sidecar launcher needs Python 3 to start the Local Vault API.");
  process.exit(1);
}

console.log("Tauri desktop prerequisites look available.");
