// Popup script for SeeThroughAI Extension
// This runs in the popup window, not as a content script

document.addEventListener('DOMContentLoaded', async () => {
  // Check if this is first run and seed demo data
  try {
    const { scanHistory } = await chrome.storage.local.get(['scanHistory']);
    if (!scanHistory || scanHistory.length === 0) {
      if (window.seedDemoData) {
        await window.seedDemoData();
      }
    }
  } catch (error) {
    console.error('Failed to seed demo data:', error);
  }
  
  // Check model status
  await checkModelStatus();
  
  // Load statistics
  await loadStats();
  
  // Load recent scans
  await loadRecentScans();
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Scan current page button
  document.getElementById('scanPageBtn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        alert('⚠️ Cannot scan this tab');
        return;
      }
      
      // Check if it's a restricted page
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        alert('⚠️ Cannot scan browser internal pages\n\nPlease navigate to a regular website.');
        return;
      }
      
      // Show feedback immediately
      const btn = document.getElementById('scanPageBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg> Scanning...';
      btn.disabled = true;
      
      // Try to send message first, if it fails, inject the content script
      chrome.tabs.sendMessage(tab.id, { action: 'scanPageImages' }, async (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it
          console.log('Content script not found, injecting...');
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content/content-script.js']
            });
            
            // Inject CSS too
            await chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['styles/content.css']
            });
            
            // Wait a moment for script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try again
            chrome.tabs.sendMessage(tab.id, { action: 'scanPageImages' }, (response) => {
              handleScanResponse(response, btn, originalText);
            });
          } catch (injectError) {
            console.error('Failed to inject content script:', injectError);
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('❌ Failed to load scanner.\n\nError: ' + injectError.message);
          }
        } else {
          handleScanResponse(response, btn, originalText);
        }
      });
      
    } catch (error) {
      console.error('Failed to scan page:', error);
      alert('❌ Could not scan this page: ' + error.message);
    }
  });
  
  function handleScanResponse(response, btn, originalText) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    
    if (response && response.success) {
      const imageCount = response.count || 0;
      
      if (imageCount === 0) {
        alert('ℹ️ No suitable images found on this page.\n\nTip: Make sure images are loaded and visible (min 100x100px).');
      } else {
        alert(`✅ Page scanned successfully!\n\n🖼️ Found ${imageCount} image${imageCount > 1 ? 's' : ''} to analyze.\n\n📊 Results will appear in your scan history shortly.\n💡 Model will load on first analysis (may take a moment).`);
      }
      
      // Reload stats after scan
      setTimeout(() => {
        loadStats();
        loadRecentScans();
      }, 1500);
    } else {
      const errorMsg = response && response.error ? response.error : 'Unknown error';
      alert(`❌ Scan failed: ${errorMsg}\n\nTry refreshing the page and scanning again.`);
    }
  }
  
  // Capture area button
  document.getElementById('captureBtn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        alert('⚠️ Cannot capture this tab');
        return;
      }
      
      // Check if it's a restricted page
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        alert('⚠️ Cannot capture browser internal pages\n\nPlease navigate to a regular website.');
        return;
      }
      
      // Inject the capture UI
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/capture-ui.js']
      });
      
      // Close the popup
      window.close();
      
    } catch (error) {
      console.error('Capture failed:', error);
      alert('❌ Capture failed: ' + error.message);
    }
  });
  
  // Record screen button - actually use desktop capture
  document.getElementById('recordBtn').addEventListener('click', async () => {
    try {
      // Request desktop capture
      const streamId = await new Promise((resolve, reject) => {
        chrome.desktopCapture.chooseDesktopMedia(
          ['screen', 'window', 'tab'],
          (streamId) => {
            if (!streamId) {
              reject(new Error('User cancelled screen capture'));
            } else {
              resolve(streamId);
            }
          }
        );
      });
      
      alert('🎥 Screen Recording\n\nStream ID obtained: ' + streamId + '\n\nFull video recording feature coming soon!\nFor now, use "Capture Area" for screenshots.');
      
    } catch (error) {
      console.error('Desktop capture failed:', error);
      alert('❌ Screen recording failed: ' + error.message);
    }
  });
  
  // Settings button - correct path for bundled extension
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/settings.html') });
  });
  
  // Profile button - opens login or profile based on auth status
  document.getElementById('profileBtn').addEventListener('click', async () => {
    const { user } = await chrome.storage.local.get(['user']);
    if (user && user.loggedIn) {
      // Logged in - show profile/logout options
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/admin.html') + '?tab=profile' });
    } else {
      // Not logged in - show login page
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/login.html') });
    }
  });
  
  // Dashboard link - admin only
  document.getElementById('dashboardLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const { user } = await chrome.storage.local.get(['user']);
    if (user && user.loggedIn && user.role === 'admin') {
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/admin.html') });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/login.html') });
    }
  });
  
  // History link - requires login
  document.getElementById('historyLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const { user } = await chrome.storage.local.get(['user']);
    if (user && user.loggedIn) {
      // Always open history view for logged-in users (admin or regular)
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/admin.html') + '?tab=history' });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup/login.html') });
    }
  });
}

