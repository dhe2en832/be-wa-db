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
  const loginEndpoint = authConfig.Endpoint;

  // credentials.json di luar asar: rootPath/credentials.json (folder instalasi)
  const credentialsPath = path.resolve(rootPath + "/credentials.json");

  // Baca credentials yang ada
  let existingCreds = {};
  if (fs.existsSync(credentialsPath)) {
    try { existingCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8")); } catch(e) {}
  }

  // Cek apakah ini login dari wacsa-md2 sendiri:
  // pakai field localUser — hanya diisi saat login dari wacsa-md2 UI
  // Jika localUser kosong atau sama dengan email yang login → isLocalLogin
  const isLocalLogin = !existingCreds.localUser || existingCreds.localUser === email;

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

    const sessionKey = response.headers.get("secretkey");
    const sessionID = response.headers.get("sessionid");
    
    const responseBody = await response.json();
    
    // Log hanya untuk login dari wacsa-md2 UI
    if (isLocalLogin) {
      console.log("[AUTH] Login success for:", email);
      console.log("[AUTH] sessionid:", sessionID);
    }

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

    // credentials.json TIDAK ditulis dari sini — hanya ditulis via IPC 'save-credentials'
    // yang dipanggil dari renderer saat login dari wacsa-md2 UI

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

async function logout(options = {}) {
  const { isLocalLogout = false } = options;
  const authConfig = config.AuthAPI || {};
  const logoutEndpoint = authConfig.Endpoint;

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
    if (isLocalLogout && fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.id = "";
      clearedCreds.localUser = "";
      clearedCreds.sessionid = "";
      fs.writeFileSync(credentialsPath, JSON.stringify(clearedCreds, null, 2));
    }
    return { success: true, message: "Logout berhasil (local)" };
  }

  try {
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

    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch (e) {
      responseBody = { result: false, onfail: { cerror: "Invalid JSON response: " + responseText } };
    }

    // Hanya tulis ke credentials.json jika logout dari wacsa-md2 sendiri
    if (isLocalLogout && fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.id = "";
      clearedCreds.localUser = "";
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
    if (isLocalLogout && fs.existsSync(credentialsPath)) {
      const clearedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      clearedCreds.token = "";
      clearedCreds.id = "";
      clearedCreds.localUser = "";
      clearedCreds.sessionid = "";
      fs.writeFileSync(credentialsPath, JSON.stringify(clearedCreds, null, 2));
    }
    return { success: true, message: "Logout berhasil (local)" };
  }
}

/**
 * Refresh session ke server auth.
 * Mengembalikan { success, validThru, message }
 */
async function refreshSession() {
  const authConfig = config.AuthAPI || {};
  const refreshEndpoint = authConfig.Endpoint;

  if (!refreshEndpoint) {
    // Tidak ada endpoint refresh — anggap session tidak pernah expire
    return { success: true, validThru: null, message: "No refresh endpoint configured" };
  }

  const credentialsPath = path.resolve(rootPath + "/credentials.json");
  let creds = {};
  if (fs.existsSync(credentialsPath)) {
    try { creds = JSON.parse(fs.readFileSync(credentialsPath, "utf8")); } catch(e) {}
  }

  const secretkey = creds.token;
  const xuser = creds.id;
  const sessionid = creds.sessionid;

  if (!secretkey || !xuser) {
    return { success: false, message: "No active credentials to refresh" };
  }

  try {
    const timeout = parseInt(authConfig.Timeout) || 10;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(refreshEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": xuser,
        "secretkey": secretkey,
        "sessionid": sessionid || "",
      },
      body: JSON.stringify({ action: "refresh" }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.json();
    console.log("[AUTH] Refresh response:", JSON.stringify(responseBody));

    if (responseBody.result === true) {
      const newValidThru = responseBody.validthru || null;
      
      // Jika server mengembalikan secretkey baru, update credentials dan wacsa.ini
      const newSecretKey = responseBody.onsuccess?.secretkey || responseBody.secretkey || null;
      if (newSecretKey && newSecretKey !== secretkey) {
        console.log("[AUTH] New secretkey received from refresh, updating credentials...");
        // Update credentials.json
        if (fs.existsSync(credentialsPath)) {
          const updatedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
          updatedCreds.token = newSecretKey;
          fs.writeFileSync(credentialsPath, JSON.stringify(updatedCreds, null, 2));
        }
        // Update wacsa.ini AuthKeyValue
        updateAuthKeyValue(newSecretKey);
      }
      
      return { success: true, validThru: newValidThru, message: "Session refreshed" };
    } else {
      const errorMsg = responseBody?.onfail?.cerror || responseBody?.message || "Refresh failed";
      return { success: false, message: errorMsg };
    }
  } catch (error) {
    return { success: false, message: `Refresh failed: ${error.message}` };
  }
}

module.exports = { login, logout, refreshSession, updateAuthKeyValue };
