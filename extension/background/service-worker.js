// Service Worker for SeeThroughAI Extension
// Handles ML model loading, context menus, and Firebase sync

let modelLoaded = false;
let inferenceEngine = null;

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('SeeThroughAI extension installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'scanImage',
    title: 'Scan with SeeThroughAI',
    contexts: ['image']
  });
  
  chrome.contextMenus.create({
    id: 'captureArea',
    title: 'Capture & Analyze Area',
    contexts: ['page']
  });
  
  // Initialize storage
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          autoSync: true,
          quality: 'balanced',
          saveHistory: true,
          theme: 'light'
        }
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scanImage') {
    handleImageScan(info.srcUrl, tab);
  } else if (info.menuItemId === 'captureArea') {
    handleAreaCapture(tab);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanImage') {
    handleImageScan(request.imageUrl, sender.tab)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
  
  if (request.action === 'getModelStatus') {
    sendResponse({ loaded: modelLoaded });
  }
  
  if (request.action === 'loadModel') {
    loadModel()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getStats') {
    getStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Image scanning function
async function handleImageScan(imageUrl, tab) {
  try {
    console.log('Scanning image:', imageUrl);
    
    // Ensure model is loaded
    if (!modelLoaded) {
      await loadModel();
    }
    
    // TODO: Implement actual inference with Transformers.js or ONNX
    // For now, return mock result
    const result = {
      scanId: generateId(),
      imageUrl: imageUrl,
      timestamp: Date.now(),
      result: Math.random() > 0.5 ? 'ai' : 'human',
      confidence: Math.floor(Math.random() * 30) + 70,
      processingTime: Math.floor(Math.random() * 3000) + 1000,
      metadata: {
        imageSize: 'unknown',
        tabUrl: tab?.url || 'unknown'
      }
    };
    
    // Save to local storage
    await saveScanResult(result);
    
    // Sync to Firebase if enabled
    const settings = await chrome.storage.local.get(['settings']);
    if (settings.settings?.autoSync) {
      await syncToFirebase(result);
    }
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../assets/icon128.png',
      title: 'Scan Complete',
      message: `Result: ${result.result.toUpperCase()} (${result.confidence}% confidence)`,
      priority: 2
    });
    
    return result;
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
}

// Area capture function
async function handleAreaCapture(tab) {
  try {
    // Inject capture UI into the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/capture-ui.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['styles/capture-ui.css']
    });
  } catch (error) {
    console.error('Capture error:', error);
  }
}

// Model loading (placeholder)
async function loadModel() {
  console.log('Loading ML model...');
  // TODO: Implement actual model loading with Transformers.js or ONNX Runtime Web
  // Example:
  // const { pipeline } = await import('./lib/transformers.min.js');
  // inferenceEngine = await pipeline('zero-shot-image-classification');
  
  return new Promise((resolve) => {
    setTimeout(() => {
      modelLoaded = true;
      console.log('Model loaded successfully');
      resolve();
    }, 2000);
  });
}

// Save scan result locally
async function saveScanResult(result) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scanHistory'], (data) => {
      const history = data.scanHistory || [];
      history.unshift(result);
      
      // Keep only last 100 scans locally
      if (history.length > 100) {
        history.pop();
      }
      
      chrome.storage.local.set({ scanHistory: history }, resolve);
    });
  });
}

// Get statistics
async function getStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scanHistory'], (data) => {
      const history = data.scanHistory || [];
      
      const stats = {
        totalScans: history.length,
        aiDetected: history.filter(s => s.result === 'ai').length,
        humanDetected: history.filter(s => s.result === 'human').length,
        avgConfidence: history.length > 0 
          ? Math.round(history.reduce((sum, s) => sum + s.confidence, 0) / history.length)
          : 0,
        lastScan: history[0]?.timestamp || null
      };
      
      resolve(stats);
    });
  });
}

// Firebase sync (placeholder)
async function syncToFirebase(result) {
  // TODO: Implement Firebase sync
  // This will connect to your Firebase Functions endpoint
  console.log('Syncing to Firebase:', result.scanId);
  
  try {
    // Example:
    // const response = await fetch('https://your-firebase-url/api/scans', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${await getAuthToken()}`
    //   },
    //   body: JSON.stringify(result)
    // });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Firebase sync error:', error);
  }
}

// Utility: Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