async function checkModelStatus() {
  const statusBar = document.getElementById('modelStatus');
  const statusText = document.getElementById('statusText');
  
  if (!statusBar || !statusText) {
    console.warn('Model status elements not found in popup');
    return;
  }
  
  try {
    // Check if model has ever been loaded
    const { modelLoaded, modelLastLoaded } = await chrome.storage.local.get(['modelLoaded', 'modelLastLoaded']);
    
    // Brief UX delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    statusBar.classList.remove('loading');
    
    if (modelLoaded) {
      statusBar.classList.add('ready');
      const lastLoaded = modelLastLoaded ? new Date(modelLastLoaded).toLocaleString() : 'recently';
      statusText.textContent = '✅ ML Model Ready';
      statusText.title = `Last loaded: ${lastLoaded}`;
    } else {
      statusBar.classList.add('warning');
      statusText.textContent = '💤 Model loads on first use';
      statusText.title = 'The ML model will download and load when you perform your first scan';
    }
  } catch (error) {
    console.error('Failed to check model status:', error);
    if (statusBar) statusBar.classList.remove('loading');
    if (statusBar) statusBar.classList.add('ready');
    if (statusText) statusText.textContent = '✓ Extension ready';
  }
}

async function loadStats() {
  try {
    // Get stats from local storage
    const { scanHistory } = await chrome.storage.local.get(['scanHistory']);
    
    const totalScans = scanHistory?.length || 0;
    
    // Count AI-detected images (look for result object with high aiScore)
    const aiDetected = scanHistory?.filter(scan => {
      if (scan.result && typeof scan.result === 'object') {
        return scan.result.aiScore > 50 || scan.result.label === 'AI-Generated';
      }
      return scan.result === 'ai';
    }).length || 0;
    
    document.getElementById('totalScans').textContent = totalScans;
    
    const aiPercentage = totalScans > 0 
      ? Math.round((aiDetected / totalScans) * 100)
      : 0;
    
    document.getElementById('aiPercent').textContent = `${aiPercentage}%`;
  } catch (error) {
    console.error('Failed to load stats:', error);
    document.getElementById('totalScans').textContent = '0';
    document.getElementById('aiPercent').textContent = '0%';
  }
}

async function loadRecentScans() {
  try {
    const { scanHistory } = await chrome.storage.local.get(['scanHistory']);
    const resultsList = document.getElementById('resultsList');
    
    if (!scanHistory || scanHistory.length === 0) {
      return; // Empty state already shown in HTML
    }
    
    // Clear empty state
    resultsList.innerHTML = '';
    
    // Show only last 5 scans
    const recentScans = scanHistory.slice(0, 5);
    
    recentScans.forEach(scan => {
      const item = createResultItem(scan);
      resultsList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load recent scans:', error);
  }
}

function createResultItem(scan) {
  const div = document.createElement('div');
  div.className = 'result-item';
  
  const timeAgo = getTimeAgo(scan.timestamp);
  
  // Handle different result formats
  let emoji, label, confidence, resultClass;
  
  if (scan.result && typeof scan.result === 'object') {
    // New format from ML inference
    emoji = scan.result.emoji || '🔍';
    label = scan.result.label || 'Unknown';
    confidence = scan.result.aiScore?.toFixed(1) || scan.result.confidence || 0;
    resultClass = scan.result.aiScore > 50 ? 'ai' : 'human';
  } else {
    // Legacy format
    emoji = scan.result === 'ai' ? '⚠️' : '✓';
    label = (scan.result || 'unknown').toUpperCase();
    confidence = scan.confidence || 0;
    resultClass = scan.result || 'unknown';
  }
  
  div.innerHTML = `
    <img src="${scan.imageUrl || scan.image}" 
         class="result-thumbnail" 
         alt="Scanned image" 
         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Crect fill=\\'%23e9ecef\\' width=\\'100\\' height=\\'100\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23868e96\\' font-size=\\'12\\'%3ENo Image%3C/text%3E%3C/svg%3E'">
    <div class="result-details">
      <div class="result-badge ${resultClass}">
        ${emoji} ${label}
      </div>
      <div class="result-confidence">${confidence}% confidence</div>
      <div class="result-time">${timeAgo}</div>
    </div>
  `;
  
  div.addEventListener('click', () => {
    // Open admin dashboard to see full details
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('extension/popup/admin.html')
    });
  });
  
  return div;
}

function getTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}