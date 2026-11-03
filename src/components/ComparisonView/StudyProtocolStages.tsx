import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  AlertCircle,
  HelpCircle,
  Users,
  Shuffle,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface StudyProtocolStagesProps {
  study: any;
  onRefresh: () => void;
}

export const StudyProtocolStages: React.FC<StudyProtocolStagesProps> = ({ study, onRefresh }) => {
  const [activeStage, setActiveStage] = useState<'pre-test' | 'learning' | 'post-test' | 'retention'>('pre-test');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProvenance, setGenerationProvenance] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Quick test-runner modal/state
  const [testStudentId, setTestStudentId] = useState('');
  const [testArmId, setTestArmId] = useState('ARM_A');
  const [testScore, setTestScore] = useState(85);
  const [isRecording, setIsRecording] = useState(false);
  const [recordMsg, setRecordMsg] = useState<string | null>(null);

  if (!study) return null;

  const items = study.items || [];
  const stageItems = items.filter((item: any) => item.stage === activeStage);

  const handleRegenerateItems = async () => {
    setIsGenerating(true);
    setGenerationProvenance(null);
    try {
      const res = await fetch(`/api/studies/${study.id}/generate-items`, { method: 'POST' });
      const data = await res.json();
      if (data.provenance) {
        setGenerationProvenance(data.provenance);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to regenerate items:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomAssign = async () => {
    setIsAssigning(true);
    try {
      await fetch(`/api/studies/${study.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'random' }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to assign students randomly:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditForm({ ...item, options: [...item.options] });
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const updated = items.map((it: any) => (it.id === editingItemId ? editForm : it));
      await fetch(`/api/studies/${study.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
      setEditingItemId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to save item edit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testStudentId) return;
    setIsRecording(true);
    setRecordMsg(null);
    try {
      const res = await fetch(`/api/studies/${study.id}/record-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: testStudentId,
          armId: testArmId,
          stage: activeStage,
          score: Number(testScore),
          passed: Number(testScore) >= 70,
          durationSec: 90,
          hintsRequested: testArmId === 'ARM_B' ? 4 : 1,
          repeatedError: testArmId === 'ARM_B',
          isTransferTask: activeStage === 'post-test',
        }),
      });
      if (res.ok) {
        setRecordMsg(`Recorded ${activeStage} event for student ${testStudentId}!`);
        onRefresh();
      }
    } catch (err: any) {
      setRecordMsg(`Failed: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PROTOCOL OVERVIEW BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Research Protocol & Concept-Matched Item Banks
            </span>
            {generationProvenance && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                generationProvenance === 'LIVE AI'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {generationProvenance}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100">{study.title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Target Concept: <strong className="text-slate-200">{study.topicName}</strong> • Structured across 4 sequential phases with isomorphic problem variants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRegenerateItems}
            disabled={isGenerating}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate Item Banks (Gemini)
          </button>
          <button
            onClick={handleRandomAssign}
            disabled={isAssigning}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Randomize Arm Assignment
          </button>
        </div>
      </div>

      {/* ARMS ENROLLMENT SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {study.arms?.map((arm: any) => (
          <div
            key={arm.id}
            className={`p-4 rounded-xl border ${
              arm.id === 'ARM_A'
                ? 'bg-indigo-950/20 border-indigo-900/50'
                : arm.id === 'ARM_B'
                ? 'bg-rose-950/20 border-rose-900/50'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className={arm.id === 'ARM_A' ? 'text-indigo-400' : arm.id === 'ARM_B' ? 'text-rose-400' : 'text-slate-300'}>
                {arm.name}
              </span>
              <span className="font-mono text-slate-400">{arm.studentIds?.length || 0} enrolled</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{arm.description}</p>
          </div>
        ))}
      </div>

      {/* STAGE SELECTOR TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'pre-test', label: '1. Pre-Test (Baseline)', icon: HelpCircle },
          { id: 'learning', label: '2. Learning Period (Assistance Protocol)', icon: Layers },
          { id: 'post-test', label: '3. Post-Test (Transfer Tasks)', icon: CheckCircle2 },
          { id: 'retention', label: '4. Delayed Retention Test', icon: Sparkles },
        ].map(stage => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {stage.label}
            </button>
          );
        })}
      </div>

      {/* ITEMS LIST */}
      <div className="space-y-4">
        {stageItems.length === 0 ? (
          <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
            No items registered for this stage. Click "Regenerate Item Banks" to create questions.
          </div>
        ) : (
          stageItems.map((item: any, idx: number) => {
            const isEditing = editingItemId === item.id;
            return (
              <div
                key={item.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-3 text-xs"
              >
                {isEditing ? (
                  /* Edit form */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Edit Question Item #{idx + 1}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editForm.question}
                      onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                      rows={2}
                    />
                    <div className="space-y-2">
                      {editForm.options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={editForm.correctIndex === optIdx}
                            onChange={() => setEditForm({ ...editForm, correctIndex: optIdx })}
                            className="cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...editForm.options];
                              newOpts[optIdx] = e.target.value;
                              setEditForm({ ...editForm, options: newOpts });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-indigo-400 font-bold">Item #{idx + 1}</span>
                          {item.isTransferTask && (
                            <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800 font-mono">
                              Transfer Task
                            </span>
                          )}
                          {item.targetMisconception && (
                            <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                              Trap: {item.targetMisconception}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-100">{item.question}</h3>
                      </div>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit question text and options"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.codeSnippet && (
                      <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {item.codeSnippet}
                      </pre>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.options?.map((opt: string, optIdx: number) => {
                        const isCorrect = optIdx === item.correctIndex;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                                : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation && (
                      <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                        Pedagogical Invariant: {item.explanation}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* QUICK EVENT SIMULATION / RECORDING PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Play className="w-4 h-4 text-emerald-400" />
          Test-Drive Student Submission for Active Stage ({activeStage})
        </div>
        <p className="text-slate-400 text-[11px]">
          Record an event for a student in this stage to verify real-time metric updates in the study dashboard.
        </p>

        <form onSubmit={handleRecordTestEvent} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-slate-400 mb-1">Student ID</label>
            <input
              type="text"
              placeholder="e.g. STU_TEST_01"
              value={testStudentId}
              onChange={e => setTestStudentId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Study Arm</label>
            <select
              value={testArmId}
              onChange={e => setTestArmId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="ARM_A">Arm A (Personalised)</option>
              <option value="ARM_B">Arm B (Generic)</option>
              <option value="ARM_C">Arm C (No Assist)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Score ({testScore}%)</label>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={testScore}
              onChange={e => setTestScore(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={isRecording}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isRecording ? 'Logging...' : 'Submit Stage Response'}
          </button>
        </form>

        {recordMsg && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs">
            {recordMsg}
          </div>
        )}
      </div>
    </div>
  );
};
