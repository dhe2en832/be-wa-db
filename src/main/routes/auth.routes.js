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

  // Endpoint untuk mengambil token aktif (read-only, tidak mengubah credentials)
  appExpress.get("/auth/token", async (req, res) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { rootPath } = require("../system");
      const credPath = path.resolve(rootPath + "/credentials.json");
      if (!fs.existsSync(credPath)) {
        return res.status(404).json({ status: false, message: "Token belum tersedia" });
      }
      const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
      if (!creds.token) {
        return res.status(404).json({ status: false, message: "Token belum tersedia" });
      }
      return res.status(200).json({ status: true, token: creds.token });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  });

  // Refresh session endpoint — dipanggil dari renderer via IPC atau langsung
  appExpress.post("/auth/refresh", async (req, res) => {
    try {
      const result = await authService.refreshSession();
      if (result.success) {
        return res.status(200).json({
          status: true,
          validThru: result.validThru,
          message: result.message,
        });
      } else {
        return res.status(401).json({
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
  });

  // Logout endpoint — dipanggil dari client eksternal (wacsa-ui, dll)
  // isLocalLogout selalu false dari sini — tidak boleh mengosongkan credentials
  appExpress.post("/auth/logout", async (req, res) => {
    try {
      const result = await authService.logout({ isLocalLogout: false });
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
