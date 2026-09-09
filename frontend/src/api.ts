const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API = `${BASE}/api`;

export const USER_TOKEN_KEY = "heeba_session_token";
export const ADMIN_TOKEN_KEY = "heeba_admin_token";

let userToken: string | null = null;
let adminToken: string | null = null;

export function setUserToken(t: string | null) {
  userToken = t;
}
export function setAdminToken(t: string | null) {
  adminToken = t;
}
export function getUserToken() {
  return userToken;
}
export function getAdminToken() {
  return adminToken;
}

type ReqOpts = { method?: string; body?: any; admin?: boolean };

async function req(path: string, opts: ReqOpts = {}) {
  const { method = "GET", body, admin = false } = opts;
  const token = admin ? adminToken : userToken;
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail;
    const msg = typeof detail === "string" ? detail : "حدث خطأ، حاول مرة أخرى";
    const err: any = new Error(msg);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return data;
}

export const api = {
  get: (p: string, admin = false) => req(p, { admin }),
  post: (p: string, body?: any, admin = false) => req(p, { method: "POST", body, admin }),
  put: (p: string, body?: any, admin = false) => req(p, { method: "PUT", body, admin }),
  del: (p: string, admin = false) => req(p, { method: "DELETE", admin }),
};

export function resolveImage(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return `${API}/files/${src}`;
}
