"use strict";
const { contextBridge, ipcRenderer } = require("electron");

const bridge = {
  platform: "electron",

  fs: {
    readFile: (path, encoding) => ipcRenderer.invoke("fs:readFile", path, encoding),
    writeFile: (path, data) => ipcRenderer.invoke("fs:writeFile", path, data),
    mkdir: (path) => ipcRenderer.invoke("fs:mkdir", path),
    readdir: (path) => ipcRenderer.invoke("fs:readdir", path),
    stat: (path) => ipcRenderer.invoke("fs:stat", path)
  },

  dialog: {
    openFile: (filters) => ipcRenderer.invoke("dialog:openFile", filters),
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
    saveFile: (defaultPath, filters) => ipcRenderer.invoke("dialog:saveFile", defaultPath, filters)
  },

  file: {
    consumeOpenRequest: () => ipcRenderer.invoke("file:consumeOpenRequest"),
    onOpenRequest(handler) {
      const listener = (_event, path) => {
        if (path) handler(path);
      };
      ipcRenderer.on("file:openRequested", listener);
      return () => ipcRenderer.removeListener("file:openRequested", listener);
    }
  },

  menu: {
    on: (channel, handler) => {
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },

  discord: {
    setActivity: (activity) => ipcRenderer.invoke("discord:setActivity", activity),
    setIdle: () => ipcRenderer.invoke("discord:setIdle")
  }
};

contextBridge.exposeInMainWorld("jsonforge", bridge);
