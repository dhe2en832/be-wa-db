const fs = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');
const withTimeout = require('async-mutex').withTimeout;

const { rootPath } = require('../system');
const { timeRangeChecker, maxRetryChecker } = require('../../utils/mutexValidator');
const { dateTimeGeneratorServer } = require('../../utils/dateTimeGenerator');

const maxTimerError = 1;
const maxRetryError = 5;
const timeRangeError = timeRangeChecker(maxTimerError);
const maxRetryCountError = maxRetryChecker(maxRetryError);
const mutexWithTimeoutError = withTimeout(new Mutex(), timeRangeError, new Error('ETIMEOUT'));

let ERROR_FILE_PATH = path.resolve(rootPath + '/wacsa-error.log');
const errorFileHandle = (resolve, reject, dataArg, count) => {
    mutexWithTimeoutError
        .acquire()
        .then((release) => {
            const log = dateTimeGeneratorServer() + ' => ' + dataArg + '\r\n';
            fs.writeFile(ERROR_FILE_PATH, log, { flag: 'a' }, (err) => {
                if (err) reject(err);
                resolve(true);
            });
            release();
        })
        .catch((error) => {
            if (error.message === 'ETIMEOUT' && count <= maxRetryCountError) {
                count++;
                errorFileHandle(resolve, reject, dataArg, count);
            } else {
                reject(error);
            }
        });
};

module.exports = {
    ERROR_FILE_PATH,
    errorFileHandle,
};
