document.addEventListener("DOMContentLoaded", () => {
  const token = api.getToken();
  const isAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html");
  const isPublicPage = window.location.pathname.includes("index.html") || window.location.pathname === "/";

  if (!token && !isAuthPage && !isPublicPage) {
    window.location.href = "login.html";
  }

  // Populate user profile widgets if present
  const profileWidget = document.getElementById("userProfileEmail");
  if (profileWidget) {
    const user = JSON.parse(localStorage.getItem("ts_user") || "{}");
    profileWidget.textContent = user.email || "Researcher";
  }

  // Bind logout buttons
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      api.clearAuth();
      window.location.href = "login.html";
    });
  }
});