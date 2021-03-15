// Import Dependency
const { app, BrowserWindow, ipcMain } = require("electron");
const dotenv = require("dotenv");
const ini = require("ini");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { body, validationResult } = require("express-validator");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const { Client, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const { randomGenerator } = require("./scripts/utils/randomGenerator");
const { dateTimeGeneratorServer } = require("./scripts/utils/dateTimeGenerator");
const { Mutex } = require("async-mutex");
const withTimeout = require("async-mutex").withTimeout;
const nodeFetch = require("node-fetch");

// Path Script
dotenv.config();
const rootPath = process.env.NODE_ENV === "development" ? app.getAppPath() : path.dirname(app.getPath("exe"));
const config = ini.parse(fs.readFileSync(path.resolve(rootPath + "/wacsa.ini"), "utf-8"));
const SESSION_FILE_PATH = path.resolve(rootPath + "/wacsa-session.json");
const ERROR_FILE_PATH = path.resolve(rootPath + "/wacsa-error.log");
let RECEIVED_FILE_PATH = path.resolve((config.FolderLog.ReceivedLogFolder || rootPath) + "/wacsa-received.json");
let SENT_FILE_PATH = path.resolve((config.FolderLog.SentLogFolder || rootPath) + "/wacsa-sent.json");
let STATS_FILE_PATH = path.resolve((config.FolderLog.StatisticLogFolder || rootPath) + "/wacsa-statistic.json");
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
   sessionCfg = require(SESSION_FILE_PATH);
}

// Init Node.js Server Script
const appExpress = express();
const allowedDomains = config.ServerOptions.cors || "*";
let corsOptions;
allowedDomains === "*"
   ? (corsOptions = {
        origin: "*",
     })
   : (corsOptions = {
        origin: function (origin, callback) {
           if (allowedDomains.indexOf(origin) !== -1) {
              callback(null, true);
           } else {
              callback(new Error("Tidak diizinkan oleh CORS!"));
           }
        },
     });
appExpress.use(cors(corsOptions));
appExpress.use(express.json());
appExpress.use(express.urlencoded({ extended: true }));
appExpress.use(
   fileUpload({
      debug: true,
   })
);
appExpress.disable("x-powered-by");
appExpress.get("/", (req, res) => {
   res.sendFile("index.html", { root: __dirname });
});
const server = http.createServer(appExpress);
const PORT = config.ServerOptions.port || 8000;
const io = socketIO(server);

// Init WAWebJS Script
const chromePath = config.ServerOptions.chrome || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const client = new Client({
   puppeteer: {
      executablePath: chromePath,
      headless: true,
      args: [
         "--no-sandbox",
         "--disable-setuid-sandbox",
         "--disable-dev-shm-usage",
         "--disable-accelerated-2d-canvas",
         "--no-first-run",
         "--no-zygote",
         "--disable-gpu",
      ],
   },
   session: sessionCfg,
   restartOnAuthFail: true,
   takeoverOnConflict: true,
   takeoverTimeoutMs: 60000,
});

