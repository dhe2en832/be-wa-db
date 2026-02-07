const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

const { config, rootPath, versionTag } = require("../system");
const errorLogger = require("../logger/error-logger");
const statsLogger = require("../logger/stats-logger");
const credentials = require("../../credentials.json");
const messageCallback = require("./messageCallback");

const chromePath =
  config.ServerOptions.chrome ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const attachmentSave = config.ServerOptions.attachment === false ? false : true;

const authStrategy = new LocalAuth({
  dataPath: rootPath,
});
const waWorker = `${authStrategy.dataPath}/session/Default/Service Worker`;
const useWWebCache = credentials.useWWebCache;
const wwebCacheVersion = credentials.wwebCacheVersion;
const waClient = new Client({
  puppeteer: {
    restartOnAuthFail: true,
    executablePath: chromePath,
    headless: config.ServerOptions.headless === false ? false : true,
    args: [
      "--disable-accelerated-2d-canvas",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-sandbox",
      "--no-zygote",
      `--window-position=${config.ServerOptions.winPos || "0,0"}`,
      `--window-size=${config.ServerOptions.winSize || "800,600"}`,
    ],
  },
  takeoverOnConflict: true,
  takeoverTimeoutMs: 10,
  authTimeoutMs: 0,
  qrMaxRetries: 0,
  ffmpegPath: "ffmpeg",
  authStrategy,
  ...(useWWebCache && {
    webVersionCache: {
      type: "remote",
      remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebCacheVersion}.html`,
    },
  }),
});

function waListener(
  RECEIVED_FILE_PATH,
  SENT_FILE_PATH,
  STATS_FILE_PATH,
  receivedFileHandle,
  sentFileHandle,
  win,
  listenClient
) {
  win.webContents.send("logs", "Sedang Menghubungkan...");

  listenClient.on("qr", (qr) => {
    win.webContents.send("disconnected_client");

    qrcode.toDataURL(qr, (err, url) => {
      win.webContents.send("qr_client", url);
      win.webContents.send(
        "logs",
        "Whatsapp QR Code diterima, Mohon discan untuk melanjutkan!"
      );
    });
  });


  listenClient.on("ready", async () => {
    const stats = await statsLogger(STATS_FILE_PATH, win);
    win.webContents.send("info_client", [
      listenClient.info.wid.user,
      listenClient.info.pushname,
      listenClient.info.platform,
      versionTag,
    ]);
    win.webContents.send("ready_client", stats);
  });

  listenClient.on("authenticated", () => {
    win.webContents.send("authenticated_client");
  });

  listenClient.on("auth_failure", async (message) => {
    win.webContents.send("logs", message);
    win.webContents.send("disconnected_client");

    try {
      await listenClient.destroy();

      if (fs.existsSync(waWorker)) {
        fs.rmdirSync(waWorker, { recursive: true });
      }

      await listenClient.initialize();
    } catch (error) {
      await errorLogger(
        "listenClient #authFailureReinit" + error,
        win
      );
      win.webContents.send("fatal-error", error);
    }
  });


  listenClient.on("message", async (receive_msg) => {
    try {
      const msgCheck = (condition, data) =>
        attachmentSave === true
          ? condition === false
            ? "-"
            : data
          : "disabled";
      const media = await receive_msg.downloadMedia();
      let qmObj;
      if (receive_msg.hasQuotedMsg) {
        const qmMsg = await receive_msg.getQuotedMessage();
        const qmMedia = await qmMsg.downloadMedia();
        qmObj = {
          qm_body: qmMsg,
          qm_base64: msgCheck(qmMsg.hasMedia, qmMsg.hasMedia && qmMedia.data),
          qm_filename: msgCheck(
            qmMsg.hasMedia,
            qmMsg.hasMedia && qmMedia.filename
          ),
          qm_mimetype: msgCheck(
            qmMsg.hasMedia,
            qmMsg.hasMedia && qmMedia.mimetype
          ),
        };
      }
      receive_msg.mediaKey = receive_msg.mediaKey || "-";
      receive_msg.quotedMsg = receive_msg.hasQuotedMsg ? qmObj : "-";
      receive_msg.base64 = msgCheck(
        receive_msg.hasMedia,
        receive_msg.hasMedia && media.data
      );
      receive_msg.filename = msgCheck(
        receive_msg.hasMedia,
        receive_msg.hasMedia && media.filename
      );
      receive_msg.mimetype = msgCheck(
        receive_msg.hasMedia,
        receive_msg.hasMedia && media.mimetype
      );
      await new Promise((resolve, reject) => {
        receivedFileHandle(resolve, reject, receive_msg, "post", 1);
      }).then(async (success) => {
        if (success) {
          win.webContents.send("received_message", 1);
          if (config.CallbackAPI.MessageIncomingEndpoint !== "") {
            try {
              await messageCallback({
                url: config.CallbackAPI.MessageIncomingEndpoint,
                options: {
                  method: "post",
                  headers: {
                    "Content-Type": "application/json",
                    [config.CallbackAPI.AuthKey || undefined]:
                      config.CallbackAPI.AuthValue || undefined,
                  },
                  body: JSON.stringify(
                    { status: "Incoming", message: receive_msg },
                    null,
                    2
                  ),
                },
                retry: config.CallbackAPI.RetryFailure || 3,
                interval: config.CallbackAPI.IntervalFailure || 1,
              });
            } catch (error) {
              await errorLogger(
                "listenClient #incomingMessageCallback" + error,
                win
              );
            }
          }
        }
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        RECEIVED_FILE_PATH = path.resolve(rootPath + "/wacsa-received.json");
        config.FolderLog.ReceivedLogFolder = rootPath;
        fs.writeFileSync(
          path.resolve(rootPath + "/wacsa.ini"),
          ini.stringify(config)
        );
      }
      await errorLogger("listenClient #receivedMessage" + error, win);
    }
  });

  // Logger Handle Move to Message Routes ::message.routes.js
  // listenClient.on('message_create', async (send_msg) => {
  //   try {
  //     if (send_msg.fromMe) {
  //       send_msg.mediaKey = send_msg.mediaKey || '-';
  //       await new Promise((resolve, reject) => {
  //         sentFileHandle(resolve, reject, send_msg, 'post', 1);
  //       }).then((success) => {
  //         if (success) {
  //           win.webContents.send('sent_message', 1);
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     if (error.code === 'ENOENT') {
  //       SENT_FILE_PATH = path.resolve(rootPath + '/wacsa-sent.json');
  //       config.FolderLog.SentLogFolder = rootPath;
  //       fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
  //     }
  //     await errorLogger('listenClient #sentMessage' + error, win);
  //   }
  // });

  listenClient.on("message_ack", async (status_msg, ack) => {
    try {
      const valAck = {
        "-1": "Error",
        0: "Pending",
        1: "At The Server",
        2: "Delivered",
        3: "Read",
        4: "On Played",
      };
      if (config.CallbackAPI.MessageStatusEndpoint !== "") {
        await messageCallback({
          url: config.CallbackAPI.MessageStatusEndpoint,
          options: {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              [config.CallbackAPI.AuthKeyName || undefined]:
                config.CallbackAPI.AuthKeyValue || undefined,
            },
            body: JSON.stringify(
              { status: valAck[ack], message: status_msg },
              null,
              2
            ),
          },
          retry: config.CallbackAPI.RetryFailure || 3,
          interval: config.CallbackAPI.IntervalFailure || 1,
        });
      }
    } catch (error) {
      await errorLogger("listenClient #statusMessageCallback" + error, win);
    }
  });

  listenClient.on("change_state", (newState) => {
    if (newState === "TIMEOUT") {
      win.webContents.send("timeout_client");
    }
    if (newState === "CONNECTED") {
      win.webContents.send("connected_client");
    }
  });

  listenClient.on("disconnected", async (reason) => {
    try {
      win.webContents.send("disconnected_client");
      win.webContents.send(
        "logs",
        "Whatsapp telah terputus! Error : " + reason
      );
      await listenClient.destroy();
      if (fs.existsSync(waWorker)) {
        fs.rmdirSync(waWorker, { recursive: true });
      }
      await listenClient.initialize();
    } catch (error) {
      await errorLogger(
        "listenClient #destroyAndOpenSessionAfterDisconnected" + error,
        win
      );
      win.webContents.send("fatal-error", error);
    }
  });
}

function waState(listenClient) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () =>
        reject(
          `TIMEOUT: WACSA call has exceeds ${config.ServerOptions.timeout || 30
          } sec.`
        ),
      (config.ServerOptions.timeout || 30) * 1000
    );
    listenClient
      .getState()
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
}

module.exports = {
  waClient,
  waListener,
  waState,
  waWorker,
};
