import { request } from './apiClient.js';

export function login(userId, password) {
  return request('POST', '/auth/login', { userId, password });
}

export function getCurrentUser() {
  return request('GET', '/auth/me');
}
