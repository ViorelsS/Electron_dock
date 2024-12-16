const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra"); // Libreria per spostare file facilmente

let mainWindow;

ipcMain.on("file-open", (event, filePath) => {
  console.log("Tentativo di aprire il file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("Il file non esiste:", filePath);
    event.reply("file-open-response", {
      success: false,
      error: "File not found",
    });
    return;
  }

  shell
    .openPath(filePath)
    .then(() => {
      console.log("File aperto con successo:", filePath);
      event.reply("file-open-response", { success: true });
    })
    .catch((err) => {
      console.error("Errore durante l'apertura del file:", err);
      event.reply("file-open-response", { success: false, error: err.message });
    });
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  return await dialog.showOpenDialog(options);
});

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const windowWidth = 800;

  mainWindow = new BrowserWindow({
    x: Math.round((width - windowWidth) / 2),
    y: 0,
    width: windowWidth,
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
  }, 100);
}

ipcMain.on("file-dropped", (event, file) => {
  console.log("file-dropped ricevuto:", file);

  if (!file.path || !fs.existsSync(file.path)) {
    console.error("Percorso file non valido o inesistente:", file.path);
    event.reply("file-moved", { success: false, error: "File not found" });
    return;
  }

  const tmpDir = path.join(app.getPath("userData"), "tmp");
  const destination = path.join(tmpDir, file.name);

  try {
    // Assicurati che la cartella temporanea esista
    fse.ensureDirSync(tmpDir);

    // Sposta il file
    fse.moveSync(file.path, destination, { overwrite: true });

    console.log(`File spostato in: ${destination}`);
    event.reply("file-moved", {
      success: true,
      fileName: file.name,
      destination,
    });
  } catch (error) {
    console.error("Errore durante lo spostamento del file:", error);
    event.reply("file-moved", { success: false, error: error.message });
  }
});

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

ipcMain.handle("get-tmp-files", async () => {
  const tmpDir = path.join(app.getPath("userData"), "tmp");

  try {
    // Assicurati che la cartella tmp esista
    fse.ensureDirSync(tmpDir);

    // Leggi i file nella cartella tmp
    const files = fs.readdirSync(tmpDir).map((fileName) => ({
      name: fileName,
      path: path.join(tmpDir, fileName),
    }));

    console.log("File trovati nella cartella tmp:", files);
    return { success: true, files };
  } catch (error) {
    console.error("Errore durante la lettura della cartella tmp:", error);
    return { success: false, error: error.message };
  }
});
