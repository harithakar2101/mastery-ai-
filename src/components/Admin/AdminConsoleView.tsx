import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  DollarSign,
  Cpu,
  RefreshCw,
  Play,
  Database,
  Trash2,
  UserPlus,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface AntiAnswerStats {
  evaluated: boolean;
  latestPassRate: number;
  totalEvaluated: number;
  passedCount: number;
  lastEvaluatedAt: string;
  history: Array<{
    id: string;
    ts: string;
    passRate: number;
    total: number;
    passed: number;
  }>;
}

interface AIUsageSummary {
  today: {
    date: string;
    activeUsers: number;
    totalRequests: number;
    totalTokens: number;
    totalUploadMb: number;
  };
  allTime: {
    totalRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  topConsumers: Array<{
    userId: string;
    date: string;
    requests: number;
    tokens: number;
    uploadMb: number;
  }>;
}

interface AuditLogItem {
  id: string;
  userId?: string;
  userRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  ts: string;
}

export const AdminConsoleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'anti_answer' | 'quotas' | 'audit' | 'cohort'>('anti_answer');

  // Anti-Answer state
  const [antiAnswerStats, setAntiAnswerStats] = useState<AntiAnswerStats | null>(null);
  const [isRunningAntiAnswerEval, setIsRunningAntiAnswerEval] = useState(false);
  const [evalOutput, setEvalOutput] = useState<any[] | null>(null);

