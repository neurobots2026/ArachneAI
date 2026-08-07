const API = import.meta.env.DEV ? '/api/v1/target' : (import.meta.env.VITE_API_URL || '/api/v1/target');
let token = localStorage.getItem('crestwood_token') || '';
export const setToken = (value) => { token = value; value ? localStorage.setItem('crestwood_token', value) : localStorage.removeItem('crestwood_token'); };
export const getToken = () => token;
async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || response.statusText);
  return body;
}
export const api = {
  news: () => request('/public/news'), programs: () => request('/public/programs'), faculty: () => request('/public/faculty'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }), me: () => request('/auth/me'), logout: () => request('/auth/logout', { method: 'POST' }),
  dashboard: () => request('/portal/dashboard'), courses: () => request('/courses'), enroll: (id) => request(`/courses/${id}/enroll`, { method: 'POST' }),
  reviews: (id) => request(`/courses/${id}/reviews`), review: (id, content) => request(`/courses/${id}/reviews`, { method: 'POST', body: JSON.stringify({ content }) }),
  updateEmail: (email) => request('/portal/profile/email', { method: 'POST', headers: { 'X-CSRF-Token': 'crestwood-ui' }, body: JSON.stringify({ email }) }),
  upload: (name, content) => request('/portal/assignments/upload', { method: 'POST', headers: { 'X-File-Name': name, 'Content-Type': 'text/plain' }, body: content }),
  admissions: (data) => request('/admissions', { method: 'POST', body: JSON.stringify(data) }), developer: () => request('/developer-resources'),
  students: () => request('/admin/students'), documents: () => request('/admin/documents'), system: () => request('/admin/system'),
  fetchPreview: (url) => request('/admin/tools/fetch-preview', { method: 'POST', body: JSON.stringify({ url }) }),
  ping: (host) => request('/admin/tools/ping', { method: 'POST', body: JSON.stringify({ host }) }),
  importSettings: (blob) => request('/admin/settings/import', { method: 'POST', body: JSON.stringify(blob) }),
  importTranscript: (xml) => request('/admin/students/import', { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: xml }),
};
