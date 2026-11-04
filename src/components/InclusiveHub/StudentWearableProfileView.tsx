import React, { useState, useEffect } from 'react';
import {
  User,
  Cpu,
  Battery,
  Wifi,
  HelpCircle,
  Coffee,
  XCircle,
  Vibrate,
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { WearableDevice, WearableEvent } from './types';
import wearableConfig from '../../../shared/wearable_config.json';

interface StudentWearableProfileViewProps {
  userId?: string;
  userName?: string;
  highContrast?: boolean;
}

export const StudentWearableProfileView: React.FC<StudentWearableProfileViewProps> = ({
  userId = 'STU_SIM_A',
  userName = 'Student',
  highContrast = false,
}) => {
  const [device, setDevice] = useState<WearableDevice | null>(null);
  const [myEvents, setMyEvents] = useState<WearableEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      const [devRes, reqRes] = await Promise.all([
        fetch('/api/inclusive/devices', { credentials: 'include' }),
        fetch('/api/inclusive/requests', { credentials: 'include' }),
      ]);

      if (devRes.ok) {
        const d = await devRes.json();
        const myDev = (d.devices || []).find((x: WearableDevice) => x.student_id === userId) || d.devices?.[0];
        setDevice(myDev || null);
      }

      if (reqRes.ok) {
        const r = await reqRes.json();
        setMyEvents(r.events || []);
      }
    } catch (err) {
      console.error('Failed to load student profile', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const evtSource = new EventSource('/api/inclusive/stream');
    evtSource.addEventListener('device_test_triggered', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.device_id === device?.device_id) {
          setTestResult(payload.feedback);
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    evtSource.addEventListener('new_request', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event && (payload.event.student_id === userId || payload.event.device_id === device?.device_id)) {
          setMyEvents(prev => [payload.event, ...prev]);
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, [device?.device_id, userId]);

  const handleTestDevice = async () => {
    if (!device) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/inclusive/devices/${device.device_id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data.feedback);
        // Trigger browser vibration if supported
        if ('vibrate' in navigator && data.feedback?.pattern_ms) {
          navigator.vibrate(data.feedback.pattern_ms);
        }
      }
    } catch (err) {
      console.error('Test error', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTriggerRequest = async (reqType: 'I_NEED_HELP' | 'I_NEED_BREAK' | 'CANCEL') => {
    if (!device) return;
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const eventId = `EVT_STU_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const res = await fetch('/api/inclusive/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_id: eventId,
          device_id: device.device_id,
          student_id: userId,
          request: reqType,
          accessibility_mode: device.accessibility_mode,
          source: device.source,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionFeedback(`✓ Transmitted: ${reqType.replace(/_/g, ' ')}`);
        if ('vibrate' in navigator && data.feedback?.pattern_ms) {
          navigator.vibrate(data.feedback.pattern_ms);
        }
      }
    } catch (err) {
      console.error('Failed to trigger request', err);
      setActionFeedback('Failed to transmit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" role="region" aria-label="My Assistive Wearable Profile">
      {/* Header Profile Card */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          highContrast ? 'bg-black border-4 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <User className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{userName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-slate-400">ID: {userId}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Enrolled Learner
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestDevice}
              disabled={isTesting || !device}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                highContrast
                  ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              <Vibrate className={`w-4 h-4 ${isTesting ? 'animate-bounce' : ''}`} />
              <span>{isTesting ? 'Broadcasting Test...' : 'Test Wearable Hardware'}</span>
            </button>
          </div>
        </div>

        {/* Device Status Banner */}
        {device ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#1e293b]">
            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <span className="text-xs text-slate-400 block font-medium">Paired ESP32 Device</span>
              <span className="font-mono font-bold text-sm text-slate-200">{device.device_id}</span>
              <span className="text-[11px] text-slate-500 block">Firmware v{device.firmware_version}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <span className="text-xs text-slate-400 block font-medium">Accessibility Mode</span>
              <span className="font-bold text-sm text-purple-300">
                {device.accessibility_mode.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {device.accessibility_mode === 'BLIND'
                  ? 'Tactile Vibration Only'
                  : device.accessibility_mode === 'DEAF'
                  ? 'Visual OLED + RGB Alert'
                  : '3-Button Physical Phrase Bar'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#111c30] border border-[#1e293b] space-y-1">
              <span className="text-xs text-slate-400 block font-medium">Telemetry Connection</span>
              <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected ({device.battery_pct}% Battery)</span>
              </div>
              <span className="text-[11px] text-slate-500 block font-mono">
                Source: {device.source.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>No wearable device is currently assigned to this account. Contact your faculty administrator.</span>
          </div>
        )}
      </div>

      {/* Hardware Test Feedback Display */}
      {testResult && (
        <div
          className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center justify-between animate-fadeIn"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">Hardware Feedback Verification Sent</p>
              <p className="text-xs opacity-90 font-mono">
                Pattern: {testResult.vibration_pattern} ({testResult.pattern_ms?.join(', ')} ms) | OLED: "{testResult.oled_text}"
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-500/20 px-2 py-1 rounded">OK</span>
        </div>
      )}

      {/* Hardware Button Mirror (Software Trigger) */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-slate-100">Quick-Action Assistive Buttons</h3>
            <p className="text-xs text-slate-400">
              Mirrors the physical buttons on your ESP32 wearable band. Tapping triggers instant teacher notification.
            </p>
          </div>
          {actionFeedback && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
              {actionFeedback}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* I Need Help */}
          <button
            onClick={() => handleTriggerRequest('I_NEED_HELP')}
            disabled={isSubmitting || !device}
            className={`p-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition shadow-lg ${
              highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 border-4 border-black'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
            }`}
          >
            <HelpCircle className="w-7 h-7" />
            <span className="text-sm">I Need Help</span>
            <span className="text-[10px] opacity-80 font-normal">Notifies faculty immediately</span>
          </button>

          {/* I Need a Break */}
          <button
            onClick={() => handleTriggerRequest('I_NEED_BREAK')}
            disabled={isSubmitting || !device}
            className={`p-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition shadow-lg ${
              highContrast
                ? 'bg-cyan-300 text-black hover:bg-cyan-200 border-4 border-black'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
            }`}
          >
            <Coffee className="w-7 h-7" />
            <span className="text-sm">I Need a Break</span>
            <span className="text-[10px] opacity-80 font-normal">Requests 5-min cognitive pause</span>
          </button>

          {/* Cancel */}
          <button
            onClick={() => handleTriggerRequest('CANCEL')}
            disabled={isSubmitting || !device}
            className={`p-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition shadow-lg ${
              highContrast
                ? 'bg-neutral-800 text-white hover:bg-neutral-700 border-4 border-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-slate-700/30'
            }`}
          >
            <XCircle className="w-7 h-7" />
            <span className="text-sm">Cancel Active Request</span>
            <span className="text-[10px] opacity-80 font-normal">Resets alert status</span>
          </button>
        </div>
      </div>

      {/* My Recent Requests Log */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <h3 className="font-bold text-sm text-slate-200">My Recent Requests & Interaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead className="bg-[#111c30] text-slate-400 font-mono">
              <tr>
                <th className="p-2.5">Time</th>
                <th className="p-2.5">Request Type</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Acknowledged By</th>
                <th className="p-2.5">Device Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {myEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No requests submitted in this session.
                  </td>
                </tr>
              ) : (
                myEvents.slice(0, 8).map(e => (
                  <tr key={e.event_id} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono text-slate-400">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-200">{e.request.replace(/_/g, ' ')}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : e.status === 'Acknowledged'
                            ? 'bg-blue-500/20 text-blue-300'
                            : e.status === 'Resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400">{e.acknowledged_by || '--'}</td>
                    <td className="p-2.5 font-mono text-cyan-300">{e.oled_text || e.vibration_pattern || 'None'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
