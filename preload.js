const { contextBridge, ipcRenderer } = require("electron");

// Esponi una API sicura al contesto del renderer (Angular)
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
  },
});
