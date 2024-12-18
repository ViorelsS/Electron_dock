const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  nativeImage,
  Tray,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const ws = require("windows-shortcuts");

let mainWindow;
let tray;

const createWindow = (displayId) => {
  const display =
    screen.getAllDisplays().find((d) => d.id === displayId) ||
    screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const windowWidth = 600;

  console.log(
    `Creating window on display ${displayId}: x=${x}, y=${y}, width=${width}, height=${height}`
  );

  mainWindow = new BrowserWindow({
    x: Math.round(x + (width - windowWidth) / 2),
    y: y, // Usa la coordinata y così com'è, anche se è negativa
    width: windowWidth,
    height: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false,
    icon: path.join(__dirname, "public", "app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "dist/dock-app/browser/index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setInterval(() => {
    if (mainWindow) {
      const cursor = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursor);
      const bounds = display.bounds;

      console.log(`Mouse position: x=${cursor.x}, y=${cursor.y}`);
      console.log(
        `Nearest display: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`
      );

      mainWindow.webContents.send("mouse-position", {
        x: cursor.x,
        y: cursor.y,
        screenBounds: bounds,
      });
    }
  }, 300);
};

const getDisplays = () => {
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    name: `Schermo ${index + 1}`,
  }));
};

app.on("ready", () => {
  createWindow();

  tray = new Tray(path.join(__dirname, "public", "app-icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Esci",
      click: () => {
        app.quit();
      },
    },
    {
      label: "Scegli schermo",
      submenu: getDisplays().map((display) => ({
        label: display.name,
        click: () => {
          if (mainWindow) {
            mainWindow.close();
            mainWindow.on("closed", () => {
              createWindow(display.id);
            });
          } else {
            createWindow(display.id);
          }
        },
      })),
    },
  ]);
  tray.setToolTip("Dock App");
  tray.setContextMenu(contextMenu);
});

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

ipcMain.on("open-folder", (event, folderPath) => {
  shell.openPath(folderPath);
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
  fs.writeFileSync(filePath, JSON.stringify(apps));
});

ipcMain.handle("get-app-icon", async (event, filePath, isDirectory) => {
  try {
    let iconPath;
    if (isDirectory) {
      iconPath = path.join(__dirname, "public", "folder-icon.png");
    } else {
      iconPath = await getIconPathFromShortcut(filePath);
    }
    if (!iconPath) {
      iconPath = path.join(__dirname, "public", "app-icon.png"); // Percorso dell'icona di default
    }
    const icon = nativeImage.createFromPath(iconPath);
    console.log(`Icon data URL for ${filePath}: ${icon.toDataURL()}`);
    return icon.toDataURL();
  } catch (error) {
    console.error("Errore nell'ottenere l'icona:", error);
    const defaultIconPath = path.join(__dirname, "public", "app-icon.png");
    const defaultIcon = nativeImage.createFromPath(defaultIconPath);
    return defaultIcon.toDataURL();
  }
});
