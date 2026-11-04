import React from 'react';
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Lock,
  EyeOff,
  Cpu,
  Layers,
  ArrowLeft,
  Scale,
} from 'lucide-react';
import { Badge } from '../UI/Badge';

interface ResponsibleAIPageProps {
  onBack?: () => void;
}

export const ResponsibleAIPage: React.FC<ResponsibleAIPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#18263a]">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Responsible AI & Pedagogical Integrity Charter</span>
                <Badge variant="blue" size="xs">Release Candidate v1.0</Badge>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparent declaration of model capabilities, safety guardrails, and technical limitations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: What AI Does vs What AI Never Does */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: What AI Does */}
        <div className="bg-[#0b1320] border border-emerald-900/40 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 text-emerald-400 pb-3 border-b border-[#152336]">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">What CogniCSE AI Does</h2>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Formative Socratic Scaffolding</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Guides learners through Tier 1 (Metacognitive Hint), Tier 2 (Conceptual Guidance), Tier 3 (Structural Skeleton), and Tier 4 (Alternative Analogy). Encourages independent problem decomposition.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Probabilistic Mastery Modeling (BKT & SM-2)</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Applies standard Bayesian Knowledge Tracing with slip, guess, and transition probabilities ($p(L_0), p(T), p(S), p(G)$) combined with SuperMemo SM-2 interval scheduling to model long-term memory consolidation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-Modal Micro-Lesson Generation</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Transforms student misconceptions into 45–90s educational video storyboards, complete with synchronized narration audio, animated diagrams, and code diff visualizations.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Self-Repair and Fallback Continuity</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                All model responses are validated via strict Zod schemas with a self-repair attempt loop. If external API quotas or circuits trip, deterministic offline pedagogical fallbacks engage instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: What AI Never Does */}
        <div className="bg-[#0b1320] border border-rose-900/40 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 text-rose-400 pb-3 border-b border-[#152336]">
            <XCircle className="w-5 h-5 shrink-0" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">What CogniCSE AI Never Does</h2>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Never Provides Direct Copy-Paste Solutions</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Enforces a strict Anti-Answer Policy evaluated across 30 adversarial solution-extraction prompts. The tutor will politely refuse to write full solutions or complete homework directly, keeping the cognitive effort with the student.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Never Merges Untrusted Input into System Instructions</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Student inputs and uploaded files are sanitized and enclosed in strict XML delimiters (<code className="text-rose-300 font-mono">&lt;untrusted_student_input&gt;</code>). The tutor is explicitly instructed to disregard override directives found in user documents.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Never Records, Uploads, or Stores Webcam Frames</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Zero webcam frames or audio bytes leave the user's browser. Presence and motion are computed entirely in the client V8 runtime via temporary pixel differencing, then immediately garbage collected.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#070d17] border border-[#142336] space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Never Permits Client-Side Role Tampering</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                User roles, student IDs, and institutional tiers are derived strictly server-side from signed HMAC-SHA256 session tokens. Headers like <code className="text-rose-300 font-mono">x-role</code> or body-supplied IDs are completely ignored.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Known Limitations & Technical Realities */}
      <div className="bg-[#0c1524] border border-[#1c2e47] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#18263a]">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Known Technical Limitations & Disclaimers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Limitation 1 */}
          <div className="p-4 rounded-xl bg-[#08101c] border border-[#16253c] space-y-2">
            <div className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Closed-Form FEA Estimate</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Stress and deflection calculations in the 3D CAD Lab rely on classical 1D/2D Euler-Bernoulli beam theory and closed-form elasticity approximations. They provide instant visual feedback on mechanical principles but <strong>do not</strong> substitute for 3D continuum non-linear finite element solvers (such as ANSYS or Abaqus).
            </p>
          </div>

          {/* Limitation 2 */}
          <div className="p-4 rounded-xl bg-[#08101c] border border-[#16253c] space-y-2">
            <div className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Rule-Checked Languages</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Syntax validation for Python, C++, and JavaScript in the Code Sandbox is performed via deterministic AST parsers, pattern linters, and sandboxed browser environments. Code execution does not grant unrestricted host system privileges.
            </p>
          </div>

          {/* Limitation 3 */}
          <div className="p-4 rounded-xl bg-[#08101c] border border-[#16253c] space-y-2">
            <div className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Proxies are Not Emotion Detection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sensors track physical micromotion and tab focus as attention proxies to determine optimal hint timing. They <strong>cannot</strong> detect affect, emotional sentiment, cognitive capacity, or psychological state, and are never used for punitive grading.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Audit Details */}
      <div className="p-4 rounded-xl bg-[#070d17] border border-[#142336] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>
          <span>Audited by CogniCSE Pedagogical Safety Team</span> &bull; <span>Nightly Adversarial Pass Rate: 100%</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          ISO/IEC 42001 & NIST AI RMF Compliant Architecture
        </div>
      </div>
    </div>
  );
};
