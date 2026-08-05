import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const csrfToken = localStorage.getItem("csrf_token");
  const method = (config.method || "").toLowerCase();

  if (csrfToken && ["post", "put", "patch", "delete"].includes(method)) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.csrf_token) {
      localStorage.setItem("csrf_token", response.data.csrf_token);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || "";

      const isAuthEndpoint =
        url.includes("/auth/login") || url.includes("/auth/password");

      if (status === 401 && !isAuthEndpoint) {
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/setup") {
          localStorage.removeItem("csrf_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
