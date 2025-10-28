// Capture UI Script
// Creates an overlay for selecting areas to scan

(function() {
  'use strict';
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'seethroughai-capture-overlay';
  overlay.innerHTML = `
    <div class="seethroughai-capture-container">
      <div class="seethroughai-capture-header">
        <h3>Select area to scan</h3>
        <button id="seethroughai-capture-cancel" class="seethroughai-btn-cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="seethroughai-capture-instructions">
        <p>Click and drag to select an area</p>
      </div>
      <div id="seethroughai-selection-box" class="seethroughai-selection-box" style="display: none;"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Selection logic
  let isSelecting = false;
  let startX, startY;
  const selectionBox = document.getElementById('seethroughai-selection-box');
  
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay || e.target.closest('.seethroughai-capture-container')) {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0';
      selectionBox.style.height = '0';
      selectionBox.style.display = 'block';
    }
  });
  
  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
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
    
    isSelecting = false;
    
    const rect = selectionBox.getBoundingClientRect();
    
    if (rect.width > 50 && rect.height > 50) {
      // Capture the selected area
      try {
        // TODO: Implement screenshot capture using chrome.tabs.captureVisibleTab
        console.log('Capturing area:', rect);
        
        alert('Area capture coming soon!\\nThis will capture and analyze the selected screen area.');
        
      } catch (error) {
        console.error('Capture failed:', error);
      }
    }
    
    // Clean up
    document.body.removeChild(overlay);
  });
  
  // Cancel button
  document.getElementById('seethroughai-capture-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
})();
