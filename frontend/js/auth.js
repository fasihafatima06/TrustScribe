// TrustScribe Authentication Helper (No-Login Frictionless Mode)
document.addEventListener("DOMContentLoaded", () => {
  const profileWidget = document.getElementById("userProfileEmail");
  if (profileWidget) {
    profileWidget.textContent = "Researcher";
  }

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
