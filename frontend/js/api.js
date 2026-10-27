const API_BASE = "http://127.0.0.1:8000/api";
const STREAM_BASE = "http://127.0.0.1:8000/stream-audio";

const api = {
  getToken() {
    return localStorage.getItem("trustscribe_token") || "";
  },

  setAuth(token, user) {
    if (token) localStorage.setItem("trustscribe_token", token);
    if (user) localStorage.setItem("trustscribe_user", JSON.stringify(user));
  },

  getUser() {
    const raw = localStorage.getItem("trustscribe_user");
    try {
      return raw ? JSON.parse(raw) : { full_name: "Researcher", email: "researcher@fieldwork.org" };
    } catch {
      return { full_name: "Researcher", email: "researcher@fieldwork.org" };
    }
  },

  clearAuth() {
    localStorage.removeItem("trustscribe_token");
    localStorage.removeItem("trustscribe_user");
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers = options.headers ? { ...options.headers } : {};

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const config = {
      ...options,
      headers
    };

    const res = await fetch(url, config);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.blob();
  }
};
