import React, { useState, useEffect } from 'react';
import {
  Settings,
  Vibrate,
  Eye,
  Sliders,
  Shield,
  VolumeX,
  Volume2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface InclusiveSettingsViewProps {
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  reducedMotion?: boolean;
  onToggleReducedMotion?: () => void;
  userRole?: string;
}

export const InclusiveSettingsView: React.FC<InclusiveSettingsViewProps> = ({
  highContrast = false,
  onToggleHighContrast,
  reducedMotion = false,
  onToggleReducedMotion,
  userRole = 'teacher',
}) => {
  const [vibrationIntensity, setVibrationIntensity] = useState<number>(80);
  const [sensorConsent, setSensorConsent] = useState<boolean>(true);
  const [audioAlertsDisabled, setAudioAlertsDisabled] = useState<boolean>(true);
  const [mlInsightsEnabled, setMlInsightsEnabled] = useState<boolean>(false);
  const [hrThresholdHigh, setHrThresholdHigh] = useState<number>(130);
  const [hrThresholdLow, setHrThresholdLow] = useState<number>(48);
  const [gsrThreshold, setGsrThreshold] = useState<number>(25.0);
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(180);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load persisted settings
    fetch('/api/inclusive/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSensorConsent(data.settings.sensor_consent_enabled ?? true);
          setAudioAlertsDisabled(data.settings.audio_alerts_disabled ?? true);
          setDataRetentionDays(data.settings.data_retention_days ?? 180);
        }
      })
      .catch(err => console.error('Failed to load settings', err));
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/inclusive/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sensor_consent_enabled: sensorConsent,
          audio_alerts_disabled: audioAlertsDisabled,
          high_contrast_mode: highContrast,
          data_retention_days: dataRetentionDays,
          wearable_ml_insights_enabled: String(mlInsightsEnabled),
        }),
      });

      if (res.ok) {
        setSaveStatus('✓ Inclusive Hub settings saved successfully.');
        setTimeout(() => setSaveStatus(null), 3500);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      setSaveStatus('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

  return (
    <div className="space-y-6 max-w-4xl" role="region" aria-label="Inclusive Assistive Hub Settings">
      {/* Title */}
      <div
        className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Inclusive Accessibility & Hardware Settings</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure haptic motor intensity, WCAG AAA accessibility, sensor consent, and alert policies.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
            highContrast
              ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {saveStatus && (
        <div
          className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* 1. Haptic & Tactile Customization */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-2 text-slate-200">
          <Vibrate className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-base">Wearable Haptic Feedback Motor Intensity</h3>
        </div>
        <p className="text-xs text-slate-400">
          Controls the PWM vibration amplitude sent to the ESP32 DRV2605L motor driver for tactile acknowledgements.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300">Tactile Intensity:</span>
            <span className="text-purple-400 font-bold">{vibrationIntensity}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={vibrationIntensity}
            onChange={e => setVibrationIntensity(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
            aria-label="Vibration intensity slider"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Gentle (20%)</span>
            <span>Balanced (70%)</span>
            <span>High Intensity (100%)</span>
          </div>
        </div>
      </div>

      {/* 2. Visual Accessibility & Display (WCAG AAA) */}
      <div
        className={`p-6 rounded-2xl border space-y-5 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-2 text-slate-200">
          <Eye className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base">WCAG AAA Accessibility & Display Controls</h3>
        </div>
        <p className="text-xs text-slate-400">
          Ensure compliance with WCAG AAA contrast guidelines (&gt;= 7:1 ratio), bold outlines, and vestibular motion preferences.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* High Contrast Mode */}
          <div className="p-4 rounded-xl bg-[#111c30] border border-[#1e293b] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-slate-200 block">High Contrast Mode</span>
              <span className="text-[11px] text-slate-400 block">
                Pure black/white background, 4px borders, zero subtle gradients.
              </span>
            </div>
            <button
              onClick={onToggleHighContrast}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                highContrast
                  ? 'bg-yellow-400 text-black border-2 border-black'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
              aria-pressed={highContrast}
            >
              {highContrast ? 'ENABLED (ON)' : 'DISABLED'}
            </button>
          </div>

          {/* Reduced Motion Mode */}
          <div className="p-4 rounded-xl bg-[#111c30] border border-[#1e293b] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-slate-200 block">Reduced Motion</span>
              <span className="text-[11px] text-slate-400 block">
                Disables animated pulsing, spin animations, and marquee tickers.
              </span>
            </div>
            <button
              onClick={onToggleReducedMotion}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                reducedMotion
                  ? 'bg-cyan-500 text-black border-2 border-black'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
              aria-pressed={reducedMotion}
            >
              {reducedMotion ? 'ENABLED (ON)' : 'DISABLED'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sensor Consent & Audio Alert Environment */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-2 text-slate-200">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base">Privacy, Sensor Consent & Acoustic Policy</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111c30] border border-[#1e293b] cursor-pointer">
            <input
              type="checkbox"
              checked={sensorConsent}
              onChange={e => setSensorConsent(e.target.checked)}
              className="mt-1 accent-emerald-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">Student Telemetry Consent Protocol</span>
              <span className="text-slate-400">
                Require explicit confirmation before transmitting heart rate, EDA, or motion data. Readings are strictly anonymized and purged per retention policy.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111c30] border border-[#1e293b] cursor-pointer">
            <input
              type="checkbox"
              checked={audioAlertsDisabled}
              onChange={e => setAudioAlertsDisabled(e.target.checked)}
              className="mt-1 accent-indigo-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">Auditory Silence Mode (Default Active)</span>
              <span className="text-slate-400">
                Disables computer chimes and buzzers in classroom settings to preserve a distraction-free sensory environment. Visual banners and haptic feedback replace sound.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Teacher/Admin Thresholds & Experimental ML Scaffold */}
      {isTeacherOrAdmin && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-[#1e293b]">
            <div className="flex items-center gap-2 text-slate-200">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base">Faculty Alert Threshold Adjustments</h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              Faculty / Admin Role Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <label className="text-slate-400 font-medium block">HR Upper Threshold</label>
              <input
                type="number"
                value={hrThresholdHigh}
                onChange={e => setHrThresholdHigh(Number(e.target.value))}
                className="w-full p-1.5 rounded bg-[#1e293b] text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500">Flag when &gt; BPM</span>
            </div>

            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <label className="text-slate-400 font-medium block">HR Lower Threshold</label>
              <input
                type="number"
                value={hrThresholdLow}
                onChange={e => setHrThresholdLow(Number(e.target.value))}
                className="w-full p-1.5 rounded bg-[#1e293b] text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500">Flag when &lt; BPM</span>
            </div>

            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <label className="text-slate-400 font-medium block">GSR Arousal Limit (µS)</label>
              <input
                type="number"
                step="0.5"
                value={gsrThreshold}
                onChange={e => setGsrThreshold(Number(e.target.value))}
                className="w-full p-1.5 rounded bg-[#1e293b] text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500">Flag elevated skin response</span>
            </div>
          </div>

          {/* Experimental ML Scaffold Toggle */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs text-purple-200">
                  Experimental Assistive ML Insights (Feature Flag: WEARABLE_ML_INSIGHTS)
                </span>
              </div>
              <button
                onClick={() => setMlInsightsEnabled(!mlInsightsEnabled)}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                  mlInsightsEnabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {mlInsightsEnabled ? 'ENABLED' : 'OFF (Default)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Surfaces gentle heuristic suggestions in the Teacher Console (e.g. suggesting a 5-minute break after repeated help triggers).
              <strong> Strictly non-diagnostic and never alters student cognitive mastery scores.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
