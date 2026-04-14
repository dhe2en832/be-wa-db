const { body, validationResult } = require("express-validator");
const authService = require("../services/auth.service");

function authRoutes(appExpress) {
  // Login endpoint
  appExpress.post(
    "/auth/login",
    [body("email").notEmpty(), body("password").notEmpty()],
    async (req, res) => {
      // console.log("[DEBUG] req.body:", req.body);
      // console.log("[DEBUG] headers:", req.headers['content-type']);
      try {
        const errors = validationResult(req).formatWith(({ msg }) => msg);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            status: false,
            message: "Email atau Password Masih Kosong",
          });
        }

        const result = await authService.login({
          email: req.body.email,
          password: req.body.password,
        });

        if (result.success) {
          return res.status(200).json({
            status: true,
            sessionKey: result.sessionKey,
            sessionID: result.sessionID,
            userID: result.userID,
            siteID: result.siteID,
            validThru: result.validThru, // Session expiration timestamp (YYYYMMDDTHH:mm:ss)
            message: result.message,
          });
        } else {
          return res.status(422).json({
            status: false,
            message: result.message,
          });
        }
      } catch (error) {
        return res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  );

  // Logout endpoint
  appExpress.post("/auth/logout", async (req, res) => {
    try {
      const sessionData = req.body;
      const result = await authService.logout(sessionData);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
}

module.exports = authRoutes;
