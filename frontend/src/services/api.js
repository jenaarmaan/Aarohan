import axios from "axios";

// Dynamically determine the backend base path
// On Vercel production, backend is served under /_/backend prefix
// Locally (dev), the Vite proxy or direct server uses /api/v1
const getBaseURL = () => {
  const host = window.location.hostname;
  // Vercel deployment: backend routes through /_/backend
  if (host.includes("vercel.app") || host.includes("vercel")) {
    return "/_/backend/api/v1";
  }
  // Local development
  return "/api/v1";
};

const api = axios.create({
  baseURL: getBaseURL()
});

// Interceptor to inject Firebase authorization token dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("aar_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
