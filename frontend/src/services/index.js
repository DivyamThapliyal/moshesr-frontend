/* ============================================================================
   Service layer — thin, typed wrappers over the FastAPI REST API. Every network
   call in the app goes through here, so swapping the backend or adding auth is a
   one-file change and no component talks to axios directly.
   ========================================================================== */
import api from './api';

export const health = () => api.get('/health').then((r) => r.data);

export const currentUser = () => api.get('/users/me').then((r) => r.data);

/* ---- tasks ---- */
export const listTasks = () => api.get('/tasks').then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const createTask = (payload) => api.post('/tasks', payload).then((r) => r.data);
export const updateTask = (id, payload) => api.put(`/tasks/${id}`, payload).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);

/* ---- certificates ---- */
export const getCertificate = (id) => api.get(`/certificate/${id}`).then((r) => r.data);
export const listTaskCertificates = (taskId) => api.get(`/tasks/${taskId}/certificates`).then((r) => r.data);

/* ---- uploads (real file persistence) ---- */
export function uploadCertificate(taskId, file, onProgress) {
  const form = new FormData();
  form.append('task_id', taskId);
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  }).then((r) => r.data);
}
export const listUploads = (taskId) => api.get('/uploads', { params: taskId ? { task_id: taskId } : {} }).then((r) => r.data);

/* ---- reviews / decisions ---- */
export const createReview = (payload) => api.post('/review', payload).then((r) => r.data);
export const listReviews = (params = {}) => api.get('/reviews', { params }).then((r) => r.data);

/* ---- local document analysis ---- */
export async function analyzeLocalDocument(path, onEvent, signal) {
  const base = import.meta.env.VITE_API_BASE || '/api';
  const response = await fetch(`${base.replace(/\/$/, '')}/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
    signal,
  });
  if (!response.ok || !response.body) {
    let message = `Analysis request failed (${response.status})`;
    try { message = (await response.json()).detail || message; } catch { /* keep status message */ }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const dispatch = (block) => {
    if (!block.trim()) return;
    let event = 'message'; let data = '';
    block.split(/\r?\n/).forEach((line) => {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    });
    if (!data) return;
    const payload = JSON.parse(data);
    if (event === 'error') throw new Error(payload.message || 'Document analysis failed');
    onEvent?.(event, payload);
  };

  let reading = true;
  while (reading) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    blocks.forEach(dispatch);
    if (done) reading = false;
  }
  dispatch(buffer);
}
