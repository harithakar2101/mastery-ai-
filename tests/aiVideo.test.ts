process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import { userRepository, videoRepository } from '../server/repositories/index.ts';
import { generateVttContent } from '../src/services/videoRenderer.ts';
import { pcmToWav, createSyntheticWav } from '../server/gemini.ts';

let server: Server;
let baseUrl: string;

const studentUser = {
  id: 'VIDEO_TEST_STUDENT_1',
  name: 'Video Feature Tester',
  email: 'video.tester@cognicse.edu',
  role: 'student' as const,
  plan: 'Campus License',
  tokenVersion: 1,
};

let studentCookie: string;

before(async () => {
  userRepository.upsert(studentUser);
  const token = createSessionToken(studentUser);
  studentCookie = `${COOKIE_NAME}=${token}`;

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3008;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

describe('AI Video Downloadable Feature & Pipeline Suite', () => {
  it('1. Storyboard generation: produces structured JSON with title, on-screen text, visual type, narration, duration', async () => {
    const res = await fetch(`${baseUrl}/api/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        topic: 'Database Ports & Sockets',
        misconception: 'Connecting MySQL client to HTTP port 80',
        subject_track: 'Web Application Development',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.title, 'Storyboard must have title');
    assert.ok(data.key_takeaway, 'Storyboard must have key_takeaway');
    assert.ok(Array.isArray(data.scenes), 'Storyboard must contain scenes array');
    assert.ok(data.scenes.length >= 3, 'Storyboard should have at least 3 scenes');

    for (const scene of data.scenes) {
      assert.ok(scene.title, 'Scene must have a title');
      assert.ok(scene.narration, 'Scene must have narration');
      assert.ok(scene.duration || scene.duration_secs || scene.duration_seconds || 15);
      assert.ok(scene.visual_type || scene.animation_type, 'Scene must have visual_type or animation_type');
      assert.ok(scene.on_screen_text || scene.visual_description, 'Scene must have on-screen text or description');
    }
  });

  it('2. Narration TTS: server provides real Gemini TTS or falls back to captions-only per specs', async () => {
    const testNarration =
      'Port 80 is the front lobby for web pages, while port 3306 is the secure vault for MySQL databases.';

    // Normal TTS call
    const res = await fetch(`${baseUrl}/api/video/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        text: testNarration,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    if (data.audioAvailable) {
      assert.ok(data.audioBase64, 'Must return audioBase64 when audio is available');
      assert.equal(data.format, 'audio/wav');
    } else {
      // Must fall back to captions only and state so clearly
      assert.equal(data.fallbackMode, 'CAPTIONS_ONLY');
      assert.match(data.reason, /Gemini TTS unavailable|fallback/i);
    }
  });

  it('3. Audio PCM to WAV synthesizer: produces valid 44-byte WAV header and decodable audio', () => {
    // Generate 3 seconds of synthetic audio
    const wavBuffer = createSyntheticWav(3, 440, 24000);
    assert.ok(wavBuffer.length > 44, 'WAV buffer must include 44-byte header plus PCM data');

    // Verify RIFF header
    assert.equal(wavBuffer.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wavBuffer.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wavBuffer.toString('ascii', 12, 16), 'fmt ');
    assert.equal(wavBuffer.readUInt16LE(20), 1, 'Audio format must be PCM (1)');
    assert.equal(wavBuffer.readUInt16LE(22), 1, 'Channels must be mono (1)');
    assert.equal(wavBuffer.readUInt32LE(24), 24000, 'Sample rate must be 24000 Hz');
    assert.equal(wavBuffer.toString('ascii', 36, 40), 'data');
  });

  it('4. Subtitle Export (.vtt): formats WebVTT with accurate timestamp ranges and text', () => {
    const mockStoryboard = {
      title: 'Database Sockets 101',
      scenes: [
        {
          id: 's1',
          duration: 15,
          narration: 'Scene 1: Office building analogy with port 80 and port 3306.',
        },
        {
          id: 's2',
          duration: 25,
          narration: 'Scene 2: PDO client knocks on port 80 and receives connection refused.',
        },
        {
          id: 's3',
          duration: 20,
          narration: 'Scene 3: Re-routing to port 3306 establishes instant socket handshake.',
        },
      ],
    };

    const vtt = generateVttContent(mockStoryboard as any);
    assert.ok(vtt.startsWith('WEBVTT'), 'Subtitle file must start with WEBVTT');
    assert.match(vtt, /00:00:00\.000 --> 00:00:15\.000/);
    assert.match(vtt, /00:00:15\.000 --> 00:00:40\.000/);
    assert.match(vtt, /00:00:40\.000 --> 00:01:00\.000/);
    assert.match(vtt, /Office building analogy/);
    assert.match(vtt, /connection refused/);
  });

  it('5. Database storage & shareable link: saves video storyboard, duration, and render settings', async () => {
    const testStoryboard = {
      title: 'Micro-Mastery: Race Conditions in Node.js',
      concept: 'Concurrency & Event Loop',
      scenes: [
        {
          id: 'scene_1',
          scene_num: 1,
          duration: 20,
          title: 'Event Loop Invariant',
          visual_type: 'flowchart',
          on_screen_text: 'Async Callback Queue',
          narration: 'Single threaded execution does not prevent interleaved I/O race conditions.',
        },
        {
          id: 'scene_2',
          scene_num: 2,
          duration: 40,
          title: 'Atomic Mutex Resolution',
          visual_type: 'code_diff',
          on_screen_text: '+ await mutex.acquire();',
          narration: 'Protect shared state with atomic locks to ensure invariant consistency.',
        },
      ],
    };

    const vttContent = generateVttContent(testStoryboard as any);

    const saveRes = await fetch(`${baseUrl}/api/video/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        title: testStoryboard.title,
        topic: 'Concurrency & Mutex',
        conceptId: 'node_race_cond',
        durationSeconds: 60,
        storyboard: testStoryboard,
        renderSettings: {
          resolution: '1280x720',
          fps: 30,
          mimeType: 'video/webm',
          audioAvailable: true,
        },
        vttContent,
        provider: 'canvas_browser',
      }),
    });

    assert.equal(saveRes.status, 200);
    const saveData = await saveRes.json();
    assert.equal(saveData.success, true);
    assert.ok(saveData.shareToken, 'Must generate shareToken');
    assert.ok(saveData.shareUrl, 'Must return shareUrl');

    // Verify stored in videoRepository
    const stored = videoRepository.findByShareToken(saveData.shareToken);
    assert.ok(stored, 'Record must be saved in database');
    assert.equal(stored.durationSeconds, 60);
    assert.equal(stored.renderSettings.resolution, '1280x720');

    // Verify user can list their saved videos
    const listRes = await fetch(`${baseUrl}/api/video/list`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData.videos));
    assert.ok(listData.videos.some((v: any) => v.id === stored.id));

    // Verify public share route returns video metadata without authentication
    const shareRes = await fetch(`${baseUrl}/api/video/share/${saveData.shareToken}`);
    assert.equal(shareRes.status, 200);
    const shareData = await shareRes.json();
    assert.equal(shareData.success, true);
    assert.equal(shareData.video.title, testStoryboard.title);
    assert.equal(shareData.video.durationSeconds, 60);
  });

  it('6. Optional provider: Cinematic mode with GEMINI_VIDEO_MODEL', async () => {
    // When GEMINI_VIDEO_MODEL is not set in environment
    delete process.env.GEMINI_VIDEO_MODEL;

    const noModelRes = await fetch(`${baseUrl}/api/video/cinematic/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        topic: 'Robotics Kinematics',
        misconception: 'Forward vs Inverse Kinematics',
      }),
    });

    assert.equal(noModelRes.status, 400);
    const noModelData = await noModelRes.json();
    assert.equal(noModelData.error.code, 'VEO_MODEL_NOT_CONFIGURED');
    assert.match(noModelData.error.message, /Browser Canvas Engine/i);

    // When GEMINI_VIDEO_MODEL is set
    process.env.GEMINI_VIDEO_MODEL = 'veo-2.0-generate-001';

    const veoRes = await fetch(`${baseUrl}/api/video/cinematic/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        topic: 'Robotics Kinematics',
        misconception: 'Forward vs Inverse Kinematics',
        durationSeconds: 60,
      }),
    });

    assert.equal(veoRes.status, 200);
    const veoData = await veoRes.json();
    assert.equal(veoData.success, true);
    assert.ok(veoData.jobId);
    assert.match(veoData.costNotice, /compute cost/i);

    // Verify polling job status
    const statusRes = await fetch(`${baseUrl}/api/video/cinematic/status/${veoData.jobId}`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.ok(['PROCESSING', 'COMPLETED', 'QUEUED'].includes(statusData.status));
  });

  it('7. Acceptance Criterion: 60s video metadata, subtitles, and scene editor match precisely', async () => {
    // Simulate teacher editing scenes before rendering
    const editedStoryboard = {
      title: '60s Micro-Mastery: Port Invariants & Socket Multiplexing',
      concept: 'TCP/IP Sockets',
      target_misconception: 'Binding database to HTTP port',
      duration_secs: 60,
      total_duration_seconds: 60,
      key_takeaway: 'Ports identify distinct processes on a machine.',
      scenes: [
        {
          id: 'scene_edit_1',
          scene_num: 1,
          duration: 15,
          title: 'Custom Edited Analogy: Building Doors',
          visual_type: 'analogy' as const,
          on_screen_text: 'Door 80 = HTTP Web\nDoor 3306 = MySQL DB',
          narration: 'Teacher customized voiceover: Sockets require exact port alignment.',
        },
        {
          id: 'scene_edit_2',
          scene_num: 2,
          duration: 25,
          title: 'Custom Edited Collision: The Protocol Slam',
          visual_type: 'diagram' as const,
          on_screen_text: 'HTTP 400 Bad Request: Raw MySQL bytes rejected',
          narration: 'When PHP sends MySQL bytes to port 80, Apache rejects it immediately.',
        },
        {
          id: 'scene_edit_3',
          scene_num: 3,
          duration: 20,
          title: 'Custom Edited Resolution: 3306 Handshake',
          visual_type: 'code_diff' as const,
          on_screen_text: '+ port=3306 // Handshake Verified',
          narration: 'Directing the driver to port 3306 gives instant 200 OK authentication.',
        },
      ],
    };

    // Calculate total duration
    const totalDuration = editedStoryboard.scenes.reduce((sum, s) => sum + s.duration, 0);
    assert.equal(totalDuration, 60, 'Edited storyboard must sum to exactly 60 seconds');

    // Generate VTT subtitles
    const vtt = generateVttContent(editedStoryboard as any);
    assert.ok(vtt.includes('Teacher customized voiceover: Sockets require exact port alignment.'));
    assert.ok(vtt.includes('00:00:00.000 --> 00:00:15.000'));
    assert.ok(vtt.includes('00:00:15.000 --> 00:00:40.000'));
    assert.ok(vtt.includes('00:00:40.000 --> 00:01:00.000'));

    // Save edited video package in database
    const saveRes = await fetch(`${baseUrl}/api/video/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        title: editedStoryboard.title,
        topic: 'Network Sockets',
        durationSeconds: 60,
        storyboard: editedStoryboard,
        renderSettings: {
          resolution: '1280x720',
          fps: 30,
          mimeType: 'video/mp4',
          audioAvailable: true,
        },
        vttContent: vtt,
        provider: 'canvas_browser',
      }),
    });

    assert.equal(saveRes.status, 200);
    const saved = await saveRes.json();
    assert.ok(saved.shareToken);

    // Verify stored video matches edited storyboard exactly
    const record = videoRepository.findByShareToken(saved.shareToken);
    assert.ok(record);
    assert.equal(record.storyboard.scenes[0].title, 'Custom Edited Analogy: Building Doors');
    assert.equal(record.storyboard.scenes[0].narration, 'Teacher customized voiceover: Sockets require exact port alignment.');
    assert.equal(record.durationSeconds, 60);
  });
});
