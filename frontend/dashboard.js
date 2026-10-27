document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("projectsContainer");
  const modal = document.getElementById("newProjModal");
  const openModalBtn = document.getElementById("openNewProjectModal");
  const form = document.getElementById("newProjForm");
  const exploreButton = document.getElementById("exploreWorkspace");

  openModalBtn.addEventListener("click", () => modal.showModal());

  exploreButton.addEventListener("click", async () => {
    const originalLabel = exploreButton.textContent;
    exploreButton.disabled = true;
    exploreButton.textContent = "Preparing workspace…";
    try {
      const response = await api.request("/explore/workspace", { method: "POST" });
      window.location.href = `project.html?id=${response.project_id}`;
    } catch (err) {
      alert(`Could not prepare the workspace: ${err.message}`);
      exploreButton.disabled = false;
      exploreButton.textContent = originalLabel;
    }
  });

  async function loadProjects() {
    try {
      const projects = await api.request("/projects");
      if (projects.length === 0) {
        container.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <p style="color: #94A3B8; margin-bottom: 12px;">No projects created yet.</p>
            <button class="btn-primary" onclick="document.getElementById('newProjModal').showModal()">Create Your First Project</button>
          </div>
        `;
        return;
      }

      container.innerHTML = projects.map(p => `
        <div class="card" style="cursor: pointer; transition: transform 0.15s;" onclick="window.location.href='project.html?id=${p.id}'">
          <h3 style="margin-bottom: 6px;">${p.name}</h3>
          <p style="color: #94A3B8; font-size: 0.85rem; margin-bottom: 16px;">${p.description || "No description provided."}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748B;">
            <span>${p.recordings_count} recording(s)</span>
            <span>Created ${new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join("");
    } catch (err) {
      container.innerHTML = `<p style="color: #EF4444;">Failed to load projects: ${err.message}</p>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.request("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("projName").value,
          description: document.getElementById("projDesc").value
        })
      });
      modal.close();
      form.reset();
      loadProjects();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  loadProjects();
});
