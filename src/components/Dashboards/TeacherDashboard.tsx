import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
  Flame,
  Radio,
  FileSpreadsheet,
  ArrowRight,
  Eye,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { TeacherStudentDrilldown } from './TeacherStudentDrilldown';
import { TeacherInterventions } from './TeacherInterventions';

export const TeacherDashboard: React.FC = () => {
  const { switchRole, setCurrentWorkflow } = useTutor();

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const fetchCohortData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teacher/cohort-analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load cohort analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortData();
  }, []);

  const handleExportCSV = () => {
    window.location.href = '/api/teacher/export-csv';
  };

  const cohortSize = analytics?.cohortSize ?? 0;
  const avgClassMastery = analytics?.avgClassMastery ?? 0;
  const atRiskCount = analytics?.atRiskCount ?? 0;
  const fadingRate = analytics?.scaffoldingFadingRate ?? 0;
  const heatmap = analytics?.heatmap ?? {};
  const students = analytics?.students ?? [];
  const misconceptions = analytics?.misconceptions ?? [];
  const interventions = analytics?.interventions ?? [];

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Instructor & Faculty Telemetry Console
            </span>
            <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
              STUDY DATA
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Cohort Diagnostics & Intervention Analytics</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Live aggregate telemetry across verified enrolled students. Monitors DKM concept heatmaps, recurrent anti-pattern traps, and scaffolding fading velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentWorkflow('LIVE_CLASS')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Launch Live Class
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={fetchCohortData}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Refresh cohort data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => switchRole('student')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Switch to Student View
          </button>
        </div>
      </div>

      {/* EMPTY STATE OR COHORT OVERVIEW */}
      {cohortSize === 0 && !isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-md">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-200">No Enrolled Students Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no enrolled students in this cohort database. Telemetry tiles and heatmap will automatically populate as students begin solving problems and submitting checkpoint responses.
          </p>
        </div>
      ) : (
        <>
          {/* COHORT OVERVIEW METRICS (Computed from server data) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Cohort Enrollment</div>
              <div className="mt-2 text-2xl font-bold text-slate-100">
                {cohortSize} <span className="text-xs text-slate-500 font-normal">Students</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono">Server-verified accounts</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Average DKM Mastery</div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">{avgClassMastery}%</div>
              <div className="mt-1 text-[11px] text-emerald-300 font-mono">Cohort aggregate p(L)</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Students At Risk</div>
              <div className="mt-2 text-2xl font-bold text-rose-400">
                {atRiskCount} <span className="text-xs text-slate-500 font-normal">Students</span>
              </div>
              <div className="mt-1 text-[11px] text-rose-300 font-mono">&ge;3 Red Nodes or no solve 7d</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Scaffolding Fading Rate</div>
              <div className="mt-2 text-2xl font-bold text-purple-400">{fadingRate}%</div>
              <div className="mt-1 text-[11px] text-purple-300 font-mono">Independent solve velocity</div>
            </div>
          </div>

          {/* COHORT CONCEPT HEATMAP */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Cohort DKM Concept Heatmap (% of Students at GREEN)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Criterion: BKT p(L) &ge; 0.80 across cohort
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(heatmap).map(([cId, item]: [string, any]) => (
                <div key={cId} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate pr-2">{item.label || cId}</span>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">{item.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                    <span>{item.greenCount} of {item.totalCount} students</span>
                    <span>GREEN</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PER-STUDENT TELEMETRY TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Student Drill-Down & Telemetry Registry
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Click a student for full ISLM trace</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Overall Mastery</th>
                    <th className="pb-3">Fading Index</th>
                    <th className="pb-3">Red Concepts</th>
                    <th className="pb-3">Repeated Traps</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((stu: any) => (
                    <tr key={stu.studentId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">
                        {stu.name}
                        <div className="text-[10px] font-mono text-slate-500">{stu.studentId}</div>
                      </td>
                      <td className="py-3">
                        {stu.isAtRisk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800">
                            AT RISK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ON TRACK
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono font-bold text-indigo-400">
                        {Math.round((stu.overallMastery || 0) * 100)}%
                      </td>
                      <td className="py-3 font-mono text-purple-400">
                        {stu.scaffoldingFadingIndex?.toFixed(2) ?? '0.00'}
                      </td>
                      <td className="py-3 font-mono text-rose-400 font-semibold">
                        {stu.redCount || 0}
                      </td>
                      <td className="py-3 font-mono text-amber-400 font-semibold">
                        {stu.repeatedErrorCount || 0}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedStudent(stu)}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-700/60 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Drill Down
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MISCONCEPTION ANALYTICS RANKED TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Misconception Analytics (Ranked by Affected Students)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Derived from real mistake logs & error categories
              </span>
            </div>

            {misconceptions.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-4">No cognitive traps logged across cohort.</div>
            ) : (
              <div className="space-y-2.5">
                {misconceptions.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold font-mono text-slate-400 text-[11px]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">{m.misconception}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-rose-400 font-bold">
                        {m.affectedStudentsCount} student{m.affectedStudentsCount !== 1 ? 's' : ''} ({m.affectedPercent}%)
                      </span>
                      <div className="w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${m.affectedPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TARGETED PEDAGOGICAL INTERVENTIONS */}
          <TeacherInterventions
            interventions={interventions}
            onRefresh={fetchCohortData}
          />
        </>
      )}

      {/* STUDENT DRILL-DOWN MODAL */}
      <TeacherStudentDrilldown
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
};
