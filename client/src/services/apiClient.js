import { getToken } from './tokenStorage.js';

const BASE_URL = '/api';
const LOGIN_PATH = '/auth/login';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor({ status, error, failures }) {
    super(failures[0].message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.failures = failures;
  }
}

// NETWORK_ERROR is a client display code, not a business rule.
function networkError(status = 0) {
  return new ApiError({
    status,
    error: 'NetworkError',
    failures: [
      {
        rule: 'NETWORK_ERROR',
        message: 'Could not reach the server.',
        fix: 'Check your connection and try again.',
      },
    ],
  });
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request(method, path, body) {
  let response;
  let data;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    data = await response.json();
  } catch {
    throw networkError();
  }
  if (!response.ok) {
    const expired = response.status === 401 && path !== LOGIN_PATH;
    if (expired && unauthorizedHandler) {
      unauthorizedHandler();
    }
    if (!Array.isArray(data?.failures) || data.failures.length === 0) {
      throw networkError(response.status);
    }
    throw new ApiError({
      status: response.status,
      error: data.error,
      failures: data.failures,
    });
  }
  return data;
}
