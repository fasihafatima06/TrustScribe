// TrustScribe Authentication Helper (No-Login Frictionless Mode)
document.addEventListener("DOMContentLoaded", () => {
  // Populate user profile widgets if present
  const profileWidget = document.getElementById("userProfileEmail");
  if (profileWidget) {
    const user = JSON.parse(localStorage.getItem("ts_user") || "{}");
    profileWidget.textContent = user.full_name || user.email || "Researcher";
  }

  // Handle any remaining logout buttons cleanly
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("ts_user");
      window.location.href = "index.html";
    });
  }
});
