import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  User,
  Plus,
  Key,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { WearableDevice, AccessibilityMode, DataSource } from './types';

interface DeviceFleetViewProps {
  highContrast?: boolean;
}

export const DeviceFleetView: React.FC<DeviceFleetViewProps> = ({
  highContrast = false,
}) => {
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [generatedPairCode, setGeneratedPairCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/inclusive/devices', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Failed to load device fleet', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    const evtSource = new EventSource('/api/inclusive/stream');
    evtSource.addEventListener('device_updated', (e: MessageEvent) => {
      try {
        const dev = JSON.parse(e.data);
        if (dev && dev.device_id) {
          setDevices(prev => {
            const exists = prev.find(d => d.device_id === dev.device_id);
            if (exists) {
              return prev.map(d => (d.device_id === dev.device_id ? dev : d));
            }
            return [...prev, dev];
          });
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const generatePairingCode = (devId: string) => {
    const code = `${devId}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setGeneratedPairCode(code);
    setTargetDeviceId(devId);
  };

  const handlePairStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeviceId || !studentIdInput) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/inclusive/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_id: targetDeviceId,
          student_id: studentIdInput,
        }),
      });

      if (res.ok) {
        setFeedbackMsg(`Successfully paired ${targetDeviceId} with ${studentIdInput}`);
        fetchDevices();
        setTimeout(() => {
          setIsPairModalOpen(false);
          setFeedbackMsg(null);
          setStudentIdInput('');
        }, 1500);
      } else {
        const err = await res.json();
        setFeedbackMsg(err.message || 'Pairing failed');
      }
    } catch (err) {
      console.error('Pairing error', err);
      setFeedbackMsg('Network error while pairing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" role="region" aria-label="Device Fleet Management">
      {/* Fleet Header & Controls */}
      <div
        className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">ESP32 Wearable Fleet Management</h2>
          </div>
          <p className="text-xs text-slate-400">
            Provision, assign, and audit firmware telemetry for all assistive wearable microcontrollers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTargetDeviceId('ESP32-' + Math.floor(10 + Math.random() * 90));
              generatePairingCode('ESP32-' + Math.floor(10 + Math.random() * 90));
              setIsPairModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              highContrast
                ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Pair New Device</span>
          </button>

          <button
            onClick={fetchDevices}
            disabled={isLoading}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-white cursor-pointer ${
              highContrast ? 'border-white' : 'border-[#334155]'
            }`}
            title="Refresh fleet table"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Fleet Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table" aria-label="Wearable fleet inventory">
            <thead
              className={`text-xs uppercase font-mono tracking-wider ${
                highContrast
                  ? 'bg-white text-black border-b-2 border-white'
                  : 'bg-[#111c30] text-slate-400 border-b border-[#1e293b]'
              }`}
            >
              <tr>
                <th scope="col" className="px-4 py-3">Device ID</th>
                <th scope="col" className="px-4 py-3">Connection</th>
                <th scope="col" className="px-4 py-3">Assigned Student</th>
                <th scope="col" className="px-4 py-3">Accessibility Mode</th>
                <th scope="col" className="px-4 py-3">Battery</th>
                <th scope="col" className="px-4 py-3">Firmware</th>
                <th scope="col" className="px-4 py-3">Source</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No devices registered in fleet inventory.
                  </td>
                </tr>
              ) : (
                devices.map(device => {
                  const isOnline = device.status === 'connected';

                  return (
                    <tr
                      key={device.device_id}
                      className={`hover:bg-slate-800/30 transition ${
                        highContrast ? 'hover:bg-neutral-900' : ''
                      }`}
                    >
                      {/* Device ID */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {device.device_id}
                      </td>

                      {/* Connection */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                            isOnline
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                          }`}
                        >
                          {isOnline ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Connected
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3" />
                              Disconnected
                            </>
                          )}
                        </span>
                      </td>

                      {/* Assigned Student */}
                      <td className="px-4 py-3">
                        {device.student_id ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-slate-200 font-medium">
                              {device.student_name || device.student_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase ${
                            device.accessibility_mode === 'BLIND'
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                              : device.accessibility_mode === 'DEAF'
                              ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                              : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                          }`}
                        >
                          {device.accessibility_mode.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Battery */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Battery
                            className={`w-4 h-4 ${
                              device.battery_pct > 40
                                ? 'text-emerald-400'
                                : device.battery_pct > 15
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          />
                          <span>{device.battery_pct}%</span>
                        </div>
                      </td>

                      {/* Firmware */}
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="text-slate-300">v{device.firmware_version}</span>
                        <span className="ml-1 text-[10px] text-emerald-400">(Latest)</span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        {device.source === 'simulation' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            SIMULATED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            HARDWARE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setTargetDeviceId(device.device_id);
                              generatePairingCode(device.device_id);
                              setIsPairModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition flex items-center gap-1"
                            title="Generate pairing code or reassign student"
                          >
                            <Key className="w-3 h-3 text-indigo-400" />
                            <span>Pair</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pairing & Setup Modal */}
      {isPairModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Device Pairing Dialogue"
        >
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-5 ${
              highContrast ? 'bg-black border-4 border-white text-white' : 'bg-[#0f172a] border-[#1e293b] text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold">Pair ESP32 Wearable</h3>
              </div>
              <button
                onClick={() => setIsPairModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Generated Code Display */}
            {generatedPairCode && (
              <div className="p-4 rounded-xl bg-[#111c30] border border-[#23354f] text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  ESP32 Provisioning Code
                </span>
                <span className="text-2xl font-mono font-extrabold text-indigo-400 tracking-widest block">
                  {generatedPairCode}
                </span>
                <span className="text-[10px] text-slate-500">
                  Enter this token in hardware sketch / settings to verify hand-shake.
                </span>
              </div>
            )}

            <form onSubmit={handlePairStudent} className="space-y-4">
              <div>
                <label htmlFor="device-id-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Device ID
                </label>
                <input
                  id="device-id-input"
                  type="text"
                  value={targetDeviceId}
                  onChange={e => setTargetDeviceId(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-mono bg-[#111c30] border border-[#1e293b] text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="student-id-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign to Student ID
                </label>
                <input
                  id="student-id-input"
                  type="text"
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  placeholder="e.g. STU_SIM_A, STU_SIM_B..."
                  className="w-full p-2.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200 focus:outline-none"
                  required
                />
              </div>

              {feedbackMsg && (
                <div className="text-xs font-semibold text-indigo-300 p-2 rounded bg-indigo-950/40 border border-indigo-800">
                  {feedbackMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsPairModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    highContrast
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isSubmitting ? 'Pairing...' : 'Confirm Pairing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
