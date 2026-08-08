const API_BASE = import.meta.env.DEV
  ? '/api/v1/target'
  : (import.meta.env.VITE_API_URL || '/api/v1/target');

const TOKEN_KEY = 'crestwood_token';
let token = localStorage.getItem(TOKEN_KEY) || '';

export function setToken(value) {
  token = value || '';
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (_) {
    throw new Error('Crestwood services are temporarily unreachable. Please try again.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || body.error || body.message || response.statusText || 'Request failed');
  }
  return body;
}

export const api = {
  news: () => request('/public/news'),
  programs: () => request('/public/programs'),
  faculty: () => request('/public/faculty'),
  developerResources: () => request('/developer-resources'),

  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  portalDashboard: () => request('/portal/dashboard'),
  financialAid: () => request('/portal/financial-aid'),

  courses: () => request('/courses'),
  enroll: (courseId) => request(`/courses/${courseId}/enroll`, { method: 'POST' }),
  reviews: (courseId) => request(`/courses/${courseId}/reviews`),
  review: (courseId, content) => request(`/courses/${courseId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),

  documents: () => request('/documents'),
  document: (documentId) => request(`/documents/${documentId}`),
  updateProfile: (data) => request('/profile/update', {
    method: 'POST',
    headers: { 'X-CSRF-Token': 'crestwood-portal' },
    body: JSON.stringify(data),
  }),
  uploadAssignment: (name, content = '') => request('/portal/assignments/upload', {
    method: 'POST',
    headers: { 'X-File-Name': name, 'Content-Type': 'text/plain' },
    body: content,
  }),
  assignmentFile: (filename) => request(`/portal/assignments/files/${encodeURIComponent(filename)}`),
  admissions: (data) => request('/admissions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  adminStudents: () => request('/admin/students'),
  adminDocuments: () => request('/admin/documents'),
  systemStatus: () => request('/admin/system'),
  ping: (host) => request('/admin/tools/ping', {
    method: 'POST',
    body: JSON.stringify({ host }),
  }),
  fetchPreview: (url) => request('/admin/tools/fetch-preview', {
    method: 'POST',
    body: JSON.stringify({ url }),
  }),
  legacyUpload: (name, content = '') => request('/admin/upload', {
    method: 'POST',
    headers: { 'X-File-Name': name, 'Content-Type': 'text/plain' },
    body: content,
  }),
  importTranscript: (xml) => request('/admin/students/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml,
  }),
  importSettings: (settings) => request('/admin/settings/import', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),
  exportConfig: () => request('/admin/config-export'),
  checkPackage: (name, version) => request('/api/package', {
    method: 'POST',
    body: JSON.stringify({ name, version }),
  }),
};
