// Thin fetch wrapper for the Flask API.
// - Auth tokens are httpOnly cookies set by the server; JS never sees them.
// - State-changing requests echo the csrf_access_token cookie as X-CSRF-TOKEN.
// - On a 401 the access token is refreshed once and the request retried; if that
//   fails an "auth:expired" event tells the app to show the login page.

const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register"];

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getCookie(name) {
  const row = document.cookie.split("; ").find((r) => r.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.split("=")[1]) : null;
}

let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-TOKEN": getCookie("csrf_refresh_token") || "" },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function api(path, { method = "GET", body, form, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = getCookie("csrf_access_token");
    if (csrf) headers["X-CSRF-TOKEN"] = csrf;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "same-origin",
    // `form` is a FormData for file uploads; the browser sets its multipart Content-Type
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && retry && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) return api(path, { method, body, form, retry: false });
    window.dispatchEvent(new Event("auth:expired"));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

api.get = (path) => api(path);
api.post = (path, body = {}) => api(path, { method: "POST", body });
api.put = (path, body = {}) => api(path, { method: "PUT", body });
api.del = (path) => api(path, { method: "DELETE" });
api.upload = (path, file, field = "file") => {
  const form = new FormData();
  form.append(field, file);
  return api(path, { method: "POST", form });
};

// Landing page for each role
export const HOME = { student: "/student", college_admin: "/admin", super_admin: "/super" };
