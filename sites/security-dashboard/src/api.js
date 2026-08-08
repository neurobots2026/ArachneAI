const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

let token = localStorage.getItem('arachne_token') || '';

export function setToken(nextToken) {
  token = nextToken || '';
  if (token) localStorage.setItem('arachne_token', token);
  else localStorage.removeItem('arachne_token');
}

export function clearToken() {
  setToken('');
}

export function getToken() {
  return token;
}

function errorMessage(payload, fallback) {
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => item.msg).filter(Boolean).join(', ') || fallback;
  }
  return payload?.error || payload?.detail || fallback;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(errorMessage(payload, response.statusText || 'Request failed'));
  }
  return response.json();
}

async function download(path) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(errorMessage(payload, response.statusText || 'Download failed'));
  }
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'incident-report';
  return { blob: await response.blob(), filename };
}

export const api = {
  login: (email, password) => request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  me: () => request('/api/v1/auth/me'),
  summary: () => request('/api/v1/dashboard/summary'),
  threats: () => request('/api/v1/dashboard/threats'),
  activity: () => request('/api/v1/dashboard/activity'),
  status: () => request('/api/v1/dashboard/status'),
  honeytokens: () => request('/api/v1/honeytokens'),
  incidents: () => request('/api/v1/incidents'),
  incident: (id) => request(`/api/v1/incidents/${id}`),
  contain: (recommendationId, approved = true) => request('/api/v1/incidents/contain', {
    method: 'POST',
    body: JSON.stringify({ recommendation_id: recommendationId, approved }),
  }),
  generateReport: (incidentId) => request(`/api/v1/reports/generate/${incidentId}`, { method: 'POST' }),
  downloadReport: (reportId) => download(`/api/v1/reports/${reportId}/download`),
  resetDemo: () => request('/api/v1/simulation/reset', { method: 'POST' }),
};
