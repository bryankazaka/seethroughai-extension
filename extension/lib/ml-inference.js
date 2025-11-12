/**
 * ML Inference Module - Complete Rewrite
 * Handles ONNX model loading, inference, and optimization
 * 
 * Features:
 * - ONNX Runtime Web with WebGPU/WASM
 * - Model caching in IndexedDB
 * - Web Worker for background processing
 * - Batch processing support
 * - Progressive loading with scaffold
 * - AI detection thresholds (0-10%, 10-45%, 45-90%, 90-100%)
 */

import * as ort from 'onnxruntime-web';

// Model configuration
const MODEL_PATH = chrome.runtime.getURL('smolvlm-classifier-onnx/classifier.onnx');
const MODEL_VERSION = '1.0.0';
const CACHE_NAME = 'seethroughai-model-cache';

// Global state
let modelSession = null;
let modelLoading = false;
let loadingCallbacks = [];

/**
 * Classification thresholds based on AI probability score
 */
export function classifyResult(aiScore) {
  if (aiScore >= 0 && aiScore <= 10) {
    return {
      label: 'DEFINITELY NOT AI',
      classification: 'definitely-not',
      confidence: 100 - aiScore,
      level: 'safe',
      emoji: '✅',
      color: '#10b981'
    };
  } else if (aiScore > 10 && aiScore <= 45) {
    return {
      label: 'LIKELY NOT AI',
      classification: 'likely-not',
      confidence: 100 - aiScore,
      level: 'probably-safe',
      emoji: '👍',
      color: '#3b82f6'
    };
  } else if (aiScore > 45 && aiScore <= 90) {
    return {
      label: 'LIKELY AI',
      classification: 'likely-ai',
      confidence: aiScore,
      level: 'suspicious',
      emoji: '⚠️',
      color: '#f59e0b'
    };
  } else { // aiScore > 90
    return {
      label: 'DEFINITELY AI',
      classification: 'definitely-ai',
      confidence: aiScore,
      level: 'dangerous',
      emoji: '🚫',
      color: '#ef4444'
    };
  }
}

/**
 * Initialize ONNX Runtime with WebGPU/WASM
 */
async function initializeRuntime() {
  console.log('🔧 Initializing ONNX Runtime...');
  
  // Configure WASM
  ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
  ort.env.wasm.simd = true;
  
  // Set WASM paths
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/onnx-wasm/');
  
  console.log(`✅ ONNX Runtime configured (${ort.env.wasm.numThreads} threads)`);
}

/**
 * Check if model is cached in IndexedDB
 */
async function getModelFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(MODEL_PATH);
    
    if (response) {
      console.log('📦 Loading model from cache...');
      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    }
    
    return null;
  } catch (error) {
    console.warn('Cache read failed:', error);
    return null;
  }
}

/**
 * Save model to IndexedDB cache
 */
async function cacheModel(arrayBuffer) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Model-Version': MODEL_VERSION
      }
    });
    
    await cache.put(MODEL_PATH, response);
    console.log('✅ Model cached successfully');
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

/**
 * Download model with progress tracking
 */
async function downloadModel(onProgress) {
  console.log('📥 Downloading model from:', MODEL_PATH);
  
  const response = await fetch(MODEL_PATH);
  
  if (!response.ok) {
    throw new Error(`Failed to download model: ${response.statusText}`);
  }
  
  const contentLength = +response.headers.get('Content-Length') || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let receivedLength = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    chunks.push(value);
    receivedLength += value.length;
    
    if (onProgress && contentLength > 0) {
      const progress = (receivedLength / contentLength) * 100;
      onProgress(progress);
    }
  }
  
  // Combine chunks
  const arrayBuffer = new Uint8Array(receivedLength);
  let position = 0;
  
  for (const chunk of chunks) {
    arrayBuffer.set(chunk, position);
    position += chunk.length;
  }
  
  return arrayBuffer.buffer;
}

/**
 * Load ML model with caching and progress
 */
