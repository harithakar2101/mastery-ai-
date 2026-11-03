import React, { useState, useEffect, useRef } from 'react';
import { useTutor } from '../../context/TutorContext';
import { VideoStoryboard, VideoScene, VideoVisualType } from '../../types';
import {
  renderStoryboardToVideo,
  generateVttContent,
  RenderProgress,
  RenderResult,
  drawVideoFrame,
} from '../../services/videoRenderer';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Film,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  Save,
  Trash2,
  Plus,
  Share2,
  FileText,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Video,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export const AIVideoPlayer: React.FC = () => {
  const { selectedNode, activeVideoStoryboard, setActiveVideoStoryboard, userProfile } = useTutor();

  // Mode: 'editor' | 'preview_player' | 'saved_library'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'library'>('editor');
  const [engineMode, setEngineMode] = useState<'canvas' | 'veo'>('canvas');

  // Storyboard state
  const [storyboard, setStoryboard] = useState<VideoStoryboard>(() => {
    if (activeVideoStoryboard && activeVideoStoryboard.scenes?.length > 0) {
      return activeVideoStoryboard;
    }
    return {
      id: `sb_${Date.now()}`,
      title: `60s Micro-Mastery: ${selectedNode.name}`,
      concept: selectedNode.keyConcept,
      target_misconception: selectedNode.typicalTrap,
      duration_secs: 60,
      total_duration_seconds: 60,
      key_takeaway: selectedNode.description,
      scenes: [
        {
          id: 'scene_1',
          scene_num: 1,
          time_range: '00:00 - 00:15',
          duration: 15,
          title: 'The Analogy: The Server Apartment Complex',
          visual_type: 'analogy' as VideoVisualType,
          on_screen_text: 'IP Address = Street Address\nPort = Specific Room Door\nDoor 80: HTTP Web Traffic\nDoor 3306: MySQL Database',
          narration: 'Imagine a server as an office building with dedicated doors. Port 80 is the front lobby for web pages, while port 3306 is the secure vault for MySQL databases.',
          visual_description: 'High-rise building with distinct front doors: Door 80 (HTTP) and Door 3306 (MySQL).',
        },
        {
          id: 'scene_2',
          scene_num: 2,
          time_range: '00:15 - 00:38',
          duration: 23,
          title: 'The Collision: Knocking on the Wrong Door',
          visual_type: 'diagram' as VideoVisualType,
          on_screen_text: 'Client: PDO("mysql:host=localhost;port=80")\nServer: HTTP/1.1 400 Bad Request\nResult: ✖ Connection Refused (Port 80 speaks HTTP!)',
          narration: 'When your PHP script tries to connect to port 80 with database credentials, the web server rejects the packet. It speaks HTTP, not MySQL!',
          visual_description: 'PHP script knocking on Door 80 with SQL queries. Door 80 slams shut with Connection Refused.',
        },
        {
          id: 'scene_3',
          scene_num: 3,
          time_range: '00:38 - 01:00',
          duration: 22,
          title: 'The Solution: Clean Port Handshake',
          visual_type: 'code_diff' as VideoVisualType,
          on_screen_text: '- const dsn = "mysql:host=localhost;port=80"; // Wrong Port\n+ const dsn = "mysql:host=localhost;port=3306"; // Dedicated Port\nStatus: ✔ 200 OK Handshake Verified',
          narration: 'Switch your connection string to port 3306. Now the MySQL daemon welcomes your driver, and your database connection succeeds instantly.',
          visual_description: 'PHP script rerouted to Door 3306. Green handshake complete, queries running smoothly.',
        },
      ],
    };
  });

  // Keep synced if activeVideoStoryboard changes externally (e.g. from Memory Tree)
  useEffect(() => {
    if (activeVideoStoryboard && activeVideoStoryboard.scenes?.length > 0) {
      setStoryboard(activeVideoStoryboard);
    }
  }, [activeVideoStoryboard]);

  // Editing state
  const [editingSceneIdx, setEditingSceneIdx] = useState<number>(0);
  const [customTopic, setCustomTopic] = useState('');
  const [isGeneratingAIVideo, setIsGeneratingAIVideo] = useState(false);

  // Video Rendering Pipeline State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Rendered Output State
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Saved Videos Library
  const [savedVideos, setSavedVideos] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Cinematic Veo Mode State
  const [veoJobId, setVeoJobId] = useState<string | null>(null);
  const [veoJobStatus, setVeoJobStatus] = useState<string | null>(null);
  const [veoProgress, setVeoProgress] = useState<number>(0);
  const [veoError, setVeoError] = useState<string | null>(null);

  // Live Canvas Interactive Preview Ref
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const totalCalculatedDuration = storyboard.scenes.reduce(
    (sum, s) => sum + (Number(s.duration) || Number(s.duration_seconds) || 15),
    0
  );

  // Draw preview canvas frame when editing or scrubbing preview
  useEffect(() => {
    if (!liveCanvasRef.current) return;
    const ctx = liveCanvasRef.current.getContext('2d');
    if (!ctx) return;
    drawVideoFrame(ctx, storyboard, previewTime, totalCalculatedDuration, renderResult?.audioAvailable ?? false);
  }, [storyboard, previewTime, totalCalculatedDuration, renderResult]);

  // Preview play timer
  useEffect(() => {
    let animId: number;
    if (previewPlaying) {
      const startTime = performance.now() - previewTime * 1000;
      const step = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= totalCalculatedDuration) {
          setPreviewTime(0);
          setPreviewPlaying(false);
        } else {
          setPreviewTime(elapsed);
          animId = requestAnimationFrame(step);
        }
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [previewPlaying, totalCalculatedDuration]);

  // Fetch saved videos library on demand
  const fetchSavedVideos = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetch('/api/video/list');
      if (res.ok) {
        const data = await res.json();
        setSavedVideos(data.videos || []);
      }
    } catch (e) {
      console.warn('Failed to load saved videos:', e);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library') {
      fetchSavedVideos();
    }
  }, [activeTab]);

  // Start 1280x720 Browser Canvas Rendering Pipeline
  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderProgress({
      percent: 0,
      currentSceneIndex: 0,
      currentSceneTitle: 'Starting Render Engine...',
      status: 'Initializing 1280x720 canvas and audio stream...',
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await renderStoryboardToVideo({
        storyboard,
        onProgress: prog => setRenderProgress(prog),
        signal: controller.signal,
      });

      setRenderResult(result);
      setActiveTab('preview');

      // Automatically save rendered video metadata & share token to database
      try {
        const saveRes = await fetch('/api/video/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: storyboard.title,
            topic: storyboard.topic || selectedNode.name,
            conceptId: selectedNode.id,
            durationSeconds: result.durationSeconds,
            storyboard,
            renderSettings: {
              resolution: '1280x720',
              fps: 30,
              mimeType: result.mimeType,
              audioAvailable: result.audioAvailable,
            },
            vttContent: result.vttContent,
            provider: 'canvas_browser',
          }),
        });

        if (saveRes.ok) {
          const saveData = await saveRes.json();
          setShareToken(saveData.shareToken);
        }
      } catch (saveErr) {
        console.warn('Auto-save to database failed:', saveErr);
      }
    } catch (err: any) {
      if (err?.message !== 'Render cancelled by user') {
        alert('Render failed: ' + err.message);
      }
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Cancel running render
  const handleCancelRender = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Download Video File (.mp4 or .webm)
  const handleDownloadVideo = () => {
    if (!renderResult) return;
    const a = document.createElement('a');
    a.href = renderResult.url;
    const ext = renderResult.mimeType.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${storyboard.title.replace(/[^a-z0-9]/gi, '_')}_1280x720.${ext}`;
    a.click();
  };

  // Download WebVTT Subtitle File (.vtt)
  const handleDownloadSubtitles = () => {
    const vtt = renderResult?.vttContent || generateVttContent(storyboard);
    const blob = new Blob([vtt], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-z0-9]/gi, '_')}_subtitles.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy shareable link
  const handleCopyShareLink = () => {
    if (!shareToken) return;
    const fullUrl = `${window.location.origin}/api/video/share/${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Generate Custom Storyboard via AI
  const handleGenerateCustomStoryboard = async (topicToGen: string) => {
    if (!topicToGen.trim()) return;
    setIsGeneratingAIVideo(true);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToGen,
          misconception: selectedNode.typicalTrap,
          subject_track: selectedNode.track,
        }),
      });
      const data = await res.json();
      setStoryboard(data);
      setActiveVideoStoryboard(data);
      setEditingSceneIdx(0);
      setRenderResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAIVideo(false);
    }
  };

  // Start Cinematic Mode (Veo Asynchronous Job)
  const handleStartCinematicVeo = async () => {
    setVeoError(null);
    setVeoJobStatus('STARTING');
    try {
      const res = await fetch('/api/video/cinematic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: storyboard.topic || selectedNode.name,
          misconception: storyboard.target_misconception || selectedNode.typicalTrap,
          durationSeconds: totalCalculatedDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to start cinematic generation');
      }

      setVeoJobId(data.jobId);
      setVeoJobStatus(data.status);

      // Poll job status
      const pollTimer = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/video/cinematic/status/${data.jobId}`);
          if (pollRes.ok) {
            const statusData = await pollRes.json();
            setVeoJobStatus(statusData.status);
            setVeoProgress(statusData.progressPercent);

            if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
              clearInterval(pollTimer);
              if (statusData.videoUrl) {
                setRenderResult({
                  blob: new Blob(),
                  mimeType: 'video/mp4',
                  url: statusData.videoUrl,
                  vttContent: generateVttContent(storyboard),
                  durationSeconds: totalCalculatedDuration,
                  audioAvailable: true,
                  provenance: 'CINEMATIC GEMINI VEO MODEL',
                });
                setActiveTab('preview');
              }
            }
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1000);
    } catch (err: any) {
      setVeoError(err.message || 'Veo generation error');
      setVeoJobStatus(null);
    }
  };

  // Scene editing helpers
  const handleUpdateScene = (index: number, field: keyof VideoScene, value: any) => {
    const updatedScenes = [...storyboard.scenes];
    updatedScenes[index] = {
      ...updatedScenes[index],
      [field]: value,
    };
    setStoryboard({
      ...storyboard,
      scenes: updatedScenes,
    });
  };

  const handleAddScene = () => {
    const newSceneNum = storyboard.scenes.length + 1;
    const newScene: VideoScene = {
      id: `scene_${Date.now()}`,
      scene_num: newSceneNum,
      duration: 15,
      title: `Scene ${newSceneNum}: Concept Invariant`,
      visual_type: 'diagram',
      on_screen_text: 'Key Invariant Check:\n• Step 1: Input Validation\n• Step 2: Protocol Alignment',
      narration: 'Verify that system constraints are respected before executing state transitions.',
    };
    setStoryboard({
      ...storyboard,
      scenes: [...storyboard.scenes, newScene],
    });
    setEditingSceneIdx(storyboard.scenes.length);
  };

  const handleDeleteScene = (index: number) => {
    if (storyboard.scenes.length <= 1) {
      alert('A storyboard must have at least one scene.');
      return;
    }
    const updated = storyboard.scenes.filter((_, idx) => idx !== index);
    setStoryboard({
      ...storyboard,
      scenes: updated,
    });
    setEditingSceneIdx(Math.max(0, index - 1));
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & WORKFLOW TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <Film className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              AI Micro-Video Studio (1280x720 HD)
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Dual-Coding Audio & Visual
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>{storyboard.title}</span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              {totalCalculatedDuration}s Duration
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Edit scene scripts, diagrams, and narrations. Export downloadable 1280x720 video files with synchronized server TTS audio and WebVTT subtitles.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Storyboard Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Output & Preview</span>
            {renderResult && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saved Videos</span>
          </button>
        </div>
      </div>

      {/* 2. RENDER PROGRESS MODAL OVERLAY */}
      {isRendering && renderProgress && (
        <div className="bg-slate-900/95 border-2 border-indigo-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-950 text-indigo-400 rounded-xl animate-pulse">
                <Video className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Rendering 1280x720 Video ({renderProgress.percent}%)
                </h3>
                <p className="text-xs text-indigo-300 font-mono">{renderProgress.status}</p>
              </div>
            </div>
            <button
              onClick={handleCancelRender}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Render</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full transition-all duration-150"
              style={{ width: `${renderProgress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Current: {renderProgress.currentSceneTitle}</span>
            <span>Target Resolution: 1280x720 @ 30fps</span>
          </div>
        </div>
      )}

      {/* 3. ENGINE SELECTION BAR (CANVAS vs OPTIONAL VEO) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">Rendering Engine:</span>
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setEngineMode('canvas')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                engineMode === 'canvas'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Browser Canvas 1280x720 (Fast, Free)
            </button>
            <button
              onClick={() => setEngineMode('veo')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                engineMode === 'veo'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cinematic Mode (Gemini Veo)
            </button>
          </div>
        </div>

        {engineMode === 'canvas' ? (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero GPU quota cost • Instant local render • MediaRecorder capture</span>
          </div>
        ) : (
          <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Veo generative video: ~$0.20/s compute cost. Requires GEMINI_VIDEO_MODEL in .env.</span>
          </div>
        )}
      </div>

      {/* 4. WORKSPACE TABS */}

      {/* TAB 1: STORYBOARD & SCENE EDITOR */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SCENE LIST & METADATA (4 COLS) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Scenes ({storyboard.scenes.length})
                </span>
                <span className="text-xs font-mono text-indigo-400">
                  Total: {totalCalculatedDuration}s
                </span>
              </div>

              {/* Scene Cards List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {storyboard.scenes.map((scene, idx) => {
                  const isSelected = editingSceneIdx === idx;
                  const duration = scene.duration || scene.duration_seconds || 15;
                  return (
                    <div
                      key={scene.id || idx}
                      onClick={() => setEditingSceneIdx(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-indigo-300">
                          Scene {idx + 1}: {scene.visual_type || 'diagram'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {duration}s
                          </span>
                          {storyboard.scenes.length > 1 && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteScene(idx);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                              title="Delete Scene"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-200 truncate">{scene.title || 'Untitled Scene'}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{scene.narration}</p>
                    </div>
                  );
                })}
              </div>

              {/* Add Scene Button */}
              <button
                onClick={handleAddScene}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Scene</span>
              </button>

              {/* RENDER ACTION BUTTON */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {engineMode === 'canvas' ? (
                  <button
                    onClick={handleStartRender}
                    disabled={isRendering}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Video className="w-4 h-4" />
                    <span>Render 1280x720 Video</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartCinematicVeo}
                    disabled={veoJobStatus === 'PROCESSING'}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{veoJobStatus === 'PROCESSING' ? `Generating Veo (${veoProgress}%)...` : 'Submit Veo Generation'}</span>
                  </button>
                )}

                {veoError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-900/60">
                    {veoError}
                  </p>
                )}
              </div>

              {/* Auto-generate new video prompt */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate AI Storyboard</span>
                </div>
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="e.g. Inode Exhaustion, Race Conditions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleGenerateCustomStoryboard(customTopic)}
                  disabled={isGeneratingAIVideo || !customTopic.trim()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAIVideo ? 'Generating...' : 'Regenerate Storyboard'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: DETAILED SCENE EDITOR (8 COLS) */}
          <div className="lg:col-span-8 space-y-4">
            {storyboard.scenes[editingSceneIdx] && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 font-bold rounded-lg border border-indigo-800/60 text-xs">
                      Scene {editingSceneIdx + 1} Editor
                    </span>
                    <span className="text-sm font-bold text-white">
                      {storyboard.scenes[editingSceneIdx].title || 'Configure Scene'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Scene duration: {storyboard.scenes[editingSceneIdx].duration || 15}s
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scene Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Scene Title</label>
                    <input
                      type="text"
                      value={storyboard.scenes[editingSceneIdx].title || ''}
                      onChange={e => handleUpdateScene(editingSceneIdx, 'title', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Visual Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Visual Animation Type</label>
                    <select
                      value={storyboard.scenes[editingSceneIdx].visual_type || 'diagram'}
                      onChange={e =>
                        handleUpdateScene(editingSceneIdx, 'visual_type', e.target.value as VideoVisualType)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="analogy">Analogy (Server Building & Doors)</option>
                      <option value="diagram">Architecture Diagram (Client/Server Socket Bus)</option>
                      <option value="code_diff">Code Diff (Red Reject / Green Handshake)</option>
                      <option value="flowchart">Flowchart (Connection State Progression)</option>
                    </select>
                  </div>

                  {/* Duration Slider */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">
                        Scene Duration: {storyboard.scenes[editingSceneIdx].duration || 15} Seconds
                      </label>
                      <span className="text-slate-500 text-[11px]">Recommended: 10 to 30s per scene</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={45}
                      step={1}
                      value={storyboard.scenes[editingSceneIdx].duration || 15}
                      onChange={e =>
                        handleUpdateScene(editingSceneIdx, 'duration', parseInt(e.target.value, 10))
                      }
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* On-Screen Text / Code Diff */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">
                      On-Screen Text & Diagnostic Invariants (Rendered directly onto 1280x720 canvas)
                    </label>
                    <textarea
                      rows={3}
                      value={storyboard.scenes[editingSceneIdx].on_screen_text || ''}
                      onChange={e => handleUpdateScene(editingSceneIdx, 'on_screen_text', e.target.value)}
                      placeholder="e.g. - const dsn = 'mysql:host=localhost;port=80';\n+ const dsn = 'mysql:host=localhost;port=3306';"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Narration Script */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Narration Script (Voiceover audio & synchronized subtitles)</span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        TTS Synced
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={storyboard.scenes[editingSceneIdx].narration || ''}
                      onChange={e => handleUpdateScene(editingSceneIdx, 'narration', e.target.value)}
                      placeholder="Spoken voiceover script..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                    />
                  </div>
                </div>

                {/* LIVE CANVAS INTERACTIVE PREVIEW */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live 1280x720 Canvas Frame Preview</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewPlaying(p => !p)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{previewPlaying ? 'Pause' : 'Play Preview'}</span>
                      </button>
                      <button
                        onClick={() => setPreviewTime(0)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                        title="Reset Preview"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Canvas Viewport (16:9 ratio) */}
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner relative flex items-center justify-center">
                    <canvas
                      ref={liveCanvasRef}
                      width={1280}
                      height={720}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Scrubber */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      {Math.floor(previewTime)}s / {totalCalculatedDuration}s
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={totalCalculatedDuration}
                      step={0.5}
                      value={previewTime}
                      onChange={e => setPreviewTime(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREVIEW PLAYER & DOWNLOADABLE ASSETS */}
      {activeTab === 'preview' && (
        <div className="space-y-6 animate-fade-in">
          {renderResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* VIDEO PLAYER (8 COLS) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center">
                  <video
                    controls
                    src={renderResult.url}
                    className="w-full h-full object-contain"
                    autoPlay
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Audio Status Banner */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    renderResult.audioAvailable
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {renderResult.audioAvailable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>
                      {renderResult.audioAvailable
                        ? 'Real Gemini TTS audio voiceover mixed directly into video track via AudioContext destination.'
                        : 'TTS unavailable; video rendered with synchronized captions only (per export rules, speechSynthesis is not mixed into files).'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold uppercase shrink-0">
                    {renderResult.provenance}
                  </span>
                </div>
              </div>

              {/* DOWNLOAD & SHARE ASSETS (4 COLS) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Export & Download Package</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1280x720 video file ready for offline revision, VLC player, or mobile import.
                    </p>
                  </div>

                  {/* Download Video Button */}
                  <button
                    onClick={handleDownloadVideo}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Video ({renderResult.mimeType.includes('mp4') ? '.mp4' : '.webm'})</span>
                  </button>

                  {/* Download Subtitles Button */}
                  <button
                    onClick={handleDownloadSubtitles}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>Download Subtitles (.vtt)</span>
                  </button>

                  {/* Shareable Link Widget */}
                  {shareToken && (
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Shareable Link (Saved in Database)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/api/video/share/${shareToken}`}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 select-all"
                        />
                        <button
                          onClick={handleCopyShareLink}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                          title="Copy Link"
                        >
                          {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Return to Editor */}
                  <button
                    onClick={() => setActiveTab('editor')}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
                  >
                    ← Edit Storyboard & Re-render
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 bg-indigo-950/80 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-800/60">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">No Video Rendered Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click "Render 1280x720 Video" in the Storyboard Editor to compile your scenes, diagrams, and narration into a playable, downloadable video file.
              </p>
              <button
                onClick={() => setActiveTab('editor')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Go to Storyboard Editor</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED VIDEOS LIBRARY */}
      {activeTab === 'library' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Saved Rendered Videos</span>
              </h3>
              <p className="text-xs text-slate-400">
                All videos rendered by your account stored in the SQLite database.
              </p>
            </div>
            <button
              onClick={fetchSavedVideos}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
            >
              Refresh Library
            </button>
          </div>

          {isLoadingLibrary ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading videos...</div>
          ) : savedVideos.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No saved videos found in your account yet. Render a video to see it here!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedVideos.map(vid => (
                <div
                  key={vid.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-indigo-400 font-bold uppercase">
                      {vid.provider || 'Canvas HD'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {vid.durationSeconds}s
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{vid.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Topic: {vid.topic}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setStoryboard(vid.storyboard);
                        setActiveTab('editor');
                      }}
                      className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Load Editor
                    </button>
                    {vid.shareToken && (
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/video/share/${vid.shareToken}`;
                          navigator.clipboard.writeText(url);
                          alert('Copied share link to clipboard!');
                        }}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                        title="Copy Share Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
