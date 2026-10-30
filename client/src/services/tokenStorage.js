const TOKEN_KEY = 'shopfloor.token';

// sessionStorage: cleared when the tab closes (OQ-05).
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}
