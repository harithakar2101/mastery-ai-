import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Code2,
  GitGraph,
  Video,
  FileQuestion,
  BookOpen,
  BarChart3,
  LayoutDashboard,
  ShieldCheck,
  Download,
  Brain,
  Sparkles,
  Users,
  GraduationCap,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  onOpenPretest: () => void;
  onOpenSecurityAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPretest, onOpenSecurityAudit }) => {
  const { currentWorkflow, setCurrentWorkflow, islm, switchRole, exportOfflinePack } = useTutor();

  const navItems = [
    { id: 'LIVE_CLASS', label: 'Live Class', icon: Radio },
    { id: 'CODE_SANDBOX_TUTORING', label: 'Code Sandbox', icon: Code2 },
    { id: 'MEMORY_TREE', label: 'Memory Tree', icon: GitGraph },
    { id: 'AI_VIDEO', label: '60s AI Video', icon: Video },
    { id: 'MOCK_TEST', label: 'AI Mock Test', icon: FileQuestion },
    { id: 'LIBRARY_VAULT', label: 'Library Vault', icon: BookOpen },
    { id: 'COMPARISON_STUDY', label: 'Empirical Study', icon: BarChart3 },
    {
      id: islm.role === 'teacher' ? 'TEACHER_DASHBOARD' : 'STUDENT_DASHBOARD',
      label: islm.role === 'teacher' ? 'Teacher Console' : 'ISLM Dashboard',
      icon: LayoutDashboard,
    },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* LOGO & BRAND */}
          <div
            onClick={() => setCurrentWorkflow('CHATS')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">CogniCSE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                  1-on-1 Socratic
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 font-mono">Pedagogical AI Learning System</p>
            </div>
          </div>

          {/* MAIN WORKFLOW NAV TABS */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentWorkflow === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentWorkflow(item.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Diagnostic Pretest Trigger */}
            <button
              onClick={onOpenPretest}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
              title="Launch Diagnostic Pretest"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pretest</span>
            </button>

            {/* Security Audit Trigger */}
            <button
              onClick={onOpenSecurityAudit}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="System Security & Reliability Audit"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            {/* Role Switcher Pill */}
            <button
              onClick={() => switchRole(islm.role === 'student' ? 'teacher' : 'student')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                islm.role === 'teacher'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
              }`}
            >
              {islm.role === 'teacher' ? (
                <>
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Teacher</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Student</span>
                </>
              )}
            </button>

            {/* Offline Export */}
            <button
              onClick={exportOfflinePack}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer hidden md:flex"
              title="Export Offline Study Pack"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MOBILE SUB-NAVIGATION BAR */}
        <div className="lg:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-800/60">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentWorkflow === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentWorkflow(item.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
