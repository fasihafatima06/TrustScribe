document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  if (!projectId) {
    window.location.href = "dashboard.html";
    return;
  }

  const dropzone = document.getElementById("fileDropzone");
  const fileInput = document.getElementById("fileInput");
  const statusText = document.getElementById("uploadStatusText");
  const recordingsList = document.getElementById("recordingsList");

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) handleUpload(e.target.files[0]);
  });

  async function loadProject() {
    try {
      const data = await api.request(`/projects/${projectId}`);
      document.getElementById("projHeaderTitle").textContent = data.name;
      document.getElementById("projHeaderDesc").textContent = data.description || "Research recording repository";
      document.getElementById("projectNavBadge").textContent = data.name;

      if (!data.recordings || data.recordings.length === 0) {
        recordingsList.innerHTML = `<p style="color: #94A3B8;">No recordings uploaded yet for this project.</p>`;
        return;
      }

      recordingsList.innerHTML = data.recordings.map(r => `
        <div class="card" style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; padding: 18px 24px;">
          <div>
            <h4 style="margin-bottom: 4px;">${r.filename}</h4>
            <div style="font-size: 0.8rem; color: #64748B; display:flex; gap: 14px;">
              <span>Language: ${r.source_language}</span>
              <span>Status: <strong style="color: #10B981;">${r.status}</strong></span>
              <span>Segments: ${r.segments_count}</span>
            </div>
          </div>
          <a href="transcript.html?id=${r.id}" class="btn-primary" style="font-size: 0.85rem;">Open Workspace →</a>
        </div>
      `).join("");
    } catch (err) {
      alert("Failed loading project: " + err.message);
    }
  }

  async function handleUpload(file) {
    statusText.style.display = "block";
    statusText.textContent = `Uploading & analyzing "${file.name}" with Trust Check...`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_language", "Auto-detect");
    formData.append("target_language", "English");

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/recordings/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${api.getToken()}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Upload failed");
      }

      const res = await response.json();
      statusText.textContent = "Upload and transcription complete!";
      window.location.href = `transcript.html?id=${res.recording_id}`;
    } catch (err) {
      statusText.style.color = "#EF4444";
      statusText.textContent = "Upload failed: " + err.message;
    }
  }

  loadProject();
});