// Mutex of File Handle Script
const maxTimerReceived = config.FileLocking.ReceivedLogRetryInterval || 1;
const maxRetryReceived = config.FileLocking.ReceivedLogMaxRetry || 5;
const timeRangeReceived = randomGenerator(0.1, maxTimerReceived < 1 ? 1 : maxTimerReceived) * 1000;
const maxRetryCountReceived = maxRetryReceived >= 1 ? (maxRetryReceived % 1 === 0 ? maxRetryReceived : Math.ceil(maxRetryReceived)) : 5;
const mutexWithTimeoutReceived = withTimeout(new Mutex(), timeRangeReceived, new Error("ETIMEOUT"));
const receivedFileHandle = (resolve, reject, data, mode, count) => {
   mutexWithTimeoutReceived
      .acquire()
      .then((release) => {
         if (mode === "post") {
            fs.writeFile(RECEIVED_FILE_PATH, JSON.stringify(data, null, 2) + ",", { flag: "a" }, (err) => {
               if (err) {
                  reject(err);
               } else {
                  resolve(true);
               }
               release();
            });
         } else {
            fs.readFile(RECEIVED_FILE_PATH, (err, data) => {
               if (err) {
                  reject(err);
               } else {
                  const rawData = "[" + data.slice(0, -1) + "]";
                  const jsonData = JSON.parse(rawData);
                  resolve(jsonData);
                  if (config.BackupLog.ReceivedLogBackup === "false") {
                     fs.unlink(RECEIVED_FILE_PATH, (err) => {
                        if (err) reject(err);
                     });
                  } else {
                     const timestamp = Date.now();
                     const FILE_BACKUP = rootPath + "/backup/deleted_wacsa-received-" + timestamp + ".json";
                     fs.rename(RECEIVED_FILE_PATH, FILE_BACKUP, (err) => {
                        if (err) reject(err);
                     });
                  }
               }
               release();
            });
         }
      })
      .catch((error) => {
         if (error.message == "ETIMEOUT" && count <= maxRetryCountReceived) {
            count++;
            receivedFileHandle(resolve, reject, data, mode, count);
         } else {
            reject(error);
         }
      });
};
const maxTimerSent = config.FileLocking.SentLogRetryInterval || 1;
const maxRetrySent = config.FileLocking.SentLogMaxRetry || 5;
const timeRangeSent = randomGenerator(0.1, maxTimerSent < 1 ? 1 : maxTimerSent) * 1000;
const maxRetryCountSent = maxRetrySent >= 1 ? (maxRetrySent % 1 === 0 ? maxRetrySent : Math.ceil(maxRetrySent)) : 5;
const mutexWithTimeoutSent = withTimeout(new Mutex(), timeRangeSent, new Error("ETIMEOUT"));
const sentFileHandle = (resolve, reject, data, mode, count) => {
   mutexWithTimeoutSent
      .acquire()
      .then((release) => {
         if (mode === "post") {
            fs.writeFile(SENT_FILE_PATH, JSON.stringify(data, null, 2) + ",", { flag: "a" }, (err) => {
               if (err) {
                  reject(err);
               } else {
                  resolve(true);
               }
               release();
            });
         } else {
            fs.readFile(SENT_FILE_PATH, (err, data) => {
               if (err) {
                  reject(err);
               } else {
                  const rawData = "[" + data.slice(0, -1) + "]";
                  const jsonData = JSON.parse(rawData);
                  resolve(jsonData);
                  if (config.BackupLog.SentLogBackup === "false") {
                     fs.unlink(SENT_FILE_PATH, (err) => {
                        if (err) reject(err);
                     });
                  } else {
                     const timestamp = Date.now();
                     const FILE_BACKUP = rootPath + "/backup/deleted_wacsa-sent-" + timestamp + ".json";
                     fs.rename(SENT_FILE_PATH, FILE_BACKUP, (err) => {
                        if (err) reject(err);
                     });
                  }
               }
               release();
            });
         }
      })
      .catch((error) => {
         if (error.message == "ETIMEOUT" && count <= maxRetryCountSent) {
            count++;
            sentFileHandle(resolve, reject, data, mode, count);
         } else {
            reject(error);
         }
      });
};
const maxTimerStats = config.FileLocking.StatisticLogRetryInterval || 1;
const maxRetryStats = config.FileLocking.StatisticLogMaxRetry || 5;
const timeRangeStats = randomGenerator(0.1, maxTimerStats < 1 ? 1 : maxTimerStats) * 1000;
const maxRetryCountStats = maxRetryStats >= 1 ? (maxRetryStats % 1 === 0 ? maxRetryStats : Math.ceil(maxRetryStats)) : 5;
const mutexWithTimeoutStats = withTimeout(new Mutex(), timeRangeStats, new Error("ETIMEOUT"));
const statsFileHandle = (resolve, reject, dataArg, mode, count) => {
   mutexWithTimeoutStats
      .acquire()
      .then((release) => {
         if (mode === "post") {
            if (fs.existsSync(STATS_FILE_PATH)) {
               fs.readFile(STATS_FILE_PATH, (err, data) => {
                  if (err) {
                     reject(err);
                  } else {
                     let datas = JSON.parse(data);
                     datas.totalReceived = dataArg[0];
                     datas.totalSent = dataArg[1];
                     datas.updatedAt = dateTimeGeneratorServer();
                     datas.updatedAtUnformat = new Date();
                     fs.writeFile(STATS_FILE_PATH, JSON.stringify(datas, null, 2), (err) => {
                        if (err) {
                           reject(err);
                        } else {
                           resolve(true);
                        }
                     });
                  }
                  release();
               });
            } else {
               const objStats = {
                  totalReceived: dataArg[0],
                  totalSent: dataArg[1],
                  createdAt: dateTimeGeneratorServer(),
                  createdAtUnformat: new Date(),
                  updatedAt: null,
                  updatedAtUnformat: null,
               };
               fs.writeFile(STATS_FILE_PATH, JSON.stringify(objStats, null, 2), (err) => {
                  if (err) {
                     reject(err);
                  } else {
                     resolve(true);
                  }
                  release();
               });
            }
         } else {
            fs.readFile(STATS_FILE_PATH, (err, data) => {
               if (err) {
                  reject(err);
               } else {
                  const jsonData = JSON.parse(data);
                  resolve(jsonData);
                  if (config.BackupLog.StatisticLogBackup === "false") {
                     fs.unlink(STATS_FILE_PATH, (err) => {
                        if (err) reject(err);
                     });
                  } else {
                     const timestamp = Date.now();
                     const FILE_BACKUP = rootPath + "/backup/deleted_wacsa-stats-" + timestamp + ".json";
                     fs.rename(STATS_FILE_PATH, FILE_BACKUP, (err) => {
                        if (err) reject(err);
                     });
                  }
                  fs.writeFile(STATS_FILE_PATH, JSON.stringify(jsonData, null, 2), (err) => {
                     if (err) reject(err);
                     resolve();
                  });
               }
               release();
            });
         }
      })
      .catch((error) => {
         if (error.message == "ETIMEOUT" && count <= maxRetryCountStats) {
            count++;
            statsFileHandle(resolve, reject, dataArg, mode, count);
         } else {
            reject(error);
         }
      });
};

