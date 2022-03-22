const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const { config, rootPath, versionTag } = require('../system');
const errorLogger = require('../logger/error-logger');
const statsLogger = require('../logger/stats-logger');
const messageCallback = require('./messageCallback');
const chromePath =
  config.ServerOptions.chrome || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const attachmentSave = config.ServerOptions.attachment || true;
const SESSION_FILE_PATH = rootPath + '/session';

const waClient = new Client({
  puppeteer: {
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--shm-size=3gb'
    ],
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
  takeoverOnConflict: true,
  takeoverTimeoutMs: 60000,
  authTimeoutMs: 0,
  authStrategy: new LocalAuth({
    dataPath: rootPath
  })
});

function waListener(
  RECEIVED_FILE_PATH,
  SENT_FILE_PATH,
  STATS_FILE_PATH,
  receivedFileHandle,
  sentFileHandle,
  win,
  listenerClient,
) {
  win.webContents.send('logs', 'Sedang Menghubungkan...');

  listenerClient.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
      win.webContents.send('qr_client', url);
      win.webContents.send('logs', 'Whatsapp QR Code diterima, Mohon discan untuk melanjutkan!');
    });
  });

  listenerClient.on('ready', async () => {
    const stats = await statsLogger(STATS_FILE_PATH, win);
    win.webContents.send('info_client', [
      listenerClient.info.wid.user,
      listenerClient.info.pushname,
      listenerClient.info.platform,
      versionTag
    ]);
    win.webContents.send('ready_client', stats);
  });

  listenerClient.on('authenticated', () => {
    win.webContents.send('authenticated_client');
  });

  listenerClient.on('auth_failure', (message) => {
    win.webContents.send('logs', message);
  });

  listenerClient.on('message', async (receive_msg) => {
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
            try {
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
              });
            } catch (error) {
              await errorLogger('listenerClient #incomingMessageCallback' + error, win)
            }
          }
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        RECEIVED_FILE_PATH = path.resolve(rootPath + '/wacsa-received.json');
        config.FolderLog.ReceivedLogFolder = rootPath;
        fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
      }
      await errorLogger('listenerClient #receivedMessage' + error, win);
    }
  });

  listenerClient.on('message_create', async (send_msg) => {
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
      await errorLogger('listenerClient #sentMessage' + error, win);
    }
  });

  listenerClient.on('message_ack', async (status_msg, ack) => {
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
      await errorLogger('listenerClient #statusMessageCallback' + error, win);
    }
  });

  listenerClient.on('change_state', (newState) => {
    if (newState === 'TIMEOUT') {
      win.webContents.send('timeout_client');
    }
    if (newState === 'CONNECTED') {
      win.webContents.send('connected_client');
    }
  });

  listenerClient.on('disconnected', async (reason) => {
    try {
      win.webContents.send('disconnected_client');
      win.webContents.send('logs', 'Whatsapp telah terputus! Error : ' + reason);
      await listenerClient.destroy();
      await listenerClient.initialize();
    } catch (error) {
      await errorLogger('waClient #destroyAndOpenSessionAfterDisconnected' + error, win);
      win.webContents.send('fatal-error', err);
    }
  });
}

async function waState(listenerClient, currentWindow) {
  try {
    setTimeout(() => {
      return "TIMEOUT-FROM-WACSA"
    }, ((config.ApiTimeout || 60) * 1000));
    const state = await listenerClient.getState();
    return state;
  } catch (error) {
    await errorLogger('whatsapp #waState' + error, currentWindow);
    const state = 'ERROR';
    return state;
  }
};

module.exports = {
  waClient,
  waListener,
  waState,
  SESSION_FILE_PATH,
};
