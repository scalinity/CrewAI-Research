import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const VITE_DEV_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:8000";

let mainWindow = null;
let backendProcess = null;
let weStartedBackend = false;

function killBackend() {
  if (!backendProcess || !weStartedBackend) return;
  try {
    // Kill the entire process group to clean up uvicorn workers
    process.kill(-backendProcess.pid, "SIGTERM");
  } catch {
    try {
      backendProcess.kill("SIGTERM");
    } catch {
      // Process already dead
    }
  }
  backendProcess = null;
  weStartedBackend = false;
}

function startBackend() {
  const venvPython = path.join(PROJECT_ROOT, "venv", "bin", "python");
  backendProcess = spawn(
    venvPython,
    ["-m", "uvicorn", "backend.app.main:app", "--port", "8000"],
    { cwd: PROJECT_ROOT, stdio: "inherit", detached: true }
  );
  weStartedBackend = true;

  backendProcess.on("error", (err) => {
    console.error("Failed to start backend:", err.message);
    weStartedBackend = false;
  });

  backendProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`Backend exited with code ${code}`);
    }
    backendProcess = null;
    weStartedBackend = false;
  });
}

// Ensure backend cleanup on all exit signals
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(signal, () => {
    killBackend();
    process.exit(0);
  });
}

process.on("exit", () => {
  killBackend();
});

async function waitForService(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Agent Observatory",
    backgroundColor: "#0C0C0E",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Check if backend is already running (started by concurrently)
  const backendReady = await waitForService(BACKEND_URL, 3);
  if (!backendReady) {
    console.log("Backend not detected, starting it...");
    startBackend();
    await waitForService(BACKEND_URL, 30);
  }

  createWindow();

  const isDev = !app.isPackaged;
  if (isDev) {
    await waitForService(VITE_DEV_URL, 15);
    mainWindow.loadURL(VITE_DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
});

app.on("window-all-closed", () => {
  killBackend();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
    if (!app.isPackaged) {
      mainWindow.loadURL(VITE_DEV_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    }
  }
});
