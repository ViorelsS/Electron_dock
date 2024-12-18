const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

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
