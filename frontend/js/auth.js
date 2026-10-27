document.addEventListener("DOMContentLoaded", () => {
  const token = api.getToken();
  const page = window.location.pathname.split("/").pop();
  const publicPages = ["", "index.html", "login.html", "register.html"];
  if (!token && !publicPages.includes(page)) window.location.href = "login.html";

  const profileWidget = document.getElementById("userProfileEmail");
  if (profileWidget) profileWidget.textContent = JSON.parse(localStorage.getItem("ts_user") || "{}").email || "Researcher";

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    api.clearAuth();
    window.location.href = "index.html";
  });
});
