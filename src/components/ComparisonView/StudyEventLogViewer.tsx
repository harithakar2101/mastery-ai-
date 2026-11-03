import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, FileSpreadsheet, CheckCircle2, AlertTriangle, HelpCircle, Activity } from 'lucide-react';

interface StudyEventLogViewerProps {
  studyId: string;
  onEventDeleted: () => void;
}

export const StudyEventLogViewer: React.FC<StudyEventLogViewerProps> = ({ studyId, onEventDeleted }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/export-json`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load study events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studyId) {
      fetchEvents();
    }
  }, [studyId]);

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/studies/${studyId}/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        onEventDeleted();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllEvents = async () => {
    if (!window.confirm('Are you sure you want to clear all telemetry events for this study?')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/clear-events`, { method: 'POST' });
      if (res.ok) {
        setEvents([]);
        onEventDeleted();
      }
    } catch (err) {
      console.error('Failed to clear events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Study Telemetry Event Stream & Reactivity Verifier
            </h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Real-time event ledger. Deleting any event immediately triggers live re-computation of all study metrics and inferential statistics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Refresh event list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearAllEvents}
            disabled={isLoading || events.length === 0}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl border border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Study Events
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <span>Total Logged Events: <strong>{events.length}</strong></span>
        <span className="text-emerald-400">Reactive BKT / Event-Engine Active</span>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2">Event ID</th>
              <th className="py-2">Student ID</th>
              <th className="py-2">Arm</th>
              <th className="py-2">Event Type</th>
              <th className="py-2">Score</th>
              <th className="py-2">Hints</th>
              <th className="py-2">Trap Repeated</th>
              <th className="py-2">Data Origin</th>
              <th className="py-2 text-right">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {events.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                  No events recorded yet. Click "Seed Demo Cohort" or submit answers in the protocol tab.
                </td>
              </tr>
            ) : (
              events.map((evt: any) => (
                <tr key={evt.id} className="hover:bg-slate-800/30">
                  <td className="py-2 text-slate-400 truncate max-w-[120px]">{evt.id}</td>
                  <td className="py-2 text-slate-200 font-bold">{evt.studentId}</td>
                  <td className="py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        evt.payload?.armId === 'ARM_A'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : evt.payload?.armId === 'ARM_B'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {evt.payload?.armId || 'N/A'}
                    </span>
                  </td>
                  <td className="py-2 text-slate-300">{evt.type}</td>
                  <td className="py-2 text-slate-200">
                    {evt.payload?.score !== undefined ? `${evt.payload.score}%` : '&mdash;'}
                  </td>
                  <td className="py-2 text-slate-400">{evt.payload?.hintsRequested ?? 0}</td>
                  <td className="py-2">
                    {evt.payload?.repeatedError ? (
                      <span className="text-rose-400 font-bold">YES</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border ${
                        evt.synthetic
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {evt.synthetic ? 'SYNTHETIC' : 'REAL'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      disabled={deletingId === evt.id}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Delete event to verify metrics change"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
