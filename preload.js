const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  },
  getPathForFile: (file) => {
    const filePath = webUtils.getPathForFile(file);
    ipcRenderer.send("file-path", filePath);
    return filePath;
  },
  getAppIcon: async (filePath, isDirectory) => {
    return await ipcRenderer.invoke("get-app-icon", filePath, isDirectory);
  },
});
