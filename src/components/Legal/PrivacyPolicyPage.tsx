import React from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Trash2,
  Download,
  Clock,
  ArrowLeft,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Badge } from '../UI/Badge';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Privacy & Data Sovereignty Policy</span>
                <Badge variant="emerald" size="xs">FERPA & GDPR Aligned</Badge>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                How CogniCSE protects learner identities, isolates sensor streams, and upholds self-service deletion rights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Privacy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Zero Frame Storage */}
        <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-blue-400">
            <EyeOff className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Zero Frame & Sensor Upload</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All optical motion tracking in the Engagement Panel operates strictly within the client's browser V8 engine using temporary 80x60 in-memory canvas differencing. <strong>Zero frames, images, or biometric features are ever captured, transmitted, or stored</strong> on our servers or third-party networks.
          </p>
          <div className="p-2.5 rounded-lg bg-[#070d18] border border-[#142336] text-[11px] text-slate-400">
            &bull; No facial recognition &bull; No emotion inference &bull; Explicit user consent required before camera starts
          </div>
        </div>

        {/* Pillar 2: Automatic PII Redaction */}
        <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Lock className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Automated PII Redaction in Logs</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All server logs emitted across our infrastructure pass through an automated PII redaction layer. Email addresses (<code className="text-emerald-300 font-mono">j***@***.com</code>), bearer tokens, passwords, cookies, and secret keys are masked before outputting to stdout or persistent storage.
          </p>
          <div className="p-2.5 rounded-lg bg-[#070d18] border border-[#142336] text-[11px] text-slate-400">
            &bull; Pino-compliant structured JSON &bull; Correlation via unique Request IDs &bull; Zero plaintext credentials
          </div>
        </div>

        {/* Pillar 3: Configurable Data Retention */}
        <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Clock className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Customizable Data Retention</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Institutional and self-directed learners can configure their personal data retention window (default: 180 days; range: 1 to 3650 days). Once the retention threshold expires, historical attempts, chat sessions, and sensor events are permanently purged from database tables.
          </p>
          <div className="p-2.5 rounded-lg bg-[#070d18] border border-[#142336] text-[11px] text-slate-400">
            &bull; Configurable in Account Profile &bull; Automated scheduled cleanup &bull; Verified in audit logs
          </div>
        </div>

        {/* Pillar 4: Complete Data Sovereignty */}
        <div className="p-6 rounded-2xl bg-[#0b1320] border border-[#16253c] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-purple-400">
            <UserCheck className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Right to Export & Erasure</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Under FERPA and GDPR principles, you retain total ownership of your learning data:
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong>One-Click Export:</strong> Download your complete personal record (ISLM, attempts, flashcards, and portfolio) as JSON.</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Right to be Forgotten:</strong> Irreversibly delete your account and all associated database records in one click.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Third-Party AI Data Isolation */}
      <div className="p-6 rounded-2xl bg-[#0c1524] border border-[#1e2f47] space-y-3 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span>Third-Party AI Model Boundaries</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Calls to the Google Gemini API are strictly stateless. Personal identifiable information (such as real names, institutional student IDs, and raw cookies) is stripped before prompts reach the model. We do not use student interactions to train foundation models, and student work remains strictly confidential.
        </p>
      </div>
    </div>
  );
};
