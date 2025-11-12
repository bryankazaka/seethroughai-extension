/**
 * Screen Capture Service
 * Handles screen recording, area selection, and frame extraction
 */

/**
 * Capture a screenshot of a specific area
 * @param {object} options - Capture options
 * @returns {Promise<Blob>} - Screenshot blob
 */
export async function captureScreenshot(options = {}) {
  const {
    area = 'full', // 'full', 'window', 'selection'
    format = 'image/png'
  } = options;
  
  try {
    console.log('📸 Capturing screenshot...', area);
    
    // Request screen capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });
    
    // Get video track
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
    
    // Create canvas and capture frame
    const canvas = document.createElement('canvas');
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    
    // Convert to blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, format);
    });
    
    console.log('✅ Screenshot captured', blob.size, 'bytes');
    
    return blob;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.log('❌ Screen capture permission denied');
      throw new Error('Screen capture permission denied');
    } else {
      console.error('❌ Screen capture failed:', error);
      throw error;
    }
  }
}

/**
 * Start screen recording
 * @param {object} options - Recording options
 * @returns {Promise<MediaRecorder>} - MediaRecorder instance
 */
export async function startScreenRecording(options = {}) {
  const {
    videoBitsPerSecond = 5000000, // 5 Mbps
    mimeType = 'video/webm;codecs=vp9'
  } = options;
  
  try {
    console.log('🎥 Starting screen recording...');
    
    // Request screen capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    });
    
    // Create recorder
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond
    });
    
    const chunks = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    recorder.chunks = chunks;
    recorder.stream = stream;
    
    // Start recording
    recorder.start(1000); // Collect data every second
    
    console.log('✅ Recording started');
    
    return recorder;
  } catch (error) {
    console.error('❌ Recording failed:', error);
    throw error;
  }
}

/**
 * Stop screen recording
 * @param {MediaRecorder} recorder - MediaRecorder instance
 * @returns {Promise<Blob>} - Recorded video blob
 */
export function stopScreenRecording(recorder) {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') {
      reject(new Error('No active recording'));
      return;
    }
    
    recorder.onstop = () => {
      console.log('⏹️ Recording stopped');
      
      // Stop all tracks
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      
      // Create blob from chunks
      const blob = new Blob(recorder.chunks, {
        type: recorder.mimeType
      });
      
      console.log('✅ Recording saved', blob.size, 'bytes');
      resolve(blob);
    };
    
    recorder.onerror = (error) => {
      console.error('❌ Recording error:', error);
      reject(error);
    };
    
    recorder.stop();
  });
}

/**
 * Extract frames from video
 * @param {Blob} videoBlob - Video blob
 * @param {object} options - Extraction options
 * @returns {Promise<Blob[]>} - Array of frame blobs
 */
export async function extractFrames(videoBlob, options = {}) {
  const {
    fps = 1, // Frames per second to extract
    maxFrames = 60, // Maximum number of frames
    format = 'image/jpeg',
    quality = 0.9
  } = options;
  
  try {
    console.log('🎬 Extracting frames from video...', { fps, maxFrames });
    
    // Create video element
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    // Wait for metadata
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    
    const duration = video.duration;
    const interval = 1 / fps;
    const frameCount = Math.min(Math.floor(duration * fps), maxFrames);
    
    console.log(`   Video duration: ${duration.toFixed(2)}s`);
    console.log(`   Extracting ${frameCount} frames`);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const frames = [];
    
    // Extract frames
    for (let i = 0; i < frameCount; i++) {
      const time = i * interval;
      
      // Seek to time
      video.currentTime = time;
      
      // Wait for seek
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, format, quality);
      });
      
      frames.push(blob);
      
      console.log(`   Frame ${i + 1}/${frameCount} extracted`);
    }
    
    // Cleanup
    URL.revokeObjectURL(video.src);
    
    console.log(`✅ ${frames.length} frames extracted`);
    
    return frames;
  } catch (error) {
    console.error('❌ Frame extraction failed:', error);
    throw error;
  }
}

/**
 * Capture and analyze screen area
 * @param {Function} analyzeCallback - Function to analyze screenshot
 * @returns {Promise<object>} - Analysis result
 */
export async function captureAndAnalyze(analyzeCallback) {
  try {
    // Capture screenshot
    const screenshot = await captureScreenshot();
    
    // Analyze
    console.log('🔍 Analyzing screenshot...');
    const result = await analyzeCallback(screenshot);
    
    return {
      screenshot,
      analysis: result
    };
  } catch (error) {
    console.error('❌ Capture and analyze failed:', error);
    throw error;
  }
}

/**
 * Check if screen capture is supported
 */
export function isScreenCaptureSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}
