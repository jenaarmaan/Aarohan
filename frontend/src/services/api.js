import axios from "axios";

// Dynamically determine the backend base path
// Fallback to local sandbox proxy or Vercel routing
const getBaseURL = () => {
  if (window.location.pathname.startsWith("/_/backend")) {
    return "/_/backend/api/v1";
  }
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
