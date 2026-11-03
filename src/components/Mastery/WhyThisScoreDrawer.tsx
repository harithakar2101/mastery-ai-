import React from 'react';
import { X, Calculator, ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { DKMNode, BKTTrace } from '../../types';
import { deriveNodeComposite } from '../../services/mastery';

interface WhyThisScoreDrawerProps {
  node: DKMNode | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSandbox?: (node: DKMNode) => void;
}

export const WhyThisScoreDrawer: React.FC<WhyThisScoreDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onOpenSandbox,
}) => {
  if (!isOpen || !node) return null;

  const composite = node.compositeMastery || deriveNodeComposite(node);
  const traces: BKTTrace[] = node.bktTrace || [];

  const evidenceLabel = node.evidenceLabel || 'Insufficient Evidence';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN':
      case 'Mastered':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'YELLOW':
      case 'Near Mastery':
      case 'Improving':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'NOT_ASSESSED':
      case 'Not Assessed':
        return 'text-slate-400 bg-slate-900 border-slate-700';
      case 'Developing':
      case 'Needs Attention':
      case 'RED':
      default:
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
    }
  };

  const getEvidenceColor = (label: string) => {
    switch (label) {
      case 'Confirmed through Repeated Evidence':
        return 'text-emerald-300 bg-emerald-950/80 border-emerald-700';
      case 'Likely Misconception':
        return 'text-rose-300 bg-rose-950/80 border-rose-700';
      case 'Possible Difficulty':
        return 'text-amber-300 bg-amber-950/80 border-amber-700';
      case 'Insufficient Evidence':
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
      <div
        className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* DRAWER HEADER */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/80 text-indigo-400 rounded-xl border border-indigo-800/80">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Bayesian Knowledge Tracing Audit
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  STUDY DATA
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">{node.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DRAWER BODY */}
        <div className="p-6 space-y-6 flex-1 text-sm text-slate-300">
          {/* PRIMARY METRICS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[11px] font-medium text-slate-400">Current p(L) Probability</div>
              <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
                {node.status === 'NOT_ASSESSED' || node.mastery === 0 ? 'Not Assessed' : `${(node.mastery * 100).toFixed(1)}%`}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {node.status === 'NOT_ASSESSED' ? 'Status: Unassessed' : `pL = ${node.mastery.toFixed(4)}`}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[11px] font-medium text-slate-400">BKT Node State</div>
              <div className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(node.status)}`}>
                {node.status}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {node.status === 'GREEN' ? 'pL >= 0.80' : node.status === 'YELLOW' ? '0.50 <= pL < 0.80' : 'pL < 0.50'}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[11px] font-medium text-slate-400">Evidence Classification</div>
              <div className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEvidenceColor(evidenceLabel)}`}>
                {evidenceLabel}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{traces.length} Total Observations</div>
            </div>
          </div>

          {/* COMPOSITE TOPIC MASTERY BREAKDOWN */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 text-sm">Composite Topic Mastery Formula</h3>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(composite.status)}`}>
                {composite.composite}% ({composite.status})
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Formula: Conceptual (35%) + Practical (35%) + Independent (20%) + Retention (10%).
              {composite.retention === null && (
                <span className="block text-indigo-300 mt-1">
                  * Retention recheck pending: weights dynamically renormalised (Conceptual {((composite.weights.conceptual) * 100).toFixed(1)}%, Practical {((composite.weights.practical) * 100).toFixed(1)}%, Independent {((composite.weights.independent) * 100).toFixed(1)}%).
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Conceptual (35%)</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{composite.conceptual}%</div>
                <div className="text-[9px] text-slate-400">Quizzes & Micro-drills</div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Practical (35%)</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{composite.practical}%</div>
                <div className="text-[9px] text-slate-400">Labs weighted by tier</div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Independent (20%)</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{composite.independent}%</div>
                <div className="text-[9px] text-slate-400">Transfer fixes: {composite.independentPassedCount} passed</div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Retention (10%)</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">
                  {composite.retention !== null ? `${composite.retention}%` : 'Not Measured'}
                </div>
                <div className="text-[9px] text-slate-400">{composite.retention !== null ? 'Recheck score' : 'Excl. & renormalised'}</div>
              </div>
            </div>
          </div>

          {/* BKT FORMULA & PARAMETERS CARD */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Bayesian Calibration Constants
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-slate-900/90 rounded border border-indigo-950">
                <div className="text-slate-400 text-[10px]">p(L0) Prior</div>
                <div className="font-bold text-slate-200 mt-0.5">0.20</div>
              </div>
              <div className="p-2 bg-slate-900/90 rounded border border-indigo-950">
                <div className="text-slate-400 text-[10px]">p(T) Transit</div>
                <div className="font-bold text-slate-200 mt-0.5">0.15</div>
              </div>
              <div className="p-2 bg-slate-900/90 rounded border border-indigo-950">
                <div className="text-slate-400 text-[10px]">p(G) Guess</div>
                <div className="font-bold text-slate-200 mt-0.5">0.20</div>
              </div>
              <div className="p-2 bg-slate-900/90 rounded border border-indigo-950">
                <div className="text-slate-400 text-[10px]">p(S) Slip</div>
                <div className="font-bold text-slate-200 mt-0.5">0.10</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 space-y-0.5 pt-1">
              <div>• Correct: P(L|C) = pL·(1-pS) / [pL·(1-pS) + (1-pL)·pG]</div>
              <div>• Incorrect: P(L|I) = pL·pS / [pL·pS + (1-pL)·(1-pG)]</div>
              <div>• Transition: pL_new = P(L|obs) + (1 - P(L|obs))·pT, clamped to [0.01, 0.99]</div>
            </div>
          </div>

          {/* OBSERVATION TRACE HISTORY TABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 text-sm">Step-by-Step Observation Trace</h3>
              <span className="text-xs text-slate-400">{traces.length} events logged</span>
            </div>

            {traces.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                No observations recorded for this concept yet. Launch Code Sandbox or complete a diagnostic quiz to generate Bayesian traces.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Source</th>
                      <th className="p-2.5">Result</th>
                      <th className="p-2.5">Prior p(L)</th>
                      <th className="p-2.5">Posterior p(L)</th>
                      <th className="p-2.5">Delta</th>
                      <th className="p-2.5">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {traces.map((t, idx) => {
                      const delta = +(t.posterior - t.prior).toFixed(4);
                      return (
                        <tr key={t.id || idx} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-slate-300 uppercase text-[11px]">{t.source}</td>
                          <td className="p-2.5">
                            {t.isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" /> FAIL
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400">{t.prior.toFixed(4)}</td>
                          <td className="p-2.5 text-slate-200 font-bold">{t.posterior.toFixed(4)}</td>
                          <td className={`p-2.5 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {delta >= 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
                          </td>
                          <td className="p-2.5 text-slate-400 text-[10px]">
                            {t.isIndependent ? 'Independent' : 'Scaffolded'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* DRAWER FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
          {onOpenSandbox && (
            <button
              onClick={() => {
                onClose();
                onOpenSandbox(node);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Practice in Sandbox <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