  // Quotas & Usage state
  const [usageSummary, setUsageSummary] = useState<AIUsageSummary | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Cohort state
  const [seedLoading, setSeedLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDegree, setTeacherDegree] = useState('Department of Computer Science & Engineering');
  const [teacherActionMsg, setTeacherActionMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch('/api/admin/anti-answer-stats', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/ai-usage', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/audit-logs?limit=50', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ])
      .then(([stats, usage, logs]) => {
        if (!isMounted) return;
        if (stats) setAntiAnswerStats(stats);
        if (usage) setUsageSummary(usage);
        if (logs?.logs) setAuditLogs(logs.logs);
      })
      .catch(err => {
        console.warn('Failed to load admin console data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [refreshKey]);

  // Run Anti-Answer evaluation on demand
  const handleRunEvaluation = async () => {
    setIsRunningAntiAnswerEval(true);
    setEvalOutput(null);
    try {
      const res = await fetch('/api/admin/eval-anti-answer', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAntiAnswerStats(prev => ({
          evaluated: true,
          latestPassRate: data.summary.passRate,
          totalEvaluated: data.summary.total,
          passedCount: data.summary.passed,
          lastEvaluatedAt: data.summary.ts,
          history: prev ? [data.summary, ...prev.history].slice(0, 5) : [data.summary],
        }));
        setEvalOutput(data.results || []);
      }
    } catch (err) {
      console.error('Failed to trigger anti-answer evaluation:', err);
    } finally {
      setIsRunningAntiAnswerEval(false);
      setRefreshKey(k => k + 1);
    }
  };

  // Seed Demo Cohort
  const handleSeedDemo = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch('/api/admin/seed-demo', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        alert('Synthetic demo cohort successfully seeded with realistic students, attempts, and ISLM records.');
        setRefreshKey(k => k + 1);
      }
    } catch (err) {
      alert('Failed to seed demo cohort.');
    } finally {
      setSeedLoading(false);
    }
  };

  // Clear Demo Cohort
  const handleClearDemo = async () => {
    if (!confirm('Are you sure you want to remove all synthetic demo records? Real student data will be preserved.')) return;
    setClearLoading(true);
    try {
      const res = await fetch('/api/admin/clear-demo', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        alert('All synthetic demo records removed cleanly.');
        setRefreshKey(k => k + 1);
      }
    } catch (err) {
      alert('Failed to clear demo cohort.');
    } finally {
      setClearLoading(false);
    }
  };

  // Create Faculty Member
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherActionMsg(null);
    setIsCreatingTeacher(true);
    try {
      const res = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: teacherEmail,
          password: teacherPassword,
          name: teacherName,
          degree: teacherDegree,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to create teacher account');
      }
      setTeacherActionMsg({ text: `Teacher account ${data.user.email} (${data.user.id}) created successfully!`, isError: false });
      setTeacherEmail('');
      setTeacherPassword('');
      setTeacherName('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setTeacherActionMsg({ text: err.message, isError: true });
    } finally {
      setIsCreatingTeacher(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#09111c] border border-[#1b2b42] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Institution Administration Console</span>
              <Badge variant="amber" size="xs">Admin Role Active</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live monitoring of Anti-Answer compliance, per-user AI quotas, estimated costs, and immutable audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="px-3 py-1.5 bg-[#0e1726] hover:bg-[#162235] text-slate-300 hover:text-white rounded-xl border border-[#1e2f47] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#18263a] pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('anti_answer')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'anti_answer'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1421]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <span>Anti-Answer Policy ({antiAnswerStats?.latestPassRate ?? 100}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('quotas')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'quotas'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1421]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>AI Quotas & Costs (${usageSummary?.allTime?.estimatedCostUsd ?? '0.00'})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'audit'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1421]'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cohort')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'cohort'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1421]'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Faculty & Demo Cohort</span>
        </button>
      </div>

      {/* Tab 1: Anti-Answer Policy */}
      {activeTab === 'anti_answer' && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Policy Pass Rate</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {antiAnswerStats?.latestPassRate ?? 100}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">30 Adversarial Prompts</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Solution Leaks Detected</span>
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {antiAnswerStats ? antiAnswerStats.totalEvaluated - antiAnswerStats.passedCount : 0}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Must remain 0 for compliance</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Last Nightly Run</span>
              </div>
              <div className="text-xs font-bold text-slate-200 mt-2 truncate">
                {antiAnswerStats?.lastEvaluatedAt ? new Date(antiAnswerStats.lastEvaluatedAt).toLocaleDateString() : 'Active Standard'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Scheduled 00:00 UTC</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] flex flex-col justify-center items-center gap-2">
              <button
                onClick={handleRunEvaluation}
                disabled={isRunningAntiAnswerEval}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRunningAntiAnswerEval ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing 30 Prompts...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run 30-Prompt Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Adversarial Evaluation Output */}
          {evalOutput && (
            <div className="p-5 rounded-2xl bg-[#08101c] border border-blue-900/50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#16253c]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>On-Demand Audit Execution Results</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {evalOutput.filter(r => r.passed).length}/{evalOutput.length} Passed
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {evalOutput.map(r => (
                  <div
                    key={r.promptId}
                    className="p-2.5 rounded-lg bg-[#0c1422] border border-[#18263a] flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        r.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] shrink-0">[{r.category}]</span>
                      <span className="text-slate-200 truncate">{r.reason}</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold shrink-0">{r.score}/100</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Runs */}
          {antiAnswerStats?.history && antiAnswerStats.history.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Evaluation Audit Trail</h3>
              <div className="space-y-2">
                {antiAnswerStats.history.map(h => (
                  <div key={h.id} className="p-3 rounded-xl bg-[#070d18] border border-[#152336] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">{new Date(h.ts).toLocaleString()}</span>
                      <span className="font-semibold text-slate-200">
                        {h.passed} of {h.total} prompts conformed to refusal policy
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{h.passRate}% Pass Rate</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Quotas & Cost */}
      {activeTab === 'quotas' && (
        <div className="space-y-6">
          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Today's Active Learners</span>
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {usageSummary?.today?.activeUsers ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Requests: {usageSummary?.today?.totalRequests ?? 0}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Today's Tokens Used</span>
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {(usageSummary?.today?.totalTokens ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Upload: {usageSummary?.today?.totalUploadMb ?? 0} MB</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>All-Time Model Tokens</span>
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {((usageSummary?.allTime?.totalTokens ?? 0) / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Total Requests: {usageSummary?.allTime?.totalRequests ?? 0}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1320] border border-[#16253c] text-center space-y-1">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estimated Gemini Cost</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${usageSummary?.allTime?.estimatedCostUsd ?? '0.00'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Gemini 2.5 Flash @ $0.25/1M</div>
            </div>
          </div>

          {/* Top Consumers Table */}
          <div className="p-5 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Top Consumers by Request Volume</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#070d18] text-slate-400 border-b border-[#142336] font-mono text-[11px]">
                  <tr>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Requests Made</th>
                    <th className="p-3">Tokens Used</th>
                    <th className="p-3">Upload (MB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142336]">
                  {usageSummary?.topConsumers && usageSummary.topConsumers.length > 0 ? (
                    usageSummary.topConsumers.map((c, i) => (
                      <tr key={i} className="hover:bg-[#0e1726] transition-colors">
                        <td className="p-3 font-mono text-blue-300 font-semibold">{c.userId}</td>
                        <td className="p-3 text-slate-400 font-mono">{c.date}</td>
                        <td className="p-3 font-mono font-bold text-slate-100">{c.requests}</td>
                        <td className="p-3 font-mono text-purple-300">{c.tokens.toLocaleString()}</td>
                        <td className="p-3 font-mono text-slate-400">{c.uploadMb} MB</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        No AI quota consumption recorded yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-5 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#16253c]">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Administrative & Faculty Audit Log</h3>
              <p className="text-[11px] text-slate-400">Chronological immutable record of privilege operations.</p>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">{auditLogs.length} Records</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No administrative audit records logged yet.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-[#070d18] border border-[#152336] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{new Date(log.ts).toLocaleString()}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                        {log.action}
                      </span>
                      {log.userRole && (
                        <span className="text-[10px] text-amber-400 font-mono">({log.userRole})</span>
                      )}
                    </div>
                    <div className="text-slate-300 text-xs">
                      Actor: <code className="text-blue-300 font-mono">{log.userId || 'System'}</code>
                      {log.resourceType && (
                        <span className="text-slate-400"> &bull; Target: {log.resourceType} ({log.resourceId})</span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 bg-[#09111c] p-2 rounded-lg border border-[#172438] max-w-sm truncate">
                    {JSON.stringify(log.details)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Cohort Management */}
      {activeTab === 'cohort' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Seed / Clear Demo Data */}
          <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#16253c]">
              <Database className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Demo Cohort Generator</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Populate the platform with realistic synthetic student profiles, pre-calculated BKT mastery curves, past attempts, and live interventions for demonstrations.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleSeedDemo}
                disabled={seedLoading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                <span>{seedLoading ? 'Seeding Demo Data...' : 'Seed Synthetic Demo Cohort'}</span>
              </button>

              <button
                onClick={handleClearDemo}
                disabled={clearLoading}
                className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-bold border border-rose-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>{clearLoading ? 'Clearing Data...' : 'One-Click Clear Demo Cohort'}</span>
              </button>
            </div>
          </div>

          {/* Right: Create Teacher Account */}
          <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#16253c]">
              <UserPlus className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Faculty Account</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Provision an official teacher account. Faculty roles are strictly assigned on the server and cannot be created via standard student registration.
            </p>

            <form onSubmit={handleCreateTeacher} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Faculty Full Name</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="Dr. Alan Turing"
                  className="w-full bg-[#070c14] border border-[#1b2b42] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Academic Email</label>
                <input
                  type="email"
                  required
                  value={teacherEmail}
                  onChange={e => setTeacherEmail(e.target.value)}
                  placeholder="turing@university.edu"
                  className="w-full bg-[#070c14] border border-[#1b2b42] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={teacherPassword}
                  onChange={e => setTeacherPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-[#070c14] border border-[#1b2b42] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {teacherActionMsg && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  teacherActionMsg.isError ? 'bg-rose-950/40 border border-rose-800 text-rose-300' : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                }`}>
                  {teacherActionMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{teacherActionMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingTeacher}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreatingTeacher ? 'Provisioning...' : 'Provision Teacher Account'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
