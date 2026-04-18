/**
 * Session helper for managing session data in localStorage
 */

const SESSION_KEYS = {
  sessionKey: 'sessionKey',
  sessionID: 'sessionID',
  userID: 'userID',
  siteID: 'siteID',
  passwordHash: 'passwordHash',
};

/**
 * Hash password menggunakan SHA-256 via Web Crypto API.
 * Password asli tidak pernah disimpan.
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSession() {
  return {
    sessionKey: localStorage.getItem(SESSION_KEYS.sessionKey),
    sessionID: localStorage.getItem(SESSION_KEYS.sessionID),
    userID: localStorage.getItem(SESSION_KEYS.userID),
    siteID: localStorage.getItem(SESSION_KEYS.siteID),
  };
}

function setSession(session) {
  localStorage.setItem(SESSION_KEYS.sessionKey, session.sessionKey);
  localStorage.setItem(SESSION_KEYS.sessionID, session.sessionID);
  localStorage.setItem(SESSION_KEYS.userID, session.userID);
  localStorage.setItem(SESSION_KEYS.siteID, session.siteID);
  if (session.passwordHash) {
    localStorage.setItem(SESSION_KEYS.passwordHash, session.passwordHash);
  }
}

function getPasswordHash() {
  return localStorage.getItem(SESSION_KEYS.passwordHash);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEYS.sessionKey);
  localStorage.removeItem(SESSION_KEYS.sessionID);
  localStorage.removeItem(SESSION_KEYS.userID);
  localStorage.removeItem(SESSION_KEYS.siteID);
  localStorage.removeItem(SESSION_KEYS.passwordHash);
}

function hasSession() {
  const sessionKey = localStorage.getItem(SESSION_KEYS.sessionKey);
  const sessionID = localStorage.getItem(SESSION_KEYS.sessionID);
  return !!(sessionKey && sessionID);
}

function getAuthHeaders() {
  const sessionKey = localStorage.getItem(SESSION_KEYS.sessionKey);
  return {
    'x-access-token': sessionKey || '',
  };
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  hasSession,
  getAuthHeaders,
  hashPassword,
  getPasswordHash,
};
