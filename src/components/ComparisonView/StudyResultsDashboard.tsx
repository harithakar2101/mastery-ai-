import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  TrendingUp,
  Clock,
  HelpCircle,
  Repeat,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react';
import { StudyStatsTable } from './StudyStatsTable';

interface StudyResultsDashboardProps {
  results: any;
  masteryThreshold: number;
  onThresholdChange: (newThreshold: number) => void;
  onRefresh: () => void;
}

export const StudyResultsDashboard: React.FC<StudyResultsDashboardProps> = ({
  results,
  masteryThreshold,
  onThresholdChange,
  onRefresh,
}) => {
  if (!results) {
    return (
      <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <Info className="w-8 h-8 text-slate-500 mx-auto" />
        <div className="text-sm font-semibold text-slate-300">No active study results loaded</div>
        <p className="text-xs text-slate-500">
          Select or initialize a study and click "Seed Demo Cohort" or submit stage events.
        </p>
      </div>
    );
  }

  const armA = results.armResults?.ARM_A;
  const armB = results.armResults?.ARM_B;
  const armC = results.armResults?.ARM_C;
  const stats = results.comparativeStats;

  // Chart 1: Arm comparison across key dimensions
  const comparisonChartData = [
    {
      metric: 'Pre-Test',
      'Arm A (Socratic)': armA?.metrics?.preScore?.mean ?? 0,
      'Arm B (Generic)': armB?.metrics?.preScore?.mean ?? 0,
      ...(armC ? { 'Arm C (No Assist)': armC?.metrics?.preScore?.mean ?? 0 } : {}),
    },
    {
      metric: 'Post-Test',
      'Arm A (Socratic)': armA?.metrics?.postScore?.mean ?? 0,
      'Arm B (Generic)': armB?.metrics?.postScore?.mean ?? 0,
      ...(armC ? { 'Arm C (No Assist)': armC?.metrics?.postScore?.mean ?? 0 } : {}),
    },
    {
      metric: 'Norm. Gain (%)',
      'Arm A (Socratic)': Math.round((armA?.metrics?.normalizedGain?.mean ?? 0) * 100),
      'Arm B (Generic)': Math.round((armB?.metrics?.normalizedGain?.mean ?? 0) * 100),
      ...(armC ? { 'Arm C (No Assist)': Math.round((armC?.metrics?.normalizedGain?.mean ?? 0) * 100) } : {}),
    },
    {
      metric: 'Retention (%)',
      'Arm A (Socratic)': armA?.metrics?.retentionRate?.percent ?? 0,
      'Arm B (Generic)': armB?.metrics?.retentionRate?.percent ?? 0,
      ...(armC ? { 'Arm C (No Assist)': armC?.metrics?.retentionRate?.percent ?? 0 } : {}),
    },
    {
      metric: 'Independent (%)',
      'Arm A (Socratic)': armA?.metrics?.independentSuccessRate?.percent ?? 0,
      'Arm B (Generic)': armB?.metrics?.independentSuccessRate?.percent ?? 0,
      ...(armC ? { 'Arm C (No Assist)': armC?.metrics?.independentSuccessRate?.percent ?? 0 } : {}),
    },
  ];

  // Chart 2: Per-student pre vs post scatter/pair comparison
  const studentPairsData = (armA?.studentPairs || []).slice(0, 10).map((p: any, idx: number) => ({
    student: `A${idx + 1}`,
    Pre: p.pre,
    Post: p.post,
    Retention: p.retention,
  }));

  // Chart 3: Mastery threshold attainment across arms
  const masteryAttainmentData = [
    {
      arm: 'Arm A (Personalised)',
      percent: armA?.metrics?.masteryAttainment?.percent ?? 0,
      color: '#6366f1',
    },
    {
      arm: 'Arm B (Generic)',
      percent: armB?.metrics?.masteryAttainment?.percent ?? 0,
      color: '#f43f5e',
    },
    ...(armC
      ? [
          {
            arm: 'Arm C (Control)',
            percent: armC?.metrics?.masteryAttainment?.percent ?? 0,
            color: '#64748b',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* 1. PERMANENT PROVENANCE BANNER (Standing Rule 4) */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between shadow-md ${
          results.isSynthetic
            ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
              results.isSynthetic
                ? 'bg-amber-900/80 text-amber-300 border-amber-600'
                : 'bg-emerald-900/80 text-emerald-300 border-emerald-600'
            }`}
          >
            {results.provenance}
          </span>
          <div className="text-xs">
            {results.isSynthetic ? (
              <span>
                <strong>DEMO DATA (synthetic):</strong> Contains simulated student responses for empirical validation. Not measured human laboratory results.
              </span>
            ) : (
              <span>
                <strong>STUDY DATA:</strong> Derived exclusively from verified human student interaction telemetry events.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="text-slate-400">Sample Size:</span>
          <strong className="text-slate-200">N = {results.totalN}</strong>
          <span className="text-slate-500">({results.eventCount} events)</span>
        </div>
      </div>

      {/* 2. SMALL SAMPLE SIZE CAUTION (When N < 30) */}
      {results.isSmallSample && (
        <div className="p-4 bg-yellow-950/30 border border-yellow-700/60 rounded-2xl flex items-center gap-3 text-xs text-yellow-200">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-yellow-300">Methodological Advisory:</span>
            <p>{results.smallSampleCaution}</p>
          </div>
        </div>
      )}

      {/* 3. MASTERY THRESHOLD CONTROLLER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Configurable Mastery Attainment Criterion:</span>
          <span className="font-mono text-emerald-400 font-bold text-sm">{masteryThreshold}%</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="70"
            max="100"
            step="5"
            value={masteryThreshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            className="w-48 accent-indigo-500 cursor-pointer"
          />
          <span className="text-slate-400 font-mono text-[11px]">(Default 90%)</span>
        </div>
      </div>

      {/* 4. KEY 11 METRICS SUMMARY GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Normalized Gain */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Normalised Gain (g)</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-400">
              +{Math.round((armA?.metrics?.normalizedGain?.mean ?? 0) * 100)}%
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              vs +{Math.round((armB?.metrics?.normalizedGain?.mean ?? 0) * 100)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Arm A 95% CI: [{armA?.metrics?.normalizedGain?.ci95?.[0] ?? 0}, {armA?.metrics?.normalizedGain?.ci95?.[1] ?? 0}]
          </div>
        </div>

        {/* Metric 2: Post-Test Score */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Post-Test Score</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-indigo-400">
              {armA?.metrics?.postScore?.mean ?? 0}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              vs {armB?.metrics?.postScore?.mean ?? 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Pre: {armA?.metrics?.preScore?.mean ?? 0}% &rarr; Post: {armA?.metrics?.postScore?.mean ?? 0}%
          </div>
        </div>

        {/* Metric 3: Mastery Attainment */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Mastery &ge; {masteryThreshold}%</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-purple-400">
              {armA?.metrics?.masteryAttainment?.percent ?? 0}%
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              vs {armB?.metrics?.masteryAttainment?.percent ?? 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            {armA?.metrics?.masteryAttainment?.masteredCount ?? 0} of {armA?.metrics?.masteryAttainment?.total ?? 0} students
          </div>
        </div>

        {/* Metric 4: Repeated-Error Rate */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Repeated-Error Rate</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-400">
              {armA?.metrics?.repeatedErrorRate?.percent ?? 0}%
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              vs {armB?.metrics?.repeatedErrorRate?.percent ?? 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Trap recurrence in learning
          </div>
        </div>

        {/* Metric 5: Delayed Retention Rate */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Retention Rate</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-400">
              {armA?.metrics?.retentionRate?.percent ?? 0}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              vs {armB?.metrics?.retentionRate?.percent ?? 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Delayed retest / post-test
          </div>
        </div>

        {/* Metric 6: Independent Similar-Problem Success */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Independent Transfer</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-teal-400">
              {armA?.metrics?.independentSuccessRate?.percent ?? 0}%
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              vs {armB?.metrics?.independentSuccessRate?.percent ?? 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Passed transfer without hints
          </div>
        </div>

        {/* Metric 7: Time to Complete */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Mean Practical Time</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-blue-400">
              {Math.round((armA?.metrics?.timeToCompleteSec?.mean ?? 0) / 60)}m
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {armA?.metrics?.timeToCompleteSec?.mean ?? 0}s avg
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Task completion duration
          </div>
        </div>

        {/* Metric 8: Assistance Requests */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-slate-400 uppercase font-semibold text-[10px]">Assistance Requests</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-indigo-400">
              {armA?.metrics?.assistanceRequests?.mean ?? 0}
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              vs {armB?.metrics?.assistanceRequests?.mean ?? 0} direct
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Mean hints requested per task
          </div>
        </div>
      </div>

      {/* 5. INFERENTIAL STATISTICAL ANALYSIS TABLE */}
      <StudyStatsTable armA={armA} armB={armB} stats={stats} />

      {/* 6. RECHARTS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cross-Arm Comparison Bars */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Arm Comparison Across Key Evaluative Dimensions
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Values in %</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Arm A (Socratic)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Arm B (Generic)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                {armC && <Bar dataKey="Arm C (No Assist)" fill="#64748b" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Mastery Attainment Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Mastery Threshold Attainment (&ge; {masteryThreshold}%)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">% of Arm Achieving</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={masteryAttainmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="arm" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
                <Bar dataKey="percent" name="% Attaining Mastery" radius={[4, 4, 0, 0]}>
                  {masteryAttainmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Per-Student Longitudinal Progress (Arm A) */}
      {studentPairsData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Per-Student Longitudinal Trajectory: Pre &rarr; Post &rarr; Delayed Retention (Arm A)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">First 10 Learners</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentPairsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="student" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="Pre" stroke="#94a3b8" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Post" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="Retention" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
