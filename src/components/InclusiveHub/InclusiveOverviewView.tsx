import React, { useEffect, useState } from 'react';
import {
  Users,
  Watch,
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Eye,
  VolumeX,
  MessageSquareOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { OverviewStats, WearableEvent, WearableDevice } from './types';

interface InclusiveOverviewViewProps {
  onNavigateTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  userRole?: string;
  highContrast?: boolean;
}

export const InclusiveOverviewView: React.FC<InclusiveOverviewViewProps> = ({
  onNavigateTab,
  onNavigate,
  userRole = 'student',
  highContrast = false,
}) => {
  const navigate = onNavigateTab || onNavigate || (() => {});
  const [stats, setStats] = useState<OverviewStats>({
    totalStudents: 0,
    connectedWearables: 0,
    pendingHelpRequests: 0,
    activeDeviceAlerts: 0,
  });
  const [recentEvents, setRecentEvents] = useState<WearableEvent[]>([]);
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inclusive/overview');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.recentEvents) setRecentEvents(data.recentEvents);
        if (data.devices) setDevices(data.devices);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('Failed to fetch inclusive overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();

    // Listen to real-time SSE stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/inclusive/stream');
      eventSource.addEventListener('new_request', (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.event) {
            setRecentEvents(prev => [parsed.event, ...prev.slice(0, 9)]);
          }
          if (parsed.overview) {
            setStats(parsed.overview);
          }
        } catch {}
      });
      eventSource.addEventListener('request_acknowledged', (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.event) {
            setRecentEvents(prev =>
              prev.map(ev => (ev.event_id === parsed.event.event_id ? parsed.event : ev))
            );
          }
        } catch {}
      });
      eventSource.addEventListener('request_resolved', (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.event) {
            setRecentEvents(prev =>
              prev.map(ev => (ev.event_id === parsed.event.event_id ? parsed.event : ev))
            );
          }
        } catch {}
      });
      eventSource.addEventListener('device_updated', (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          setDevices(prev =>
            prev.map(d => (d.device_id === parsed.device_id ? parsed : d))
          );
        } catch {}
      });
    } catch {}

    const interval = setInterval(fetchOverview, 15000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'BLIND':
        return <Eye className="w-4 h-4 text-amber-400" aria-label="Blind Mode Icon" />;
      case 'DEAF':
        return <VolumeX className="w-4 h-4 text-blue-400" aria-label="Deaf Mode Icon" />;
      case 'NON_SPEAKING':
        return <MessageSquareOff className="w-4 h-4 text-purple-400" aria-label="Non-speaking Mode Icon" />;
      default:
        return <Watch className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/70 border border-amber-600 text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950/70 border border-blue-600 text-blue-300">
            <Radio className="w-3.5 h-3.5" />
            <span>Acknowledged</span>
          </span>
        );
      case 'Assistance Provided':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/70 border border-purple-600 text-purple-300">
            <Activity className="w-3.5 h-3.5" />
            <span>Assisting</span>
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/70 border border-emerald-600 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-600 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Inclusive Assistive Hub Overview">
      {/* HEADER BANNER */}
      <div className="bg-[#0b1322] border border-[#1d2d44] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              Universal Design & Wearable Fleet
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              SSE LIVE TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Inclusive Assistive Hub</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Multi-modal assistive infrastructure supporting <strong>Blind</strong>, <strong>Deaf</strong>, and <strong>Non-speaking</strong> learners.
            Wearable telemetry operates independently of pedagogical mastery scoring.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#121c2d] hover:bg-[#1a293f] text-slate-200 border border-[#23354f] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            aria-label="Refresh telemetry data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('simulator')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 cursor-pointer transition-colors"
          >
            <Watch className="w-4 h-4" />
            <span>Open Wearable Simulator</span>
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key Accessibility Metrics">
        {/* Card 1: Total Registered Students */}
        <div className="bg-[#0c1424] border border-[#1b2b42] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Students</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">{stats.totalStudents}</div>
            <div className="text-[11px] text-slate-500 mt-1">Inclusive cohort members</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Connected Wearables */}
        <div className="bg-[#0c1424] border border-[#1b2b42] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Connected Wearables</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{stats.connectedWearables}</div>
            <div className="text-[11px] text-slate-500 mt-1">ESP32 fleet active</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Watch className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Help Requests */}
        <div className="bg-[#0c1424] border border-[#1b2b42] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Help Requests</div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{stats.pendingHelpRequests}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting instructor response</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Active Device Alerts */}
        <div className="bg-[#0c1424] border border-[#1b2b42] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Device Alerts</div>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-1">{stats.activeDeviceAlerts}</div>
            <div className="text-[11px] text-slate-500 mt-1">Flagged for review only</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: LIVE REQUESTS & DEVICE FLEET STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Help Requests Queue (2 Columns) */}
        <div className="lg:col-span-2 bg-[#09101c] border border-[#1a293f] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#162337] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                <AlertCircle className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Help Requests Queue
              </h2>
            </div>
            {userRole !== 'student' && (
              <button
                type="button"
                onClick={() => navigate('requests')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Queue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No active assistance requests in queue. All learners clear.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Live assistance requests table">
                <thead>
                  <tr className="border-b border-[#162337] text-slate-400 text-[11px] font-semibold uppercase">
                    <th scope="col" className="pb-2.5">Student</th>
                    <th scope="col" className="pb-2.5">Mode</th>
                    <th scope="col" className="pb-2.5">Request Type</th>
                    <th scope="col" className="pb-2.5">Status</th>
                    <th scope="col" className="pb-2.5 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131d2e]">
                  {recentEvents.map(evt => (
                    <tr key={evt.id || evt.event_id} className="hover:bg-[#0e1726]/60 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">
                        <div>{evt.student_name || 'Anonymous Student'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{evt.device_id}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                          {getModeIcon(evt.accessibility_mode)}
                          <span>{evt.accessibility_mode}</span>
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-white">
                          {evt.request.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        {getStatusBadge(evt.status)}
                      </td>
                      <td className="py-3 text-right">
                        {evt.source === 'simulation' ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950 text-purple-300 border border-purple-800">
                            SIMULATED
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            HARDWARE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Device Status Table (1 Column) */}
        <div className="bg-[#09101c] border border-[#1a293f] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#162337] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                <Watch className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Device Fleet Status
              </h2>
            </div>
            {userRole !== 'student' && (
              <button
                type="button"
                onClick={() => navigate('devices')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Fleet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {devices.map(dev => (
              <div
                key={dev.id || dev.device_id}
                className="p-3 bg-[#0d1624] border border-[#1c2c43] rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono">{dev.device_id}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                      {getModeIcon(dev.accessibility_mode)}
                      <span>{dev.accessibility_mode}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Paired: <strong className="text-slate-200">{dev.student_name || 'Unassigned'}</strong>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      dev.status === 'connected'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {dev.status.toUpperCase()}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Bat: {dev.battery_pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
