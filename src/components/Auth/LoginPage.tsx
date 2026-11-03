import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { Brain, Lock, Mail, User, ArrowRight, GraduationCap, Shield, KeyRound, Loader2, Info } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
  onOpenProfileBuilder: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithServer, registerWithServer, isLoading } = useTutor();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('B.Tech in Computer Science & Engineering');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!email.trim() || !password.trim() || !name.trim()) {
          setErrorMessage('Please provide your name, email, and password (min 8 chars).');
          setSubmitting(false);
          return;
        }
        await registerWithServer({
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          degree: degree.trim(),
          inviteCode: inviteCode.trim() || undefined,
        });
      } else {
        const userEmail = email.trim() || 'haritha.k@university.edu';
        const userPass = password.trim() || 'Password123!';
        await loginWithServer({
          email: userEmail,
          password: userPass,
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoKey: 'student' | 'teacher' | 'admin') => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (demoKey === 'student') {
        await loginWithServer({
          email: 'haritha.k@university.edu',
          password: 'Password123!',
        });
      } else if (demoKey === 'teacher') {
        await loginWithServer({
          email: 'd.thorne@cs.university.edu',
          password: 'Password123!',
        });
      } else {
        await loginWithServer({
          email: 'admin@cognicse.edu',
          password: 'Password123!',
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Demo authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b13] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 mb-3">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <span>CogniCSE</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-700 font-mono">Matrix</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Production-Grade Socratic CSE Tutoring Platform</p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-[#0c1421] border border-[#1a273b] rounded-2xl p-7 shadow-2xl relative z-10 space-y-6">
        {/* Toggle Sign In / Register */}
        <div className="flex bg-[#070d18] p-1 rounded-xl border border-[#1a273b] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              !isRegister ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              isRegister ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Security & Role Policy Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300">
          <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-200">Production-Grade Security: </span>
            {isRegister
              ? 'All new accounts are enrolled as students by default. Faculty roles require a teacher invite code.'
              : 'User roles and student IDs are securely maintained server-side in httpOnly cookies. Client cannot tamper with role.'}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Haritha Karthikkumar"
                    className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Degree Program / College</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    placeholder="B.Tech in Computer Science & Engineering"
                    className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isRegister ? "name@university.edu" : "haritha.k@university.edu"}
                className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isRegister ? "Min 8 characters" : "Password123!"}
                className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Teacher Invite Code (Optional)</span>
                <span className="text-[10px] text-slate-500">Leave blank for Student</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="TEACHER_INVITE_2026"
                  className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Complete Registration' : 'Sign In to Matrix'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="pt-3 border-t border-[#1a273b] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Instant Demo Profiles</span>
            <span className="text-[10px] text-slate-500 font-mono">Password123!</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('student')}
              disabled={submitting}
              className="p-2 bg-[#070d18] hover:bg-[#111e33] border border-[#1a273b] rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-[10px] font-semibold text-blue-400 group-hover:text-blue-300">Student</div>
              <div className="text-[11px] font-bold text-slate-200 truncate">Haritha K.</div>
              <div className="text-[9px] text-slate-500 truncate">CSE_STU_8810</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('teacher')}
              disabled={submitting}
              className="p-2 bg-[#070d18] hover:bg-[#111e33] border border-[#1a273b] rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-[10px] font-semibold text-emerald-400 group-hover:text-emerald-300">Teacher</div>
              <div className="text-[11px] font-bold text-slate-200 truncate">Prof. Thorne</div>
              <div className="text-[9px] text-slate-500 truncate">FACULTY_402</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              disabled={submitting}
              className="p-2 bg-[#070d18] hover:bg-[#111e33] border border-[#1a273b] rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-[10px] font-semibold text-amber-400 group-hover:text-amber-300">Admin</div>
              <div className="text-[11px] font-bold text-slate-200 truncate">SysAdmin</div>
              <div className="text-[9px] text-slate-500 truncate">ADMIN_001</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
