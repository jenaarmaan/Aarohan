import axios from "axios";

// Axios instance proxied to FastAPI backend
const api = axios.create({
  baseURL: "/api/v1"
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
