const fs = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');
const withTimeout = require('async-mutex').withTimeout;

const { config, rootPath } = require('../system');
const { timeRangeChecker, maxRetryChecker } = require('../../utils/mutexValidator');
const { dateTimeGeneratorServer } = require('../../utils/dateTimeGenerator');

const maxTimerStats = config.FileLocking.StatisticLogRetryInterval || 1;
const maxRetryStats = config.FileLocking.StatisticLogMaxRetry || 5;
const timeRangeStats = timeRangeChecker(maxTimerStats);
const maxRetryCountStats = maxRetryChecker(maxRetryStats);
const mutexWithTimeoutStats = withTimeout(new Mutex(), timeRangeStats, new Error('ETIMEOUT'));

let STATS_FILE_PATH = path.resolve(
  (config.FolderLog.StatisticLogFolder || rootPath) + '/wacsa-statistic.json'
);
const statsFileHandle = (resolve, reject, dataArg, mode, count) => {
  mutexWithTimeoutStats
    .acquire()
    .then((release) => {
      if (mode === 'post') {
        if (fs.existsSync(STATS_FILE_PATH)) {
          fs.readFile(STATS_FILE_PATH, (err, data) => {
            if (err) {
              reject(err);
            } else {
              let datas;
              try {
                datas = JSON.parse(data);
              } catch (e) {
                datas = { totalReceived: 0, totalSent: 0, createdAt: null, createdAtUnformat: null, updatedAt: null, updatedAtUnformat: null };
              }
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
            let jsonData;
            try {
              jsonData = JSON.parse(data);
            } catch (e) {
              jsonData = { totalReceived: 0, totalSent: 0, createdAt: null, createdAtUnformat: null, updatedAt: null, updatedAtUnformat: null };
            }
            resolve(jsonData);
            if (config.BackupLog.StatisticLogBackup === false) {
              fs.unlink(STATS_FILE_PATH, (err) => {
                if (err) reject(err);
              });
            } else {
              const timestamp = Date.now();
              const FILE_BACKUP = rootPath + '/backup/deleted_wacsa-stats-' + timestamp + '.json';
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
      if (error.message === 'ETIMEOUT' && count <= maxRetryCountStats) {
        count++;
        statsFileHandle(resolve, reject, dataArg, mode, count);
      } else {
        reject(error);
      }
    });
};

module.exports = {
  STATS_FILE_PATH,
  statsFileHandle,
};
