import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  Clock,
  AlertTriangle,
  Send,
  HelpCircle,
} from 'lucide-react';

interface InterventionItem {
  id: string;
  studentId: string;
  studentName?: string;
  conceptId?: string;
  conceptName?: string;
  severity?: 'high' | 'medium' | 'low';
  issueType?: string;
  suggestedAction?: string;
  rationale?: string;
  tutorMessage: string;
  socraticQuestion: string;
  status?: 'pending' | 'Teacher-approved' | 'dismissed';
  outcome?: 'pending' | 'resolved' | 'repeated error';
  approvedAt?: string;
  outcomeRecordedAt?: string;
}

interface TeacherInterventionsProps {
  interventions: InterventionItem[];
  onRefresh: () => void;
}

export const TeacherInterventions: React.FC<TeacherInterventionsProps> = ({ interventions, onRefresh }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTutorMessage, setEditTutorMessage] = useState('');
  const [editSocraticQuestion, setEditSocraticQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceProvenance, setSourceProvenance] = useState<'LIVE AI' | 'FALLBACK'>('LIVE AI');

  const handleStartEdit = (item: InterventionItem) => {
    setEditingId(item.id);
    setEditTutorMessage(item.tutorMessage || '');
    setEditSocraticQuestion(item.socraticQuestion || '');
  };

  const handleApprove = async (item: InterventionItem) => {
    try {
      await fetch('/api/teacher/interventions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          conceptId: item.conceptId,
          tutorMessage: editingId === item.id ? editTutorMessage : item.tutorMessage,
          socraticQuestion: editingId === item.id ? editSocraticQuestion : item.socraticQuestion,
        }),
      });
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error('Failed to approve intervention:', e);
    }
  };

  const handleDismiss = async (item: InterventionItem) => {
    try {
      await fetch('/api/teacher/interventions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId: item.id }),
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to dismiss intervention:', e);
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/teacher/intervention-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSourceProvenance(data.source === 'gemini' ? 'LIVE AI' : 'FALLBACK');
      onRefresh();
    } catch (e) {
      console.error('Failed to generate suggestions:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeOrPending = interventions.filter(i => i.status !== 'dismissed');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Targeted Pedagogical Interventions
            </h3>
            <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
              {sourceProvenance}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AI-synthesized remediation plans. Approved interventions display with "Teacher-approved" badge in student dashboards.
          </p>
        </div>

        <button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          {isGenerating ? 'Synthesizing...' : 'Generate New Suggestions'}
        </button>
      </div>

      {activeOrPending.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 italic">
          No pending or active interventions. Click "Generate New Suggestions" to evaluate at-risk students.
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrPending.map(item => {
            const isEditing = editingId === item.id;
            const isApproved = item.status === 'Teacher-approved';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isApproved
                    ? 'bg-indigo-950/30 border-indigo-700/60'
                    : 'bg-slate-950 border-slate-800'
                } space-y-3`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {item.studentName || item.studentId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({item.studentId})
                    </span>
                    <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {item.conceptName || item.conceptId || 'Core Concept'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                        Teacher-approved
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                        Pending Approval
                      </span>
                    )}

                    {item.outcome && (
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                        item.outcome === 'resolved'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : item.outcome === 'repeated error'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        Outcome: {item.outcome.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {item.rationale && (
                  <p className="text-xs text-slate-400 italic">
                    Diagnostic Rationale: {item.rationale}
                  </p>
                )}

                {/* Editable Tutor Message & Socratic Question */}
                {isEditing ? (
                  <div className="space-y-2 pt-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Tutor Guidance:</label>
                      <textarea
                        value={editTutorMessage}
                        onChange={e => setEditTutorMessage(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Socratic Question:</label>
                      <input
                        type="text"
                        value={editSocraticQuestion}
                        onChange={e => setEditSocraticQuestion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <p className="text-slate-200">
                      <strong>Guidance:</strong> {item.tutorMessage}
                    </p>
                    {item.socraticQuestion && (
                      <p className="text-indigo-300 italic">
                        <strong>Socratic Prompt:</strong> "{item.socraticQuestion}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!isApproved && (
                    <>
                      {isEditing ? (
                        <button
                          onClick={() => handleApprove(item)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> Save & Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}

                      {!isEditing && (
                        <button
                          onClick={() => handleApprove(item)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}

                      <button
                        onClick={() => handleDismiss(item)}
                        className="px-3 py-1 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
