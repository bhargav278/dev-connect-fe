const ACCESS_TOKEN_KEY = 'devconnect.accessToken';

export const AUTH_CHANGE_EVENT = 'devconnect:authchange';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
