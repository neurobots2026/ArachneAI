const API = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
let token = localStorage.getItem('arachne_token') || '';

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('arachne_token', t);
  else localStorage.removeItem('arachne_token');
}

export function getToken() { return token; }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/v1/auth/me'),
  summary: () => request('/api/v1/dashboard/summary'),
  threats: () => request('/api/v1/dashboard/threats'),
  activity: () => request('/api/v1/dashboard/activity'),
  status: () => request('/api/v1/dashboard/status'),
  honeytokens: () => request('/api/v1/honeytokens'),
  incidents: () => request('/api/v1/incidents'),
  incident: (id) => request(`/api/v1/incidents/${id}`),
  analyzeDeception: () => request('/api/v1/deception/analyze', { method: 'POST' }),
  generateDeception: (strategy) =>
    request('/api/v1/deception/generate', { method: 'POST', body: JSON.stringify({ strategy }) }),
  contain: (recommendation_id, approved = true) =>
    request('/api/v1/incidents/contain', { method: 'POST', body: JSON.stringify({ recommendation_id, approved }) }),
  generateReport: (incidentId) =>
    request(`/api/v1/reports/generate/${incidentId}`, { method: 'POST' }),
};
