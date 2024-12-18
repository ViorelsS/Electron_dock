const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const ws = require("windows-shortcuts");

let mainWindow;

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const windowWidth = 800;

  mainWindow = new BrowserWindow({
    x: Math.round((width - windowWidth) / 2),
    y: 0,
    width: windowWidth,
    height: 70,
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
  // mainWindow.webContents.openDevTools();

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
};

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

ipcMain.on("file-path", (event, filePath) => {
  console.log("FILEPATH:" + filePath);
});

ipcMain.on("launch-app", (event, appPath) => {
  exec(`"${appPath}"`);
});

ipcMain.handle("read-apps", async () => {
  const filePath = path.join(__dirname, "apps.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }

  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
});

ipcMain.handle("write-apps", async (event, apps) => {
  const filePath = path.join(__dirname, "apps.json");
  fs.writeFileSync(filePath, JSON.stringify(apps, null, 2));
});

const getIconPathFromShortcut = (filePath) => {
  return new Promise((resolve, reject) => {
    ws.query(filePath, (err, options) => {
      if (err) {
        console.error("Errore nell'ottenere l'icona:", err);
        resolve(null);
      } else {
        const iconPath = options.icon || options.target;
        if (iconPath && fs.existsSync(iconPath)) {
          resolve(iconPath);
        } else {
          console.warn(
            `Icona non trovata per ${filePath}, utilizzo dell'icona predefinita.`
          );
          resolve(null);
        }
      }
    });
  });
};

ipcMain.handle("get-app-icon", async (event, filePath) => {
  try {
    const iconPath = await getIconPathFromShortcut(filePath);
    if (iconPath) {
      const icon = nativeImage.createFromPath(iconPath);
      return icon.toDataURL();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Errore nell'ottenere l'icona:", error);
    return null;
  }
});
