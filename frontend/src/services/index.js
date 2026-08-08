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
