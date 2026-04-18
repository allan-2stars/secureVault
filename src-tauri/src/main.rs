#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, RunEvent};

const LOCAL_API_HOST: &str = "127.0.0.1";
const LOCAL_API_PORT: &str = "9100";
const LOCAL_API_ALLOW_ORIGINS: &str =
    "http://localhost:3000,http://127.0.0.1:3000,http://tauri.localhost,tauri://localhost";

struct LocalVaultApiState(Mutex<Option<Child>>);

fn resolve_local_vault_api_dir(app: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("local-vault-api")
            .canonicalize()
            .map_err(|error| format!("Failed to resolve local-vault-api directory: {error}"))
    }

    #[cfg(not(debug_assertions))]
    {
        app.path()
            .resource_dir()
            .map_err(|error| format!("Failed to resolve Tauri resource directory: {error}"))
            .map(|dir| dir.join("local-vault-api"))
    }
}

fn resolve_local_vault_api_entrypoint(api_dir: &Path) -> PathBuf {
    api_dir.join("run_local_vault_api.py")
}

fn resolve_sqlite_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

    let sqlite_dir = app_data_dir.join("securevault");
    fs::create_dir_all(&sqlite_dir)
        .map_err(|error| format!("Failed to create SQLite app data directory: {error}"))?;

    Ok(sqlite_dir.join("securevault.db"))
}

fn spawn_local_vault_api(app: &AppHandle) -> Result<Child, String> {
    let api_dir = resolve_local_vault_api_dir(app)?;
    let sqlite_path = resolve_sqlite_path(app)?;
    let entrypoint = resolve_local_vault_api_entrypoint(&api_dir);

    #[cfg(target_os = "windows")]
    let python_binary = "python";
    #[cfg(not(target_os = "windows"))]
    let python_binary = "python3";

    Command::new(python_binary)
        .arg(entrypoint)
        .current_dir(api_dir)
        .env("LOCAL_VAULT_API_HOST", LOCAL_API_HOST)
        .env("LOCAL_VAULT_API_PORT", LOCAL_API_PORT)
        .env("LOCAL_VAULT_ALLOW_ORIGINS", LOCAL_API_ALLOW_ORIGINS)
        .env("LOCAL_VAULT_DB_PATH", sqlite_path)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("Failed to launch Local Vault API sidecar: {error}"))
}

fn stop_local_vault_api(app: &AppHandle) {
    if let Some(state) = app.try_state::<LocalVaultApiState>() {
        if let Ok(mut child_slot) = state.0.lock() {
            if let Some(child) = child_slot.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }

            *child_slot = None;
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let child = spawn_local_vault_api(&app.handle())?;
            app.manage(LocalVaultApiState(Mutex::new(Some(child))));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Tauri application")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
                stop_local_vault_api(app);
            }
        });
}
