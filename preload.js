const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
  },
  showFilePath: (file) => {
    ipcRenderer.invoke("get-file-path", file).then((path) => {
      ipcRenderer.send("file-path-received", path);
    });
  },
  getAppIcon: (filePath) => {
    return ipcRenderer.invoke("get-app-icon", filePath);
  },
});
