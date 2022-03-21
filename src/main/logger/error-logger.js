const { errorFileHandle } = require('../mutex/error-file')

async function errorLogger(errMsg, win) {
  try {
    await new Promise((resolve, reject) => {
      errorFileHandle(resolve, reject, errMsg, 1);
    });
    return;
  } catch (error) {
    win.webContents.send('error', error);
  }
}

module.exports = errorLogger;
