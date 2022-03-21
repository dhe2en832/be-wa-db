const fs = require('fs');
const path = require('path');
const { config, rootPath } = require('../system');

async function statsLogger(STATS_FILE_PATH, win) {
  try {
    const statsGenerate = () => {
      const getStats = fs.readFileSync(STATS_FILE_PATH);
      const stats = JSON.parse(getStats);
      return stats;
    };
    if (fs.existsSync(STATS_FILE_PATH)) {
      return statsGenerate();
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      STATS_FILE_PATH = path.resolve(rootPath + '/wacsa-statistic.json');
      config.FolderLog.StatisticLogFolder = rootPath;
      fs.writeFileSync(path.resolve(rootPath + '/wacsa.ini'), ini.stringify(config));
      if (fs.existsSync(STATS_FILE_PATH)) {
        return statsGenerate();
      }
    }
    await errorLogger('statsLogger #generateStats' + error, win);
  }
}

module.exports = statsLogger;
