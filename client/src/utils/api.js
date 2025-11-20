import axios from 'axios';

const baseURL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://mind-merge-server.vercel.app/api' : 'http://localhost:4000/api')
);

const api = axios.create({
  baseURL,
  // Abort long-hanging requests that make the UI feel stuck
  timeout: 12000,
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.error;
      const isCors = !error?.response && error?.message?.toLowerCase()?.includes('network');
      const title = status === 401 ? 'Unauthorized' : status === 423 ? 'Account blocked' : isCors ? 'Network/CORS error' : 'Request failed';
      const desc = serverMsg || error?.message || 'Request failed';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', title, desc } }));
      }

      // 401: redirect to signin (avoid loops)
      if (status === 401 && typeof window !== 'undefined') {
        try { localStorage.removeItem('idToken'); } catch {}
        const loc = window.location;
        const path = (loc?.pathname || '') + (loc?.search || '');
        if (!String(path).startsWith('/signin')) {
          // small delay so toast can render before navigation
          setTimeout(() => { window.location.assign('/signin'); }, 300);
        }
      }

      // Lightweight retry for GETs on network/5xx
      const cfg = error?.config || {};
      const method = String(cfg.method || 'get').toLowerCase();
      const shouldRetry = method === 'get' && (!error.response || (status >= 500 && status < 600));
      if (shouldRetry) {
        cfg.__retryCount = (cfg.__retryCount || 0) + 1;
        const maxRetries = 2;
        if (cfg.__retryCount <= maxRetries) {
          const backoff = 200 * Math.pow(2, cfg.__retryCount - 1); // 200ms, 400ms
          return new Promise((resolve) => setTimeout(resolve, backoff)).then(() => axios(cfg));
        }
      }
    } catch {}
    return Promise.reject(error);
  }
);

export default api;
