import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Sends HttpOnly cookies (access/refresh tokens)
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to handle token expiration (HTTP 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and the request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh flow if we are already trying to login, logout, or refresh to prevent infinite loops
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refreshToken") ||
        originalRequest.url?.includes("/auth/logout")
      ) {
        return Promise.reject(error);
      }

      try {
        // Attempt to silently refresh the access token via the refreshToken endpoint
        await api.post("/auth/refreshToken");
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is expired or invalid -> force redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

//console.log("ADMIN API URL:", process.env.NEXT_PUBLIC_ADMIN_API_URL);
export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Silently refresh token using the main auth client
        await api.post("/auth/refreshToken");
        return adminApi(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;