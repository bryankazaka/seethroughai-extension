// Popup script for SeeThroughAI Extension

document.addEventListener('DOMContentLoaded', async () => {
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to find images
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: findImagesOnPage
      });
    } catch (error) {
      console.error('Failed to scan page:', error);
      alert('Could not scan this page. Some pages (like chrome:// URLs) cannot be scanned.');
    }
  });
  
  // Capture area button
  document.getElementById('captureBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({ action: 'captureArea', tabId: tab.id });
    window.close();
  });
  
  // Record screen button
  document.getElementById('recordBtn').addEventListener('click', () => {
    alert('Screen recording feature coming soon!\\n\\nThis will allow you to record your screen and analyze multiple images in a video.');
  });
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    // TODO: options.html
    alert('Settings coming soon!\n\nYou will be able to configure:\n- Auto-sync preferences\n- Model quality settings\n- Privacy controls\n- Keyboard shortcuts');
  });
  
  // Profile button
  document.getElementById('profileBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://127.0.0.1:3000/web-extension/seethroughai/web/home.html' });
  });
  
  // Dashboard link
  document.getElementById('dashboardLink').addEventListener('click', (e) => {
    e.preventDefault();
  chrome.tabs.create({ url: 'http://127.0.0.1:3000/web-extension/seethroughai/web/home.html' });
  });
  
  // History link
  document.getElementById('historyLink').addEventListener('click', (e) => {
    e.preventDefault();
  chrome.tabs.create({ url: 'http://127.0.0.1:3000/web-extension/seethroughai/web/home.html' });
  });
}

async function checkModelStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getModelStatus' });
    const statusBar = document.getElementById('modelStatus');
    const statusText = document.getElementById('statusText');
    
    if (response.loaded) {
      statusBar.classList.add('ready');
      statusText.textContent = '✓ Ready to scan';
    } else {
      statusText.textContent = 'Loading model...';
      // Try to load model
      chrome.runtime.sendMessage({ action: 'loadModel' }, (loadResponse) => {
        if (loadResponse.success) {
          statusBar.classList.add('ready');
          statusText.textContent = '✓ Ready to scan';
        }
      });
    }
  } catch (error) {
    console.error('Failed to check model status:', error);
  }
}

async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    
    if (response.success) {
      const { stats } = response;
      
      document.getElementById('totalScans').textContent = stats.totalScans;
      
      const aiPercentage = stats.totalScans > 0 
        ? Math.round((stats.aiDetected / stats.totalScans) * 100)
        : 0;
      
      document.getElementById('aiPercent').textContent = `${aiPercentage}%`;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function loadRecentScans() {
  try {
    const { scanHistory } = await chrome.storage.local.get(['scanHistory']);
    const resultsList = document.getElementById('resultsList');
    
    if (!scanHistory || scanHistory.length === 0) {
      return; // Empty state already shown
    }
    
    // Clear empty state
    resultsList.innerHTML = '';
    
    // Show only last 3 scans
    const recentScans = scanHistory.slice(0, 3);
    
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
  const emoji = scan.result === 'ai' ? '⚠️' : '✓';
  
  div.innerHTML = `
    <img src="${scan.imageUrl}" class="result-thumbnail" alt="Scanned image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Crect fill=\\'%23e9ecef\\' width=\\'100\\' height=\\'100\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23868e96\\' font-size=\\'12\\'%3ENo Image%3C/text%3E%3C/svg%3E'">
    <div class="result-details">
      <div class="result-badge ${scan.result}">
        ${emoji} ${scan.result.toUpperCase()}
      </div>
      <div class="result-confidence">${scan.confidence}% confidence</div>
      <div class="result-time">${timeAgo}</div>
    </div>
  `;
  
  div.addEventListener('click', () => {
    // Open detail view on main website
    chrome.tabs.create({ 
      url: 'http://127.0.0.1:3000/web-extension/seethroughai/web/home.html' 
    });
  });
  
  return div;
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

// Function to inject into page to find images
function findImagesOnPage() {
  const images = document.querySelectorAll('img');
  
  if (images.length === 0) {
    alert('No images found on this page');
    return;
  }
  
  // Find the largest visible image
  let largestImage = null;
  let maxSize = 0;
  
  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    const size = rect.width * rect.height;
    
    if (size > maxSize && rect.width > 50 && rect.height > 50) {
      largestImage = img;
      maxSize = size;
    }
  });
  
  if (largestImage) {
    chrome.runtime.sendMessage({
      action: 'scanImage',
      imageUrl: largestImage.src
    });
  } else {
    // Fallback to first image
    chrome.runtime.sendMessage({
      action: 'scanImage',
      imageUrl: images[0].src
    });
  }
}
