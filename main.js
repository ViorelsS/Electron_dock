const { app, BrowserWindow, screen, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const extract = require("extract-file-icon");

const appsFilePath = path.join(__dirname, "apps.json");

let mainWindow;

ipcMain.on("files-dropped", (event, files) => {
  console.log("File ricevuti:", files);
});

/* RECUPERARE ICONA APP */
ipcMain.handle("get-icon", async (event, filePath) => {
  try {
    const iconPath = extract(filePath, 32);
    console.log("Icona recuperata per", filePath, ":", iconPath);
    return iconPath;
  } catch (err) {
    console.error("Errore nel recupero dell'icona:", err);
    return null;
  }
});

ipcMain.on("file-open", (event, filePath) => {
  console.log("Tentativo di apertura applicazione:", filePath);

  if (filePath) {
    shell
      .openPath(filePath)
      .then(() => console.log("Applicazione aperta con successo:", filePath))
      .catch((err) => console.error("Errore durante l'apertura:", err));
  } else {
    console.error("Percorso non valido:", filePath);
  }
});

ipcMain.on("files-dropped", (event, filePaths) => {
  console.log("File ricevuti:", filePaths);
  // Ad esempio, puoi leggere i file, estrarre icone, ecc.
});

// Salva la lista delle applicazioni
ipcMain.on("save-apps", (event, apps) => {
  console.log("Salvataggio delle applicazioni:", apps);
  fs.writeFileSync(appsFilePath, JSON.stringify(apps, null, 2));
});

// Carica la lista delle applicazioni
ipcMain.handle("load-apps", async () => {
  console.log("Tentativo di caricamento delle applicazioni...");
  if (fs.existsSync(appsFilePath)) {
    console.log("File delle applicazioni trovato:", appsFilePath);
    try {
      const apps = JSON.parse(fs.readFileSync(appsFilePath, "utf-8"));
      console.log("Applicazioni caricate:", apps);
      return apps;
    } catch (err) {
      console.error(
        "Errore durante la lettura del file delle applicazioni:",
        err
      );
      return [];
    }
  } else {
    console.warn("File delle applicazioni non trovato:", appsFilePath);
    return [];
  }
});

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const windowWidth = 800;

  mainWindow = new BrowserWindow({
    x: Math.round((width - windowWidth) / 2),
    y: 0,
    width: windowWidth,
    // height: 70,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "dist/dock-app/browser/index.html"));
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const bounds = display.bounds;

    mainWindow.webContents.send("mouse-position", {
      x: cursor.x,
      y: cursor.y,
      screenBounds: bounds,
    });
  }, 300);
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
