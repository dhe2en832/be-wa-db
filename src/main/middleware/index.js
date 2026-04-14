const fs = require("fs");
const path = require("path");
const { app } = require("electron/main");

const getCredentials = () => {
  const rootPath =
    app.isPackaged === false
      ? app.getAppPath()
      : path.dirname(app.getPath("exe"));
  const credPath = path.resolve(rootPath + "/credentials.json");
  if (fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, "utf-8"));
  }
  // fallback ke bundled credentials (dev mode)
  return require("../../credentials.json");
};

const auth = (req, res, next) => {
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token tidak tercantum",
    });
  }

  const credentials = getCredentials();
  if (token === credentials.token) {
    next();
    return;
  } else {
    return res.status(401).send({
      status: false,
      message: "Token anda salah!",
    });
  }
};

module.exports = { auth };
