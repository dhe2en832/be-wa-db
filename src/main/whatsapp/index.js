const fs = require('fs');
const path = require('path');
const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const { config, rootPath } = require('../system');
const errorLogger = require('../logger/error-logger');
const statsLogger = require('../logger/stats-logger');
const messageCallback = require('./messageCallback');
const chromePath =
  config.ServerOptions.chrome || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const attachmentSave = config.ServerOptions.attachment || true;
const SESSION_FILE_PATH = path.resolve(rootPath + '/wacsa-session.json');

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

const waClient = new Client({
  puppeteer: {
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--shm-size=3gb'
    ],
  },
  restartOnAuthFail: true,
  authStrategy: new LegacySessionAuth({
    session: sessionCfg,
  })
});

function waListener(
  RECEIVED_FILE_PATH,
  SENT_FILE_PATH,
  STATS_FILE_PATH,
  receivedFileHandle,
  sentFileHandle,
  win
) {
  win.webContents.send('logs', 'Sedang Menghubungkan...');

  waClient.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
      win.webContents.send('qr', url);
      win.webContents.send('logs', 'Whatsapp QR Code diterima, Mohon discan untuk melanjutkan!');
    });
  });

  waClient.on('ready', async () => {
    const stats = await statsLogger(STATS_FILE_PATH, win);
    win.webContents.send('info', [
      waClient.info.wid.user,
      waClient.info.pushname,
      waClient.info.platform,
      waClient.info.phone.wa_version,
    ]);
    win.webContents.send('ready', stats);
  });

  waClient.on('authenticated', (session) => {
    win.webContents.send('authenticated');
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (error) {
      if (error) {
        errorLogger('waClient #savingSessionAfterAuthenticated' + error, win);
      }
    });
  });

  waClient.on('auth_failure', function () {
    win.webContents.send('logs', 'Otentikasi gagal, sedang memuat ulang...');
  });

  waClient.on('message', async (receive_msg) => {
    try {
      const msgCheck = (condition, data) =>
        attachmentSave === true ? (condition === false ? '-' : data) : 'disabled';
      const media = await receive_msg.downloadMedia();
      let qmObj;
      if (receive_msg.hasQuotedMsg) {
        const qmMsg = await receive_msg.getQuotedMessage();
        const qmMedia = await qmMsg.downloadMedia();
        qmObj = {
          qm_body: qmMsg,
          qm_base64: msgCheck(qmMsg.hasMedia, qmMsg.hasMedia && qmMedia.data),
          qm_filename: msgCheck(qmMsg.hasMedia, qmMsg.hasMedia && qmMedia.filename),
          qm_mimetype: msgCheck(qmMsg.hasMedia, qmMsg.hasMedia && qmMedia.mimetype),
        };
      }
      receive_msg.mediaKey = receive_msg.mediaKey || '-';
      receive_msg.quotedMsg = receive_msg.hasQuotedMsg ? qmObj : '-';
      receive_msg.base64 = msgCheck(receive_msg.hasMedia, receive_msg.hasMedia && media.data);
      receive_msg.filename = msgCheck(receive_msg.hasMedia, receive_msg.hasMedia && media.filename);
      receive_msg.mimetype = msgCheck(receive_msg.hasMedia, receive_msg.hasMedia && media.mimetype);
      await new Promise((resolve, reject) => {
        receivedFileHandle(resolve, reject, receive_msg, 'post', 1);
      }).then(async (success) => {
        if (success) {
          win.webContents.send('received_message', 1);
          if (config.CallbackAPI.MessageIncomingEndpoint !== '') {
            await messageCallback({
              url: config.CallbackAPI.MessageIncomingEndpoint,
              options: {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json',
                  [config.CallbackAPI.AuthKey || undefined]:
                    config.CallbackAPI.AuthValue || undefined,
                },
                body: JSON.stringify({ status: 'Incoming', message: receive_msg }, null, 2),
              },
              retry: config.CallbackAPI.RetryFailure || 3,
              interval: config.CallbackAPI.IntervalFailure || 1,
            }).catch((error) => errorLogger('waClient #incomingMessageCallback' + error, win));
          }
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        RECEIVED_FILE_PATH = path.resolve(rootPath + '/wacsa-received.json');
        config.FolderLog.ReceivedLogFolder = rootPath;
        fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
      }
      errorLogger('waClient #receivedMessage' + error, win);
    }
  });

  waClient.on('message_create', async (send_msg) => {
    try {
      if (send_msg.fromMe) {
        send_msg.mediaKey = send_msg.mediaKey || '-';
        await new Promise((resolve, reject) => {
          sentFileHandle(resolve, reject, send_msg, 'post', 1);
        }).then((success) => {
          if (success) {
            win.webContents.send('sent_message', 1);
          }
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        SENT_FILE_PATH = path.resolve(rootPath + '/wacsa-sent.json');
        config.FolderLog.SentLogFolder = rootPath;
        fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
      }
      errorLogger('waClient #sentMessage' + error, win);
    }
  });

  waClient.on('message_ack', async (status_msg, ack) => {
    try {
      const valAck = {
        '-1': 'Error',
        0: 'Pending',
        1: 'At The Server',
        2: 'Delivered',
        3: 'Read',
        4: 'On Played',
      };
      if (config.CallbackAPI.MessageStatusEndpoint !== '') {
        await messageCallback({
          url: config.CallbackAPI.MessageStatusEndpoint,
          options: {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              [config.CallbackAPI.AuthKeyName || undefined]:
                config.CallbackAPI.AuthKeyValue || undefined,
            },
            body: JSON.stringify({ status: valAck[ack], message: status_msg }, null, 2),
          },
          retry: config.CallbackAPI.RetryFailure || 3,
          interval: config.CallbackAPI.IntervalFailure || 1,
        });
      }
    } catch (error) {
      errorLogger('waClient #statusMessageCallback' + error, win);
    }
  });

  waClient.on('change_state', (newState) => {
    if (newState === 'TIMEOUT') {
      win.webContents.send('timeout');
    }
    if (newState === 'CONNECTED') {
      win.webContents.send('connected');
    }
  });

  waClient.on('disconnected', (reason) => {
    win.webContents.send('disconnected_client');
    win.webContents.send('logs', 'Whatsapp telah terputus! Error : ' + reason);
    if (fs.existsSync(SESSION_FILE_PATH)) {
      fs.unlink(SESSION_FILE_PATH, (error) => {
        if (error) {
          errorLogger('waClient #unlinkSessionFile' + error, win);
        }
        waClient
          .destroy()
          .then(() => {
            waClient.initialize().catch((error) => {
              errorLogger('waClient #waClientInitializeAfterDisconnected' + error, win);
              win.webContents.send('fatal-error', err);
            });
          })
          .catch((error) => {
            errorLogger('waClient #destroySessionAfterDisconnected' + error, win);
          });
      });
    }
  });
}

module.exports = {
  waClient,
  waListener,
};
