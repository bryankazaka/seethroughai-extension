// Capture UI Script
// Creates an overlay for selecting areas to scan

(function() {
  'use strict';
  
  // Prevent multiple instances
  if (document.getElementById('seethroughai-capture-overlay')) {
    return;
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'seethroughai-capture-overlay';
  overlay.innerHTML = `
    <div class="seethroughai-capture-container">
      <div class="seethroughai-capture-header">
        <h3>🎯 Select Area to Analyze</h3>
        <button id="seethroughai-capture-cancel" class="seethroughai-btn-cancel" title="Cancel (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="seethroughai-capture-instructions">
        <p>📍 Click and drag to select an area to analyze for AI content</p>
        <p style="font-size: 12px; opacity: 0.8; margin-top: 8px;">Press ESC to cancel</p>
      </div>
      <div id="seethroughai-selection-box" class="seethroughai-selection-box" style="display: none;"></div>
    </div>
  `;
  
  // Add inline styles since CSS might not be loaded
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 2147483647;
    cursor: crosshair;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  const container = overlay.querySelector('.seethroughai-capture-container');
  container.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    min-width: 300px;
  `;
  
  const header = overlay.querySelector('.seethroughai-capture-header');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `;
  
  const cancelBtn = overlay.querySelector('#seethroughai-capture-cancel');
  cancelBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    opacity: 0.6;
    transition: opacity 0.2s;
  `;
  cancelBtn.onmouseover = () => cancelBtn.style.opacity = '1';
  cancelBtn.onmouseout = () => cancelBtn.style.opacity = '0.6';
  
  const selectionBox = overlay.querySelector('#seethroughai-selection-box');
  selectionBox.style.cssText = `
    position: fixed;
    border: 3px solid #3399cc;
    background: rgba(51, 153, 204, 0.1);
    pointer-events: none;
    display: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  `;
  
  document.body.appendChild(overlay);
  
  // Selection logic
  let isSelecting = false;
  let startX, startY;
  
  overlay.addEventListener('mousedown', (e) => {
    if (e.target.closest('.seethroughai-capture-container')) {
      return; // Don't start selection if clicking the instructions
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
    selectionBox.style.display = 'block';
    
    // Hide instructions when selecting
    container.style.display = 'none';
  });
  
  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);
    
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  });
  
  overlay.addEventListener('mouseup', async (e) => {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isSelecting = false;
    
    const rect = selectionBox.getBoundingClientRect();
    
    if (rect.width > 50 && rect.height > 50) {
      // Show processing message
      overlay.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <h3 style="margin: 0 0 12px 0;">Analyzing selected area...</h3>
          <p style="margin: 0; color: #666;">This may take a moment</p>
        </div>
      `;
      
      try {
        // Capture the visible tab
        const imageData = await chrome.runtime.sendMessage({
          action: 'captureVisibleTab',
          area: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          }
        });
        
        if (imageData) {
          // Send to content script for analysis
          chrome.runtime.sendMessage({
            action: 'analyzeCapture',
            imageData: imageData,
            area: rect
          });
          
          // Show success message
          overlay.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h3 style="margin: 0 0 12px 0;">Area captured!</h3>
              <p style="margin: 0; color: #666;">Analysis in progress. Check your scan history.</p>
            </div>
          `;
          
          setTimeout(() => {
            document.body.removeChild(overlay);
          }, 2000);
        }
        
      } catch (error) {
        console.error('Capture failed:', error);
        alert('❌ Failed to capture area: ' + error.message);
        document.body.removeChild(overlay);
      }
    } else {
      // Selection too small, clean up
      document.body.removeChild(overlay);
    }
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // ESC key to cancel
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
})();

