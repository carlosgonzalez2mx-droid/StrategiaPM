/**
 * Mock de config para tests
 */

export function getAppBaseUrl() {
  return 'http://localhost:3000';
}

export function getAppUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `http://localhost:3000${cleanPath}`;
}
