const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export function token(){ return localStorage.getItem("ym_token"); }
export async function api(path, options={}) {
  const headers = { "Content-Type":"application/json", ...(options.headers||{}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) { const error = new Error(data.message || "Request failed"); error.status = response.status; throw error; }
  return data;
}
export { API };
