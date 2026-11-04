import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Filter,
  CheckCheck,
  Sparkles,
  HelpCircle,
  Coffee,
  Check,
  ChevronRight,
  ShieldAlert,
  Info,
  RefreshCw,
} from 'lucide-react';
import { WearableDevice, WearableEvent } from './types';

interface TeacherConsoleViewProps {
  highContrast?: boolean;
}

export const TeacherConsoleView: React.FC<TeacherConsoleViewProps> = ({
  highContrast = false,
}) => {
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [events, setEvents] = useState<WearableEvent[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsEnabled, setInsightsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEEDS_ATTENTION' | 'ACTIVE' | 'OFFLINE'>('ALL');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState<string>('Batch resolved by teacher');
  const [isResolvingBatch, setIsResolvingBatch] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [devRes, reqRes, insRes] = await Promise.all([
        fetch('/api/inclusive/devices', { credentials: 'include' }),
        fetch('/api/inclusive/requests', { credentials: 'include' }),
        fetch('/api/inclusive/insights', { credentials: 'include' }).catch(() => null),
      ]);

      if (devRes.ok) {
        const d = await devRes.json();
        setDevices(d.devices || []);
      }
      if (reqRes.ok) {
        const r = await reqRes.json();
        setEvents(r.events || []);
      }
      if (insRes && insRes.ok) {
        const i = await insRes.json();
        setInsightsEnabled(i.enabled || false);
        setInsights(i.insights || []);
      }
    } catch (err) {
      console.error('Failed to load teacher console data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const evtSource = new EventSource('/api/inclusive/stream');
    evtSource.addEventListener('new_request', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => [payload.event, ...prev.filter(x => x.event_id !== payload.event.event_id)]);
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    evtSource.addEventListener('device_updated', (e: MessageEvent) => {
      try {
        const dev = JSON.parse(e.data);
        if (dev && dev.device_id) {
          setDevices(prev => prev.map(d => (d.device_id === dev.device_id ? dev : d)));
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    evtSource.addEventListener('request_acknowledged', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => prev.map(x => (x.event_id === payload.event.event_id ? payload.event : x)));
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    evtSource.addEventListener('request_resolved', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => prev.map(x => (x.event_id === payload.event.event_id ? payload.event : x)));
        }
      } catch (err) {
        console.error('SSE error', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const handleAcknowledge = async (eventId: string) => {
    try {
      const res = await fetch(`/api/inclusive/requests/${eventId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: 'Acknowledged via Teacher Console' }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(prev => prev.map(e => (e.event_id === eventId ? data.event : e)));
      }
    } catch (err) {
      console.error('Acknowledge failed', err);
    }
  };

  const handleBatchResolve = async () => {
    if (selectedEventIds.length === 0) return;
    setIsResolvingBatch(true);
    try {
      const res = await fetch('/api/inclusive/requests/batch-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_ids: selectedEventIds, notes: batchNotes }),
      });
      if (res.ok) {
        setSelectedEventIds([]);
        fetchData();
      }
    } catch (err) {
      console.error('Batch resolve failed', err);
    } finally {
      setIsResolvingBatch(false);
    }
  };

  // Group student wearable profiles with their latest active request
  const studentWearableRoster = useMemo(() => {
    return devices.map(device => {
      const studentEvents = events.filter(e => e.student_id === device.student_id || e.device_id === device.device_id);
      const activeRequest = studentEvents.find(e => e.status === 'Pending' || e.status === 'Acknowledged' || e.status === 'Assistance Provided');
      return {
        device,
        studentName: device.student_name || 'Assigned Student',
        studentId: device.student_id || 'STU_UNASSIGNED',
        activeRequest,
        hasPending: activeRequest?.status === 'Pending',
        isOnline: device.status === 'connected',
      };
    });
  }, [devices, events]);

  const filteredRoster = useMemo(() => {
    return studentWearableRoster.filter(item => {
      if (filterMode === 'NEEDS_ATTENTION') return !!item.activeRequest;
      if (filterMode === 'ACTIVE') return item.isOnline;
      if (filterMode === 'OFFLINE') return !item.isOnline;
      return true;
    });
  }, [studentWearableRoster, filterMode]);

  const pendingRequests = events.filter(e => e.status === 'Pending');

  return (
    <div className="space-y-6" role="region" aria-label="Inclusive Teacher Classroom Console">
      {/* Top Header & Fast Filters */}
      <div
        className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Classroom Wearable Fleet & Help Console</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time status of all active student wearables, live assistance requests, and battery telemetry.
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              filterMode === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Students ({studentWearableRoster.length})
          </button>
          <button
            onClick={() => setFilterMode('NEEDS_ATTENTION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
              filterMode === 'NEEDS_ATTENTION'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Needs Attention ({studentWearableRoster.filter(r => r.activeRequest).length})
          </button>
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
              filterMode === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Active ({studentWearableRoster.filter(r => r.isOnline).length})
          </button>
          <button
            onClick={() => setFilterMode('OFFLINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              filterMode === 'OFFLINE'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Offline ({studentWearableRoster.filter(r => !r.isOnline).length})
          </button>
        </div>
      </div>

      {/* Experimental ML Insights Banner (If Enabled) */}
      {insightsEnabled && insights.length > 0 && (
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            highContrast ? 'bg-black border-2 border-white' : 'bg-purple-950/30 border-purple-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
              Experimental Assistive Insights (Non-Diagnostic)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-[#111c30] border border-[#23354f] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{item.title}</span>
                  <span className="font-mono text-[10px] text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded">
                    Confidence: {Math.round(item.confidence * 100)}%
                  </span>
                </div>
                <p className="text-slate-300">{item.description}</p>
                <span className="text-[10px] text-slate-500 block font-mono">
                  Trigger: {item.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Wearable Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoster.map(item => {
          const req = item.activeRequest;
          const isPending = req?.status === 'Pending';
          const isAck = req?.status === 'Acknowledged';

          return (
            <div
              key={item.device.device_id}
              className={`p-5 rounded-2xl border transition shadow-sm space-y-4 ${
                isPending
                  ? highContrast
                    ? 'bg-neutral-900 border-4 border-yellow-400'
                    : 'bg-[#151c2c] border-amber-500/60 shadow-amber-500/10'
                  : highContrast
                  ? 'bg-black border-2 border-white'
                  : 'bg-[#0b1322] border-[#1e293b]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100">{item.studentName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-slate-500">{item.studentId}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        item.device.accessibility_mode === 'BLIND'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : item.device.accessibility_mode === 'DEAF'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {item.device.accessibility_mode.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {item.isOnline ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Device Telemetry info */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-[#111c30] border border-[#1e293b]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Battery className="w-3.5 h-3.5 text-slate-400" />
                  <span>Battery: {item.device.battery_pct}%</span>
                </div>
                <div className="text-right text-slate-400">
                  Dev: {item.device.device_id}
                </div>
              </div>

              {/* Active Request Status Box */}
              {req ? (
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isPending
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : isAck
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                      : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      {req.request === 'I_NEED_HELP' ? (
                        <HelpCircle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Coffee className="w-4 h-4 text-cyan-400" />
                      )}
                      {req.request.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/40">
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-300">Est. response: &lt; 30s</span>
                  </div>

                  {/* 1-Click Acknowledge */}
                  {isPending && (
                    <button
                      onClick={() => handleAcknowledge(req.event_id)}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        highContrast
                          ? 'bg-white text-black hover:bg-neutral-200'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>1-Click Acknowledge</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500/60" />
                  <span>No active requests (Nominal)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Resolution Bar */}
      {pendingRequests.length > 0 && (
        <div
          className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
          }`}
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              Batch Request Resolution
            </h4>
            <p className="text-xs text-slate-400">
              Select and resolve all active pending requests simultaneously during session transitions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={batchNotes}
              onChange={e => setBatchNotes(e.target.value)}
              placeholder="Batch resolution notes..."
              className="px-3 py-1.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200 w-56 focus:outline-none"
            />
            <button
              onClick={() => {
                const pendingIds = pendingRequests.map(r => r.event_id);
                setSelectedEventIds(pendingIds);
                handleBatchResolve();
              }}
              disabled={isResolvingBatch}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                highContrast
                  ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isResolvingBatch ? 'Resolving...' : `Resolve All (${pendingRequests.length}) Pending`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
