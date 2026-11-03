import React, { useState } from 'react';
import { X, Sparkles, Shuffle, Users, Check, AlertCircle } from 'lucide-react';
import { useTutor } from '../../context/TutorContext';

interface StudySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (study: any) => void;
}

export const StudySetupModal: React.FC<StudySetupModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { dkmNodes } = useTutor();
  const [title, setTitle] = useState('Empirical Investigation: Closed-Loop Socratic Scaffolding vs. Direct LLM Solutions');
  const [selectedTopicId, setSelectedTopicId] = useState(dkmNodes[0]?.id || 'pdo_mysql_port');
  const [description, setDescription] = useState('Comparative evaluation measuring normalized learning gains, error recurrence rates, and independent transfer.');
  const [masteryThreshold, setMasteryThreshold] = useState(90);
  const [enableArmC, setEnableArmC] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedNode = dkmNodes.find(n => n.id === selectedTopicId) || dkmNodes[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          topicId: selectedNode.id,
          topicName: selectedNode.name,
          description,
          masteryThreshold,
          enableArmC,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create study');
      }

      onCreated(data.study);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-100">Configure New Empirical Study</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up randomized controlled research protocol across Socratic scaffolding and generic assistant arms.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Study Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Socratic vs Direct Answer Study"
            />
          </div>

          {/* Topic Picker */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">DKM Target Concept Topic</label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {dkmNodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.track})
                </option>
              ))}
            </select>
            {selectedNode && (
              <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">
                  Key Invariant: <span className="text-slate-200">{selectedNode.keyConcept}</span>
                </div>
                <div className="text-rose-400">
                  Typical Trap: <span className="text-rose-200">{selectedNode.typicalTrap}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Research Abstract / Hypothesis</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Study Arms preview */}
          <div>
            <label className="block font-semibold text-slate-300 mb-2">Protocol Treatment Arms</label>
            <div className="space-y-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-900/40">
                <div className="font-bold text-indigo-300">Arm A: Personalised Closed-Loop (Treatment)</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Individual Student Learning Model (ISLM), Socratic 4-tier scaffolding, anti-answer protocol, and dynamic misconception tracking.
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/40">
                <div className="font-bold text-rose-300">Arm B: Generic Assistant (Active Control)</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Same underlying LLM, but delivers direct complete code answers without scaffolding or learner memory state.
                </div>
              </div>
              {enableArmC && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-bold text-slate-300">Arm C: No Assistance (Baseline Control)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Standard problem environment without automated AI hints or solutions.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="enableArmC"
                checked={enableArmC}
                onChange={e => setEnableArmC(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="enableArmC" className="text-slate-300 cursor-pointer select-none">
                Include optional Arm C (No assistance control group)
              </label>
            </div>
          </div>

          {/* Mastery threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">Mastery Threshold</label>
              <span className="font-mono text-emerald-400 font-bold">{masteryThreshold}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="100"
              step="5"
              value={masteryThreshold}
              onChange={e => setMasteryThreshold(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500">
              Students scoring &ge; {masteryThreshold}% on the post-test are classified as having attained complete concept mastery.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Study Protocol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
