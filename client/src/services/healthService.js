import { request } from './apiClient.js';

export function getHealth() {
  return request('GET', '/health');
}
