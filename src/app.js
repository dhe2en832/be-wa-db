const fs = require('path');
const path = require('path');
const ini = require('ini');
const { app, BrowserWindow, ipcMain } = require('electron/main');
const { config, rootPath } = require('./main/system');
const { appExpress, SERVER, PORT } = require('./main/server');
const { waClient, waListener } = require('./main/whatsapp');
let { RECEIVED_FILE_PATH } = require('./main/mutex/received-file');
let { SENT_FILE_PATH } = require('./main/mutex/sent-file');
let { STATS_FILE_PATH } = require('./main/mutex/stats-file');
const { receivedFileHandle } = require('./main/mutex/received-file');
const { sentFileHandle } = require('./main/mutex/sent-file');
const { statsFileHandle } = require('./main/mutex/stats-file');
const authRoutes = require('./main/routes/auth.routes');
const logRoutes = require('./main/routes/log.routes');
const messageRoutes = require('./main/routes/message.routes');
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
        win.webContents.send('dom-loaded', PORT);
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
        win
      );

      ipcMain.on('client_disconnected', async (event, arg) => {
        try {
          await new Promise((resolve, reject) => {
            statsFileHandle(resolve, reject, arg, 'post', 1);
          }).catch((error) => {
            errorLogger(error, win);
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            STATS_FILE_PATH = path.resolve(rootPath + '/wacsa-statistic.json');
            config.FolderLog.StatisticLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
          }
          errorLogger(error, win);
        }
      });

      ipcMain.on('windows-closed', async (event, arg) => {
        try {
          await new Promise((resolve, reject) => {
            statsFileHandle(resolve, reject, arg, 'post', 1);
          })
            .then((success) => {
              if (success) {
                BrowserWindow.getAllWindows().forEach(() => {
                  app.quit();
                });
                win = null;
                createWindow = null;
              }
            })
            .catch((error) => {
              errorLogger(error, win);
            });
        } catch (error) {
          if (error.code === 'ENOENT') {
            STATS_FILE_PATH = path.resolve(rootPath + '/wacsa-statistic.json');
            config.FolderLog.StatisticLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
          }
          errorLogger(error, win);
        }
      });

      ipcMain.on('login-succeed', (event, arg) => {
        waClient.initialize().catch((error) => {
          errorLogger(error, win);
          win.webContents.send('fatal-error', error);
        });
      });
    };
  }
}).on('error', (error) => {
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
        icon: path.resolve(app.getAppPath() + '/images/icon.ico'),
        buttons: [],
        defaultId: 0,
        title: 'Perhatian',
        message: 'Aplikasi WACSA ini sudah berjalan di user lain.',
        detail: 'Jendela akan tertutup otomatis',
      };
      dialog.showMessageBox(null, options).then(() => app.quit());
    };
  } else {
    errorLogger(error, win);
  }
});

app.whenReady().then(() => {
  createWindow(win);
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(win);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  win = null;
  createWindow = null;
});
