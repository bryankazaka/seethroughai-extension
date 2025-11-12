// Settings Page - Simplified
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  setupTabs();
  setupButtons();
});

async function loadSettings() {
  const result = await chrome.storage.local.get(["settings"]);
  const settings = result.settings || {autoDetect: true, showBadges: true, enableNotifications: false, theme: "auto"};
  
  const autoDetect = document.getElementById("autoDetect");
  const showBadges = document.getElementById("showBadges");
  const enableNotifications = document.getElementById("enableNotifications");
  const theme = document.getElementById("theme");
  
  if (autoDetect) autoDetect.checked = settings.autoDetect;
  if (showBadges) showBadges.checked = settings.showBadges;
  if (enableNotifications) enableNotifications.checked = settings.enableNotifications;
  if (theme) theme.value = settings.theme;
  
  [autoDetect, showBadges, enableNotifications, theme].forEach(el => {
    if (el) el.addEventListener("change", saveSettings);
  });
}

async function saveSettings() {
  const settings = {
    autoDetect: document.getElementById("autoDetect")?.checked || true,
    showBadges: document.getElementById("showBadges")?.checked || true,
    enableNotifications: document.getElementById("enableNotifications")?.checked || false,
    theme: document.getElementById("theme")?.value || "auto"
  };
  await chrome.storage.local.set({settings});
  alert("Settings saved!");
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab + "-tab")?.classList.add("active");
    });
  });
}

function setupButtons() {
  const clearCache = document.getElementById("clearCache");
  const clearHistory = document.getElementById("clearHistory");
  const exportData = document.getElementById("exportData");
  
  if (clearCache) {
    clearCache.addEventListener("click", async () => {
      if (confirm("Clear all data?")) {
        await chrome.storage.local.clear();
        alert("Cache cleared!");
      }
    });
  }
  
  if (clearHistory) {
    clearHistory.addEventListener("click", async () => {
      if (confirm("Delete history?")) {
        await chrome.storage.local.set({scanHistory: []});
        alert("History cleared!");
      }
    });
  }
  
  if (exportData) {
    exportData.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(null);
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seethroughai-data.json";
      a.click();
    });
  }
}
