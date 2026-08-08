const configuredBase = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL || '/api/v1');

const API_BASE = configuredBase.replace(/\/$/, '');
const TOKEN_KEY = 'arachne_operator_token';

let accessToken = localStorage.getItem(TOKEN_KEY) || '';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function errorMessage(payload, fallback) {
  if (Array.isArray(payload?.detail)) {
    const messages = payload.detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length) return messages.join(', ');
  }
  return payload?.error || payload?.detail || fallback;
}

async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const headers = { Accept: 'application/json', ...(fetchOptions.headers || {}) };

  if (fetchOptions.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  } catch (error) {
    throw new ApiError(error.message || 'The API could not be reached.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.statusText || 'Request failed'), response.status);
  }

  return payload;
}

export function setToken(token) {
  accessToken = token || '';
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken('');
}

export function hasToken() {
  return Boolean(accessToken);
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  }),
  me: () => request('/auth/me'),
  startSimulation: (scenarioName) => request('/simulation/start', {
    method: 'POST',
    body: JSON.stringify({ scenario_name: scenarioName }),
  }),
  simulation: (simulationId) => request(`/simulation/${encodeURIComponent(simulationId)}`),
  simulationLog: (simulationId) => request(`/simulation/${encodeURIComponent(simulationId)}/log`),
};
