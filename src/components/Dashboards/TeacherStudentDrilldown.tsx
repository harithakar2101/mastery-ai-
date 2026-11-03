import React from 'react';
import {
  X,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Repeat,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';

interface StudentDrilldownProps {
  student: any | null;
  onClose: () => void;
}

export const TeacherStudentDrilldown: React.FC<StudentDrilldownProps> = ({ student, onClose }) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {student.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{student.name}</h2>
                <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                  {student.studentId}
                </span>
                {student.isAtRisk ? (
                  <span className="text-[10px] font-bold font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> AT RISK
                  </span>
                ) : (
                  <span className="text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ON TRACK
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.email} • Track: <span className="text-slate-200">{student.courseTrack}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* At Risk Reasons */}
          {student.isAtRisk && student.atRiskReasons?.length > 0 && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2">
              <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Diagnostic Risk Triggers
              </div>
              <ul className="list-disc list-inside text-xs text-rose-200 space-y-1">
                {student.atRiskReasons.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Overall Mastery</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                {Math.round((student.overallMastery || 0) * 100)}%
              </div>
              <div className="text-[10px] text-slate-500">ISLM aggregate</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Fading Index</div>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {student.scaffoldingFadingIndex?.toFixed(2) ?? '0.00'}
              </div>
              <div className="text-[10px] text-slate-500">Independence velocity</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Repeated Errors</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {student.repeatedErrorCount || 0}
              </div>
              <div className="text-[10px] text-slate-500">Same concept + trap</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Assistance Requests</div>
              <div className="text-xl font-bold text-blue-400 mt-1">
                {student.assistanceRequests || 0}
              </div>
              <div className="text-[10px] text-slate-500">Hints & Tutoring calls</div>
            </div>
          </div>

          {/* Concept Mastery Radar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              BKT Concept Mastery Breakdown
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(student.topicMastery || {}).map(([cId, pL]) => {
                const val = Number(pL);
                const isGreen = val >= 0.80;
                const isYellow = val >= 0.50 && val < 0.80;
                return (
                  <div key={cId} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">{cId}</span>
                      <span className={`font-bold font-mono ${isGreen ? 'text-emerald-400' : isYellow ? 'text-amber-400' : 'text-rose-400'}`}>
                        {(val * 100).toFixed(0)}% ({isGreen ? 'GREEN' : isYellow ? 'YELLOW' : 'RED'})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isGreen ? 'bg-emerald-500' : isYellow ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.round(val * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Categories Breakdown */}
          {Object.keys(student.errorCategories || {}).length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-amber-400" />
                Error Categories Distribution
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(student.errorCategories).map(([cat, count]) => (
                  <span key={cat} className="px-2.5 py-1 bg-slate-900 text-slate-300 rounded-lg text-xs border border-slate-800 font-mono">
                    {cat}: <strong>{String(count)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event & Attempt Timeline */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Recent Chronological Event & Attempt Log
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {student.timeline && student.timeline.length > 0 ? (
                student.timeline.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {item.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-300">{item.description}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">No recent attempts or events logged.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
