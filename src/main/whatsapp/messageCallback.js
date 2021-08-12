const nodeFetch = require('node-fetch');

function messageCallback({ url, options, retry, interval }) {
  return new Promise((resolve, reject) => {
    return nodeFetch(url, options)
      .then((res) => res.json())
      .then((resJson) => resolve(resJson))
      .catch((err) => {
        if (retry === 0) return reject(err);
        setTimeout(() => {
          resolve(messageCallback({ url, options, retry: retry - 1 }));
        }, interval * 1000);
      });
  });
}

module.exports = messageCallback;
