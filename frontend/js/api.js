// TrustScribe API Client & Deployment Configuration
function getBackendOrigin() {
  if (window.TRUSTSCRIBE_BACKEND_URL && window.TRUSTSCRIBE_BACKEND_URL.trim()) {
    return window.TRUSTSCRIBE_BACKEND_URL.trim().replace(/\/+$/, "");
  }
  const stored = localStorage.getItem("ts_backend_url");
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, "");
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "") {
    return "http://127.0.0.1:8000";
  }
  // Default Render production endpoint:
  return "https://trustscribe-backend.onrender.com";
}

const api = {
  getBackendOrigin() {
    return getBackendOrigin();
  },

  getBaseUrl() {
    return `${getBackendOrigin()}/api`;
  },

  getStreamBase() {
    return `${getBackendOrigin()}/stream-audio`;
  },

  setBackendUrl(url) {
    if (!url) {
      localStorage.removeItem("ts_backend_url");
    } else {
      localStorage.setItem("ts_backend_url", url.trim().replace(/\/+$/, ""));
    }
    window.location.reload();
  },

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
      return raw ? JSON.parse(raw) : { full_name: "Researcher", email: "researcher@trustscribe.local" };
    } catch {
      return { full_name: "Researcher", email: "researcher@trustscribe.local" };
    }
  },

  clearAuth() {
    localStorage.removeItem("trustscribe_token");
    localStorage.removeItem("trustscribe_user");
  },

  async request(endpoint, options = {}) {
    const base = this.getBaseUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
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
