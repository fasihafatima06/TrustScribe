document.addEventListener("DOMContentLoaded", () => {
  // Demo Audio Player Elements
  const demoAudio = document.getElementById("demoAudioPlayer");
  const previewPlayBtn = document.getElementById("previewPlayBtn");
  const previewTime = document.getElementById("previewTime");
  const previewFill = document.getElementById("previewFill");
  const previewTrack = document.getElementById("previewTrack");

  // Dropzone & Upload Elements
  const dropzoneEl = document.getElementById("dropzoneEl");
  const audioFileInput = document.getElementById("audioFileInput");
  const uploadStatusMsg = document.getElementById("uploadStatusMsg");

  // Processing Stepper Modal
  const processingModal = document.getElementById("processingModal");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const step4 = document.getElementById("step4");
  const step5 = document.getElementById("step5");

  // Contact Form
  const contactForm = document.getElementById("contactForm");
  const contactStatusMsg = document.getElementById("contactStatusMsg");

  // --- 1. Preview Audio Player Logic ---
  if (demoAudio && previewPlayBtn) {
    previewPlayBtn.addEventListener("click", () => {
      if (demoAudio.paused) {
        demoAudio.play().then(() => {
          previewPlayBtn.textContent = "⏸";
        }).catch(err => console.log("Audio play notice:", err));
      } else {
        demoAudio.pause();
        previewPlayBtn.textContent = "▶";
      }
    });

    demoAudio.addEventListener("timeupdate", () => {
      if (!demoAudio.duration) return;
      const cur = demoAudio.currentTime;
      const dur = demoAudio.duration;
      const pct = (cur / dur) * 100;
      if (previewFill) previewFill.style.width = `${pct}%`;
      
      const cMin = String(Math.floor(cur / 60)).padStart(2, '0');
      const cSec = String(Math.floor(cur % 60)).padStart(2, '0');
      const dMin = String(Math.floor(dur / 60)).padStart(2, '0');
      const dSec = String(Math.floor(dur % 60)).padStart(2, '0');
      if (previewTime) previewTime.textContent = `${cMin}:${cSec} / ${dMin}:${dSec}`;
    });

    demoAudio.addEventListener("ended", () => {
      previewPlayBtn.textContent = "▶";
      if (previewFill) previewFill.style.width = "0%";
    });

    if (previewTrack) {
      previewTrack.addEventListener("click", (e) => {
        const rect = previewTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        if (demoAudio.duration) {
          demoAudio.currentTime = ratio * demoAudio.duration;
        }
      });
    }
  }

  window.jumpPreviewAudio = function(seconds) {
    if (demoAudio) {
      demoAudio.currentTime = seconds;
      demoAudio.play().then(() => {
        if (previewPlayBtn) previewPlayBtn.textContent = "⏸";
      }).catch(() => {});
    }
  };

  // --- 2. File Upload & Processing Stepper ---
  function showProcessingSteps() {
    processingModal.style.display = "flex";
    const steps = [step1, step2, step3, step4, step5];
    steps.forEach(s => {
      s.className = "stepper-item";
      s.children[0].textContent = "○";
    });

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        if (current > 0) {
          steps[current - 1].className = "stepper-item completed";
          steps[current - 1].children[0].textContent = "✓";
        }
        steps[current].className = "stepper-item active";
        steps[current].children[0].textContent = "●";
        current++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return interval;
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const allowed = ["mp3", "wav", "m4a", "mp4", "ogg"];
    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      uploadStatusMsg.textContent = "Unsupported format. Please select an MP3, WAV, M4A, MP4, or OGG file.";
      uploadStatusMsg.style.color = "#f43f5e";
      return;
    }

    uploadStatusMsg.textContent = `Processing ${file.name}...`;
    uploadStatusMsg.style.color = "#60a5fa";

    showProcessingSteps();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_language", "Auto-detect");
      formData.append("target_language", "English");

      const result = await api.request("/upload-direct", {
        method: "POST",
        body: formData
      });

      setTimeout(() => {
        window.location.href = `transcript.html?id=${result.recording_id}`;
      }, 2000);

    } catch (err) {
      processingModal.style.display = "none";
      uploadStatusMsg.textContent = `Upload failed: ${err.message}`;
      uploadStatusMsg.style.color = "#f43f5e";
    }
  }

  if (audioFileInput) {
    audioFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    });
  }

  if (dropzoneEl) {
    ["dragenter", "dragover"].forEach(evt => {
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzoneEl.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(evt => {
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzoneEl.classList.remove("dragover");
      });
    });

    dropzoneEl.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // --- 3. Preloaded Sample Runner ---
  window.runSampleInterview = async function(sampleId) {
    showProcessingSteps();
    try {
      const result = await api.request(`/seed-sample/${sampleId}`, { method: "POST" });
      setTimeout(() => {
        window.location.href = `transcript.html?id=${result.recording_id}`;
      }, 1800);
    } catch (err) {
      processingModal.style.display = "none";
      alert("Error initializing sample: " + err.message);
    }
  };

  // --- 4. Pricing Billing Toggle ---
  window.setBillingCycle = function(cycle) {
    const btnM = document.getElementById("priceMonthlyBtn");
    const btnA = document.getElementById("priceAnnualBtn");
    const pFree = document.getElementById("priceFree");
    const pRes = document.getElementById("priceResearcher");
    const pPro = document.getElementById("pricePro");

    if (cycle === "annual") {
      btnM.classList.remove("active");
      btnA.classList.add("active");
      pFree.innerHTML = `₹0<span style="font-size:0.9rem; color:#64748b;"> / month (billed annually)</span>`;
      pRes.innerHTML = `₹399<span style="font-size:0.9rem; color:#64748b;"> / month (billed annually)</span>`;
      pPro.innerHTML = `₹1,199<span style="font-size:0.9rem; color:#64748b;"> / month (billed annually)</span>`;
    } else {
      btnA.classList.remove("active");
      btnM.classList.add("active");
      pFree.innerHTML = `₹0<span style="font-size:0.9rem; color:#64748b;"> / month</span>`;
      pRes.innerHTML = `₹499<span style="font-size:0.9rem; color:#64748b;"> / month</span>`;
      pPro.innerHTML = `₹1,499<span style="font-size:0.9rem; color:#64748b;"> / month</span>`;
    }
  };

  // --- 5. Contact Form Submission ---
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        email: document.getElementById("contactEmail").value,
        first_name: document.getElementById("contactFirst").value,
        last_name: document.getElementById("contactLast").value,
        company_name: document.getElementById("contactCompany").value,
        job_title: document.getElementById("contactTitle").value,
        company_size: document.getElementById("contactSize").value,
        message: document.getElementById("contactMessage").value
      };

      try {
        const res = await api.request("/contact", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        contactStatusMsg.style.display = "block";
        contactStatusMsg.textContent = res.message || "Thank you! Inquiry received.";
        contactForm.reset();
      } catch (err) {
        alert("Could not send inquiry: " + err.message);
      }
    });
  }
});
