import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Coffee,
  Check,
  Filter,
  Eye,
  RefreshCw,
  User,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { WearableEvent, AccessibilityMode, WearableRequestStatus, DataSource } from './types';
import wearableConfig from '../../../shared/wearable_config.json';

interface LiveRequestsViewProps {
  userRole?: string;
  userId?: string;
  highContrast?: boolean;
}

export const LiveRequestsView: React.FC<LiveRequestsViewProps> = ({
  userRole = 'teacher',
  userId,
  highContrast = false,
}) => {
  const [events, setEvents] = useState<WearableEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<WearableEvent | null>(null);
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/inclusive/requests', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);

          // Check for newly arriving pending request to trigger visual/browser alert
          const pending = data.events.find((e: WearableEvent) => e.status === 'Pending');
          if (pending && pending.event_id !== lastAlertId) {
            setLastAlertId(pending.event_id);
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`Assistive Request: ${pending.student_name || 'Student'}`, {
                body: `Mode: ${pending.accessibility_mode} | Request: ${pending.request.replace(/_/g, ' ')}`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // SSE connection for live request updates
    const evtSource = new EventSource('/api/inclusive/stream');
    evtSource.addEventListener('new_request', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => [payload.event, ...prev.filter(x => x.event_id !== payload.event.event_id)]);
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    evtSource.addEventListener('request_acknowledged', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => prev.map(x => (x.event_id === payload.event.event_id ? payload.event : x)));
          if (selectedEvent?.event_id === payload.event.event_id) {
            setSelectedEvent(payload.event);
          }
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    evtSource.addEventListener('request_resolved', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => prev.map(x => (x.event_id === payload.event.event_id ? payload.event : x)));
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    evtSource.addEventListener('request_cancelled', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event) {
          setEvents(prev => prev.map(x => (x.event_id === payload.event.event_id ? payload.event : x)));
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const handleAction = async (eventId: string, action: 'acknowledge' | 'assistance-provided' | 'resolve' | 'cancel') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/inclusive/requests/${eventId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: teacherNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvents(prev => prev.map(e => (e.event_id === eventId ? data.event : e)));
          if (selectedEvent?.event_id === eventId) {
            setSelectedEvent(data.event);
          }
        }
        setTeacherNotes('');
      }
    } catch (err) {
      console.error(`Failed to execute ${action}`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered and sorted: Pending first, then by timestamp descending
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
        if (sourceFilter !== 'ALL' && e.source !== sourceFilter) return false;
        if (modeFilter !== 'ALL' && e.accessibility_mode !== modeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Pending first
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (b.status === 'Pending' && a.status !== 'Pending') return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [events, statusFilter, sourceFilter, modeFilter]);

  const pendingCount = events.filter(e => e.status === 'Pending').length;

  return (
    <div className="space-y-6" role="region" aria-label="Live Assistive Help Requests">
      {/* Top Banner with sound-free visual alert */}
      {pendingCount > 0 && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            highContrast
              ? 'bg-yellow-400 text-black border-4 border-black'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          } animate-pulse`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 shrink-0 ${highContrast ? 'text-black' : 'text-amber-400'}`} />
            <div>
              <p className="font-bold text-base">
                {pendingCount} Pending Student {pendingCount === 1 ? 'Request' : 'Requests'} Requiring Response
              </p>
              <p className="text-xs opacity-90">
                Non-auditory visual notification active. High priority queues are displayed at top.
              </p>
            </div>
          </div>
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                highContrast
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-amber-500 text-black hover:bg-amber-400'
              }`}
            >
              Enable Browser Alerts
            </button>
          )}
        </div>
      )}

      {/* Filter and Control Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border font-medium ${
              highContrast
                ? 'bg-white text-black border-2 border-black'
                : 'bg-[#1e293b] text-slate-200 border-[#334155]'
            }`}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses ({events.length})</option>
            <option value="Pending">Pending ({events.filter(e => e.status === 'Pending').length})</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Assistance Provided">Assistance Provided</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border font-medium ${
              highContrast
                ? 'bg-white text-black border-2 border-black'
                : 'bg-[#1e293b] text-slate-200 border-[#334155]'
            }`}
            aria-label="Filter by Accessibility Mode"
          >
            <option value="ALL">All Modes</option>
            <option value="BLIND">Blind (Tactile Only)</option>
            <option value="DEAF">Deaf (Visual + Tactile)</option>
            <option value="NON_SPEAKING">Non-Speaking (Phrase Buttons)</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border font-medium ${
              highContrast
                ? 'bg-white text-black border-2 border-black'
                : 'bg-[#1e293b] text-slate-200 border-[#334155]'
            }`}
            aria-label="Filter by Source"
          >
            <option value="ALL">All Data Sources</option>
            <option value="hardware">Hardware Only</option>
            <option value="simulation">Simulation Only</option>
          </select>
        </div>

        <button
          onClick={fetchRequests}
          disabled={isLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
            highContrast
              ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
              : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
          }`}
          aria-label="Refresh requests queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Request Queue Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table" aria-label="Requests queue table">
            <thead
              className={`text-xs uppercase font-mono tracking-wider ${
                highContrast
                  ? 'bg-white text-black border-b-2 border-white'
                  : 'bg-[#111c30] text-slate-400 border-b border-[#1e293b]'
              }`}
            >
              <tr>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Student</th>
                <th scope="col" className="px-4 py-3">Mode</th>
                <th scope="col" className="px-4 py-3">Request</th>
                <th scope="col" className="px-4 py-3">Device</th>
                <th scope="col" className="px-4 py-3">Time</th>
                <th scope="col" className="px-4 py-3">Source</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No requests match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(event => {
                  const isPending = event.status === 'Pending';
                  const isAck = event.status === 'Acknowledged';
                  const isAssistance = event.status === 'Assistance Provided';

                  return (
                    <tr
                      key={event.event_id}
                      className={`transition ${
                        isPending
                          ? highContrast
                            ? 'bg-neutral-900 border-l-4 border-yellow-400'
                            : 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-amber-500'
                          : highContrast
                          ? 'hover:bg-neutral-900'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Status */}
                      <td className="px-4 py-3 font-medium">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            event.status === 'Pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : event.status === 'Acknowledged'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : event.status === 'Assistance Provided'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : event.status === 'Resolved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              event.status === 'Pending'
                                ? 'bg-amber-400 animate-ping'
                                : event.status === 'Acknowledged'
                                ? 'bg-blue-400'
                                : event.status === 'Resolved'
                                ? 'bg-emerald-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          {event.status}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.student_name || 'Unassigned'}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{event.student_id || 'N/A'}</span>
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase ${
                            event.accessibility_mode === 'BLIND'
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                              : event.accessibility_mode === 'DEAF'
                              ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                              : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                          }`}
                        >
                          {event.accessibility_mode.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Request */}
                      <td className="px-4 py-3 font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          {event.request === 'I_NEED_HELP' ? (
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                          ) : event.request === 'I_NEED_BREAK' ? (
                            <Coffee className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-400" />
                          )}
                          <span>
                            {event.request === 'I_NEED_HELP'
                              ? 'I Need Help'
                              : event.request === 'I_NEED_BREAK'
                              ? 'I Need a Break'
                              : event.request === 'CANCEL'
                              ? 'Cancelled'
                              : event.request}
                          </span>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{event.device_id}</td>

                      {/* Time */}
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        {event.source === 'simulation' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            SIMULATED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            HARDWARE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleAction(event.event_id, 'acknowledge')}
                              disabled={isSubmitting}
                              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                                highContrast
                                  ? 'bg-white text-black hover:bg-neutral-200'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                              }`}
                              title="Acknowledge request and trigger haptic feedback to device"
                            >
                              Acknowledge
                            </button>
                          )}

                          {isAck && (
                            <button
                              onClick={() => handleAction(event.event_id, 'assistance-provided')}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition"
                              title="Mark assistance as actively underway"
                            >
                              Assist
                            </button>
                          )}

                          {(isPending || isAck || isAssistance) && (
                            <button
                              onClick={() => handleAction(event.event_id, 'resolve')}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition"
                              title="Mark request fully resolved"
                            >
                              Resolve
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition"
                            title="Open detailed view and notes"
                            aria-label={`View details for event ${event.event_id}`}
                          >
                            <Eye className="w-4 h-4" />
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

      {/* Detail & Notes Drawer Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Request details"
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-5 ${
              highContrast ? 'bg-black border-4 border-white text-white' : 'bg-[#0f172a] border-[#1e293b] text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Assistive Request Detail</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
                aria-label="Close dialog"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Student</span>
                <span className="font-semibold text-sm text-slate-200">
                  {selectedEvent.student_name || 'Unassigned'}
                </span>
                <span className="text-slate-500 font-mono block">{selectedEvent.student_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Accessibility Mode</span>
                <span className="font-semibold text-sm text-purple-300">
                  {selectedEvent.accessibility_mode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Request Type</span>
                <span className="font-semibold text-sm text-amber-300">{selectedEvent.request}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Current Status</span>
                <span className="font-semibold text-sm text-blue-300">{selectedEvent.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Device ID</span>
                <span className="font-mono text-slate-300">{selectedEvent.device_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Timestamp</span>
                <span className="font-mono text-slate-300">
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Hardware Feedback Sent to Wearable */}
            <div className="p-3 rounded-lg bg-[#162032] border border-[#23354f] space-y-1.5 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Wearable Output Feedback
              </span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Vibration:</span>
                  <span className="text-emerald-400">{selectedEvent.vibration_pattern || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">LED Color:</span>
                  <span className="text-amber-400">{selectedEvent.led_color || 'Off'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">OLED Message:</span>
                  <span className="text-cyan-400">{selectedEvent.oled_text || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Teacher Notes Field */}
            <div className="space-y-2">
              <label htmlFor="teacher-notes" className="text-xs font-semibold text-slate-300">
                Teacher Intervention Notes
              </label>
              <textarea
                id="teacher-notes"
                value={teacherNotes}
                onChange={e => setTeacherNotes(e.target.value)}
                placeholder="Log assistance provided, observed student need, or accommodations offered..."
                rows={3}
                className="w-full p-2.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Action Buttons in Drawer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1e293b]">
              <button
                onClick={() => handleAction(selectedEvent.event_id, 'cancel')}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel Request
              </button>

              <div className="flex items-center gap-2">
                {selectedEvent.status === 'Pending' && (
                  <button
                    onClick={() => handleAction(selectedEvent.event_id, 'acknowledge')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => handleAction(selectedEvent.event_id, 'resolve')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Resolve with Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
