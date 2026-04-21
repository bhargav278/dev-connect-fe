import { io } from 'socket.io-client';
import { env } from './env';
import { getAccessToken, AUTH_CHANGE_EVENT } from '../features/auth/auth.token';

/**
 * Socket.io client instance.
 *
 * - `autoConnect: false` — we connect manually after login so the auth token
 *   is always present when the handshake happens.
 * - `auth.token` is read lazily via a function so it always picks up the
 *   latest token (e.g. after a silent refresh).
 */
export const socket = io(env.apiBaseUrl, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: getAccessToken() });
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

/**
 * Call after a successful login / token set.
 * Connects the socket if not already connected.
 */
export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Call on logout / token clear.
 * Disconnects the socket cleanly.
 */
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

// ─── Auto-sync with auth state ──────────────────────────────────────────────
// Listen to the same auth change event used by the navbar so the socket
// connects/disconnects automatically whenever the token changes.
window.addEventListener(AUTH_CHANGE_EVENT, () => {
  const token = getAccessToken();
  if (token) {
    connectSocket();
  } else {
    disconnectSocket();
  }
});

// Connect immediately if a token already exists (e.g. page refresh)
if (getAccessToken()) {
  connectSocket();
}