// Error Logger Script
const errorLogger = async (errMsg) => {
   const ioError = (errorInfo) => {
      io.sockets.emit("error", errorInfo);
   };
   try {
      await new Promise((resolve, reject) => {
         const log = "Error At " + dateTimeGeneratorServer() + " : " + errMsg + "\r\n \r\n";
         fs.writeFile(ERROR_FILE_PATH, log, { flag: "a" }, (err) => {
            if (err) reject(err);
            resolve();
         });
      });
   } catch (error) {
      ioError(error);
   }
};

// Statistic Logger Script
const currentStats = (socket) => {
   const statsGenerate = (socket) => {
      const getStats = fs.readFileSync(STATS_FILE_PATH);
      const stats = JSON.parse(getStats);
      socket.emit("received_message", stats.totalReceived);
      socket.emit("sent_message", stats.totalSent);
   };
   try {
      if (fs.existsSync(STATS_FILE_PATH)) {
         statsGenerate(socket);
      }
   } catch (error) {
      if (error.code === "ENOENT") {
         STATS_FILE_PATH = path.resolve(rootPath + "/wacsa-statistic.json");
         config.FolderLog.StatisticLogFolder = rootPath;
         fs.writeFileSync(path.resolve(rootPath + "/wacsa.ini"), ini.stringify(config));
         if (fs.existsSync(STATS_FILE_PATH)) {
            statsGenerate(socket);
         }
      }
      errorLogger(error);
   }
};

// Attachment Save Switcher Script
const attachmentSave = config.ServerOptions.attachment === false ? false : true;

// Routes Server Script
require("./scripts/routes/message.routes.js")(appExpress, client, MessageMedia, body, validationResult, errorLogger);
require("./scripts/routes/log.routes")(appExpress, errorLogger, receivedFileHandle, sentFileHandle, statsFileHandle);
require("./scripts/routes/auth.routes")(appExpress, body, validationResult);

