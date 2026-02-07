const fs = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');
const withTimeout = require('async-mutex').withTimeout;

const { config, rootPath } = require('../system');
const { timeRangeChecker, maxRetryChecker } = require('../../utils/mutexValidator');

const maxTimerSent = config.FileLocking.SentLogRetryInterval || 1;
const maxRetrySent = config.FileLocking.SentLogMaxRetry || 5;
const timeRangeSent = timeRangeChecker(maxTimerSent);
const maxRetryCountSent = maxRetryChecker(maxRetrySent);
const mutexWithTimeoutSent = withTimeout(new Mutex(), timeRangeSent, new Error('ETIMEOUT'));

let SENT_FILE_PATH = path.resolve(
  (config.FolderLog.SentLogFolder || rootPath) + '/wacsa-sent.json'
);

const isDisabled = config.ServerOptions.disableSentLog || false;

function sentFileHandle(resolve, reject, data, mode, count) {
  if (isDisabled) return;
  mutexWithTimeoutSent
    .acquire()
    .then((release) => {
      if (mode === 'post') {
        fs.writeFile(SENT_FILE_PATH, JSON.stringify(data, null, 2) + ',', { flag: 'a' }, (err) => {
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
            const rawData = '[' + data.slice(0, -1) + ']';
            const jsonData = JSON.parse(rawData);
            resolve(jsonData);
            if (config.BackupLog.SentLogBackup === false) {
              fs.unlink(SENT_FILE_PATH, (err) => {
                if (err) reject(err);
              });
            } else {
              const timestamp = Date.now();
              const FILE_BACKUP = rootPath + '/backup/deleted_wacsa-sent-' + timestamp + '.json';
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
      if (error.message === 'ETIMEOUT' && count <= maxRetryCountSent) {
        count++;
        sentFileHandle(resolve, reject, data, mode, count);
      } else {
        reject(error);
      }
    });
}

module.exports = {
  SENT_FILE_PATH,
  sentFileHandle,
};
