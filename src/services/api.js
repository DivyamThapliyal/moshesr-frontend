/* ============================================================================
   Axios instance — the single client every service module uses. Base URL is
   configurable via VITE_API_BASE (defaults to /api, which the Vite dev server
   proxies to the FastAPI backend on :8000). A response interceptor normalises
   errors so callers get a readable message.
   ========================================================================== */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail = error.response?.data?.detail;
    const message = detail || error.message || 'Request failed';
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status, cause: error }));
  },
);

export default api;
