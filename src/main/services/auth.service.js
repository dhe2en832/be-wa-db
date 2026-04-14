const fs = require("fs");
const path = require("path");
const ini = require("ini");
const { config, rootPath } = require("../system");

function updateAuthKeyValue(token) {
  try {
    const iniPath = path.resolve(rootPath + "/wacsa.ini");
    if (!fs.existsSync(iniPath)) return;
    let raw = fs.readFileSync(iniPath, "utf-8");
    // Replace nilai AuthKeyValue tanpa rewrite seluruh file (agar komentar tidak hilang)
    if (/^AuthKeyValue=.*$/m.test(raw)) {
      raw = raw.replace(/^AuthKeyValue=.*$/m, `AuthKeyValue=${token}`);
    } else {
      // Belum ada, tambahkan di bawah [CallbackAPI]
      raw = raw.replace(/(\[CallbackAPI\][^\[]*)/s, (match) => match + `AuthKeyValue=${token}\n`);
    }
    fs.writeFileSync(iniPath, raw);
    // Sync in-memory config too
    if (config.CallbackAPI) config.CallbackAPI.AuthKeyValue = token;
  } catch (e) {
    console.error("[AUTH] Failed to update AuthKeyValue in wacsa.ini:", e.message);
  }
}

async function login(credentials) {
  const { email, password } = credentials;
  const authConfig = config.AuthAPI || {};
  const loginEndpoint = authConfig.LoginEndpoint;

  // credentials.json di luar asar: rootPath/credentials.json (folder instalasi)
  // fallback ke dalam asar jika belum ada
  const credentialsPath = path.resolve(rootPath + "/credentials.json");

  // If no external API configured, fall back to local credentials
  if (!loginEndpoint) {
    let credentialsJson;
    if (fs.existsSync(credentialsPath)) {
      credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    } else {
      credentialsJson = require("../../credentials.json");
    }
    if (email === credentialsJson.id && password === credentialsJson.password) {
      updateAuthKeyValue(credentialsJson.token);
      return {
        sessionKey: credentialsJson.token,
        sessionID: Date.now().toString(),
        userID: email,
        siteID: "1",
        success: true,
        message: "Login berhasil (hardcoded)",
      };
    }
    return { success: false, message: "Email atau Password Tidak Cocok" };
  }

  try {
    const timeout = parseInt(authConfig.Timeout) || 10;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(loginEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": email,
        "x-password": password,
      },
      body: JSON.stringify({ action: "login" }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // console.log("[AUTH] Response status:", response.status);
    // console.log("[AUTH] Response headers:", Object.fromEntries(response.headers.entries()));

    const sessionKey = response.headers.get("secretkey");
    const sessionID = response.headers.get("sessionid");
    
    const responseBody = await response.json();
       // Log untuk debugging/logout via Postman
    console.log("[AUTH] Login Success:");
    console.log("[AUTH] secretkey (sessionKey):", sessionKey);
    console.log("[AUTH] sessionid:", sessionID);

    // Check response format from webcsa-v2
    if (responseBody.result !== true) {
      const errorMsg = responseBody?.onfail?.cerror || responseBody?.message || "Login failed";
      return {
        success: false,
        message: errorMsg,
      };
    }

    if (!sessionKey || !sessionID) {
      return {
        success: false,
        message: "Invalid response: missing session headers (secretkey, sessionid)",
      };
    }

    // Trim siteID (webcsa-v2 sometimes has trailing spaces)
    const siteID = (responseBody?.onsuccess?.csiteid || "1").trim();

    // SAVE TOKEN & SESSION KE CREDENTIALS.JSON di folder instalasi
    // Juga disimpan untuk logout (perlu secretkey dan sessionid)
    let creds = {};
    if (fs.existsSync(credentialsPath)) {
      creds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    }
    creds.token = sessionKey;
    creds.id = email;
    creds.sessionid = sessionID; // Save for logout
    fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2));

    // Update AuthKeyValue in wacsa.ini so callbacks use the new token
    updateAuthKeyValue(sessionKey);

    return {
      sessionKey,
      sessionID,
      userID: email,
      siteID,
      validThru: responseBody.validthru, // Timestamp when session expires (format: YYYYMMDDTHH:mm:ss)
      success: true,
      message: "Login berhasil",
    };
  } catch (error) {
    return {
      success: false,
      message: `Authentication failed: ${error.message}`,
    };
  }
}

async function logout() {
  const authConfig = config.AuthAPI || {};
  const logoutEndpoint = authConfig.LogoutEndpoint;

  // READ credentials from credentials.json di folder instalasi
  const credentialsPath = path.resolve(rootPath + "/credentials.json");
  let creds = {};
  if (fs.existsSync(credentialsPath)) {
    creds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  }

  // Need token (secretkey), id (x-user), and sessionid for logout
  const secretkey = creds.token;
  const xuser = creds.id;
  const sessionid = creds.sessionid;

  if (!logoutEndpoint || !secretkey || !xuser) {
    // Still clear local credentials even if API call not possible
    if (fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.sessionid = "";
      fs.writeFileSync(credentialsPath, JSON.stringify(clearedCreds, null, 2));
    }
    return { success: true, message: "Logout berhasil (local)" };
  }

  try {
    // console.log("[LOGOUT] Calling endpoint:", logoutEndpoint);
    // console.log("[LOGOUT] With headers:", { "x-user": xuser, "secretkey": secretkey ? "***" : "missing", "sessionid": sessionid ? "***" : "missing" });

    // console.log("[LOGOUT] Headers being sent:");
    // console.log("  x-user:", xuser);
    // console.log("  secretkey:", secretkey ? secretkey.substring(0, 10) + "..." : "MISSING");
    // console.log("  sessionid:", sessionid ? sessionid.substring(0, 10) + "..." : "MISSING");

    const response = await fetch(logoutEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": xuser,
        "secretkey": secretkey,
        "sessionid": sessionid || "",
      },
      body: JSON.stringify({ action: "logout" }),
    });

    // console.log("[LOGOUT] Response status:", response.status);
    const responseText = await response.text();
    // console.log("[LOGOUT] Response text:", responseText);
    
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch (e) {
      responseBody = { result: false, onfail: { cerror: "Invalid JSON response: " + responseText } };
    }

    // Clear credentials regardless of API response
    if (fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.sessionid = "";
      fs.writeFileSync(credentialsPath, JSON.stringify(clearedCreds, null, 2));
    }

    if (responseBody.result === true) {
      return { success: true, message: "Logout berhasil" };
    } else {
      const errorMsg = responseBody?.onfail?.cerror || "Logout failed";
      return { success: false, message: errorMsg };
    }
  } catch (error) {
    // Clear credentials on error too
    if (fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.sessionid = "";
      fs.writeFileSync(credentialsPath, JSON.stringify(clearedCreds, null, 2));
    }
    return { success: true, message: "Logout berhasil (local)" };
  }
}

module.exports = { login, logout };
