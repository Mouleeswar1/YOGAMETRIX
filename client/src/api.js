const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = RAW_API.replace(/\/+$/, "");

export function token() {
  return localStorage.getItem("ym_token");
}

export async function api(path, options = {}) {
  const endpoint = `${API}/${path.replace(/^\/+/, "")}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}

export { API };