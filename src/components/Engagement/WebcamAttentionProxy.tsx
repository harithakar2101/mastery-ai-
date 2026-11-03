import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Shield, Activity, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface WebcamAttentionProxyProps {
  onMotionUpdate: (motionScore: number, presenceDetected: boolean) => void;
}

export const WebcamAttentionProxy: React.FC<WebcamAttentionProxyProps> = ({ onMotionUpdate }) => {
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [motionPercent, setMotionPercent] = useState<number>(0);
  const [presence, setPresence] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const animFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    if (!hasConsent) return;
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 160, height: 120, frameRate: 10 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
    } catch (err: any) {
      console.warn('Webcam proxy initialization failed:', err);
      setErrorMsg(err.message || 'Camera access declined or unavailable.');
      setIsActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    prevFrameData.current = null;
    setIsActive(false);
    setMotionPercent(0);
    setPresence(false);
    onMotionUpdate(0, false);
  };

  // Local frame differencing loop
  useEffect(() => {
    if (!isActive) return;

    let lastCompute = Date.now();
    const computeDifference = () => {
      const now = Date.now();
      if (now - lastCompute >= 150 && videoRef.current && canvasRef.current) {
        lastCompute = now;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          canvas.width = 80;
          canvas.height = 60;
          ctx.drawImage(video, 0, 0, 80, 60);

          try {
            const currentImg = ctx.getImageData(0, 0, 80, 60);
            const data = currentImg.data;

            if (prevFrameData.current && prevFrameData.current.length === data.length) {
              let totalDiff = 0;
              const numPixels = data.length / 4;

              for (let i = 0; i < data.length; i += 4) {
                // Grayscale luminance
                const g1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const g0 =
                  0.299 * prevFrameData.current[i] +
                  0.587 * prevFrameData.current[i + 1] +
                  0.114 * prevFrameData.current[i + 2];
                totalDiff += Math.abs(g1 - g0);
              }

              const avgDiff = totalDiff / numPixels;
              // Scale to 0-100%
              const score = Math.min(100, Math.round((avgDiff / 32) * 100));
              const isPresent = score > 2 || avgDiff > 1.2;

              setMotionPercent(score);
              setPresence(isPresent);
              onMotionUpdate(score, isPresent);
            }

            prevFrameData.current = new Uint8ClampedArray(data);
          } catch (e) {
            // Context read error handling
          }
        }
      }
      animFrameId.current = requestAnimationFrame(computeDifference);
    };

    animFrameId.current = requestAnimationFrame(computeDifference);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isActive, onMotionUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="bg-[#0b1321] border border-[#1b2b42] rounded-2xl p-4 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#16253a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">Local Presence & Motion Proxy</h3>
            <p className="text-[10px] text-slate-400">
              Computed 100% in-browser via frame differencing. Zero frame upload.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
          REAL SENSOR
        </span>
      </div>

      {/* Explicit Consent Guard */}
      {!hasConsent ? (
        <div className="bg-[#070d18] border border-amber-900/40 rounded-xl p-3 text-xs space-y-2.5">
          <div className="flex items-start gap-2 text-amber-300">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="text-[11px] leading-relaxed">
              <strong>Explicit Privacy Consent Required:</strong> This optical proxy tracks presence and micromotion
              by differencing local pixel values. It does <strong>not</strong> perform facial recognition or emotion
              detection. All video stream pixels are discarded instantly and never transmitted over the network.
            </p>
          </div>

          <label className="flex items-center gap-2 text-slate-200 text-xs font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={e => setHasConsent(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>I consent to local in-memory frame differencing for engagement timing.</span>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Controls & Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={isActive ? stopWebcam : startWebcam}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40'
                }`}
              >
                {isActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{isActive ? 'Turn Off Webcam' : 'Activate Optical Proxy'}</span>
              </button>

              <button
                onClick={() => {
                  stopWebcam();
                  setHasConsent(false);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Revoke Consent
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                {presence ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Student Present
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    Inactive / Idle
                  </span>
                )}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-2.5 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Preview & Motion Gauge */}
          {isActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Video Element */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <span className="absolute bottom-1.5 left-2 text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-emerald-400">
                  Local V8 Feed (80x60 differencer)
                </span>
              </div>

              {/* Real-time telemetry gauges */}
              <div className="bg-[#070c16] rounded-xl p-3 border border-[#162338] flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Frame Delta Metric (Motion)</span>
                    <span className="font-mono text-indigo-300 font-bold">{motionPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        motionPercent > 15 ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, motionPercent * 2)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-snug">
                  <div>
                    Optical Proxy Status:{' '}
                    <strong className={presence ? 'text-emerald-400' : 'text-amber-400'}>
                      {presence ? 'Active Attention' : 'Low / No Motion Detected'}
                    </strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Rule: Influences when the tutor checks in. Does not modify mastery scores.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
