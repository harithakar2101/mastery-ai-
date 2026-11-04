import { VideoStoryboard, VideoScene } from '../types';

export interface RenderProgress {
  percent: number;
  currentSceneIndex: number;
  currentSceneTitle: string;
  status: string;
}

export interface RenderResult {
  blob: Blob;
  mimeType: string;
  url: string;
  vttContent: string;
  durationSeconds: number;
  audioAvailable: boolean;
  provenance: string;
}

/**
 * Generates standard WebVTT subtitle file content from a VideoStoryboard
 */
export function generateVttContent(storyboard: VideoStoryboard): string {
  let vtt = 'WEBVTT\n\n';
  let runningSec = 0;

  const scenes = storyboard.scenes || [];
  scenes.forEach((scene, idx) => {
    const duration = scene.duration || scene.duration_seconds || 15;
    const startSec = runningSec;
    const endSec = runningSec + duration;
    runningSec = endSec;

    const formatTime = (s: number) => {
      const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
      const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const secs = Math.floor(s % 60).toString().padStart(2, '0');
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0');
      return `${hrs}:${mins}:${secs}.${ms}`;
    };

    const text = scene.narration || scene.narration_script || scene.visual_description || `Scene ${idx + 1}`;
    vtt += `${idx + 1}\n`;
    vtt += `${formatTime(startSec)} --> ${formatTime(endSec)}\n`;
    vtt += `${text.trim()}\n\n`;
  });

  return vtt;
}

/**
 * Fetches server-side Gemini TTS audio for narration
 */
