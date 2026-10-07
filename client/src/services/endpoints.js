import { api, unwrap } from './api.js';

export const authApi = {
  me: () => unwrap(api.get('/auth/me')),
  login: (email, password) => unwrap(api.post('/auth/login', { email, password })),
  logout: () => unwrap(api.post('/auth/logout')),
  logoutAll: () => unwrap(api.post('/auth/logout-all')),
  changePassword: (currentPassword, newPassword) =>
    unwrap(api.post('/auth/change-password', { currentPassword, newPassword })),
};

export const publicApi = {
  profile: () => unwrap(api.get('/profile')),
  settings: () => unwrap(api.get('/settings')),
  resumeInfo: () => unwrap(api.get('/resume')),
  skills: () => unwrap(api.get('/skills')),
  experience: () => unwrap(api.get('/experience')),
  education: () => unwrap(api.get('/education')),
  certificates: () => unwrap(api.get('/certificates')),
  projects: (params) => unwrap(api.get('/projects', { params })),
  project: (slug) => unwrap(api.get(`/projects/${encodeURIComponent(slug)}`)),
  trackProjectClick: (id) => api.post(`/projects/${id}/click`).catch(() => {}), // analytics must never break UX
  blog: (params) => unwrap(api.get('/blog', { params })),
  post: (slug) => unwrap(api.get(`/blog/${encodeURIComponent(slug)}`)),
  blogMeta: () => unwrap(api.get('/blog/meta')),
  github: () => unwrap(api.get('/github')),
  // Fire-and-forget: counting a view must never slow down or break the page
  trackView: (path) => api.post('/analytics/view', { path }).catch(() => {}),
  sendMessage: (payload) => unwrap(api.post('/messages', payload)),
};

export const adminApi = {
  stats: () => unwrap(api.get('/admin/stats')),
};

// Direct links to the resume stream (counted as a download when download=1)
export const resumeUrl = (download = false) => `${api.defaults.baseURL}/resume/file${download ? '?download=1' : ''}`;

// ---- Admin content management
export const adminCrud = (path, { getPath } = {}) => ({
  list: (params) => unwrap(api.get(path, { params })),
  get: (id) => unwrap(api.get(getPath ? getPath(id) : `${path}/${id}`)),
  create: (body) => unwrap(api.post(path, body)),
  update: (id, body) => unwrap(api.put(`${path}/${id}`, body)),
  remove: (id) => unwrap(api.delete(`${path}/${id}`)),
  reorder: (ids) => unwrap(api.patch(`${path}/reorder`, { ids })),
  patch: (id, suffix) => unwrap(api.patch(`${path}/${id}${suffix}`)),
});

export const uploadsApi = {
  image: (file, folder, onProgress) => {
    const body = new FormData();
    body.append('folder', folder); // text fields must come before the file for multer to see them
    body.append('file', file);
    return unwrap(
      api.post('/uploads/image', body, {
        timeout: 60000,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
    );
  },
  remove: (publicId) => unwrap(api.delete('/uploads', { data: { publicId } })),
};

export const profileApi = {
  get: () => unwrap(api.get('/profile')),
  update: (body) => unwrap(api.put('/profile', body)),
};

export const resumeApi = {
  info: () => unwrap(api.get('/resume')),
  upload: (file, onProgress) => {
    const body = new FormData();
    body.append('file', file);
    return unwrap(
      api.post('/resume', body, {
        timeout: 60000,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
    );
  },
  remove: () => unwrap(api.delete('/resume')),
};

export const settingsApi = {
  get: () => unwrap(api.get('/settings')),
  update: (body) => unwrap(api.put('/settings', body)),
};

export const messagesApi = {
  list: (params) => unwrap(api.get('/messages', { params })),
  setRead: (id, read) => unwrap(api.patch(`/messages/${id}`, { read })),
  markAllRead: () => unwrap(api.patch('/messages/read-all')),
  remove: (id) => unwrap(api.delete(`/messages/${id}`)),
};

export const analyticsApi = {
  get: (days) => unwrap(api.get('/analytics', { params: { days } })),
};
