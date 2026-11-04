import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Heart,
  Droplet,
  Zap,
  Compass,
  AlertTriangle,
  Info,
  Sliders,
  Send,
  RefreshCw,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { SensorReading, DataSource } from './types';

interface SensorMonitoringViewProps {
  highContrast?: boolean;
}

export const SensorMonitoringView: React.FC<SensorMonitoringViewProps> = ({
  highContrast = false,
}) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('ESP32-01');

  // Interactive Simulation Sliders
  const [simHeartRate, setSimHeartRate] = useState<number>(75);
  const [simSpO2, setSimSpO2] = useState<number>(98);
  const [simGSR, setSimGSR] = useState<number>(12.5);
  const [simAccelX, setSimAccelX] = useState<number>(0.05);
  const [simAccelY, setSimAccelY] = useState<number>(-0.12);
  const [simAccelZ, setSimAccelZ] = useState<number>(0.98);
  const [simTemp, setSimTemp] = useState<number>(36.6);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [injectionFeedback, setInjectionFeedback] = useState<string | null>(null);

  const fetchReadings = async () => {
    try {
      const res = await fetch('/api/inclusive/sensors?limit=60', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.readings) {
          setReadings(data.readings);
        }
      }
    } catch (err) {
      console.error('Failed to load sensor telemetry', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();

    const evtSource = new EventSource('/api/inclusive/stream');
    evtSource.addEventListener('sensor_reading', (e: MessageEvent) => {
      try {
        const reading = JSON.parse(e.data);
        if (reading && reading.id) {
          setReadings(prev => [reading, ...prev.slice(0, 59)]);
        }
      } catch (err) {
        console.error('Sensor SSE parse error', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const handleInjectTelemetry = async () => {
    setIsInjecting(true);
    setInjectionFeedback(null);
    try {
      const payload = {
        device_id: selectedDevice,
        student_id: selectedDevice === 'ESP32-01' ? 'STU_SIM_A' : selectedDevice === 'ESP32-02' ? 'STU_SIM_B' : 'STU_SIM_C',
        heart_rate: Number(simHeartRate),
        spo2: Number(simSpO2),
        gsr_eda: Number(simGSR),
        accel_x: Number(simAccelX),
        accel_y: Number(simAccelY),
        accel_z: Number(simAccelZ),
        temp_c: Number(simTemp),
        source: 'simulation',
        timestamp: new Date().toISOString(),
      };

      const res = await fetch('/api/inclusive/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setInjectionFeedback(
          result.review_flag
            ? '⚠️ Flagged for Teacher Review (Anomaly threshold exceeded)'
            : '✓ Telemetry logged within nominal parameters'
        );
      }
    } catch (err) {
      console.error('Injection error', err);
      setInjectionFeedback('Error transmitting simulated sensor reading');
    } finally {
      setIsInjecting(false);
    }
  };

  // Recent readings filtered by device
  const deviceReadings = useMemo(() => {
    return readings.filter(r => r.device_id === selectedDevice);
  }, [readings, selectedDevice]);

  const latestReading = deviceReadings[0] || readings[0] || null;

  return (
    <div className="space-y-6" role="region" aria-label="Wearable Sensor Telemetry">
      {/* Prominent Ethical & Non-Diagnostic Disclaimer */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 ${
          highContrast
            ? 'bg-black text-white border-2 border-white'
            : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
        }`}
        role="note"
      >
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm text-blue-100">
            Clinical & Non-Diagnostic Advisory Notice
          </p>
          <p className="opacity-90">
            Sensor readings (Heart Rate, SpO2, Electrodermal Activity, Accelerometer) cannot confirm stress, discomfort, or cognitive focus.
            They serve purely as experimental contextual telemetry and <strong>never modify student mastery scores or ISLM parameters</strong>.
            Student-initiated wearable requests remain the authoritative primary signal.
          </p>
        </div>
      </div>

      {/* Device Selector & Live Stats Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-3">
          <label htmlFor="device-selector" className="text-xs font-semibold text-slate-400">
            Telemetry Feed:
          </label>
          <select
            id="device-selector"
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border ${
              highContrast
                ? 'bg-white text-black border-2 border-black'
                : 'bg-[#1e293b] text-slate-200 border-[#334155]'
            }`}
          >
            <option value="ESP32-01">ESP32-01 (Student A - BLIND)</option>
            <option value="ESP32-02">ESP32-02 (Student B - DEAF)</option>
            <option value="ESP32-03">ESP32-03 (Student C - NON_SPEAKING)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {latestReading?.source === 'simulation' ? (
            <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              SIMULATED SENSOR STREAM
            </span>
          ) : (
            <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              HARDWARE TELEMETRY
            </span>
          )}

          <button
            onClick={fetchReadings}
            disabled={isLoading}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-white cursor-pointer ${
              highContrast ? 'border-white' : 'border-[#334155]'
            }`}
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div
          className={`p-4 rounded-xl border ${
            highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0b1322] border-[#1e293b]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400" />
              Heart Rate (MAX30102)
            </span>
            <span className="font-mono text-[10px]">BPM</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {latestReading?.heart_rate ? Math.round(latestReading.heart_rate) : '--'}
            </span>
            <span className="text-xs text-slate-500">Nominal: 60-100</span>
          </div>
          {latestReading?.heart_rate && (latestReading.heart_rate > 120 || latestReading.heart_rate < 50) && (
            <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Flagged for faculty review</span>
            </div>
          )}
        </div>

        {/* SpO2 */}
        <div
          className={`p-4 rounded-xl border ${
            highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0b1322] border-[#1e293b]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-cyan-400" />
              Blood Oxygen (SpO2)
            </span>
            <span className="font-mono text-[10px]">%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {latestReading?.spo2 ? Math.round(latestReading.spo2) : '--'}%
            </span>
            <span className="text-xs text-slate-500">Target: &gt; 95%</span>
          </div>
          {latestReading?.spo2 && latestReading.spo2 < 93 && (
            <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Low saturation alert</span>
            </div>
          )}
        </div>

        {/* GSR / EDA */}
        <div
          className={`p-4 rounded-xl border ${
            highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0b1322] border-[#1e293b]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              GSR / EDA (Conductance)
            </span>
            <span className="font-mono text-[10px]">µS</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {latestReading?.gsr_eda ? Number(latestReading.gsr_eda).toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-500">Arousal proxy</span>
          </div>
          {latestReading?.gsr_eda && latestReading.gsr_eda > 22 && (
            <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Elevated skin response</span>
            </div>
          )}
        </div>

        {/* Accelerometer */}
        <div
          className={`p-4 rounded-xl border ${
            highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0b1322] border-[#1e293b]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              MPU6050 Motion (X, Y, Z)
            </span>
            <span className="font-mono text-[10px]">G</span>
          </div>
          <div className="text-xs font-mono space-y-0.5 text-slate-300">
            <div>X: <span className="text-emerald-400 font-bold">{latestReading?.accel_x?.toFixed(2) ?? '0.00'}</span></div>
            <div>Y: <span className="text-emerald-400 font-bold">{latestReading?.accel_y?.toFixed(2) ?? '0.00'}</span></div>
            <div>Z: <span className="text-emerald-400 font-bold">{latestReading?.accel_z?.toFixed(2) ?? '1.00'}</span></div>
          </div>
        </div>
      </div>

      {/* Telemetry Stream Chart / Recent Sparklines Visualizer */}
      <div
        className={`p-5 rounded-xl border space-y-4 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-100">Recent Telemetry Time Series (Last 20 Readings)</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Interval: 1.0s - 5.0s</span>
        </div>

        {/* Visual Bar Spectrum */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Heart Rate Trend</span>
              <span className="font-mono">{latestReading?.heart_rate ?? 0} bpm</span>
            </div>
            <div className="h-4 bg-[#111c30] rounded-full overflow-hidden flex items-center p-0.5 border border-[#1e293b]">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((latestReading?.heart_rate || 70) / 160) * 100))}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Electrodermal Conductance (GSR) Trend</span>
              <span className="font-mono">{latestReading?.gsr_eda ?? 0} µS</span>
            </div>
            <div className="h-4 bg-[#111c30] rounded-full overflow-hidden flex items-center p-0.5 border border-[#1e293b]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((latestReading?.gsr_eda || 10) / 40) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent Readings Compact Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs text-left" role="table" aria-label="Recent sensor values">
            <thead className="bg-[#111c30] text-slate-400 font-mono">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Heart Rate</th>
                <th className="p-2">SpO2</th>
                <th className="p-2">GSR (µS)</th>
                <th className="p-2">Accel (X, Y, Z)</th>
                <th className="p-2">Review Status</th>
                <th className="p-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {deviceReadings.slice(0, 6).map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30">
                  <td className="p-2 font-mono text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2 font-mono font-semibold text-rose-300">{r.heart_rate ? `${r.heart_rate} bpm` : '--'}</td>
                  <td className="p-2 font-mono text-cyan-300">{r.spo2 ? `${r.spo2}%` : '--'}</td>
                  <td className="p-2 font-mono text-amber-300">{r.gsr_eda ? `${Number(r.gsr_eda).toFixed(1)} µS` : '--'}</td>
                  <td className="p-2 font-mono text-slate-300">
                    {r.accel_x?.toFixed(1)}, {r.accel_y?.toFixed(1)}, {r.accel_z?.toFixed(1)}
                  </td>
                  <td className="p-2">
                    {r.review_flag ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        REVIEW FLAGGED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        NOMINAL
                      </span>
                    )}
                  </td>
                  <td className="p-2 font-mono text-[10px] text-slate-400">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulation Mode Sliders & Injection Panel */}
      <div
        className={`p-6 rounded-xl border space-y-5 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-[#1e293b]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-slate-100">Telemetry Simulation Injector</h3>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
            Simulated sensor value, not a real physiological measurement
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Adjust the sliders below to simulate different physiological states (e.g. elevated EDA during challenging tasks or rapid motion) to verify threshold evaluation and faculty review alerts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Heart Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="hr-slider" className="font-medium text-slate-300">Heart Rate (BPM)</label>
              <span className="font-mono font-bold text-rose-400">{simHeartRate} BPM</span>
            </div>
            <input
              id="hr-slider"
              type="range"
              min={45}
              max={160}
              value={simHeartRate}
              onChange={e => setSimHeartRate(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Bradycardia (45)</span>
              <span>Nominal (75)</span>
              <span>Tachycardia (160)</span>
            </div>
          </div>

          {/* GSR Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="gsr-slider" className="font-medium text-slate-300">GSR / EDA (µS)</label>
              <span className="font-mono font-bold text-amber-400">{simGSR} µS</span>
            </div>
            <input
              id="gsr-slider"
              type="range"
              min={2}
              max={35}
              step={0.5}
              value={simGSR}
              onChange={e => setSimGSR(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Resting (2.0)</span>
              <span>Engaged (12.0)</span>
              <span>Elevated (&gt;22.0)</span>
            </div>
          </div>

          {/* SpO2 Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="spo2-slider" className="font-medium text-slate-300">SpO2 Saturation (%)</label>
              <span className="font-mono font-bold text-cyan-400">{simSpO2}%</span>
            </div>
            <input
              id="spo2-slider"
              type="range"
              min={85}
              max={100}
              value={simSpO2}
              onChange={e => setSimSpO2(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Low (85%)</span>
              <span>Normal (98%)</span>
              <span>Max (100%)</span>
            </div>
          </div>
        </div>

        {/* Quick Scenario Presets & Transmit */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1e293b]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Test Presets:</span>
            <button
              onClick={() => {
                setSimHeartRate(72);
                setSimSpO2(99);
                setSimGSR(8.5);
                setSimAccelX(0.02);
                setSimAccelY(-0.05);
                setSimAccelZ(1.0);
              }}
              className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Calm / Baseline
            </button>
            <button
              onClick={() => {
                setSimHeartRate(115);
                setSimSpO2(96);
                setSimGSR(24.8);
                setSimAccelX(0.4);
                setSimAccelY(0.6);
                setSimAccelZ(1.2);
              }}
              className="px-2.5 py-1 rounded text-xs bg-amber-900/40 hover:bg-amber-900/60 text-amber-200 border border-amber-700/50 cursor-pointer"
            >
              Task Frustration Spike
            </button>
            <button
              onClick={() => {
                setSimHeartRate(135);
                setSimSpO2(91);
                setSimGSR(29.0);
                setSimAccelX(1.1);
                setSimAccelY(-0.9);
                setSimAccelZ(2.1);
              }}
              className="px-2.5 py-1 rounded text-xs bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/50 cursor-pointer"
            >
              Threshold Anomaly Test
            </button>
          </div>

          <div className="flex items-center gap-3">
            {injectionFeedback && (
              <span className="text-xs font-semibold text-slate-300 font-mono">
                {injectionFeedback}
              </span>
            )}
            <button
              onClick={handleInjectTelemetry}
              disabled={isInjecting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                highContrast
                  ? 'bg-white text-black hover:bg-neutral-200 border-2 border-black'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInjecting ? 'Transmitting...' : 'Inject Telemetry Reading'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
