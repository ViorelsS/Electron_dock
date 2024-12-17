const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");
const extractFileIcon = require("extract-file-icon");

let mainWindow;

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

ipcMain.on("file-dropped", async (event, fileList) => {
  try {
    const updatedFileList = await Promise.all(
      fileList.map(async (file) => {
        const iconBuffer = await extractFileIcon(file.path || file.name, 64);
        const icon = nativeImage.createFromBuffer(iconBuffer);
        return {
          ...file,
          path: path.resolve(file.path || file.name),
          icon: icon.toDataURL(),
        };
      })
    );
    console.log("Percorsi dei file droppati:", updatedFileList);
    event.sender.send("file-paths", updatedFileList);
  } catch (error) {
    console.error("Error extracting file icon:", error);
  }
});

ipcMain.handle("get-file-path", (event, file) => {
  return path.resolve(file.path || file.name);
});

// ipcMain.handle("get-app-icon", async (event, filePath) => {
//   try {
//     const iconBuffer = await extractFileIcon(filePath, 64);
//     const icon = nativeImage.createFromBuffer(iconBuffer);
//     return icon.toDataURL();
//   } catch (error) {
//     console.error("Error extracting file icon:", error);
//     throw error;
//   }
// });
