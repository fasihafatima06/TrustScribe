document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let recordingId = urlParams.get("id") || "1";

  // Audio & Video Media Elements
  const audio = document.getElementById("wsAudioMedia");
  const video = document.getElementById("wsVideoMedia");
  const videoContainer = document.getElementById("videoContainer");
  const playBtn = document.getElementById("wsPlayBtn");
  const timeDisplay = document.getElementById("wsTime");
  const track = document.getElementById("wsTrack");
  const fill = document.getElementById("wsFill");
  const speedSelect = document.getElementById("playbackSpeedSelect");
  const skipBackBtn = document.getElementById("btnSkipBack");
  const skipFwdBtn = document.getElementById("btnSkipFwd");
  const wsToast = document.getElementById("wsToast");

  // Workspace Info Elements
  const projectTitle = document.getElementById("projectTitle");
  const recordingMeta = document.getElementById("recordingMeta");
  const segmentsContainer = document.getElementById("segmentsContainer");

  // Stats Elements
  const countReviewed = document.getElementById("countReviewed");
  const countFlagged = document.getElementById("countFlagged");
  const countUnverified = document.getElementById("countUnverified");
  const pillAll = document.getElementById("pillAll");
  const pillFlagged = document.getElementById("pillFlagged");
  const pillReviewed = document.getElementById("pillReviewed");
  const pillUnverified = document.getElementById("pillUnverified");
  const pillUnclear = document.getElementById("pillUnclear");
  const btnNextFlagged = document.getElementById("btnNextFlagged");

  // Filter & Search
  const filterPills = document.querySelectorAll(".filter-pill");
  const searchInput = document.getElementById("transcriptSearch");

  // Modals
  const glossaryDialog = document.getElementById("glossaryDialog");
  const insightsDialog = document.getElementById("insightsDialog");
  const exportDialog = document.getElementById("exportDialog");

  let currentRecording = null;
  let segments = [];
  let currentFilter = "all";
  let searchQuery = "";
  let isVideo = false;

  // --- Toast Notification Helper ---
  function showToast(msg, isSuccess = true) {
    if (!wsToast) return;
    wsToast.style.display = "flex";
    wsToast.style.borderColor = isSuccess ? "#10b981" : "#f59e0b";
    wsToast.innerHTML = `<span>${isSuccess ? '✓' : 'ℹ'}</span> <span>${msg}</span>`;
    setTimeout(() => {
      wsToast.style.display = "none";
    }, 2800);
  }

  // --- Initial Data Load ---
  async function loadRecordingWorkspace() {
    try {
      const data = await api.request(`/recordings/${recordingId}`);
      currentRecording = data;
      segments = data.segments || [];

      projectTitle.textContent = data.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace("sample ", "").toUpperCase();
      recordingMeta.textContent = `${data.source_language} → ${data.target_language} • ${Math.round(data.duration_seconds)}s Audio • Trust Check Engine Active`;

      // Set initial duration readout immediately so it never shows 00:00 / 00:00
      const totalSec = Math.round(data.duration_seconds || 32);
      const dMin = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const dSec = String(Math.floor(totalSec % 60)).padStart(2, '0');
      timeDisplay.textContent = `00:00 / ${dMin}:${dSec}`;

      // Media URL
      const mediaUrl = `http://127.0.0.1:8000/stream-audio/${data.storage_filename}`;
      const ext = data.storage_filename.split(".").pop().toLowerCase();
      isVideo = ["mp4", "mov", "webm"].includes(ext);

      if (isVideo && video && videoContainer) {
        videoContainer.style.display = "block";
        video.src = mediaUrl;
      }
      audio.src = mediaUrl;

      updateStatsCounters();
      renderSegments();
    } catch (err) {
      segmentsContainer.innerHTML = `
        <div style="background:rgba(244, 63, 94, 0.1); border:1px solid #f43f5e; border-radius:12px; padding:24px; text-align:center;">
          <h3 style="color:#f43f5e; margin-bottom:8px;">Could not load interview</h3>
          <p style="color:#94a3b8; font-size:0.9rem;">${err.message}</p>
          <a href="index.html" class="btn-secondary" style="margin-top:16px; display:inline-block;">← Return to Home</a>
        </div>
      `;
    }
  }

  // --- Stats Counter Updater ---
  function updateStatsCounters() {
    const total = segments.length;
    const reviewed = segments.filter(s => s.review_status === "human_reviewed").length;
    const flagged = segments.filter(s => s.review_status === "review_suggested" || s.is_flagged).length;
    const unclear = segments.filter(s => s.review_status === "unclear").length;
    const unverified = segments.filter(s => s.review_status === "unverified").length;

    const pct = total ? Math.round((reviewed / total) * 100) : 0;
    countReviewed.textContent = `${reviewed} / ${total} (${pct}%)`;
    countFlagged.textContent = `${flagged} lines`;
    countUnverified.textContent = `${unverified} lines`;

    pillAll.textContent = total;
    pillFlagged.textContent = flagged;
    pillReviewed.textContent = reviewed;
    pillUnverified.textContent = unverified;
    pillUnclear.textContent = unclear;
  }

  // --- Render Segment Stream ---
  function renderSegments() {
    let filtered = segments;

    if (currentFilter !== "all") {
      filtered = filtered.filter(s => {
        if (currentFilter === "review_suggested") return s.review_status === "review_suggested" || s.is_flagged;
        return s.review_status === currentFilter;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.original_text && s.original_text.toLowerCase().includes(q)) ||
        (s.translated_text && s.translated_text.toLowerCase().includes(q)) ||
        (s.speaker_tag && s.speaker_tag.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      segmentsContainer.innerHTML = `
        <p style="color:var(--text-dim); text-align:center; padding:40px;">No segments match the current filter.</p>
      `;
      return;
    }

    segmentsContainer.innerHTML = filtered.map(seg => {
      const startM = String(Math.floor(seg.start_time / 60)).padStart(2, '0');
      const startS = String(Math.floor(seg.start_time % 60)).padStart(2, '0');
      const endM = String(Math.floor(seg.end_time / 60)).padStart(2, '0');
      const endS = String(Math.floor(seg.end_time % 60)).padStart(2, '0');

      let statusBadge = `<span class="badge badge-neutral">Unverified</span>`;
      let cardClass = "";

      if (seg.review_status === "human_reviewed") {
        statusBadge = `<span class="badge badge-success">✓ Human-Reviewed</span>`;
        cardClass = "human-reviewed";
      } else if (seg.review_status === "review_suggested" || seg.is_flagged) {
        statusBadge = `<span class="badge badge-warning">⚠ Review Suggested</span>`;
        cardClass = "review-suggested";
      } else if (seg.review_status === "unclear") {
        statusBadge = `<span class="badge badge-purple">? Unclear</span>`;
        cardClass = "unclear";
      }

      const matchPct = seg.comparison_score ? Math.round(seg.comparison_score * 100) : 100;
      const confPct = seg.confidence_score ? Math.round(seg.confidence_score * 100) : 95;

      return `
        <article class="ws-segment-card ${cardClass}" id="segCard_${seg.id}" data-id="${seg.id}" data-start="${seg.start_time}" data-end="${seg.end_time}">
          <div class="seg-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <button class="seg-time-btn" onclick="playSegmentAudio(${seg.start_time}, ${seg.end_time})">
                ▶ ${startM}:${startS} - ${endM}:${endS}
              </button>
              <input type="text" class="speaker-input" value="${seg.speaker_tag || 'Speaker'}" onchange="saveSpeaker(${seg.id}, this.value)" title="Click to rename speaker" />
              <span class="badge badge-info" style="font-size:0.72rem;">${seg.detected_language}</span>
              <span style="font-size:0.72rem; color:var(--text-dim);">${confPct}% Acoustic Confidence</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              ${statusBadge}
              <button class="btn-secondary btn-pill" style="font-size:0.75rem; padding:3px 8px;" onclick="toggleEngineComparison(${seg.id})">
                Compare Engines ▾
              </button>
            </div>
          </div>

          <!-- Dual Engine Comparison Accordion -->
          <div class="engine-comparison-drawer" id="compDrawer_${seg.id}" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:4px;">
              <span style="font-weight:600; color:#60a5fa; font-size:0.78rem;">Cross-Engine Acoustic Alignment</span>
              <span style="font-weight:600; color:${matchPct < 80 ? '#fbbf24' : '#34d399'}; font-size:0.78rem;">RapidFuzz Similarity: ${matchPct}%</span>
            </div>
            
            <div class="engine-diff-row">
              <span style="color:var(--text-dim); font-size:0.75rem;">Engine 1 (Primary):</span>
              <span style="color:#cbd5e1;">${seg.raw_engine1_text || seg.original_text}</span>
              <button class="btn-secondary btn-pill" style="padding:2px 8px; font-size:0.72rem;" onclick="adoptEngineText(${seg.id}, 'e1')">Use This</button>
            </div>
            <div class="engine-diff-row">
              <span style="color:var(--text-dim); font-size:0.75rem;">Engine 2 (Verification):</span>
              <span style="color:#cbd5e1;">${seg.raw_engine2_text || seg.original_text}</span>
              <button class="btn-secondary btn-pill" style="padding:2px 8px; font-size:0.72rem;" onclick="adoptEngineText(${seg.id}, 'e2')">Use This</button>
            </div>
          </div>

          <!-- Dual Column Editors -->
          <div class="seg-grid">
            <div class="seg-col">
              <label>Original Spoken Transcript (Regional / Code-Mixed / English)</label>
              <textarea class="seg-textarea" id="origText_${seg.id}" onblur="saveOriginalText(${seg.id}, this.value)">${seg.original_text}</textarea>
            </div>
            <div class="seg-col">
              <label>English Translation / Verified Text</label>
              <textarea class="seg-textarea" id="transText_${seg.id}" onblur="saveTranslatedText(${seg.id}, this.value)">${seg.translated_text || ''}</textarea>
            </div>
          </div>

          <!-- Segment Footer / Action Bar -->
          <div class="seg-footer">
            <div>
              ${seg.flag_reason ? `<span style="color:#fbbf24; font-size:0.78rem;">⚠ <b>Warning:</b> ${seg.flag_reason}</span>` : `<span style="color:var(--text-dim); font-size:0.75rem;">Acoustic alignment verified</span>`}
              ${seg.reviewed_at ? `<div style="color:#34d399; font-size:0.72rem; margin-top:2px;">✓ Verified by ${seg.reviewer_id || 'Researcher'}</div>` : ''}
            </div>

            <div class="review-action-btns">
              <button class="btn-action btn-verify" onclick="setSegmentStatus(${seg.id}, 'human_reviewed')" title="Mark as human verified">
                ✓ Mark Reviewed
              </button>
              <button class="btn-action btn-flag" onclick="setSegmentStatus(${seg.id}, 'review_suggested')" title="Flag for second listen">
                ⚠ Suggest Review
              </button>
              <button class="btn-action" onclick="setSegmentStatus(${seg.id}, 'unclear')" title="Mark acoustic ambiguity">
                ? Unclear
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // --- Audio / Video Playback Synchronization ---
  function getActivePlayer() {
    return (isVideo && video && !video.paused) ? video : audio;
  }

  window.playSegmentAudio = function(startSec, endSec) {
    audio.currentTime = startSec;
    if (isVideo && video) video.currentTime = startSec;

    audio.play().then(() => {
      playBtn.textContent = "⏸";
      if (isVideo && video) video.play().catch(() => {});
    }).catch(err => {
      // If audio fails on video format, try playing video directly
      if (isVideo && video) {
        video.play().then(() => { playBtn.textContent = "⏸"; }).catch(() => {});
      }
    });
  };

  playBtn.addEventListener("click", () => {
    const isPaused = audio.paused && (!video || video.paused);
    if (isPaused) {
      audio.play().then(() => {
        playBtn.textContent = "⏸";
        if (isVideo && video) video.play().catch(() => {});
      }).catch(() => {
        if (isVideo && video) {
          video.play().then(() => { playBtn.textContent = "⏸"; }).catch(() => {});
        }
      });
    } else {
      audio.pause();
      if (isVideo && video) video.pause();
      playBtn.textContent = "▶";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      playBtn.click();
    }
  });

  skipBackBtn.addEventListener("click", () => {
    const target = Math.max(0, audio.currentTime - 5);
    audio.currentTime = target;
    if (isVideo && video) video.currentTime = target;
  });

  skipFwdBtn.addEventListener("click", () => {
    const target = Math.min(audio.duration || (currentRecording ? currentRecording.duration_seconds : 9999), audio.currentTime + 5);
    audio.currentTime = target;
    if (isVideo && video) video.currentTime = target;
  });

  speedSelect.addEventListener("change", (e) => {
    const r = parseFloat(e.target.value);
    audio.playbackRate = r;
    if (isVideo && video) video.playbackRate = r;
  });

  function onMediaTimeUpdate(player) {
    const cur = player.currentTime;
    const dur = player.duration || (currentRecording ? currentRecording.duration_seconds : 32.0);
    fill.style.width = `${Math.min(100, (cur / dur) * 100)}%`;

    const cMin = String(Math.floor(cur / 60)).padStart(2, '0');
    const cSec = String(Math.floor(cur % 60)).padStart(2, '0');
    const dMin = String(Math.floor(dur / 60)).padStart(2, '0');
    const dSec = String(Math.floor(dur % 60)).padStart(2, '0');
    timeDisplay.textContent = `${cMin}:${cSec} / ${dMin}:${dSec}`;

    // Active segment highlighter
    segments.forEach(seg => {
      const el = document.getElementById(`segCard_${seg.id}`);
      if (!el) return;
      if (cur >= seg.start_time && cur <= seg.end_time) {
        if (!el.classList.contains("playing")) {
          document.querySelectorAll(".ws-segment-card.playing").forEach(c => c.classList.remove("playing"));
          el.classList.add("playing");
        }
      } else {
        el.classList.remove("playing");
      }
    });
  }

  audio.addEventListener("timeupdate", () => onMediaTimeUpdate(audio));
  if (video) video.addEventListener("timeupdate", () => onMediaTimeUpdate(video));

  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    fill.style.width = "0%";
  });

  track.addEventListener("click", (e) => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = audio.duration || (currentRecording ? currentRecording.duration_seconds : 32.0);
    const targetTime = ratio * dur;
    audio.currentTime = targetTime;
    if (isVideo && video) video.currentTime = targetTime;
  });

  // --- Inline Segment Updates ---
  window.saveOriginalText = async function(segId, val) {
    const seg = segments.find(s => s.id === segId);
    if (!seg || seg.original_text === val) return;
    seg.original_text = val;
    await api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({ original_text: val })
    });
    showToast("Transcript line saved");
  };

  window.saveTranslatedText = async function(segId, val) {
    const seg = segments.find(s => s.id === segId);
    if (!seg || seg.translated_text === val) return;
    seg.translated_text = val;
    await api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({ translated_text: val })
    });
    showToast("Translation saved");
  };

  window.saveSpeaker = async function(segId, val) {
    const seg = segments.find(s => s.id === segId);
    if (!seg || seg.speaker_tag === val) return;
    seg.speaker_tag = val;
    await api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({ speaker_tag: val })
    });
    showToast(`Speaker updated to "${val}"`);
  };

  window.setSegmentStatus = async function(segId, status) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    seg.review_status = status;
    if (status === "human_reviewed") {
      seg.is_flagged = false;
      seg.reviewer_id = api.getUser().full_name || "Researcher";
      seg.reviewed_at = new Date().toISOString();
      showToast("Segment marked as Human-Reviewed ✓");
    } else if (status === "review_suggested") {
      seg.is_flagged = true;
      showToast("Line flagged for review ⚠", false);
    } else if (status === "unclear") {
      showToast("Marked as unclear acoustic audio", false);
    }

    updateStatsCounters();
    renderSegments();

    await api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({
        review_status: status,
        reviewer_id: seg.reviewer_id
      })
    });
  };

  window.toggleEngineComparison = function(segId) {
    const drawer = document.getElementById(`compDrawer_${segId}`);
    if (drawer) {
      drawer.style.display = drawer.style.display === "none" ? "block" : "none";
    }
  };

  window.adoptEngineText = function(segId, engine) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    const text = engine === "e1" ? (seg.raw_engine1_text || seg.original_text) : (seg.raw_engine2_text || seg.original_text);
    const textarea = document.getElementById(`origText_${segId}`);
    if (textarea) textarea.value = text;
    saveOriginalText(segId, text);
    showToast("Applied engine variant text");
  };

  // --- Next Flagged Line Jumper ---
  btnNextFlagged.addEventListener("click", () => {
    const nextFlagged = segments.find(s => s.review_status === "review_suggested" || s.is_flagged);
    if (!nextFlagged) {
      showToast("All flagged lines have been reviewed! 🎉");
      return;
    }
    const card = document.getElementById(`segCard_${nextFlagged.id}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      playSegmentAudio(nextFlagged.start_time, nextFlagged.end_time);
    }
  });

  // --- Filter Pills & Search ---
  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.dataset.filter;
      renderSegments();
    });
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderSegments();
  });

  // --- Research Glossary ---
  document.getElementById("openGlossaryBtn").addEventListener("click", async () => {
    glossaryDialog.showModal();
    await loadGlossaryTable();
  });

  async function loadGlossaryTable() {
    const tbody = document.getElementById("glossaryTbody");
    try {
      const items = await api.request(`/projects/${currentRecording.project_id}/glossary`);
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:12px; text-align:center; color:var(--text-dim);">No glossary terms defined yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = items.map(item => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:8px 12px; font-weight:600; color:#60a5fa;">${item.term}</td>
          <td style="padding:8px 12px; color:var(--text-dim);">${item.category}</td>
          <td style="padding:8px 12px; color:var(--text-muted);">${item.description || ''}</td>
          <td style="padding:8px 12px; text-align:right;">
            <button onclick="deleteGlossaryItem(${item.id})" style="background:transparent; border:none; color:#f43f5e; cursor:pointer;">×</button>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.log("Glossary load notice:", err);
    }
  }

  document.getElementById("newGlossaryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = document.getElementById("newGlossaryTerm").value.trim();
    const category = document.getElementById("newGlossaryCat").value;
    const description = document.getElementById("newGlossaryDesc").value.trim();

    try {
      await api.request(`/projects/${currentRecording.project_id}/glossary`, {
        method: "POST",
        body: JSON.stringify({ term, category, description })
      });
      document.getElementById("newGlossaryForm").reset();
      await loadGlossaryTable();
      showToast(`Added "${term}" to project glossary`);
    } catch (err) {
      alert("Error adding glossary term: " + err.message);
    }
  });

  window.deleteGlossaryItem = async function(id) {
    await api.request(`/projects/${currentRecording.project_id}/glossary/${id}`, { method: "DELETE" });
    await loadGlossaryTable();
    showToast("Glossary term removed");
  };

  document.getElementById("applyGlossaryBtn").addEventListener("click", async () => {
    const feedback = document.getElementById("glossaryFeedback");
    feedback.textContent = "Applying approved glossary to transcript...";
    try {
      const res = await api.request(`/recordings/${recordingId}/glossary/apply`, { method: "POST" });
      feedback.textContent = `Applied! Standardized ${res.standardized_replacements} misspellings across transcript.`;
      await loadRecordingWorkspace();
      showToast(`Standardized ${res.standardized_replacements} terms across transcript`);
    } catch (err) {
      feedback.textContent = `Standardization error: ${err.message}`;
    }
  });

  // --- Insights & Summary Modal ---
  document.getElementById("openInsightsBtn").addEventListener("click", async () => {
    insightsDialog.showModal();
    const summaryEl = document.getElementById("dialogSummaryText");
    const listEl = document.getElementById("dialogInsightsList");

    summaryEl.textContent = currentRecording.summary || "Synthesizing executive summary for interview...";

    try {
      const insights = await api.request(`/recordings/${recordingId}/insights`);
      if (insights.length === 0) {
        listEl.innerHTML = `<p style="color:var(--text-dim);">No insights generated yet.</p>`;
        return;
      }
      listEl.innerHTML = insights.map(ins => `
        <div style="background:#111827; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <b style="color:#60a5fa; font-size:0.85rem;">[${ins.category}] ${ins.title}</b>
            ${ins.linked_timestamp ? `<button class="seg-time-btn" onclick="insightsDialog.close(); playSegmentAudio(${ins.linked_timestamp}, ${ins.linked_timestamp + 6});">▶ Jump to ${Math.round(ins.linked_timestamp)}s</button>` : ''}
          </div>
          <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.5;">${ins.content}</p>
        </div>
      `).join("");
    } catch (err) {
      console.log("Insights error:", err);
    }
  });

  // --- Export Modal & Downloads ---
  document.getElementById("openExportBtn").addEventListener("click", () => {
    exportDialog.showModal();
  });

  window.downloadExport = function(format) {
    const url = `http://127.0.0.1:8000/api/recordings/${recordingId}/export/${format}`;
    window.open(url, "_blank");
    showToast(`Downloading .${format} report...`);
    exportDialog.close();
  };

  // Launch initial fetch
  loadRecordingWorkspace();
});
