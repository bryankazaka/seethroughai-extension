// Content script for SeeThroughAI Extension
// Runs on all web pages to enable image scanning

console.log('SeeThroughAI content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlightImage') {
    highlightImage(request.imageUrl);
  }
  
  if (request.action === 'initCapture') {
    initCaptureMode();
  }
});

// Highlight scanned images
function highlightImage(imageUrl) {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    if (img.src === imageUrl) {
  img.style.outline = '3px solid #3399cc';
      img.style.outlineOffset = '2px';
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        img.style.outline = '';
        img.style.outlineOffset = '';
      }, 2000);
    }
  });
}

// Initialize capture mode
function initCaptureMode() {
  // This will be implemented with capture-ui.js
  console.log('Capture mode initialized');
}

// Add hover effect to images (optional feature)
document.addEventListener('mouseenter', (e) => {
  if (e.target.tagName === 'IMG' && e.target.width > 50 && e.target.height > 50) {
    // Could add a subtle overlay indicating the image is scannable
    // For now, just log
    // console.log('Hovering over scannable image');
  }
}, true);