export async function fetchServerTTS(narrationText: string): Promise<{
  audioAvailable: boolean;
  audioBase64?: string;
  format?: string;
  provenance?: string;
  reason?: string;
}> {
  try {
    const res = await fetch('/api/video/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: narrationText,
        generateSyntheticFallback: false,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('TTS fetch failed:', err);
  }

  return {
    audioAvailable: false,
    reason: 'Gemini TTS unavailable; running in Captions-Only fallback mode',
  };
}

/**
 * Draws a single frame to the 1280x720 canvas
 */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  storyboard: VideoStoryboard,
  currentTime: number,
  totalDuration: number,
  audioAvailable: boolean
) {
  const width = 1280;
  const height = 720;

  // 1. Determine active scene based on currentTime
  let activeSceneIndex = 0;
  let elapsedBeforeScene = 0;
  const scenes = storyboard.scenes || [];

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].duration || scenes[i].duration_seconds || 15;
    if (currentTime >= elapsedBeforeScene && currentTime < elapsedBeforeScene + dur) {
      activeSceneIndex = i;
      break;
    }
    elapsedBeforeScene += dur;
  }
  if (currentTime >= totalDuration && scenes.length > 0) {
    activeSceneIndex = scenes.length - 1;
  }

  const activeScene: VideoScene = scenes[activeSceneIndex] || {
    id: 'default',
    title: storyboard.title,
    duration: 15,
    visual_type: 'diagram',
    narration: storyboard.key_takeaway || 'Key concept breakdown',
  };

  const sceneDuration = activeScene.duration || activeScene.duration_seconds || 15;
  const sceneProgress = Math.max(0, Math.min(1, (currentTime - elapsedBeforeScene) / sceneDuration));
  const overallProgress = Math.max(0, Math.min(1, currentTime / Math.max(1, totalDuration)));

  // 2. Background: Deep rich tech gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#060b13');
  bgGrad.addColorStop(0.5, '#0a1224');
  bgGrad.addColorStop(1, '#080d1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle background matrix dots
  ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
  for (let x = 30; x < width; x += 40) {
    for (let y = 30; y < height; y += 40) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // 4. Header Bar
  ctx.fillStyle = 'rgba(12, 20, 36, 0.85)';
  ctx.fillRect(0, 0, width, 68);

  // Logo Badge
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(42, 34, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(42, 34, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('MASTERY.AI', 62, 28);

  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('DUAL-CODING PEDAGOGICAL ENGINE', 62, 46);

  // Video Title & Scene Number
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f8fafc';
  const titleText = `${storyboard.title} — Scene ${activeSceneIndex + 1}/${scenes.length}: ${activeScene.title || 'Micro-Lesson'}`;
  ctx.fillText(titleText, 380, 40);

  // Time indicator
  ctx.font = 'bold 14px ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = '#94a3b8';
  const timeStr = `${Math.floor(currentTime)}s / ${Math.floor(totalDuration)}s`;
  ctx.fillText(timeStr, 1170, 40);

  // Progress Bar under Header
  ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.fillRect(0, 68, width, 4);

  const progGrad = ctx.createLinearGradient(0, 0, width, 0);
  progGrad.addColorStop(0, '#6366f1');
  progGrad.addColorStop(0.5, '#38bdf8');
  progGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, 68, width * overallProgress, 4);

  // 5. Visual Stage Rendering (Based on visual_type)
  const visualType = activeScene.visual_type || activeScene.animation_type || 'diagram';

  if (visualType === 'code_diff') {
    drawCodeDiffStage(ctx, activeScene, sceneProgress);
  } else if (visualType === 'flowchart') {
    drawFlowchartStage(ctx, activeScene, sceneProgress);
  } else if (visualType === 'analogy') {
    drawAnalogyStage(ctx, activeScene, sceneProgress);
  } else {
    // Default: 'diagram' or 'architecture'
    drawArchitectureStage(ctx, activeScene, sceneProgress);
  }

  // 6. Lower Third: Synchronized Subtitle Caption Box
  ctx.save();
  ctx.fillStyle = 'rgba(6, 11, 24, 0.94)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
  ctx.lineWidth = 1.5;

  const boxX = 80;
  const boxY = 575;
  const boxW = 1120;
  const boxH = 110;
  const boxRadius = 16;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, boxRadius);
  ctx.fill();
  ctx.stroke();

  // Caption text wrapping
  const narrationText = activeScene.narration || activeScene.narration_script || 'Narration synchronized...';
  ctx.font = '500 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#e0e7ff';
  wrapText(ctx, `"${narrationText}"`, boxX + 30, boxY + 38, boxW - 240, 26);

  // Provenance Tag
  ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
  if (audioAvailable) {
    ctx.fillStyle = '#10b981';
    ctx.fillText('🔊 TTS NARRATION AUDIO', boxX + boxW - 190, boxY + 40);
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('📝 SYNCHRONIZED CAPTIONS', boxX + boxW - 190, boxY + 40);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('1280x720 HD Dual-Coded', boxX + boxW - 190, boxY + 62);
  ctx.restore();
}

/**
 * Draws Code Diff visual
 */
function drawCodeDiffStage(ctx: CanvasRenderingContext2D, scene: VideoScene, progress: number) {
  const cardX = 180;
  const cardY = 115;
  const cardW = 920;
  const cardH = 430;

  // Window frame
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  // Window title bar
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 40, [14, 14, 0, 0]);
  ctx.fill();

  // macOS traffic lights
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cardX + 22, cardY + 20, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(cardX + 42, cardY + 20, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(cardX + 62, cardY + 20, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '13px ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('db_connection_fix.ts — Code Diff Invariant Inspection', cardX + 90, cardY + 25);

  // Line 1: Comment
  ctx.font = '16px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('1  // Invariant Rule: Directing driver to proper listening socket', cardX + 30, cardY + 80);

  // Line 2: Red line (- Wrong port)
  ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
  ctx.fillRect(cardX + 20, cardY + 105, cardW - 40, 38);
  ctx.fillStyle = '#f43f5e';
  ctx.fillText('2  - const dsn = "mysql:host=127.0.0.1;port=80";   // ✖ Fails: Port 80 speaks HTTP', cardX + 30, cardY + 130);

  // Line 3: Green line (+ Correct port)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  ctx.fillRect(cardX + 20, cardY + 155, cardW - 40, 38);
  ctx.fillStyle = '#10b981';
  ctx.fillText('3  + const dsn = "mysql:host=127.0.0.1;port=3306"; // ✔ Correct: Dedicated MySQL Port', cardX + 30, cardY + 180);

  // Line 4: Query execution
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('4  const db = new DatabaseConnection(dsn);', cardX + 30, cardY + 230);
  ctx.fillText('5  await db.authenticate(); // Handshake ACK received', cardX + 30, cardY + 265);

  // Blinking cursor
  const showCursor = Math.floor(progress * 10) % 2 === 0;
  if (showCursor) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cardX + 460, cardY + 252, 9, 18);
  }

  // Diagnostic Callout Banner at bottom of card
  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardX + 30, cardY + 310, cardW - 60, 90, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#a5b4fc';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('💡 Pedagogical Invariant Explanation:', cardX + 50, cardY + 338);

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '13px system-ui, sans-serif';
  const customNote = scene.on_screen_text || 'Changing port from 80 to 3306 resolves SQLSTATE[HY000] [2002] connection refused.';
  wrapText(ctx, customNote, cardX + 50, cardY + 365, cardW - 100, 20);

  ctx.restore();
}

/**
 * Draws Architecture Diagram visual
 */
function drawArchitectureStage(ctx: CanvasRenderingContext2D, scene: VideoScene, progress: number) {
  ctx.save();

  // Client Node
  const clientX = 220;
  const clientY = 280;
  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(clientX - 100, clientY - 80, 200, 160, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#c7d2fe';
  ctx.fillText('Application Client', clientX - 70, clientY - 30);
  ctx.font = '12px ui-monospace, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('PHP PDO / Node.js', clientX - 60, clientY);
  ctx.fillText('Driver Handshake', clientX - 58, clientY + 22);

  // Server Node (Right)
  const serverX = 1060;
  const serverY = 280;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(serverX - 120, serverY - 140, 240, 280, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#bae6fd';
  ctx.fillText('Server Host (Linux)', serverX - 80, serverY - 100);

  // Door 80 (HTTP)
  ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(serverX - 100, serverY - 60, 200, 70, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#fda4af';
  ctx.fillText('Door 80: HTTP Web', serverX - 80, serverY - 35);
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('Apache / Nginx Worker', serverX - 80, serverY - 15);

  // Door 3306 (MySQL)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(serverX - 100, serverY + 40, 200, 70, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText('Door 3306: MySQL DB', serverX - 80, serverY + 65);
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('mysqld Socket Listener', serverX - 80, serverY + 85);

  // Animated Packet Transmission
  const packetTargetY = scene.scene_num === 2 ? serverY - 25 : serverY + 75;
  const packetColor = scene.scene_num === 2 ? '#f43f5e' : '#10b981';

  // Connecting Bus Wire
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(clientX + 100, clientY);
  ctx.lineTo(serverX - 100, packetTargetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Moving Packet
  const currentPacketX = clientX + 100 + (serverX - 200 - clientX) * progress;
  const currentPacketY = clientY + (packetTargetY - clientY) * progress;

  ctx.fillStyle = packetColor;
  ctx.shadowColor = packetColor;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(currentPacketX, currentPacketY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TCP SYN', currentPacketX - 24, currentPacketY - 18);

  ctx.restore();
}

/**
 * Draws Flowchart visual
 */
function drawFlowchartStage(ctx: CanvasRenderingContext2D, scene: VideoScene, progress: number) {
  ctx.save();
  const nodes = [
    { label: '1. Initiate Connection', x: 200, y: 300, w: 200, h: 80, color: '#6366f1' },
    { label: '2. Inspect Target Port', x: 540, y: 300, w: 200, h: 80, color: '#38bdf8' },
    { label: '3. Protocol Handshake', x: 880, y: 300, w: 220, h: 80, color: '#10b981' },
  ];

  nodes.forEach((n, idx) => {
    const isCurrent = progress >= idx / 3 && progress <= (idx + 1) / 3;
    ctx.fillStyle = isCurrent ? '#1e1b4b' : '#0f172a';
    ctx.strokeStyle = isCurrent ? n.color : '#334155';
    ctx.lineWidth = isCurrent ? 3 : 1.5;

    ctx.beginPath();
    ctx.roundRect(n.x, n.y, n.w, n.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = isCurrent ? '#f8fafc' : '#94a3b8';
    ctx.fillText(n.label, n.x + 20, n.y + 46);

    // Connecting arrows
    if (idx < nodes.length - 1) {
      const next = nodes[idx + 1];
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(n.x + n.w, n.y + n.h / 2);
      ctx.lineTo(next.x, next.y + next.h / 2);
      ctx.stroke();
    }
  });

  ctx.restore();
}

/**
 * Draws Analogy visual (Apartment complex with doors)
 */
function drawAnalogyStage(ctx: CanvasRenderingContext2D, scene: VideoScene, progress: number) {
  ctx.save();

  // High-rise building silhouette
  const bldgX = 260;
  const bldgY = 140;
  const bldgW = 760;
  const bldgH = 400;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bldgX, bldgY, bldgW, bldgH, 16);
  ctx.fill();
  ctx.stroke();

  // Building Roof sign
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('🏢 Server Apartment Complex (IP Address: 192.168.1.100)', bldgX + 50, bldgY + 45);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('The IP address brings you to the front gate. The PORT chooses the exact apartment door.', bldgX + 50, bldgY + 75);

  // 3 Distinct Doors
  const doors = [
    { label: 'Door 80', service: 'HTTP (Websites)', desc: 'Apache / Nginx Worker', color: '#f43f5e', x: bldgX + 60 },
    { label: 'Door 443', service: 'HTTPS (SSL/TLS)', desc: 'Secure Web Gateway', color: '#38bdf8', x: bldgX + 290 },
    { label: 'Door 3306', service: 'MySQL Database', desc: 'Secure SQL Daemon', color: '#10b981', x: bldgX + 520 },
  ];

  doors.forEach(d => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(d.x, bldgY + 110, 180, 250, 12);
    ctx.fill();
    ctx.stroke();

    // Doorknob
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x + 155, bldgY + 235, 7, 0, Math.PI * 2);
    ctx.fill();

    // Door labels
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.label, d.x + 40, bldgY + 160);

    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = d.color;
    ctx.fillText(d.service, d.x + 20, bldgY + 195);

    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(d.desc, d.x + 20, bldgY + 225);
  });

  ctx.restore();
}

/**
 * Text wrapper helper for canvas rendering
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

/**
 * Full Browser Video Rendering Pipeline
 * Captures 1280x720 canvas at 30fps with MediaRecorder, mixes TTS audio if available, and yields downloadable Blob.
 */
export async function renderStoryboardToVideo(options: {
  storyboard: VideoStoryboard;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const { storyboard, onProgress, signal } = options;

  // 1. Calculate total duration
  const totalDuration = storyboard.scenes.reduce(
    (sum, s) => sum + (s.duration || s.duration_seconds || 15),
    0
  );

  onProgress?.({
    percent: 5,
    currentSceneIndex: 0,
    currentSceneTitle: 'Preparing Video Engine...',
    status: 'Requesting Server Gemini TTS Narration...',
  });

  // 2. Fetch server-side Gemini TTS audio
  const combinedNarration = storyboard.scenes
    .map(s => s.narration || s.narration_script || '')
    .filter(Boolean)
    .join('. ');

  const ttsResponse = await fetchServerTTS(combinedNarration);
  let audioBuffer: AudioBuffer | null = null;
  let audioContext: AudioContext | null = null;

  if (ttsResponse.audioAvailable && ttsResponse.audioBase64) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const rawAudioBytes = Uint8Array.from(atob(ttsResponse.audioBase64), c => c.charCodeAt(0));
      audioBuffer = await audioContext.decodeAudioData(rawAudioBytes.buffer);
    } catch (e) {
      console.warn('Audio decoding failed, continuing in captions mode:', e);
      audioBuffer = null;
    }
  }

  // 3. Initialize 1280x720 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 4. Capture canvas stream at 30 fps
  const canvasStream = canvas.captureStream(30);

  // 5. Audio mixing via AudioContext MediaStreamDestination
  let destinationNode: MediaStreamAudioDestinationNode | null = null;
  let audioSourceNode: AudioBufferSourceNode | null = null;

  if (audioContext && audioBuffer) {
    destinationNode = audioContext.createMediaStreamDestination();
    audioSourceNode = audioContext.createBufferSource();
    audioSourceNode.buffer = audioBuffer;
    audioSourceNode.connect(destinationNode);
    const audioTrack = destinationNode.stream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
  }

  // 6. MediaRecorder initialization (prefer video/mp4, fallback to video/webm)
  let mimeType = 'video/webm';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
      mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
      mimeType = 'video/webm; codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // 7. Start Recorder and Audio Playback
  recorder.start(100);
  if (audioSourceNode) {
    audioSourceNode.start(0);
  }

  // 8. Render Loop at 30fps
  const fps = 30;
  const frameIntervalMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.round(totalDuration * fps));

  let currentFrame = 0;

  return new Promise<RenderResult>((resolve, reject) => {
    const renderInterval = setInterval(() => {
      // Check cancellation signal
      if (signal?.aborted) {
        clearInterval(renderInterval);
        try {
          recorder.stop();
          if (audioContext && audioContext.state !== 'closed') audioContext.close();
        } catch {}
        return reject(new Error('Render cancelled by user'));
      }

      const currentTime = (currentFrame / fps);
      drawVideoFrame(ctx, storyboard, currentTime, totalDuration, !!audioBuffer);

      currentFrame++;
      const percent = Math.min(99, Math.round((currentFrame / totalFrames) * 90) + 5);

      // Determine active scene for progress reporting
      let scIdx = 0;
      let cumSec = 0;
      for (let s = 0; s < storyboard.scenes.length; s++) {
        const d = storyboard.scenes[s].duration || 15;
        if (currentTime >= cumSec && currentTime < cumSec + d) {
          scIdx = s;
          break;
        }
        cumSec += d;
      }

      onProgress?.({
        percent,
        currentSceneIndex: scIdx,
        currentSceneTitle: storyboard.scenes[scIdx]?.title || 'Rendering Scene...',
        status: `Rendering frame ${currentFrame}/${totalFrames} (${Math.round(currentTime)}s / ${totalDuration}s)...`,
      });

      if (currentFrame >= totalFrames) {
        clearInterval(renderInterval);
        onProgress?.({
          percent: 98,
          currentSceneIndex: storyboard.scenes.length - 1,
          currentSceneTitle: 'Finalizing Output...',
          status: 'Packaging video stream and audio tracks into file...',
        });

        recorder.onstop = () => {
          if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
          }

          const finalBlob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(finalBlob);
          const vttContent = generateVttContent(storyboard);

          onProgress?.({
            percent: 100,
            currentSceneIndex: storyboard.scenes.length - 1,
            currentSceneTitle: 'Complete!',
            status: 'Ready for preview and download!',
          });

          resolve({
            blob: finalBlob,
            mimeType,
            url,
            vttContent,
            durationSeconds: totalDuration,
            audioAvailable: !!audioBuffer,
            provenance: audioBuffer ? 'LIVE GEMINI TTS AUDIO' : 'SYNCHRONIZED CAPTIONS (TTS UNAVAILABLE)',
          });
        };

        recorder.stop();
      }
    }, frameIntervalMs);
  });
}