// Socket.io While Connected
io.on("connection", function (socket) {
   socket.emit("logs", "Sedang Menghubungkan...");

   // WAWEBjs On QR Code
   client.on("qr", (qr) => {
      console.log("QR RECEIVED", qr);
      qrcode.toDataURL(qr, (err, url) => {
         socket.emit("qr", url);
         socket.emit("logs", "QR Code diterima, Mohon discan untuk melanjutkan!");
      });
   });

   // WAWEBjs On Ready
   client.on("ready", () => {
      socket.emit("ready");
      socket.emit("logs", "Whatsapp Telah Siap!");
      socket.emit("info", client.info.wid.user, client.info.pushname, client.info.platform, client.info.phone.wa_version);
      currentStats(socket);
   });

   // WAWEBjs On Authenticated
   client.on("authenticated", (session) => {
      socket.emit("authenticated");
      socket.emit("logs", "Whatsapp telah diotentikasi!");
      // console.log("AUTHENTICATED", session);
      sessionCfg = session;
      fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
         if (err) {
            errorLogger(err);
         }
      });
   });

   // WAWEBjs On Auth Failure
   client.on("auth_failure", function (session) {
      socket.emit("logs", "Otentikasi gagal, sedang memulai ulang...");
   });

   // WAWEBjs On Message Received
   client.on("message", async (msg) => {
      try {
         const media = await msg.downloadMedia();
         let qmObj;
         if (msg.hasQuotedMsg) {
            const qmGet = await msg.getQuotedMessage();
            const qmId = qmGet.id._serialized;
            const qmtype = qmGet.type;
            const qmFrom = qmGet.from;
            const qmAuthor = qmGet.author;
            const qmBody = qmGet.body;
            const qmhasMedia = qmGet.hasMedia;
            const qmTimestamp = qmGet.timestamp;
            const qmMedia = await qmGet.downloadMedia();
            qmObj = {
               qm_hasMedia: qmhasMedia,
               qm_base64: attachmentSave == true ? (qmhasMedia == false ? "-" : qmMedia.data) : "disabled",
               qm_filename: attachmentSave == true ? (qmhasMedia == false ? "-" : qmMedia.filename) : "disabled",
               qm_mimetype: attachmentSave == true ? (qmhasMedia == false ? "-" : qmMedia.mimetype) : "disabled",
               qm_id: qmId,
               qm_type: qmtype,
               qm_from: qmFrom,
               qm_author: qmAuthor,
               qm_body: qmBody,
               qm_timestamp: qmTimestamp,
            };
         }
         const mainObj = {
            mediaKey: msg.mediaKey || "-",
            id: {
               fromMe: msg.id.fromMe,
               remote: msg.id.remote,
               id: msg.id.id,
               _serialized: msg.id._serialized,
            },
            ack: msg.ack,
            hasMedia: msg.hasMedia,
            body: msg.body,
            type: msg.type,
            timestamp: msg.timestamp,
            from: msg.from,
            to: msg.to,
            author: msg.author,
            isForwarded: msg.isForwarded,
            isStatus: msg.isStatus,
            broadcast: msg.broadcast,
            fromMe: msg.fromMe,
            hasQuotedMsg: msg.hasQuotedMsg,
            quotedMsg: msg.hasQuotedMsg == false ? "-" : qmObj,
            location: msg.location,
            vCards: msg.vCards,
            mentionedIds: msg.mentionedIds,
            mimetype: attachmentSave == true ? (msg.hasMedia == false ? "-" : media.mimetype) : "disabled",
            filename: attachmentSave == true ? (msg.hasMedia == false ? "-" : media.filename) : "disabled",
            base64: attachmentSave == true ? (msg.hasMedia == false ? "-" : media.data) : "disabled",
         };
         await new Promise((resolve, reject) => {
            receivedFileHandle(resolve, reject, mainObj, "post", 1);
         }).then((success) => {
            if (success) {
               socket.emit("received_message", 1);
               const urlAPI = config.CallbackAPI.MessageIncomingEndpoint || "http://192.168.100.81:8090/api/incoming";
               console.log(urlAPI);
               nodeFetch(urlAPI, {
                  method: "post",
                  body: JSON.stringify({ status: "Incoming", message: msg }),
                  headers: {
                     "Content-Type": "application/json",
                  },
               })
                  .then((res) => res.json())
                  .then((json) => console.log(json))
                  .catch((err) => {
                     if (err) errorLogger(err);
                  });
            }
         });
      } catch (error) {
         if (error.code === "ENOENT") {
            RECEIVED_FILE_PATH = path.resolve(rootPath + "/wacsa-received.json");
            config.FolderLog.ReceivedLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + "/wacsa.ini"), ini.stringify(config));
         }
         errorLogger(error);
      }
   });

   // WAWEBjs On Before Message Sent
   client.on("message_create", async (send_msg) => {
      try {
         if (send_msg.fromMe) {
            const mainObj = {
               mediaKey: send_msg.hasMedia == false ? "-" : send_msg.mediaKey,
               id: {
                  fromMe: send_msg.id.fromMe,
                  remote: send_msg.id.remote,
                  id: send_msg.id.id,
                  _serialized: send_msg.id._serialized,
               },
               ack: send_msg.ack,
               hasMedia: send_msg.hasMedia,
               body: send_msg.body,
               type: send_msg.type,
               timestamp: send_msg.timestamp,
               from: send_msg.from,
               to: send_msg.to,
               author: send_msg.author,
               isForwarded: send_msg.isForwarded,
               isStatus: send_msg.isStatus,
               broadcast: send_msg.broadcast,
               fromMe: send_msg.fromMe,
               hasQuotedMsg: send_msg.hasQuotedMsg,
               location: send_msg.location,
               vCards: send_msg.vCards,
               mentionedIds: send_msg.mentionedIds,
            };

            await new Promise((resolve, reject) => {
               sentFileHandle(resolve, reject, mainObj, "post", 1);
            }).then((success) => {
               if (success) {
                  socket.emit("sent_message", 1);
               }
            });
         }
      } catch (error) {
         if (error.code === "ENOENT") {
            SENT_FILE_PATH = path.resolve(rootPath + "/wacsa-sent.json");
            config.FolderLog.SentLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + "/wacsa.ini"), ini.stringify(config));
         }
         errorLogger(error);
      }
   });

   //WAWEBjs On Message Ack
   client.on("message_ack", (msg, ack) => {
      const valAck = {
         "-1": "Error",
         0: "Pending",
         1: "At The Server",
         2: "Delivered",
         3: "Read",
         4: "On Played",
      };
      const statusMsg = valAck[ack];
      const urlAPI = config.CallbackAPI.MessageStatusEndpoint || "http://192.168.100.81:8090/api/notifier";
      console.log(urlAPI);
      nodeFetch(urlAPI, {
         method: "post",
         body: JSON.stringify({ status: statusMsg, message: msg }),
         headers: {
            "Content-Type": "application/json",
         },
      })
         .then((res) => res.json())
         .then((json) => console.log(json))
         .catch((err) => {
            if (err) errorLogger(err);
         });
   });

   // WAWEBjs On Whatsapp Disconnected From Mobile Apps
   client.on("disconnected", (reason) => {
      socket.emit("disconnected");
      socket.emit("logs", "Whatsapp telah terputus!");
      try {
         if (fs.existsSync(SESSION_FILE_PATH)) {
            fs.unlinkSync(SESSION_FILE_PATH);
         }
      } catch (error) {
         errorLogger(error);
      }
      client
         .destroy()
         .then(() => {
            client.initialize().catch((err) => {
               console.log(err);
               errorLogger(err);
               io.sockets.emit("fatal-error", err);
            });
         })
         .catch((err) => {
            console.log(err);
            errorLogger(err);
         });
   });
});

