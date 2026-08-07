const API = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

let token = localStorage.getItem('crestwood_token') || '';

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('crestwood_token', t);
  else localStorage.removeItem('crestwood_token');
}

export function getToken() { return token; }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/api/v1/target${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  news: () => request('/public/news'),
  programs: () => request('/public/programs'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  courses: () => request('/courses'),
  enroll: (id) => request(`/courses/${id}/enroll`, { method: 'POST' }),
  reviews: (id) => request(`/courses/${id}/reviews`),
  postReview: (id, content) => request(`/courses/${id}/review`, { method: 'POST', body: JSON.stringify({ content }) }),
  documents: () => request('/documents'),
  getDocument: (id) => request(`/documents/${id}`),
  updateProfile: (data) => request('/profile/update', { method: 'POST', body: JSON.stringify(data) }),
  admission: (data) => request('/admissions', { method: 'POST', body: JSON.stringify(data) }),
  adminStudents: () => request('/admin/students'),
  adminDocuments: () => request('/admin/documents'),
  systemStatus: () => request('/admin/system'),
};
