const { authCSA } = require("../middleware/authCSA");

module.exports = function (appExpress, errorLogger, receivedFileHandle, sentFileHandle, statsFileHandle) {
  appExpress.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  appExpress.get("/log/received-message", [authCSA], async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        receivedFileHandle(resolve, reject, null, "get", 1);
      }).then((jsonData) => {
        res.status(200).json({
          status: true,
          response: jsonData,
        });
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        res.status(404).json({
          status: false,
          message: "Data Log Pesan Masuk Masih Kosong",
        });
      } else if (error.message === "ETIMEOUT") {
        return res.status(422).json({
          status: false,
          message: "Data Log Pesan Masuk Sedang Ada Pengaksesan",
        });
      } else {
        errorLogger(error);
        return res.status(500).json({
          status: false,
          message: error,
        });
      }
    }
  });

  appExpress.get("/log/sent-message", [authCSA], async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        sentFileHandle(resolve, reject, null, "get", 1);
      }).then((jsonData) => {
        res.status(200).json({
          status: true,
          response: jsonData,
        });
      });
    } catch (error) {
      if (error.code == "ENOENT") {
        res.status(404).json({
          status: false,
          message: "Data Log Pesan Keluar Masih Kosong",
        });
      } else if (error.message === "ETIMEOUT") {
        return res.status(422).json({
          status: false,
          message: "Data Log Pesan Keluar Sedang Ada Pengaksesan",
        });
      } else {
        errorLogger(error);
        return res.status(500).json({
          status: false,
          message: error,
        });
      }
    }
  });

  appExpress.get("/log/statistic", [authCSA], async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        statsFileHandle(resolve, reject, null, "get", 1);
      }).then((jsonData) => {
        res.status(200).json({
          status: true,
          response: jsonData,
        });
      });
    } catch (error) {
      if (error.code == "ENOENT") {
        res.status(404).json({
          status: false,
          message: "Data Log Statistik Masih Kosong",
        });
      } else if (error.message === "ETIMEOUT") {
        return res.status(422).json({
          status: false,
          message: "Data Log Statistik Sedang Ada Pengaksesan",
        });
      } else {
        errorLogger(error);
        return res.status(500).json({
          status: false,
          message: error,
        });
      }
    }
  });
};
