/**
 * SeeThroughAI Service Worker (Bundled Version)
 * Orchestrates context menus and forwards work to content scripts
 */

console.log('🚀 SeeThroughAI service worker initialized');

// Create context menus and initialize settings
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 SeeThroughAI extension installed');

  // Primary analyze image option
  chrome.contextMenus.create({
    id: 'analyze-image',
    title: 'Analyze with SeeThroughAI',
    contexts: ['image']
  });

  // Page actions
  chrome.contextMenus.create({
    id: 'scan-page-images',
    title: 'Scan all images on page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'capture-screen',
    title: 'Capture & Analyze Screen',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'open-settings',
    title: 'SeeThroughAI Settings',
    contexts: ['action', 'page']
  });

  // Ensure default settings exist
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          autoDetect: true,
          showBadges: true,
          enableNotifications: false,
          theme: 'auto'
        }
      });
    }
  });
});

// Forward context menu actions to the active tab's content script where DOM/canvas are available
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab || !tab.id) return;

    if (info.menuItemId === 'analyze-image' && info.srcUrl) {
      // Ask the content script to analyze this image
      try {
        // Try to send message, if it fails, inject content script first
        chrome.tabs.sendMessage(tab.id, { action: 'analyzeImage', imageUrl: info.srcUrl }, async (response) => {
          if (chrome.runtime.lastError) {
            // Content script not loaded, inject it
            console.log('Content script not found, injecting...');
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content/content-script.js']
              });
              
              await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['styles/content.css']
              });
              
              // Wait for initialization
              setTimeout(async () => {
                // Try again
                await chrome.tabs.sendMessage(tab.id, { action: 'analyzeImage', imageUrl: info.srcUrl });
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: chrome.runtime.getURL('assets/icon48.png'),
                  title: 'SeeThroughAI',
                  message: 'Analyzing image — results will appear shortly.'
                });
              }, 500);
            } catch (injectError) {
              console.error('Failed to inject content script:', injectError);
              chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/icon48.png'),
                title: 'SeeThroughAI Error',
                message: 'Failed to inject analyzer. Try refreshing the page.'
              });
            }
          } else {
            // Success
            chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('assets/icon48.png'),
              title: 'SeeThroughAI',
              message: 'Analyzing image — results will appear shortly.'
            });
          }
        });
      } catch (err) {
        console.error('Failed to send message to content script:', err);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon48.png'),
          title: 'SeeThroughAI Error',
          message: 'Failed to communicate with page. Try refreshing.'
        });
      }
    }

    if (info.menuItemId === 'scan-page-images') {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'scanPageImages' });
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon48.png'),
          title: 'SeeThroughAI',
          message: 'Scanning page images — processing in background.'
        });
      } catch (err) {
        console.error('Failed to send message to content script:', err);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon48.png'),
          title: 'SeeThroughAI Error',
          message: 'Failed to communicate with page. Try refreshing.'
        });
      }
    }

    if (info.menuItemId === 'capture-screen') {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'captureScreen' });
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon48.png'),
          title: 'SeeThroughAI',
          message: 'Starting screen capture...'
        });
      } catch (err) {
        console.error('Failed to send message to content script:', err);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon48.png'),
          title: 'SeeThroughAI Error',
          message: 'Failed to communicate with page. Try refreshing.'
        });
      }
    }

    if (info.menuItemId === 'open-settings') {
      // Open settings page in a new tab - correct path for bundled extension
      const url = chrome.runtime.getURL('extension/popup/settings.html');
      chrome.tabs.create({ url });
    }
  } catch (err) {
    console.error('Context menu handling failed:', err);
  }
});

// Receive analysis results from content scripts and surface notifications or store detections
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'analysisResult') {
    const { imageUrl, result } = message;

    // Store basic detection in storage.history (so popup can display)
    chrome.storage.local.get(['scanHistory'], (res) => {
      const history = Array.isArray(res.scanHistory) ? res.scanHistory : [];
      history.unshift({
        id: Date.now().toString(36),
        imageUrl,
        result,
        timestamp: Date.now()
      });
      // Keep recent 200 records
      const trimmed = history.slice(0, 200);
      chrome.storage.local.set({ scanHistory: trimmed });
    });

    // Optionally show notification with classification
    if (result && result.label) {
      const title = `SeeThroughAI — ${result.emoji} ${result.label}`;
      const msg = `AI score: ${result.aiScore}% — ${result.classification}`;
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon48.png'),
        title,
        message: msg
      });
    }

    sendResponse({ success: true });
    return true;
  }

  // Support simple settings get/update
  if (message && message.action === 'get-settings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse({ success: true, settings: result.settings || {} });
    });
    return true;
  }

  if (message && message.action === 'update-settings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle capture visible tab request
  if (message && message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // If area is specified, crop the image
      if (message.area) {
        cropImage(dataUrl, message.area).then(croppedDataUrl => {
          sendResponse(croppedDataUrl);
        }).catch(error => {
          console.error('Crop failed:', error);
          sendResponse(dataUrl); // Send full image if crop fails
        });
      } else {
        sendResponse(dataUrl);
      }
    });
    return true; // Keep channel open for async response
  }

  // Handle analyze capture request
  if (message && message.action === 'analyzeCapture') {
    // Store the capture in history
    chrome.storage.local.get(['scanHistory'], (res) => {
      const history = Array.isArray(res.scanHistory) ? res.scanHistory : [];
      history.unshift({
        id: Date.now().toString(36),
        imageUrl: message.imageData,
        result: {
          label: 'Captured Area',
          classification: 'Analyzing...',
          emoji: '📸',
          aiScore: 0,
          color: '#3399cc'
        },
        timestamp: Date.now()
      });
      chrome.storage.local.set({ scanHistory: history.slice(0, 200) });
    });
    
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon48.png'),
      title: 'SeeThroughAI',
      message: 'Captured area saved! Analysis in progress...'
    });
    
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Helper function to crop image
async function cropImage(dataUrl, area) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = new OffscreenCanvas(area.width, area.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
      canvas.convertToBlob({ type: 'image/png' }).then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }).catch(reject);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

console.log('✅ Service worker ready');
