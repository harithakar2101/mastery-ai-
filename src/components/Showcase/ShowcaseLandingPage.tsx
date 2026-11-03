import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
  Video,
  Box,
  Code2,
  Globe,
  Radio,
  GitBranch,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  CheckCircle2,
  Play,
  RotateCcw,
  BookOpen,
  Layers,
  Zap,
} from 'lucide-react';
import { Button, Badge } from '../UI';

interface ShowcaseMetrics {
  totalVerifiedAttempts: number;
  activeLearners: number;
  instructionalVideosGenerated: number;
  masteredConcepts: number;
  hoursStudied: number;
  averageMastery: number;
}

export const ShowcaseLandingPage: React.FC<{
  onOpenLogin: () => void;
}> = ({ onOpenLogin }) => {
  const { setIsAuthenticated, setUserProfile, setIslmState, setCurrentWorkflow } = useTutor();

  const [metrics, setMetrics] = useState<ShowcaseMetrics | null>(null);
  const [metricsAvailable, setMetricsAvailable] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<number>(0);

  useEffect(() => {
    fetch('/api/showcase/metrics')
      .then(res => res.json())
      .then(data => {
        if (data.available && data.stats) {
          setMetrics(data.stats);
          setMetricsAvailable(true);
        } else {
          setMetricsAvailable(false);
        }
      })
      .catch(() => setMetricsAvailable(false));
  }, []);

  const handleTryDemo = async () => {
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserProfile(data.user);
        if (data.islm) setIslmState(data.islm);
        setIsAuthenticated(true);
        setCurrentWorkflow('STUDY_STUDIO');
      } else {
        alert('Could not start demo session: ' + (data?.error?.message || 'Server error'));
      }
    } catch (err: any) {
      alert('Error connecting to demo server.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const workflowSteps = [
    {
      step: '01',
      title: 'Cognitive Diagnostic Pretest',
      subtitle: 'Knowledge Boundary Calibration',
      desc: 'Calibrates student knowledge frontiers using cold-start Bayesian parameter estimation across foundational prerequisites.',
      icon: <Brain className="w-5 h-5 text-blue-400" />,
    },
    {
      step: '02',
      title: 'Dynamic Memory Tree',
      subtitle: 'Real-Time Mastery Topology',
      desc: 'Visualizes concept graph dependencies, retention half-lives, and priority frontiers with live 2D/3D topological projections.',
      icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
    },
    {
      step: '03',
      title: 'Adaptive Study Studio',
      subtitle: 'Multimodal Ingestion & Planning',
      desc: 'Ingests course syllabi, textbooks, and lecture PDFs (up to 20MB) to generate BKT-weighted day-by-day exam roadmaps.',
      icon: <BookOpen className="w-5 h-5 text-purple-400" />,
    },
    {
      step: '04',
      title: 'Interactive Labs & Sandboxes',
      subtitle: 'Parametric CAD & Code Labs',
      desc: 'Autonomous practice across 3D CSG boolean models, polyglot unit testing, and reactive DOM trees with Socratic hints.',
      icon: <Box className="w-5 h-5 text-cyan-400" />,
    },
    {
      step: '05',
      title: 'AI Video Studio & TTS',
      subtitle: '1-Click Micro-Learning Explainer',
      desc: 'Auto-synthesizes 60s animated canvas explainers from weak concepts with server-mixed Gemini TTS audio and WebVTT captions.',
      icon: <Video className="w-5 h-5 text-pink-400" />,
    },
    {
      step: '06',
      title: 'Verified Learner Portfolio',
      subtitle: 'Zero Manual Override Credentials',
      desc: 'Generates immutable evidence-backed skill profiles, shareable read-only URLs (/p/:slug), and downloadable JSON transcripts.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    },
  ];

  const faqs = [
    {
      q: 'How does CogniCSE calculate mastery without subjective grading?',
      a: 'We implement Bayesian Knowledge Tracing (BKT) with parameters p(L0), p(T), p(G), and p(S). Every mastery claim is mathematically updated following verified unit tests, code sandbox executions, and CAD constraint evaluations. Manual score alterations are physically impossible.',
    },
    {
      q: 'What is the Anti-Answer Shield in Socratic Tutor mode?',
      a: 'Our pedagogical guardrails prohibit the AI tutor from supplying outright code answers or homework solutions. Instead, it diagnoses the student\'s latent misconception and provides tiered Socratic questions that guide them to discover the solution independently.',
    },
    {
      q: 'How does the downloadable AI Video feature work?',
      a: 'The video pipeline translates complex concepts into structured scene storyboards, renders them on a 1280x720 HTML5 canvas with animated diagrams, and combines them with server-synthesized Gemini TTS audio via an AudioContext destination to export standard MP4/WebM files with WebVTT subtitles.',
    },
    {
      q: 'Can employers or professors verify portfolio claims?',
      a: 'Yes. Every verified skill links to an immutable evidence record showing the exact code snippet, test cases passed, timestamp, and hint usage. Portfolios can be published to a private read-only URL (/p/:slug) or exported as a W3C-compliant JSON skills transcript.',
    },
    {
      q: 'Is my student data private and secure?',
      a: 'Absolutely. We use bcrypt password hashing, signed httpOnly cookies, server-side RBAC, and zero tracking scripts. Students retain full GDPR rights to export their complete data JSON or permanently delete their account with one click.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Public Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#060b13]/80 backdrop-blur-md border-b border-[#142135] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#070c16] rounded-[10px] flex items-center justify-center text-blue-400 font-black text-base">
              C
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm sm:text-base tracking-wide flex items-center gap-1.5">
              <span>CogniCSE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/80 font-mono">
                Mastery AI
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTryDemo}
            isLoading={isDemoLoading}
            leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
          >
            Try Demo
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenLogin}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d182b] border border-[#1e3456] text-blue-300 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span>Closed-Loop Autonomous Engineering Education</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Master Engineering with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Bayesian Precision</span> & Real Evidence
        </h1>

        <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The verified learning platform for Computer Science & Mechanical Engineering. Replace passive videos with interactive 3D CAD modeling, polyglot code sandboxes, and evidence-backed skill portfolios.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleTryDemo}
            isLoading={isDemoLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Launch Interactive Demo Account
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onOpenLogin}
          >
            Sign In with University ID
          </Button>
        </div>

        {/* Product Video / Interactive Showcase Card */}
        <div className="mt-12 relative max-w-4xl mx-auto rounded-2xl border border-[#1d304a] bg-[#09111e] p-2 sm:p-3 shadow-2xl">
          <div className="bg-[#050912] rounded-xl overflow-hidden border border-[#152336] aspect-video relative flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CogniCSE Simulation Engine • Ready</span>
              </span>
              <span>1280x720 Canvas Stream</span>
            </div>

            <div className="my-auto text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center mx-auto text-blue-300 hover:scale-105 transition-transform cursor-pointer shadow-lg" onClick={handleTryDemo}>
                <Play className="w-7 h-7 fill-blue-300 translate-x-0.5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-200">
                Autonomous Closed-Loop Learning in Action
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Explore real-time Bayesian Knowledge Tracing, 3D CSG booleans, and 60-second synthesized micro-lessons.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-[#131f32] pt-3">
              <span>BKT Mastery Tracking</span>
              <span>Socratic Hint Fading</span>
              <span>100% Client-Side Canvas Rendering</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Metrics from Real Database (Hidden entirely when no data exists) */}
      {metricsAvailable && metrics && (
        <section className="py-12 border-y border-[#152236] bg-[#080e18]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="text-xs font-mono uppercase text-blue-400 tracking-wider">
                Real-Time Telemetry
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                Live Engineering Mastery Analytics
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">
                  {metrics.totalVerifiedAttempts.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">Verified Attempts</div>
              </div>
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  {metrics.activeLearners.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">Active Students</div>
              </div>
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">
                  {metrics.instructionalVideosGenerated.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">AI Videos Rendered</div>
              </div>
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                  {metrics.masteredConcepts.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">Concepts Mastered</div>
              </div>
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  {metrics.hoursStudied}h
                </div>
                <div className="text-xs text-slate-400 mt-1">Time Studied</div>
              </div>
              <div className="p-4 bg-[#0a1220] rounded-xl border border-[#18283e]">
                <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono">
                  {metrics.averageMastery}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Avg Cohort Mastery</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* The Closed-Loop Explainer */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="purple" size="sm">The Closed Pedagogical Loop</Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
            How CogniCSE Guarantees Engineering Mastery
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Traditional tutorials leave blind spots. CogniCSE closes the feedback loop between diagnosis, practice, adaptive spacing, and immutable verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflowSteps.map((s, idx) => (
            <div
              key={s.step}
              className="bg-[#09111e] border border-[#18273d] hover:border-blue-500/40 rounded-2xl p-6 space-y-4 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#111e32] border border-[#1e3454] flex items-center justify-center">
                    {s.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    STEP {s.step}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{s.title}</h3>
                  <div className="text-xs text-blue-400 font-semibold">{s.subtitle}</div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Laboratory Features Breakdown */}
      <section className="py-16 bg-[#080e18] border-t border-[#152236] px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Interactive Engineering Laboratories
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              State-of-the-art WebGL and sandbox engines built directly into your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b1424] border border-[#1b2b41] rounded-xl p-5 space-y-3">
              <Box className="w-6 h-6 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">3D CAD Lab</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Parametric geometric constraint modeling with real-time 3D Three.js CSG boolean extrusions and dimensional inspections.
              </p>
            </div>
            <div className="bg-[#0b1424] border border-[#1b2b41] rounded-xl p-5 space-y-3">
              <Code2 className="w-6 h-6 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">Polyglot Code Sandbox</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Python and JavaScript code executor with Socratic multi-tier hint scaffolding, automated test assertion evaluation, and variant generation.
              </p>
            </div>
            <div className="bg-[#0b1424] border border-[#1b2b41] rounded-xl p-5 space-y-3">
              <Globe className="w-6 h-6 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Interactive Web Dev Lab</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live reactive DOM architecture workspace with instant CSS Flexbox/Grid visualizers and state inspection tools.
              </p>
            </div>
            <div className="bg-[#0b1424] border border-[#1b2b41] rounded-xl p-5 space-y-3">
              <Video className="w-6 h-6 text-pink-400" />
              <h3 className="text-sm font-bold text-slate-100">AI Video Production</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Client-side 1280x720 canvas rendering engine combining Gemini TTS PCM audio and subtitle exports into downloadable MP4/WebM files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible-AI & Privacy Statement */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#0c1626] to-[#080f1a] border border-[#1e3250] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                Responsible AI & Institutional Privacy Commitments
              </h2>
              <span className="text-xs text-emerald-400 font-mono">Pedagogical Guardrails & Enterprise Security</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-3 bg-[#08101c] rounded-xl border border-[#18283e] space-y-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Anti-Answer Shield</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Direct code solutions are blocked by system prompts. The AI acts strictly as an epistemological guide via Socratic inquiry.
              </p>
            </div>

            <div className="p-3 bg-[#08101c] rounded-xl border border-[#18283e] space-y-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Score Hallucination</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Every mastery score is calculated by the deterministic Bayesian Knowledge Tracing engine from executed tests, never fabricated.
              </p>
            </div>

            <div className="p-3 bg-[#08101c] rounded-xl border border-[#18283e] space-y-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Tracking or Data Monetization</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                No third-party advertising scripts or telemetry beacons. Your study logs and code attempts are never sold or trained upon.
              </p>
            </div>

            <div className="p-3 bg-[#08101c] rounded-xl border border-[#18283e] space-y-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>GDPR Portability & Erasure</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Export your complete data JSON at any time. Self-service account deletion permanently purges all records from the SQLite database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">Everything you need to know about the CogniCSE platform.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="bg-[#09111e] border border-[#18273d] rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-slate-200 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-[#142033]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 text-center space-y-6 border-t border-[#152236] bg-[#070d17]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Ready to experience autonomous engineering mastery?
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Start in seconds with a sandboxed student demo account. No credit card or installation required.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleTryDemo}
            isLoading={isDemoLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Launch Sandboxed Demo
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={onOpenLogin}
          >
            Sign In
          </Button>
        </div>
      </section>
    </div>
  );
};
