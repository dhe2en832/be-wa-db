/**
 * Session helper for managing session data in localStorage
 */

const SESSION_KEYS = {
  sessionKey: 'sessionKey',
  sessionID: 'sessionID',
  userID: 'userID',
  siteID: 'siteID',
};

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
}

function clearSession() {
  localStorage.removeItem(SESSION_KEYS.sessionKey);
  localStorage.removeItem(SESSION_KEYS.sessionID);
  localStorage.removeItem(SESSION_KEYS.userID);
  localStorage.removeItem(SESSION_KEYS.siteID);
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
};
