/**
 * Content Script for SeeThroughAI Extension
 * Handles ML inference in the page context where DOM/canvas APIs are available
 */

import { runInference, loadModel } from '../lib/ml-inference.js';
import { captureScreenshot } from '../lib/capture-service.js';

console.log('SeeThroughAI content script loaded');

// Wrap everything in try-catch to prevent errors from breaking the page
let modelLoaded = false;
let modelLoadError = null;

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.action === 'analyzeImage' && request.imageUrl) {
      try {
        console.log('Analyzing image:', request.imageUrl);
        
        // Ensure model is loaded (with error handling)
        if (!modelLoaded && !modelLoadError) {
          try {
            await loadModel((progress) => {
              console.log(`Loading model: ${progress.toFixed(1)}%`);
            });
            modelLoaded = true;
            // Mark in storage that model has been loaded
            chrome.storage.local.set({ 
              modelLoaded: true, 
              modelLastLoaded: Date.now() 
            });
          } catch (loadError) {
            modelLoadError = loadError;
            console.error('Failed to load ML model:', loadError);
            throw new Error(`Model loading failed: ${loadError.message}`);
          }
        }
        
        if (modelLoadError) {
          throw new Error(`Model unavailable: ${modelLoadError.message}`);
        }
        
        // Run inference
        const result = await runInference(request.imageUrl);
        
        // Send result back to service worker
        chrome.runtime.sendMessage({
          action: 'analysisResult',
          imageUrl: request.imageUrl,
          result
        });
        
        // Highlight the image
        highlightImage(request.imageUrl, result);
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('Analysis failed:', error);
        chrome.runtime.sendMessage({
          action: 'analysisResult',
          imageUrl: request.imageUrl,
          result: { error: error.message }
        });
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  
    if (request.action === 'scanPageImages') {
      try {
        const images = Array.from(document.querySelectorAll('img'));
        const suitableImages = images
          .filter(img => img.width > 100 && img.height > 100 && img.complete)
          .map(img => img.src);
        
        console.log(`Found ${suitableImages.length} suitable images on page`);
        
        // Load model once (with error handling)
        if (!modelLoaded && !modelLoadError) {
          try {
            await loadModel();
            modelLoaded = true;
            chrome.storage.local.set({ 
              modelLoaded: true, 
              modelLastLoaded: Date.now() 
            });
          } catch (loadError) {
            modelLoadError = loadError;
            throw new Error(`Model loading failed: ${loadError.message}`);
          }
        }
        
        if (modelLoadError) {
          throw new Error(`Model unavailable: ${modelLoadError.message}`);
        }
        
        // Analyze each image
        for (const imgSrc of suitableImages.slice(0, 10)) { // Limit to 10 images
          try {
            const result = await runInference(imgSrc);
            chrome.runtime.sendMessage({
              action: 'analysisResult',
              imageUrl: imgSrc,
              result
            });
            highlightImage(imgSrc, result);
          } catch (error) {
            console.warn('Failed to analyze image:', imgSrc, error);
          }
        }
        
        sendResponse({ success: true, count: suitableImages.length });
      } catch (error) {
        console.error('Page scan failed:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  
    if (request.action === 'captureScreen') {
      try {
        console.log('Starting screen capture');
        const screenshot = await captureScreenshot();
        
        // Convert blob to data URL for analysis
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result;
          
          // Analyze captured screenshot (with error handling)
          if (!modelLoaded && !modelLoadError) {
            try {
              await loadModel();
              modelLoaded = true;
              chrome.storage.local.set({ 
                modelLoaded: true, 
                modelLastLoaded: Date.now() 
              });
            } catch (loadError) {
              modelLoadError = loadError;
              console.error('Model loading failed:', loadError);
              return;
            }
          }
          
          if (modelLoadError) {
            console.error('Model unavailable:', modelLoadError);
            return;
          }
          
          const result = await runInference(dataUrl);
          
          chrome.runtime.sendMessage({
            action: 'analysisResult',
            imageUrl: dataUrl,
            result
          });
        };
        reader.readAsDataURL(screenshot);
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('Screen capture failed:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  } catch (outerError) {
    console.error('Content script error:', outerError);
    sendResponse({ success: false, error: outerError.message });
    return true; // Keep channel open for async
  }
  
  // Always return true for async message handling
  return true;
});

/**
 * Highlight an analyzed image with a colored border
 */
function highlightImage(imageUrl, result) {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    if (img.src === imageUrl) {
      const color = result.color || '#3399cc';
      img.style.outline = `3px solid ${color}`;
      img.style.outlineOffset = '2px';
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        img.style.outline = '';
        img.style.outlineOffset = '';
      }, 3000);
    }
  });
}
