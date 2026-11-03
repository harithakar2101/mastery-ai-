import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import { User, Award, CheckCircle2, AlertTriangle, TrendingUp, Clock, Download, ArrowRight, ShieldCheck, Terminal, Video, Radio, Sparkles } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { islm, dkmNodes, exportOfflinePack, setCurrentWorkflow, setSelectedNode } = useTutor();
  const [approvedInterventions, setApprovedInterventions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/store/interventions?studentId=${islm.student_id}`)
      .then(r => r.json())
      .then(data => {
        const approved = (data.items || []).filter((i: any) => i.status === 'Teacher-approved');
        setApprovedInterventions(approved);
      })
      .catch(() => {});
  }, [islm.student_id]);

  const greenCount = dkmNodes.filter(n => n.status === 'GREEN').length;
  const yellowCount = dkmNodes.filter(n => n.status === 'YELLOW').length;
  const redCount = dkmNodes.filter(n => n.status === 'RED').length;

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xl">
            {islm.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{islm.name}</h1>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                {islm.student_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track: <span className="text-slate-200 font-semibold">{islm.course_track}</span> • Individual Student Learning Model (ISLM)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentWorkflow('LIVE_CLASS')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            Join Live Class
          </button>
          <button
            onClick={exportOfflinePack}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-950/40 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Revision Pack
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Overall ISLM Mastery</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{(islm.overall_mastery * 100).toFixed(0)}%</div>
          <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${Math.round(islm.overall_mastery * 100)}%` }} />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Independent Solves</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{islm.independent_solves}</div>
          <div className="text-[10px] text-emerald-300 mt-1">Validated without direct answers</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Scaffolding Fading</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{islm.scaffolding_fading_index}</div>
          <div className="text-[10px] text-purple-300 mt-1">Autonomous problem-solving index</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Knowledge Gaps</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{redCount}</div>
          <div className="text-[10px] text-rose-300 mt-1">Flagged for targeted drills</div>
        </div>
      </div>

      {/* TEACHER-APPROVED INTERVENTIONS */}
      {approvedInterventions.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-700/60 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-800/60">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Teacher-Approved Pedagogical Interventions
            </div>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Teacher-approved
            </span>
          </div>

          <div className="space-y-3">
            {approvedInterventions.map((item: any) => (
              <div key={item.id} className="p-3.5 bg-slate-900/90 rounded-xl border border-indigo-900/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{item.conceptName || item.conceptId || 'Core Architecture'}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    item.outcome === 'resolved'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : item.outcome === 'repeated error'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    Outcome: {(item.outcome || 'pending').toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Instructor Advice:</strong> {item.tutorMessage}
                </p>
                {item.socraticQuestion && (
                  <p className="text-indigo-300 italic">
                    <strong>Reflective Prompt:</strong> "{item.socraticQuestion}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWO COLUMNS: RECENT MISCONCEPTIONS & LEARNING HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECENT MISCONCEPTIONS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Active Misconceptions Log
              </div>
              <span className="text-[10px] font-mono text-slate-500">ISLM Cognitive Radar</span>
            </div>

            <div className="space-y-2.5">
              {islm.recent_misconceptions.map((misc, idx) => (
                <div key={idx} className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/50 text-xs space-y-1">
                  <div className="font-semibold text-rose-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {misc}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Target: Socratic Scaffolding Tier {islm.scaffolding_tier_required}</span>
                    <button
                      onClick={() => {
                        const targetNode = dkmNodes.find(n => misc.toLowerCase().includes(n.id) || n.status === 'RED') || dkmNodes[0];
                        setSelectedNode(targetNode);
                        setCurrentWorkflow('CODE_SANDBOX');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold cursor-pointer"
                    >
                      Launch Drill →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT SESSIONS HISTORY (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Pedagogical Scaffolding & Solve History
              </div>
              <span className="text-[10px] font-mono text-slate-500">{islm.history.length} Sessions Logged</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {islm.history.map(entry => (
                <div key={entry.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{entry.topic_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {entry.timestamp} • Scaffold Tier {entry.tier_used} • {entry.issue_type}
                    </div>
                  </div>
                  <div>
                    {entry.resolved_independently ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                        Independent Solve
                      </span>
                    ) : (
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                        Scaffolded
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
