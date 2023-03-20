const auth = (req, res, next) => {
  let token = req.headers["x-access-token"];
  const api_token = process.env.ACCESS_TOKEN;

  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token tidak tercantum",
    });
  }

  if (token === api_token) {
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
