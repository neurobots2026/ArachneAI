const API = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
let token = localStorage.getItem('arachne_token') || '';

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('arachne_token', t);
}

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
  startSimulation: (scenario_name) =>
    request('/api/v1/simulation/start', { method: 'POST', body: JSON.stringify({ scenario_name }) }),
  simulationLog: (id) => request(`/api/v1/simulation/${id}/log`),
  simulationStatus: (id) => request(`/api/v1/simulation/${id}`),
};
