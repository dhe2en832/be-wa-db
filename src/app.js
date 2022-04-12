const fs = require('fs');
const path = require('path');
const ini = require('ini');
const { app, BrowserWindow, ipcMain, dialog } = require('electron/main');
const { autoUpdater } = require('electron-updater');
const { config, rootPath, versionTag, updateListener } = require('./main/system');
const { appExpress, SERVER, PORT } = require('./main/server');
const { waClient, waListener, waWorker } = require('./main/whatsapp');
let { RECEIVED_FILE_PATH } = require('./main/mutex/received-file');
let { SENT_FILE_PATH } = require('./main/mutex/sent-file');
let { STATS_FILE_PATH } = require('./main/mutex/stats-file');
const { receivedFileHandle } = require('./main/mutex/received-file');
const { sentFileHandle } = require('./main/mutex/sent-file');
const { statsFileHandle } = require('./main/mutex/stats-file');
const authRoutes = require('./main/routes/auth.routes');
const logRoutes = require('./main/routes/log.routes');
const messageRoutes = require('./main/routes/message.routes');
const errorLogger = require('./main/logger/error-logger')
let win,
  createWindow = null;

SERVER.listen(PORT, function () {
  console.log('WACSA running on *: ' + PORT);
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });

    createWindow = (win) => {
      win = new BrowserWindow({
        width: 480,
        height: 640,
        frame: false,
        resizable: false,
        webPreferences: {
          enableRemoteModule: true,
          nodeIntegration: false,
          contextIsolation: true,
          devTools: app.isPackaged === false ? true : false,
          preload: path.join(__dirname, '/renderer/preload.js'),
        },
      });
      win.loadFile(path.join(__dirname, '/index.html'));
      win.webContents.once('dom-ready', () => {
        win.webContents.send('dom-loaded', { port: PORT, version: versionTag });
      });
      win.focus();

      authRoutes(appExpress);
      logRoutes(appExpress, receivedFileHandle, sentFileHandle, statsFileHandle, win);
      messageRoutes(appExpress, waClient, win);

      waListener(
        RECEIVED_FILE_PATH,
        SENT_FILE_PATH,
        STATS_FILE_PATH,
        receivedFileHandle,
        sentFileHandle,
        win,
        waClient
      );

      ipcMain.on('client_disconnected', async (event, arg) => {
        try {
          await new Promise((resolve, reject) => {
            statsFileHandle(resolve, reject, arg, 'post', 1);
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            STATS_FILE_PATH = path.resolve(rootPath + '/wacsa-statistic.json');
            config.FolderLog.StatisticLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
          }
          await errorLogger('electron #saveStatsAfterClientDisconnected' + error, win);
        }
      });

      ipcMain.on('windows-closed', async () => {
        await waClient.destroy();
        BrowserWindow.getAllWindows().forEach(() => {
          app.quit();
        });
      });

      ipcMain.on('login-succeed', async (event, arg) => {
        try {
          if (fs.existsSync(waWorker)) {
            fs.rmdirSync(waWorker, { recursive: true })
          }
          await waClient.initialize();
        } catch (error) {
          await errorLogger('electron #waClientInitializeAfterLoginSucceed' + error, win);
          win.webContents.send('fatal-error', error);
        }
      });

      updateListener(autoUpdater, ipcMain, win, errorLogger);
    };
  }
}).on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    createWindow = (win) => {
      win = new BrowserWindow({
        width: 480,
        height: 480,
        frame: false,
        resizable: false,
        webPreferences: {
          devTools: app.isPackaged === false ? true : false,
        },
      });
      const options = {
        type: 'warning',
        icon: path.resolve(app.getAppPath() + '/src/images/icon.ico'),
        buttons: [],
        defaultId: 0,
        title: 'Perhatian',
        message: 'Aplikasi WACSA ini sudah dibuka atau sedang berjalan di user lain.',
        detail: 'Jendela ini akan tertutup otomatis',
      };
      dialog.showMessageBox(null, options).then(() => app.quit());
    };
  } else {
    await errorLogger('electron #serverInitialize' + error, win);
  }
});

app.whenReady().then(() => {
  createWindow(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  try {
    await waClient.destroy();
    win = null;
    createWindow = null;
  } catch (error) {
    await errorLogger("electron #beforeQuit" + error);
  }
});
