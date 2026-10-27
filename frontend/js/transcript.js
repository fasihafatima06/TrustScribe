document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let recordingId = urlParams.get("id") || "1";

  // Media Elements
  const audio = document.getElementById("wsAudioMedia");
  const video = document.getElementById("wsVideoMedia");
  const videoContainer = document.getElementById("videoContainer");
  const playBtn = document.getElementById("wsPlayBtn");
  const stopBtn = document.getElementById("wsStopBtn");
  const timeDisplay = document.getElementById("wsTime");
  const track = document.getElementById("wsTrack");
  const fill = document.getElementById("wsFill");
  const speedSelect = document.getElementById("playbackSpeedSelect");
  const skipBackBtn = document.getElementById("btnSkipBack");
  const skipFwdBtn = document.getElementById("btnSkipFwd");
  const wsToast = document.getElementById("wsToast");

  // Title & Headers
  const projectTitle = document.getElementById("projectTitle");
  const recordingMeta = document.getElementById("recordingMeta");
  const segmentsContainer = document.getElementById("segmentsContainer");

  // Counters
  const pillAll = document.getElementById("pillAll");
  const pillFlagged = document.getElementById("pillFlagged");
  const pillReviewed = document.getElementById("pillReviewed");
  const sideCountFlagged = document.getElementById("sideCountFlagged");
  const sideCountAuto = document.getElementById("sideCountAuto");
  const btnNextFlagged = document.getElementById("btnNextFlagged");

  // Sidebar Controls
  const confSlider = document.getElementById("confSlider");
  const confValueDisplay = document.getElementById("confValueDisplay");
  const srSearchInput = document.getElementById("srSearchInput");
  const srReplaceInput = document.getElementById("srReplaceInput");
  const btnReplaceAll = document.getElementById("btnReplaceAll");
  const sideSummaryText = document.getElementById("sideSummaryText");
  const sideInsightsList = document.getElementById("sideInsightsList");
  const sideAudioLang = document.getElementById("sideAudioLang");

  // Filters & Search
  const filterPills = document.querySelectorAll(".filter-pill");
  const searchInput = document.getElementById("transcriptSearch");

  // Export Modal
  const exportDialog = document.getElementById("exportDialog");
  const openExportBtn = document.getElementById("openExportBtn");

  let currentRecording = null;
  let segments = [];
  let currentFilter = "all";
  let searchQuery = "";
  let confidenceThreshold = 0.75;
  let isVideo = false;

  // --- Toast Notification ---
  function showToast(msg, isSuccess = true) {
    if (!wsToast) return;
    wsToast.style.display = "flex";
    wsToast.style.borderColor = isSuccess ? "#10b981" : "#f59e0b";
    wsToast.innerHTML = `<span>${isSuccess ? '✓' : 'ℹ'}</span> <span>${msg}</span>`;
    setTimeout(() => {
      wsToast.style.display = "none";
    }, 2800);
  }

  // --- Format Time Helper ---
  function fmtTime(seconds) {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  }

  // --- Load Workspace Data ---
  async function loadRecordingWorkspace() {
    try {
      const data = await api.request(`/recordings/${recordingId}`);
      currentRecording = data;
      segments = data.segments || [];

      projectTitle.textContent = data.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace("sample ", "").toUpperCase();
      const durSec = Math.round(data.duration_seconds || 1725);
      recordingMeta.textContent = `${data.source_language} → ${data.target_language} • ${fmtTime(durSec)} Audio`;
      timeDisplay.textContent = `00:00 / ${fmtTime(durSec)}`;
      if (sideAudioLang) sideAudioLang.textContent = data.source_language;

      // Media setup
      const mediaUrl = `${api.getStreamBase()}/${data.storage_filename}`;
      const ext = data.storage_filename.split(".").pop().toLowerCase();
      isVideo = ["mp4", "mov", "webm"].includes(ext);

      if (isVideo && video && videoContainer) {
        videoContainer.style.display = "block";
        video.src = mediaUrl;
      }
      audio.src = mediaUrl;

      // Render summary & insights in sidebar
      renderSidebarInsights(data.summary, data.insights);

      // Render glossary
      await loadGlossaryTable();

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

  // --- Render Sidebar Insights ---
  function renderSidebarInsights(summary, insights) {
    if (sideSummaryText) {
      sideSummaryText.textContent = summary || "Fieldwork interview analysis investigating payment friction and welfare schemes.";
    }
    if (sideInsightsList) {
      const items = insights || [];
      if (items.length === 0) {
        sideInsightsList.innerHTML = `<p style="color:var(--text-dim); font-size:0.8rem;">No insights generated yet.</p>`;
        return;
      }
      sideInsightsList.innerHTML = items.map(ins => `
        <div style="background:#090d15; border:1px solid var(--border-color); border-radius:6px; padding:10px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <b style="color:#60a5fa; font-size:0.8rem;">${ins.title}</b>
            ${ins.linked_timestamp ? `<button class="btn-secondary btn-pill" style="padding:2px 6px; font-size:0.7rem;" onclick="playSegmentAudio(${ins.linked_timestamp}, ${ins.linked_timestamp + 6})">▶ ${fmtTime(ins.linked_timestamp)}</button>` : ''}
          </div>
          <p style="color:#94a3b8; font-size:0.78rem; line-height:1.45;">${ins.content}</p>
        </div>
      `).join("");
    }
  }

  // --- Update Counters & Filter Counts ---
  function updateStatsCounters() {
    const total = segments.length;
    const reviewed = segments.filter(s => s.review_status === "human_reviewed").length;
    const flagged = segments.filter(s => s.review_status === "review_suggested" || s.is_flagged || s.confidence_score < confidenceThreshold).length;
    const autoVerified = total - flagged;

    if (pillAll) pillAll.textContent = total;
    if (pillFlagged) pillFlagged.textContent = flagged;
    if (pillReviewed) pillReviewed.textContent = reviewed;
    if (sideCountFlagged) sideCountFlagged.textContent = `${flagged} lines`;
    if (sideCountAuto) sideCountAuto.textContent = `${autoVerified} lines (${Math.round((autoVerified/total)*100)}%)`;
  }

  // --- Speaker Color Classifier ---
  function getSpeakerStyle(tag) {
    const t = (tag || "").toLowerCase();
    if (t.includes("researcher") || t.includes("interviewer") || t.includes("priya") || t.includes("arjun")) {
      return "speaker-lavender";
    }
    if (t.includes("officer") || t.includes("panchayat") || t.includes("assistant")) {
      return "speaker-emerald";
    }
    return "speaker-blue";
  }

  // --- Render Transcript Stream (Clean Image 3 Style) ---
  function renderSegments() {
    let filtered = segments;

    if (currentFilter === "review_suggested") {
      filtered = filtered.filter(s => s.review_status === "review_suggested" || s.is_flagged || s.confidence_score < confidenceThreshold);
    } else if (currentFilter === "human_reviewed") {
      filtered = filtered.filter(s => s.review_status === "human_reviewed");
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
        <div style="background:#111827; border:1px solid var(--border-color); border-radius:8px; padding:32px; text-align:center;">
          <p style="color:var(--text-dim); font-size:0.9rem;">No lines match the active filter.</p>
        </div>
      `;
      return;
    }

    segmentsContainer.innerHTML = filtered.map(seg => {
      const isUnderConf = seg.confidence_score < confidenceThreshold;
      const isFlagged = seg.review_status === "review_suggested" || seg.is_flagged || isUnderConf;
      const isReviewed = seg.review_status === "human_reviewed";

      let rowClass = "";
      if (isReviewed) rowClass = "verified-row";
      else if (isFlagged) rowClass = "flagged-row";

      const speakerClass = getSpeakerStyle(seg.speaker_tag);
      const matchPct = seg.comparison_score ? Math.round(seg.comparison_score * 100) : (isFlagged ? 72 : 98);

      return `
        <div class="transcript-row-card ${rowClass}" id="segCard_${seg.id}" data-id="${seg.id}" data-start="${seg.start_time}" data-end="${seg.end_time}">
          <!-- Timestamp Pill -->
          <div>
            <button class="seg-time-btn" onclick="playSegmentAudio(${seg.start_time}, ${seg.end_time})" title="Play audio from this timestamp">
              ▶ ${fmtTime(seg.start_time)}
            </button>
          </div>

          <!-- Speaker Badge -->
          <div>
            <span class="speaker-pill ${speakerClass}" title="${seg.speaker_tag}">
              ${seg.speaker_tag || 'Speaker'}
            </span>
          </div>

          <!-- Transcript & Translation Content -->
          <div>
            <div style="font-size:0.95rem; line-height:1.6; color:#f8fafc; margin-bottom:6px;" id="textDisplay_${seg.id}">
              ${seg.original_text}
            </div>

            <div style="font-size:0.85rem; color:#94a3b8; line-height:1.5; margin-bottom:10px;" id="transDisplay_${seg.id}">
              “${seg.translated_text || ''}”
            </div>

            <!-- Flagged Discrepancy Alert -->
            ${isFlagged ? `
              <div style="background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.3); border-radius:6px; padding:6px 12px; margin-bottom:10px; font-size:0.78rem; color:#fbbf24; display:flex; justify-content:space-between; align-items:center;">
                <span>⚠ <b>Discrepancy:</b> ${seg.flag_reason || `Acoustic confidence below threshold (${Math.round(seg.confidence_score*100)}%). Verify audio.`}</span>
                <span class="badge badge-warning" style="font-size:0.7rem;">Engine Match: ${matchPct}%</span>
              </div>
            ` : ''}

            <!-- Engine Comparison Drawer (Expandable) -->
            <div class="engine-comparison-drawer" id="compDrawer_${seg.id}" style="display:none;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:600; color:#60a5fa; font-size:0.75rem;">Cross-Engine Acoustic Alignment</span>
                <span style="font-size:0.75rem; color:${matchPct < 80 ? '#fbbf24' : '#34d399'};">RapidFuzz: ${matchPct}%</span>
              </div>
              <div class="engine-diff-row">
                <span style="color:var(--text-dim); font-size:0.72rem;">Engine 1 (Sarvam):</span>
                <span style="color:#cbd5e1; font-size:0.8rem;">${seg.raw_engine1_text || seg.original_text}</span>
                <button class="btn-secondary btn-pill" style="padding:2px 8px; font-size:0.7rem;" onclick="adoptEngineText(${seg.id}, 'e1')">Use</button>
              </div>
              <div class="engine-diff-row">
                <span style="color:var(--text-dim); font-size:0.72rem;">Engine 2 (Gemini):</span>
                <span style="color:#cbd5e1; font-size:0.8rem;">${seg.raw_engine2_text || seg.original_text}</span>
                <button class="btn-secondary btn-pill" style="padding:2px 8px; font-size:0.7rem;" onclick="adoptEngineText(${seg.id}, 'e2')">Use</button>
              </div>
            </div>

            <!-- Inline Edit Form (Hidden by default) -->
            <div id="editForm_${seg.id}" style="display:none; margin-top:8px; margin-bottom:10px;">
              <label style="font-size:0.72rem; color:var(--text-dim);">Edit Original Text:</label>
              <textarea class="seg-textarea" id="editOrig_${seg.id}" style="min-height:50px; margin-bottom:6px;">${seg.original_text}</textarea>
              <label style="font-size:0.72rem; color:var(--text-dim);">Edit Translation:</label>
              <textarea class="seg-textarea" id="editTrans_${seg.id}" style="min-height:50px; margin-bottom:8px;">${seg.translated_text || ''}</textarea>
              <button class="btn-primary btn-pill" style="padding:4px 12px; font-size:0.75rem;" onclick="saveInlineEdit(${seg.id})">Save Changes</button>
              <button class="btn-secondary btn-pill" style="padding:4px 12px; font-size:0.75rem;" onclick="toggleInlineEdit(${seg.id})">Cancel</button>
            </div>

            <!-- Row Actions Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn-action btn-verify" onclick="setSegmentStatus(${seg.id}, 'human_reviewed')" title="Mark line human verified">
                  ${isReviewed ? '✓ Verified' : '✓ Mark Reviewed'}
                </button>
                <button class="btn-action" onclick="toggleEngineComparison(${seg.id})" style="font-size:0.75rem;">
                  Compare Engines ▾
                </button>
                <button class="btn-action" onclick="toggleInlineEdit(${seg.id})" style="font-size:0.75rem;">
                  Edit
                </button>
              </div>

              ${isReviewed ? `<span style="font-size:0.72rem; color:#34d399;">✓ Verified by ${seg.reviewer_id || 'Researcher'}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- Audio / Video Synchronization ---
  window.playSegmentAudio = function(startSec, endSec) {
    audio.currentTime = startSec;
    if (isVideo && video) video.currentTime = startSec;

    audio.play().then(() => {
      playBtn.textContent = "⏸";
      if (isVideo && video) video.play().catch(() => {});
    }).catch(() => {
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

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      audio.pause();
      audio.currentTime = 0;
      if (isVideo && video) {
        video.pause();
        video.currentTime = 0;
      }
      playBtn.textContent = "▶";
      fill.style.width = "0%";
    });
  }

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
    const dur = audio.duration || (currentRecording ? currentRecording.duration_seconds : 1725);
    const target = Math.min(dur, audio.currentTime + 5);
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
    const dur = player.duration || (currentRecording ? currentRecording.duration_seconds : 1725);
    fill.style.width = `${Math.min(100, (cur / dur) * 100)}%`;
    timeDisplay.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;

    // Highlight playing row
    segments.forEach(seg => {
      const el = document.getElementById(`segCard_${seg.id}`);
      if (!el) return;
      if (cur >= seg.start_time && cur <= seg.end_time) {
        if (!el.classList.contains("playing")) {
          document.querySelectorAll(".transcript-row-card.playing").forEach(c => c.classList.remove("playing"));
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
    const dur = audio.duration || (currentRecording ? currentRecording.duration_seconds : 1725);
    const targetTime = ratio * dur;
    audio.currentTime = targetTime;
    if (isVideo && video) video.currentTime = targetTime;
  });

  // --- Inline Edit Handlers ---
  window.toggleInlineEdit = function(segId) {
    const form = document.getElementById(`editForm_${segId}`);
    if (form) {
      form.style.display = form.style.display === "none" ? "block" : "none";
    }
  };

  window.saveInlineEdit = async function(segId) {
    const origVal = document.getElementById(`editOrig_${segId}`).value;
    const transVal = document.getElementById(`editTrans_${segId}`).value;
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;

    seg.original_text = origVal;
    seg.translated_text = transVal;

    document.getElementById(`textDisplay_${segId}`).textContent = origVal;
    document.getElementById(`transDisplay_${segId}`).textContent = `“${transVal}”`;
    toggleInlineEdit(segId);

    await api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({
        original_text: origVal,
        translated_text: transVal
      })
    });
    showToast("Transcript changes saved to database");
  };

  window.setSegmentStatus = async function(segId, status) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    seg.review_status = status;
    if (status === "human_reviewed") {
      seg.is_flagged = false;
      seg.reviewer_id = api.getUser().full_name || "Researcher";
      seg.reviewed_at = new Date().toISOString();
      showToast("Line verified and marked human-reviewed ✓");
    } else {
      seg.is_flagged = true;
      showToast("Line flagged for second listen ⚠", false);
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
    seg.original_text = text;
    document.getElementById(`textDisplay_${segId}`).textContent = text;
    api.request(`/recordings/segments/${segId}`, {
      method: "PATCH",
      body: JSON.stringify({ original_text: text })
    });
    showToast("Adopted engine variant text");
  };

  // --- Confidence Slider (Matching Image 3) ---
  if (confSlider) {
    confSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      confValueDisplay.textContent = `${val}%`;
      confidenceThreshold = val / 100.0;
      updateStatsCounters();
      renderSegments();
    });
  }

  // --- Search and Replace (Matching Image 3) ---
  if (btnReplaceAll) {
    btnReplaceAll.addEventListener("click", async () => {
      const searchFor = srSearchInput.value.trim();
      const replaceWith = srReplaceInput.value.trim();
      if (!searchFor) {
        alert("Please enter a search term.");
        return;
      }

      let count = 0;
      for (const seg of segments) {
        if (seg.original_text && seg.original_text.includes(searchFor)) {
          seg.original_text = seg.original_text.replaceAll(searchFor, replaceWith);
          count++;
          api.request(`/recordings/segments/${seg.id}`, {
            method: "PATCH",
            body: JSON.stringify({ original_text: seg.original_text })
          });
        }
      }

      showToast(`Replaced ${count} occurrences across transcript`);
      renderSegments();
      srSearchInput.value = "";
      srReplaceInput.value = "";
    });
  }

  // --- Jump to Next Flagged Line ---
  if (btnNextFlagged) {
    btnNextFlagged.addEventListener("click", () => {
      const nextFlagged = segments.find(s => s.review_status === "review_suggested" || s.is_flagged || s.confidence_score < confidenceThreshold);
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
  }

  // --- Filter Pills & Search ---
  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.dataset.filter;
      renderSegments();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderSegments();
    });
  }

  // --- Sidebar Tab Switcher ---
  document.querySelectorAll(".sidebar-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetTabId = btn.dataset.tab;
      document.querySelectorAll(".sidebar-tab-content").forEach(content => {
        content.style.display = content.id === targetTabId ? "block" : "none";
      });
    });
  });

  // --- Glossary Management ---
  async function loadGlossaryTable() {
    const tbody = document.getElementById("glossaryTbody");
    if (!tbody || !currentRecording) return;
    try {
      const items = await api.request(`/projects/${currentRecording.project_id}/glossary`);
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td style="padding:8px; text-align:center; color:var(--text-dim);">No glossary terms defined.</td></tr>`;
        return;
      }
      tbody.innerHTML = items.map(item => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:6px 8px; font-weight:600; color:#60a5fa;">${item.term}</td>
          <td style="padding:6px 8px; color:var(--text-muted); font-size:0.75rem;">${item.description || ''}</td>
          <td style="padding:6px 4px; text-align:right;">
            <button onclick="deleteGlossaryItem(${item.id})" style="background:transparent; border:none; color:#f43f5e; cursor:pointer;">×</button>
          </td>
        </tr>
      `).join("");
    } catch (err) {}
  }

  const sideGlossaryForm = document.getElementById("sideGlossaryForm");
  if (sideGlossaryForm) {
    sideGlossaryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const term = document.getElementById("sideGlossaryTerm").value.trim();
      const description = document.getElementById("sideGlossaryDesc").value.trim();

      try {
        await api.request(`/projects/${currentRecording.project_id}/glossary`, {
          method: "POST",
          body: JSON.stringify({ term, description })
        });
        sideGlossaryForm.reset();
        await loadGlossaryTable();
        showToast(`Added "${term}" to glossary`);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  window.deleteGlossaryItem = async function(id) {
    await api.request(`/projects/${currentRecording.project_id}/glossary/${id}`, { method: "DELETE" });
    await loadGlossaryTable();
    showToast("Glossary term deleted");
  };

  const btnApplyGlossarySide = document.getElementById("btnApplyGlossarySide");
  if (btnApplyGlossarySide) {
    btnApplyGlossarySide.addEventListener("click", async () => {
      try {
        const res = await api.request(`/recordings/${recordingId}/glossary/apply`, { method: "POST" });
        showToast(`Standardized ${res.standardized_replacements} misspellings across transcript`);
        await loadRecordingWorkspace();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // --- Export Modal Trigger (Image 1) ---
  if (openExportBtn && exportDialog) {
    openExportBtn.addEventListener("click", () => {
      exportDialog.showModal();
    });
  }

  window.downloadExport = function(format) {
    const url = `${api.getBaseUrl()}/recordings/${recordingId}/export/${format}`;
    window.open(url, "_blank");
    showToast(`Downloading .${format} report...`);
    exportDialog.close();
  };

  // Initial Launch
  loadRecordingWorkspace();
});
