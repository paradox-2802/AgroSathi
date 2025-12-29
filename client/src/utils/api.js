import { getToken } from "./auth";

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const authFetch = (url, options = {}) => {
  const token = getToken();

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