// Electron Create JS and Prevent Double Instance
let win = null;
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
   app.quit();
} else {
   app.on("second-instance", () => {
      if (win) {
         if (win.isMinimized()) win.restore();
         win.focus();
      }
   });

   const createWindow = (win) => {
      server
         .listen(PORT, function () {
            console.log("App running on *: " + PORT);
         })
         .on("error", (err) => {
            if (err.errno === "EADDRINUSE") {
               app.quit();
            } else {
               errorLogger(err);
            }
         });
      win = new BrowserWindow({
         width: 480,
         height: 640,
         frame: false,
         resizable: false,
         webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            enableRemoteModule: true,
            nodeIntegration: true,
            contextIsolation: false,
            devTools: process.env.NODE_ENV === "development" ? true : false,
         },
      });
      win.loadFile("index.html");
      win.webContents.once("dom-ready", () => {
         win.webContents.send("dom-loaded", PORT);
      });
      win.focus();
   };

   // Electron JS Ready
   app.whenReady().then(() => {
      createWindow(win);
      app.on("activate", function () {
         if (BrowserWindow.getAllWindows().length === 0) createWindow(win);
      });
   });

   // Electron On Renderer Windows Closed or Reloaded
   ipcMain.on("windows-closed", async (event, arg) => {
      try {
         await new Promise((resolve, reject) => {
            statsFileHandle(resolve, reject, arg, "post", 1);
         })
            .then((success) => {
               if (success) {
                  BrowserWindow.getAllWindows().forEach(() => {
                     app.quit();
                  });
               }
            })
            .catch((err) => {
               console.log(err);
            });
      } catch (error) {
         if (error.code === "ENOENT") {
            STATS_FILE_PATH = path.resolve(rootPath + "/wacsa-statistic.json");
            config.FolderLog.StatisticLogFolder = rootPath;
            fs.writeFileSync(path.resolve(rootPath + "/wacsa.ini"), ini.stringify(config));
         }
         errorLogger(error);
      }
   });

   // Electron On Renderer Send Login Success Then Initialize WA
   ipcMain.on("login-succeed", (event, arg) => {
      client.initialize().catch((err) => {
         console.log(err);
         errorLogger(err);
         io.sockets.emit("fatal-error", err);
      });
   });

   // Electron JS Window Closed
   app.on("window-all-closed", function () {
      if (process.platform !== "darwin") app.quit();
   });

   app.on("before-quit", () => {
      process.kill(process.pid, "SIGINT");
   });
}
