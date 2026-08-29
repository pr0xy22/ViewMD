use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, RwLock},
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DocumentSnapshot {
    path: String,
    name: String,
    content: String,
    error: Option<String>,
    modified_at_ms: Option<u64>,
}

struct PreviewState {
    target: Arc<RwLock<Option<PathBuf>>>,
    watched_directory: Mutex<Option<PathBuf>>,
    watcher: Mutex<RecommendedWatcher>,
}

fn path_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled.md")
        .to_owned()
}

fn snapshot(path: &Path) -> DocumentSnapshot {
    let modified_at_ms = fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64);

    match fs::read_to_string(path) {
        Ok(content) => DocumentSnapshot {
            path: path.to_string_lossy().into_owned(),
            name: path_name(path),
            content,
            error: None,
            modified_at_ms,
        },
        Err(error) => DocumentSnapshot {
            path: path.to_string_lossy().into_owned(),
            name: path_name(path),
            content: String::new(),
            error: Some(format!("{error}")),
            modified_at_ms,
        },
    }
}

fn validate_markdown_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase);

    if !matches!(extension.as_deref(), Some("md" | "markdown")) {
        return Err("Learn can only preview .md and .markdown files.".to_owned());
    }
    if !path.is_file() {
        return Err(format!("Preview file does not exist: {}", path.display()));
    }
    Ok(())
}

fn absolute_path(path: &Path, cwd: &Path) -> Result<PathBuf, String> {
    let joined = if path.is_absolute() {
        path.to_owned()
    } else {
        cwd.join(path)
    };

    joined
        .canonicalize()
        .map_err(|error| format!("Could not open {}: {error}", joined.display()))
}

fn set_preview_file(
    app: &AppHandle,
    state: &PreviewState,
    requested_path: &Path,
    cwd: &Path,
) -> Result<DocumentSnapshot, String> {
    let path = absolute_path(requested_path, cwd)?;
    validate_markdown_path(&path)?;
    let directory = path
        .parent()
        .ok_or_else(|| "The preview file has no parent directory.".to_owned())?
        .to_owned();

    {
        let mut watcher = state.watcher.lock().map_err(|error| error.to_string())?;
        let mut watched_directory = state
            .watched_directory
            .lock()
            .map_err(|error| error.to_string())?;

        if watched_directory.as_ref() != Some(&directory) {
            if let Some(previous) = watched_directory.as_ref() {
                let _ = watcher.unwatch(previous);
            }
            watcher
                .watch(&directory, RecursiveMode::NonRecursive)
                .map_err(|error| format!("Could not watch {}: {error}", directory.display()))?;
            *watched_directory = Some(directory);
        }
    }

    *state.target.write().map_err(|error| error.to_string())? = Some(path.clone());

    let document = snapshot(&path);
    let _ = app.emit("document-changed", document.clone());
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title(&format!("{} — ViewMD", document.name));
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    Ok(document)
}

fn event_touches_watched_directory(event: &Event, target: &Path) -> bool {
    let target_directory = target.parent();
    event.paths.iter().any(|event_path| {
        event_path == target || event_path.parent() == target_directory
    })
}

fn make_preview_state(app: &AppHandle) -> Result<PreviewState, notify::Error> {
    let target = Arc::new(RwLock::new(None::<PathBuf>));
    let callback_target = Arc::clone(&target);
    let callback_app = app.clone();

    let watcher = notify::recommended_watcher(move |result: Result<Event, notify::Error>| {
        let Ok(event) = result else {
            return;
        };
        let Ok(target_guard) = callback_target.read() else {
            return;
        };
        let Some(target_path) = target_guard.as_ref() else {
            return;
        };

        if event_touches_watched_directory(&event, target_path) {
            let document = snapshot(target_path);
            let _ = callback_app.emit("document-changed", document);
        }
    })?;

    Ok(PreviewState {
        target,
        watched_directory: Mutex::new(None),
        watcher: Mutex::new(watcher),
    })
}

fn requested_file(args: impl IntoIterator<Item = OsString>) -> Option<PathBuf> {
    args.into_iter().skip(1).find_map(|argument| {
        let text = argument.to_string_lossy();
        (!text.starts_with('-')).then(|| PathBuf::from(argument))
    })
}

#[tauri::command]
fn current_document(state: State<'_, PreviewState>) -> Option<DocumentSnapshot> {
    state
        .target
        .read()
        .ok()
        .and_then(|target| target.as_ref().map(|path| snapshot(path)))
}

#[tauri::command]
fn open_document(
    app: AppHandle,
    state: State<'_, PreviewState>,
    path: String,
) -> Result<DocumentSnapshot, String> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    set_preview_file(&app, &state, Path::new(&path), &cwd)
}

#[tauri::command]
fn create_document(
    app: AppHandle,
    state: State<'_, PreviewState>,
    path: String,
) -> Result<DocumentSnapshot, String> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let requested = Path::new(&path);
    let joined = if requested.is_absolute() {
        requested.to_owned()
    } else {
        cwd.join(requested)
    };

    // Same extension rule as validate_markdown_path, minus the exists check —
    // the whole point is that the file doesn't exist yet.
    let extension = joined
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase);
    if !matches!(extension.as_deref(), Some("md" | "markdown")) {
        return Err("Learn can only create .md and .markdown files.".to_owned());
    }

    if !joined.exists() {
        if let Some(parent) = joined.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
        }
        fs::write(&joined, "")
            .map_err(|error| format!("Could not create {}: {error}", joined.display()))?;
    }
    // If it already exists, just open it — no data lost, no error.

    set_preview_file(&app, &state, &joined, &cwd)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(path) = requested_file(args.into_iter().map(OsString::from)) {
                let state = app.state::<PreviewState>();
                if let Err(error) = set_preview_file(app, &state, &path, Path::new(&cwd)) {
                    eprintln!("{error}");
                }
            } else if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init());

    builder
        .setup(|app| {
            let state = make_preview_state(app.handle())?;
            app.manage(state);

            if let Some(path) = requested_file(std::env::args_os()) {
                let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
                let state = app.state::<PreviewState>();
                if let Err(error) = set_preview_file(app.handle(), &state, &path, &cwd) {
                    eprintln!("{error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![current_document, open_document, create_document])
        .run(tauri::generate_context!())
        .expect("error while running Learn");
}
