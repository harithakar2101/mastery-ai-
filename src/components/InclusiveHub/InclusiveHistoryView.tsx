import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  User,
  Cpu,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { WearableEvent } from './types';

interface InclusiveHistoryViewProps {
  highContrast?: boolean;
}

export const InclusiveHistoryView: React.FC<InclusiveHistoryViewProps> = ({
  highContrast = false,
}) => {
  const [events, setEvents] = useState<WearableEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inclusive/history?limit=150', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportCSV = () => {
    window.open('/api/inclusive/history?format=csv', '_blank');
  };

  const filteredHistory = useMemo(() => {
    return events.filter(e => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && e.source !== sourceFilter) return false;
      if (modeFilter !== 'ALL' && e.accessibility_mode !== modeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const studentMatch = (e.student_name || '').toLowerCase().includes(term) || (e.student_id || '').toLowerCase().includes(term);
        const deviceMatch = e.device_id.toLowerCase().includes(term);
        const eventIdMatch = e.event_id.toLowerCase().includes(term);
        if (!studentMatch && !deviceMatch && !eventIdMatch) return false;
      }
      return true;
    });
  }, [events, searchTerm, statusFilter, sourceFilter, modeFilter]);

  return (
    <div className="space-y-6" role="region" aria-label="Interaction History & Audit Log">
      {/* Header Bar with Search & CSV Export */}
      <div
        className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Assistive Telemetry Audit Log</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable interaction log for all wearable requests, teacher acknowledgements, and tactile feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              highContrast
                ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>

          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-white cursor-pointer ${
              highContrast ? 'border-white' : 'border-[#334155]'
            }`}
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student, device ID, or event ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Assistance Provided">Assistance Provided</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#111c30] border border-[#1e293b] text-slate-200"
          >
            <option value="ALL">All Sources</option>
            <option value="hardware">Hardware Only</option>
            <option value="simulation">Simulation Only</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {filteredHistory.length} of {events.length} records
        </span>
      </div>

      {/* History Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          highContrast ? 'bg-black border-2 border-white' : 'bg-[#0b1322] border-[#1e293b]'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table" aria-label="Interaction history">
            <thead
              className={`uppercase font-mono tracking-wider ${
                highContrast
                  ? 'bg-white text-black border-b-2 border-white'
                  : 'bg-[#111c30] text-slate-400 border-b border-[#1e293b]'
              }`}
            >
              <tr>
                <th scope="col" className="px-4 py-3">Timestamp</th>
                <th scope="col" className="px-4 py-3">Student</th>
                <th scope="col" className="px-4 py-3">Device</th>
                <th scope="col" className="px-4 py-3">Mode</th>
                <th scope="col" className="px-4 py-3">Request</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Acknowledged By</th>
                <th scope="col" className="px-4 py-3">Resolved By</th>
                <th scope="col" className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No historical events match the query criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(item => (
                  <tr
                    key={item.event_id}
                    className={`hover:bg-slate-800/30 transition ${
                      highContrast ? 'hover:bg-neutral-900' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      <div>{item.student_name || 'Unassigned'}</div>
                      <span className="font-mono text-[10px] text-slate-500">{item.student_id}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{item.device_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                          item.accessibility_mode === 'BLIND'
                            ? 'bg-purple-900/40 text-purple-300'
                            : item.accessibility_mode === 'DEAF'
                            ? 'bg-cyan-900/40 text-cyan-300'
                            : 'bg-emerald-900/40 text-emerald-300'
                        }`}
                      >
                        {item.accessibility_mode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {item.request.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : item.status === 'Acknowledged'
                            ? 'bg-blue-500/20 text-blue-300'
                            : item.status === 'Resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {item.acknowledged_by || '--'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {item.resolved_by || '--'}
                    </td>
                    <td className="px-4 py-3">
                      {item.source === 'simulation' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          SIMULATED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          HARDWARE
                        </span>
                      )}
                    </td>
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