export async function loadModel(onProgress = null) {
  if (modelSession) {
    console.log('✅ Model already loaded');
    return modelSession;
  }
  
  if (modelLoading) {
    console.log('⏳ Model loading in progress, waiting...');
    return new Promise((resolve) => {
      loadingCallbacks.push(resolve);
    });
  }
  
  modelLoading = true;
  
  try {
    // Initialize runtime
    await initializeRuntime();
    
    // Try to load from cache first
    let modelData = await getModelFromCache();
    
    if (!modelData) {
      // Download and cache
      if (onProgress) onProgress(0);
      modelData = await downloadModel(onProgress);
      await cacheModel(modelData);
      if (onProgress) onProgress(100);
    }
    
    console.log('🔄 Creating inference session...');
    
    // Create session with optimization
    modelSession = await ort.InferenceSession.create(modelData, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'parallel'
    });
    
    console.log('✅ Model loaded successfully');
    console.log(`   Inputs: ${modelSession.inputNames.join(', ')}`);
    console.log(`   Outputs: ${modelSession.outputNames.join(', ')}`);
    
    // Notify waiting callbacks
    loadingCallbacks.forEach(cb => cb(modelSession));
    loadingCallbacks = [];
    
    return modelSession;
  } catch (error) {
    console.error('❌ Model loading failed:', error);
    throw error;
  } finally {
    modelLoading = false;
  }
}

/**
 * Preprocess image for model input
 */
async function preprocessImage(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Resize to model input size (384x384)
      canvas.width = 384;
      canvas.height = 384;
      
      // Draw and resize image
      ctx.drawImage(img, 0, 0, 384, 384);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, 384, 384);
      const { data } = imageData;
      
      // Convert to float tensor [1, 3, 384, 384]
      const float32Data = new Float32Array(3 * 384 * 384);
      
      for (let i = 0; i < 384 * 384; i++) {
        float32Data[i] = data[i * 4] / 255.0; // R
        float32Data[384 * 384 + i] = data[i * 4 + 1] / 255.0; // G
        float32Data[2 * 384 * 384 + i] = data[i * 4 + 2] / 255.0; // B
      }
      
      // Create tensor
      const tensor = new ort.Tensor('float32', float32Data, [1, 3, 384, 384]);
      
      resolve(tensor);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load image
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Run inference on an image
 * @param {string|Blob} imageSource - Image URL or Blob
 * @returns {Promise<object>} - Detection result
 */
export async function runInference(imageSource) {
  const startTime = performance.now();
  
  try {
    // Ensure model is loaded
    if (!modelSession) {
      await loadModel();
    }
    
    console.log('🖼️ Preprocessing image...');
    const pixelValues = await preprocessImage(imageSource);
    
    // Create dummy text inputs (model expects text prompt)
    const inputIds = new ort.Tensor('int64', new BigInt64Array(512).fill(0n), [1, 512]);
    const attentionMask = new ort.Tensor('int64', new BigInt64Array(512).fill(1n), [1, 512]);
    
    console.log('🔮 Running inference...');
    const feeds = {
      pixel_values: pixelValues,
      input_ids: inputIds,
      attention_mask: attentionMask
    };
    
    // Run model
    const results = await modelSession.run(feeds);
    
    // Get outputs
    const logits = results.logits;
    const probs = results.probs;
    
    // Extract probabilities
    const realProb = probs.data[0];
    const aiProb = probs.data[1];
    
    // Calculate AI score (0-100%)
    const aiScore = Math.round(aiProb * 100);
    
    // Classify result
    const classification = classifyResult(aiScore);
    
    const processingTime = Math.round(performance.now() - startTime);
    
    console.log(`✅ Inference complete (${processingTime}ms)`);
    console.log(`   AI Score: ${aiScore}%`);
    console.log(`   Classification: ${classification.label}`);
    
    return {
      aiScore,
      realScore: Math.round(realProb * 100),
      ...classification,
      probabilities: {
        real: realProb,
        ai: aiProb
      },
      processingTime,
      modelVersion: MODEL_VERSION
    };
  } catch (error) {
    console.error('❌ Inference failed:', error);
    throw error;
  }
}

/**
 * Batch process multiple images
 */
export async function batchInference(imageSources, onProgress = null) {
  console.log(`📦 Batch processing ${imageSources.length} images...`);
  
  const results = [];
  
  for (let i = 0; i < imageSources.length; i++) {
    try {
      const result = await runInference(imageSources[i]);
      results.push({ success: true, result });
      
      if (onProgress) {
        onProgress((i + 1) / imageSources.length * 100);
      }
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  console.log(`✅ Batch complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  
  return results;
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    name: 'SmolVLM AI Classifier',
    version: MODEL_VERSION,
    loaded: modelSession !== null,
    runtime: 'ONNX Runtime Web',
    acceleration: 'WebGPU/WASM',
    inputSize: '384x384',
    classes: ['real', 'ai']
  };
}

/**
 * Unload model and free memory
 */
export async function unloadModel() {
  if (modelSession) {
    console.log('🗑️ Unloading model...');
    modelSession = null;
    console.log('✅ Model unloaded');
  }
}

/**
 * Clear model cache
 */
export async function clearCache() {
  try {
    await caches.delete(CACHE_NAME);
    console.log('✅ Model cache cleared');
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
  }
}
