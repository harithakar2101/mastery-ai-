import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldCheck, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { VerificationQuestionState } from './types';

interface SelfReportVerificationModalProps {
  modalState: VerificationQuestionState;
  onClose: () => void;
  onVerifyResult: (isCorrect: boolean) => void;
}

export const SelfReportVerificationModal: React.FC<SelfReportVerificationModalProps> = ({
  modalState,
  onClose,
  onVerifyResult,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  if (!modalState.isOpen) return null;

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === modalState.correctIndex;
    setIsAnswered(true);
    if (isCorrect) {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    }
    setTimeout(() => {
      onVerifyResult(isCorrect);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b1322] border border-[#1e2f47] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#18263a]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/60">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Self-Report Verification Drill</h3>
              <p className="text-[11px] text-slate-400">
                Triggered by MasteryBand <code className="text-amber-300">I_UNDERSTAND</code> gesture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Note: Pedagogical Rule */}
        <div className="bg-[#070d17] border border-amber-900/40 rounded-xl p-2.5 text-xs text-amber-200">
          <strong>Anti-Inflation Protocol:</strong> Self-reports do not advance mastery scores directly.
          Mastery updates only when you correctly solve this single diagnostic verification item!
        </div>

        {/* Concept & Question */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            Target Concept: <strong className="text-indigo-300">{modalState.conceptName}</strong>
          </div>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed">
            {modalState.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {modalState.options.map((opt, idx) => (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => setSelectedOption(idx)}
              className={`w-full p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                isAnswered
                  ? idx === modalState.correctIndex
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : selectedOption === idx
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  : selectedOption === idx
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isAnswered && (
              <span
                className={`font-semibold flex items-center gap-1 ${
                  selectedOption === modalState.correctIndex ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {selectedOption === modalState.correctIndex
                  ? 'Mastery Confirmed! Haptic SHORT_LONG sent.'
                  : 'Conceptual gap persists. Tier 1 hint dispatched.'}
              </span>
            )}
          </span>

          {!isAnswered ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                selectedOption !== null
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-950/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Verify Understanding
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
