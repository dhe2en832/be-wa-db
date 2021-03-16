const callbackAPI = ({ nodeFetch, url, options, retry }) => {
   return new Promise((resolve, reject) => {
      return nodeFetch(url, options)
         .then((res) => res.json())
         .then((resJson) => resolve(resJson))
         .catch((err) => {
            if (retry === 1) reject(err);
            resolve(callbackAPI({ nodeFetch, url, options, retry: retry - 1 }));
         });
   });
};

export default callbackAPI;
