# WACSA-MD2 Login System Implementation Summary

## Overview
Migration dari hardcoded credentials ke external API authentication (webcsa-v2) dengan token management.

## Changes Made

### 1. Configuration (`wacsa.ini`)
```ini
[AuthAPI]
LoginEndpoint=http://192.168.100.13/api/csa/pulauplastik/login_x
LogoutEndpoint=http://192.168.100.13/api/csa/pulauplastik/login_x
Timeout=10
```

### 2. Backend Services

#### `src/main/services/auth.service.js`
- **Login function**: Calls webcsa-v2 API with headers `x-user` and `x-password`
- **Response handling**: Extracts `secretkey` and `sessionid` from headers, `csiteid` from body
- **Token storage**: Saves to `credentials.json` (token, id, sessionid)
- **Logout function**: Reads credentials from file, calls logout API with proper headers
- **Debug logging**: Added detailed console logs for troubleshooting

#### `src/main/routes/auth.routes.js`
- Updated `/auth/login` to use `authService.login()`
- Added `/auth/logout` endpoint
- Returns `sessionKey`, `sessionID`, `userID`, `siteID`, `validThru`

### 3. Frontend

#### `src/renderer/pages/login.js`
- Simplified login flow - no session management
- Token stored server-side in `credentials.json`
- Direct navigation to home page after successful login

#### `src/renderer/pages/home.js`
- Removed logout button (per user request)
- Removed session validation checks

#### `src/renderer/preload.js`
- Simplified - always starts with login page
- No session persistence in localStorage

### 4. Main Process (`src/app.js`)
```javascript
app.on("window-all-closed", async () => {
  // Call logout API when window is closed (X button)
  await authService.logout();
  await waClient.destroy();
  app.quit();
});
```

## API Format

### Login Request
```http
POST http://192.168.100.13/api/csa/pulauplastik/login_x
Headers:
  content-type: application/json
  x-user: {email}
  x-password: {password}
Body:
  {"action": "login"}
```

### Login Response Headers
- `secretkey`: Session token
- `sessionid`: Session identifier

### Login Response Body
```json
{
  "result": true,
  "onsuccess": {
    "csiteid": "DEMO-ID"
  },
  "validthru": "20260414T11:06:43"
}
```

### Logout Request
```http
POST http://192.168.100.13/api/csa/pulauplastik/login_x
Headers:
  content-type: application/json
  x-user: {email}
  secretkey: {token}
  sessionid: {sessionid}
Body:
  {"action": "logout"}
```

## Token Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Login     │────▶│  webcsa-v2 API   │────▶│  Get sessionKey │
│   Screen    │     └──────────────────┘     └────────┬────────┘
└─────────────┘                                      │
                                                     ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Home      │◀────│  credentials.json │◀────│   Save token    │
│   Screen    │     │  (token storage)  │     └─────────────────┘
└─────────────┘     └──────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Service APIs │
                   │ (/message/*) │
                   └──────────────┘
```

## Key Features

1. **No Session Management**: Token stored in `credentials.json`, not localStorage
2. **Auto-logout on Close**: Tombol X triggers logout API call
3. **Token Persistence**: Service continues working as long as token valid
4. **Simple Flow**: Login → Store token → Use until next login

## Files Modified

| File | Changes |
|------|---------|
| `wacsa.ini` | Added [AuthAPI] section |
| `src/main/services/auth.service.js` | Created login/logout functions |
| `src/main/routes/auth.routes.js` | Updated to use auth service |
| `src/renderer/pages/login.js` | Simplified login flow |
| `src/renderer/pages/home.js` | Removed logout button |
| `src/renderer/preload.js` | Simplified session check |
| `src/app.js` | Added auto-logout on window close |

## Debug Logs

Console output during login/logout:
```
[AUTH] Calling endpoint: http://...
[AUTH] Response status: 200
[AUTH] secretkey (sessionKey): 3d87f4987c...
[AUTH] sessionid: 9f6bf064bb...

[LOGOUT] Calling endpoint: http://...
[LOGOUT] Headers being sent:
  x-user: xs01
  secretkey: 3d87f4987c...
  sessionid: 9f6bf064bb...
[LOGOUT] Response status: 200
[LOGOUT] Response text: {"result": true, ...}
```

## Testing

1. Login with webcsa-v2 credentials
2. Check `credentials.json` for stored token
3. Scan QR code for WhatsApp connection
4. Press X button to close app
5. Check terminal for logout logs
6. Verify can login again (no "slot unavailable" error)

## Notes

- Token changes on every login (normal behavior)
- Service endpoints use token from `credentials.json`
- Logout clears token from `credentials.json`
- Session expiration handled by webcsa-v2 server
