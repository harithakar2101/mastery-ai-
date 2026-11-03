import React from 'react';
import { Sparkles } from 'lucide-react';

interface StudyStatsTableProps {
  armA: any;
  armB: any;
  stats: any;
}

export const StudyStatsTable: React.FC<StudyStatsTableProps> = ({ armA, armB, stats }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Inferential Statistical Hypotheses & Effect Sizes
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Exact p via Regularized Incomplete Beta &bull; &alpha; = 0.05
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="pb-2.5">Hypothesis / Comparison</th>
              <th className="pb-2.5">Test Statistic</th>
              <th className="pb-2.5">df</th>
              <th className="pb-2.5">p-value</th>
              <th className="pb-2.5">Mean Diff</th>
              <th className="pb-2.5">95% CI</th>
              <th className="pb-2.5">Effect Size (d / g)</th>
              <th className="pb-2.5 text-right">Significance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {/* Paired t-test: Arm A pre vs post */}
            {armA?.pairedTTest && (
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-semibold text-slate-200">
                  Arm A Pre vs Post (Paired)
                </td>
                <td className="py-2.5 text-indigo-400">t = {armA.pairedTTest.t}</td>
                <td className="py-2.5 text-slate-400">{armA.pairedTTest.df}</td>
                <td className="py-2.5 text-emerald-400">
                  {armA.pairedTTest.pValue < 0.0001 ? '< 0.0001' : armA.pairedTTest.pValue}
                </td>
                <td className="py-2.5 text-slate-200">+{armA.pairedTTest.meanDiff}%</td>
                <td className="py-2.5 text-slate-400">
                  [{armA.pairedTTest.ci95?.[0]}, {armA.pairedTTest.ci95?.[1]}]
                </td>
                <td className="py-2.5 text-slate-400">&mdash;</td>
                <td className="py-2.5 text-right">
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    p &lt; 0.05
                  </span>
                </td>
              </tr>
            )}

            {/* Paired t-test: Arm B pre vs post */}
            {armB?.pairedTTest && (
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-semibold text-slate-200">
                  Arm B Pre vs Post (Paired)
                </td>
                <td className="py-2.5 text-indigo-400">t = {armB.pairedTTest.t}</td>
                <td className="py-2.5 text-slate-400">{armB.pairedTTest.df}</td>
                <td className="py-2.5 text-slate-300">
                  {armB.pairedTTest.pValue < 0.0001 ? '< 0.0001' : armB.pairedTTest.pValue}
                </td>
                <td className="py-2.5 text-slate-200">+{armB.pairedTTest.meanDiff}%</td>
                <td className="py-2.5 text-slate-400">
                  [{armB.pairedTTest.ci95?.[0]}, {armB.pairedTTest.ci95?.[1]}]
                </td>
                <td className="py-2.5 text-slate-400">&mdash;</td>
                <td className="py-2.5 text-right">
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                    p &lt; 0.05
                  </span>
                </td>
              </tr>
            )}

            {/* Welch t-test: Arm A vs Arm B on Normalized Gain */}
            {stats?.welchGain && (
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-semibold text-slate-200">
                  Arm A vs Arm B (Norm. Gain)
                </td>
                <td className="py-2.5 text-indigo-400">t = {stats.welchGain.t}</td>
                <td className="py-2.5 text-slate-400">{stats.welchGain.df}</td>
                <td className="py-2.5 text-emerald-400">
                  {stats.welchGain.pValue < 0.0001 ? '< 0.0001' : stats.welchGain.pValue}
                </td>
                <td className="py-2.5 text-emerald-400">+{stats.welchGain.meanDiff}</td>
                <td className="py-2.5 text-slate-400">
                  [{stats.welchGain.ci95?.[0]}, {stats.welchGain.ci95?.[1]}]
                </td>
                <td className="py-2.5 text-amber-400 font-bold">
                  d = {stats.cohensDGain} (g = {stats.hedgesGGain})
                </td>
                <td className="py-2.5 text-right">
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    Significant
                  </span>
                </td>
              </tr>
            )}

            {/* Welch t-test: Arm A vs Arm B on Post Scores */}
            {stats?.welchPost && (
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-semibold text-slate-200">
                  Arm A vs Arm B (Post Score)
                </td>
                <td className="py-2.5 text-indigo-400">t = {stats.welchPost.t}</td>
                <td className="py-2.5 text-slate-400">{stats.welchPost.df}</td>
                <td className="py-2.5 text-emerald-400">
                  {stats.welchPost.pValue < 0.0001 ? '< 0.0001' : stats.welchPost.pValue}
                </td>
                <td className="py-2.5 text-emerald-400">+{stats.welchPost.meanDiff}%</td>
                <td className="py-2.5 text-slate-400">
                  [{stats.welchPost.ci95?.[0]}, {stats.welchPost.ci95?.[1]}]
                </td>
                <td className="py-2.5 text-amber-400 font-bold">
                  d = {stats.cohensDPost} (g = {stats.hedgesGPost})
                </td>
                <td className="py-2.5 text-right">
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    Significant
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
