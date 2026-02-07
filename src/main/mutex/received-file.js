const fs = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');
const withTimeout = require('async-mutex').withTimeout;

const { config, rootPath } = require('../system');
const { timeRangeChecker, maxRetryChecker } = require('../../utils/mutexValidator');

const maxTimerReceived = config.FileLocking.ReceivedLogRetryInterval || 1;
const maxRetryReceived = config.FileLocking.ReceivedLogMaxRetry || 5;
const timeRangeReceived = timeRangeChecker(maxTimerReceived);
const maxRetryCountReceived = maxRetryChecker(maxRetryReceived);
const mutexWithTimeoutReceived = withTimeout(new Mutex(), timeRangeReceived, new Error('ETIMEOUT'));

let RECEIVED_FILE_PATH = path.resolve(
  (config.FolderLog.ReceivedLogFolder || rootPath) + '/wacsa-received.json'
);

const isDisabled = config.ServerOptions.disableReceivedLog || false;

function receivedFileHandle(resolve, reject, data, mode, count) {
  if (isDisabled) return;
  mutexWithTimeoutReceived
    .acquire()
    .then((release) => {
      if (mode === 'post') {
        fs.writeFile(
          RECEIVED_FILE_PATH,
          JSON.stringify(data, null, 2) + ',',
          { flag: 'a' },
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
            release();
          }
        );
      } else {
        fs.readFile(RECEIVED_FILE_PATH, (err, data) => {
          if (err) {
            reject(err);
          } else {
            const rawData = '[' + data.slice(0, -1) + ']';
            const jsonData = JSON.parse(rawData);
            resolve(jsonData);
            if (config.BackupLog.ReceivedLogBackup === false) {
              fs.unlink(RECEIVED_FILE_PATH, (err) => {
                if (err) reject(err);
              });
            } else {
              const timestamp = Date.now();
              const FILE_BACKUP =
                rootPath + '/backup/deleted_wacsa-received-' + timestamp + '.json';
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
      if (error.message === 'ETIMEOUT' && count <= maxRetryCountReceived) {
        count++;
        receivedFileHandle(resolve, reject, data, mode, count);
      } else {
        reject(error);
      }
    });
}

module.exports = {
  RECEIVED_FILE_PATH,
  receivedFileHandle,
};
