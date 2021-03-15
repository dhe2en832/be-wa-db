const authCSA = (req, res, next) => {
  let token = req.headers["x-access-token"];
  const api_token = "3e0c363ff3064af03a9dd3f9f1cbb587";

  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token tidak tercantum",
    });
  }

  if (token == api_token) {
    next();
    return
  } else {
    return res.status(401).send({
      status: false,
      message: "Token anda salah!",
    });
  }
};

module.exports = { authCSA };
