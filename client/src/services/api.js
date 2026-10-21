// Thin fetch wrapper. Cookies carry the JWT (httpOnly), so no token handling in JS.
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method, credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("We cannot reach PennyPal right now. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data?.error?.message || "Something went wrong."); e.code = data?.error?.code; e.status = res.status; throw e; }
  return data;
}
export const api = {
  get: (p) => request("GET", p), post: (p, b = {}) => request("POST", p, b),
  patch: (p, b) => request("PATCH", p, b), del: (p) => request("DELETE", p),
};
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));
export const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const dateShort = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
