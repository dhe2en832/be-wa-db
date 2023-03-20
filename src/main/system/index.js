const { app } = require("electron/main");
const fs = require("fs");
const path = require("path");
const ini = require("ini");

const rootPath =
  app.isPackaged === false
    ? app.getAppPath()
    : path.dirname(app.getPath("exe"));
const config = ini.parse(
  fs.readFileSync(path.resolve(rootPath + "/wacsa.ini"), "utf-8")
);
const versionTag = app.getVersion();

const updateListener = (autoUpdater, ipcMain, win, errorLogger) => {
  autoUpdater.setFeedURL({
    url: process.env.UPDATER_URL,
    provider: "generic",
  });
  autoUpdater.autoDownload = false;

  autoUpdater.on("error", async (error) => {
    win.webContents.send("update_error", error);
    await errorLogger("electron #autoUpdater" + error, win);
  });

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update_available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    win.webContents.send("update_not_available", info);
  });

  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update_downloaded");
  });

  ipcMain.on("check-for-update", () => {
    autoUpdater.checkForUpdates().catch(() => {});
  });

  ipcMain.on("download-update", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("restart-for-update", () => {
    autoUpdater.quitAndInstall();
  });
};

module.exports = {
  rootPath,
  config,
  versionTag,
  updateListener,
};
