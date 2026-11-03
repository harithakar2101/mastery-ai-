import React, { useState, useEffect, useRef } from 'react';
import { useTutor } from '../../context/TutorContext';
import { VideoStoryboard, VideoScene } from '../../types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Sparkles, Film, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const AIVideoPlayer: React.FC = () => {
  const { selectedNode, activeVideoStoryboard, setActiveVideoStoryboard } = useTutor();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 60 seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const duration = 60; // 60 seconds
  const timerRef = useRef<number | null>(null);

  // Default storyboard fallback if none provided
  const currentStoryboard: VideoStoryboard = activeVideoStoryboard || {
    title: `60s Micro-Mastery: ${selectedNode.name}`,
    duration_secs: 60,
    concept: selectedNode.keyConcept,
    key_takeaway: selectedNode.description,
    scenes: [
      {
        time: '0-15s',
        visual: 'Visualizing server architecture: Server high-rise building with Door 80 (HTTP) and Door 3306 (MySQL).',
        narration: 'Imagine a server as an office building with dedicated doors. Port 80 is the front lobby for web pages, while port 3306 is the secure vault for MySQL databases.',
        animation_type: 'network_packet',
      },
      {
        time: '15-40s',
        visual: 'PHP script knocking on Door 80 with SQL queries. Door 80 slams shut with Connection Refused.',
        narration: 'When your PHP script tries to connect to port 80 with database credentials, the web server rejects the packet. It speaks HTTP, not MySQL!',
        animation_type: 'comparison',
      },
      {
        time: '40-60s',
        visual: 'PHP script rerouted to Door 3306. Green handshake complete, queries running smoothly.',
        narration: 'Switch your connection string to port 3306. Now the MySQL daemon welcomes your driver, and your database connection succeeds instantly.',
        animation_type: 'code_diff',
      },
    ],
  };

  // Determine active scene based on currentTime
  let activeSceneIndex = 0;
  if (currentTime < 15) activeSceneIndex = 0;
  else if (currentTime < 40) activeSceneIndex = 1;
  else activeSceneIndex = 2;

  const activeScene: VideoScene = currentStoryboard.scenes[activeSceneIndex] || currentStoryboard.scenes[0];

  // Speech synthesis for active scene narration
  useEffect(() => {
    if (!isPlaying || isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeScene.narration);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [activeSceneIndex, isPlaying, isVoiceMuted, playbackSpeed]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return +(prev + 0.5 * playbackSpeed).toFixed(1);
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleGenerateCustomVideo = async (topicToGen: string) => {
    if (!topicToGen.trim()) return;
    setIsGenerating(true);
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
      setActiveVideoStoryboard(data);
      setCurrentTime(0);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export video storyboard & offline package
  const handleExportOfflineVideo = () => {
    const markdownContent = `# ${currentStoryboard.title}
**Duration:** 60 Seconds
**Core Concept:** ${currentStoryboard.concept || selectedNode.keyConcept}
**Key Takeaway:** ${currentStoryboard.key_takeaway || selectedNode.description}

---
## Video Storyboard & Script

### Scene 1 (${currentStoryboard.scenes[0]?.time}) - Setup & Analogy
- **Visual Display:** ${currentStoryboard.scenes[0]?.visual}
- **Narration:** "${currentStoryboard.scenes[0]?.narration}"

### Scene 2 (${currentStoryboard.scenes[1]?.time}) - The Collision & Trap
- **Visual Display:** ${currentStoryboard.scenes[1]?.visual}
- **Narration:** "${currentStoryboard.scenes[1]?.narration}"

### Scene 3 (${currentStoryboard.scenes[2]?.time}) - Socratic Resolution
- **Visual Display:** ${currentStoryboard.scenes[2]?.visual}
- **Narration:** "${currentStoryboard.scenes[2]?.narration}"

---
Generated by CogniCSE Pedagogical 1-on-1 Learning Support System for offline mobile revision.`;

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStoryboard.title.replace(/[^a-z0-9]/gi, '_')}_Offline_Script.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-violet-950 text-violet-400 rounded-lg border border-violet-800/60">
              <Film className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
              60-Second Pedagogical Micro-Video Generator
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{currentStoryboard.title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Empirically proven to dismantle misconceptions in 60 seconds through multi-modal dual-coding (synchronized audio narration + visual animated mental models).
          </p>
        </div>

        <button
          onClick={handleExportOfflineVideo}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          Export Offline Video Pack
        </button>
      </div>

      {/* VIDEO PLAYER STAGE & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* VIDEO DISPLAY CANVAS (8 COLS) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex flex-col justify-between">
            {/* Top Bar Overlay */}
            <div className="p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
              <span className="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                Scene {activeSceneIndex + 1}/3: {activeScene.time}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dual-Coding Engine Active
                </span>
              </div>
            </div>

            {/* DYNAMIC ANIMATED SCENE CANVAS */}
            <div className="absolute inset-0 flex items-center justify-center p-6 select-none overflow-hidden">
              {/* SCENE 1: BUILDING & DOORS ANALOGY */}
              {activeSceneIndex === 0 && (
                <div className="w-full max-w-lg flex flex-col items-center animate-fade-in">
                  <div className="text-center mb-4">
                    <span className="text-xs text-indigo-400 font-mono uppercase tracking-wider block">
                      Analogy: The Server Apartment Complex
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      IP Address gets you to the building. The Port picks the exact room.
                    </span>
                  </div>

                  <div className="w-full flex justify-center gap-6">
                    {/* Door 80 (HTTP) */}
                    <div className="p-4 bg-slate-900 border-2 border-indigo-500/50 rounded-xl flex flex-col items-center w-36 text-center">
                      <div className="w-10 h-10 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-sm mb-2">
                        80
                      </div>
                      <div className="text-xs font-bold text-slate-200">Door 80</div>
                      <div className="text-[10px] text-slate-400">HTTP Web Traffic</div>
                      <div className="mt-2 text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        Apache / Nginx
                      </div>
                    </div>

                    {/* Door 3306 (MySQL) */}
                    <div className="p-4 bg-slate-900 border-2 border-emerald-500/50 rounded-xl flex flex-col items-center w-36 text-center ring-2 ring-emerald-500/20">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                        3306
                      </div>
                      <div className="text-xs font-bold text-emerald-300">Door 3306</div>
                      <div className="text-[10px] text-slate-400">MySQL Database</div>
                      <div className="mt-2 text-[9px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded">
                        mysqld Daemon
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 2: THE REJECTION COLLISION */}
              {activeSceneIndex === 1 && (
                <div className="w-full max-w-lg flex flex-col items-center animate-fade-in">
                  <div className="text-center mb-4">
                    <span className="text-xs text-rose-400 font-mono uppercase tracking-wider block">
                      The Collision: Knocking on Port 80
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      Web server receives raw database bytes and throws Connection Refused!
                    </span>
                  </div>

                  <div className="p-5 bg-rose-950/40 border-2 border-rose-600 rounded-2xl w-full flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-rose-300 font-bold font-mono">PHP PDO Client</div>
                      <div className="text-slate-300 text-[11px] font-mono">
                        DSN: "mysql:host=localhost;port=80"
                      </div>
                    </div>
                    <div className="text-rose-400 font-mono font-bold text-lg">✖ REJECTED</div>
                    <div className="space-y-1 text-right text-xs">
                      <div className="text-slate-400 font-mono">Port 80 (HTTP)</div>
                      <div className="text-rose-400 text-[11px] font-bold">SQLSTATE[HY000] [2002]</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 3: THE RESOLUTION */}
              {activeSceneIndex === 2 && (
                <div className="w-full max-w-lg flex flex-col items-center animate-fade-in">
                  <div className="text-center mb-4">
                    <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider block">
                      The Resolution: Seamless Port 3306 Handshake
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      Changing port to 3306 establishes instant socket authentication!
                    </span>
                  </div>

                  <div className="p-5 bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl w-full flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-emerald-300 font-bold font-mono">PHP PDO Client</div>
                      <div className="text-emerald-200 text-[11px] font-mono font-bold">
                        DSN: "mysql:host=localhost;port=3306"
                      </div>
                    </div>
                    <div className="text-emerald-400 font-mono font-bold text-lg flex items-center gap-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> 200 OK
                    </div>
                    <div className="space-y-1 text-right text-xs">
                      <div className="text-slate-300 font-mono">Port 3306 (mysqld)</div>
                      <div className="text-emerald-300 text-[11px] font-bold">Handshake ACK Verified</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Subtitles & Caption Box */}
            <div className="p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-10">
              <div className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-center">
                <span className="text-xs text-indigo-200 font-medium leading-relaxed">
                  "{activeScene.narration}"
                </span>
              </div>
            </div>
          </div>

          {/* PLAYBACK CONTROLS BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                onClick={handleRestart}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Restart Video"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsVoiceMuted(prev => !prev)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isVoiceMuted ? 'bg-rose-950/60 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'
                }`}
                title={isVoiceMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
              >
                {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Scrubber */}
            <div className="flex-1 w-full flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 shrink-0">
                {Math.floor(currentTime)}s / {duration}s
              </span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.5}
                value={currentTime}
                onChange={e => setCurrentTime(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 shrink-0">
              {[1, 1.25, 1.5].map(spd => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    playbackSpeed === spd ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SCENE STORYBOARD LIST & GENERATOR (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Video Storyboard Scenes
              </div>
              <span className="text-xs font-mono text-slate-400">3 Scenes (60s)</span>
            </div>

            <div className="space-y-2.5">
              {currentStoryboard.scenes.map((scene, i) => {
                const isActive = activeSceneIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (i === 0) setCurrentTime(0);
                      else if (i === 1) setCurrentTime(15);
                      else setCurrentTime(40);
                      setIsPlaying(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-950/60 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-indigo-300">Scene {i + 1}</span>
                      <span className="font-mono text-[10px] text-slate-500">{scene.time}</span>
                    </div>
                    <p className="text-xs line-clamp-2 leading-relaxed text-slate-300">{scene.narration}</p>
                  </button>
                );
              })}
            </div>

            {/* GENERATE CUSTOM VIDEO PROMPT */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Generate Video for Any CSE Topic
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="e.g. Recursion Stack Overflow, Deadlocks"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleGenerateCustomVideo(customTopic)}
                  disabled={isGenerating || !customTopic.trim()}
                  className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGenerating ? 'Generating Video Storyboard...' : 'Generate New 60s Video'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
