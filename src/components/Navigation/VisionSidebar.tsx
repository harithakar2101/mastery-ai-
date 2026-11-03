import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Brain,
  MessageSquare,
  FileCheck,
  GitBranch,
  BookOpen,
  Code2,
  Video,
  BarChart3,
  Plus,
  Sun,
  Moon,
  LogOut,
  User,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Settings,
  Box,
  Globe,
  HeartPulse,
  Radio,
  LayoutDashboard,
  X,
} from 'lucide-react';

interface VisionSidebarProps {
  onOpenProfile: () => void;
  onOpenSecurityAudit: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const VisionSidebar: React.FC<VisionSidebarProps> = ({
  onOpenProfile,
  onOpenSecurityAudit,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const {
    currentWorkflow,
    setCurrentWorkflow,
    userProfile,
    setUserProfile,
    setIsAuthenticated,
    chatSessions,
    currentChatSession,
    selectChatSession,
    createNewChatSession,
    activeTrack,
    setActiveTrack,
  } = useTutor();

  const [isDarkMode, setIsDarkMode] = useState(userProfile.theme !== 'light');

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    setUserProfile(prev => ({ ...prev, theme: newTheme }));
    if (newTheme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const isMech =
    activeTrack === 'All Tracks' ||
    activeTrack === 'Mechanical Engineering (CAD)' ||
    activeTrack.toLowerCase().includes('mech') ||
    activeTrack.toLowerCase().includes('cad') ||
    currentWorkflow === 'CAD_LAB';

  const navItems = [
    { id: 'CHATS', label: 'Chats', icon: MessageSquare },
    { id: 'MOCK_TEST', label: 'Mock Test', icon: FileCheck },
    ...(isMech ? [{ id: 'CAD_LAB', label: '3D CAD Lab', icon: Box }] : []),
    { id: 'LIVE_CLASS', label: 'Live Class', icon: Radio },
    { id: 'CODE_SANDBOX', label: isMech ? 'Parametric Scripting' : 'Code Sandbox', icon: Code2 },
    { id: 'WEB_DEV_LAB', label: 'Web Dev Lab', icon: Globe },
    { id: 'MEMORY_TREE', label: 'Memory Tree', icon: GitBranch },
    { id: 'LIBRARY_VAULT', label: 'Library Vault', icon: BookOpen },
    { id: 'AI_VIDEO', label: '60s AI Video', icon: Video },
    { id: 'COMPARISON_STUDY', label: 'Empirical Study', icon: BarChart3 },
    { id: 'ENGAGEMENT', label: 'Sensors & Attention', icon: HeartPulse },
    {
      id: userProfile.role === 'teacher' ? 'TEACHER_DASHBOARD' : 'STUDENT_DASHBOARD',
      label: userProfile.role === 'teacher' ? 'Teacher Console' : 'Student ISLM',
      icon: LayoutDashboard,
    },
  ];

  return (
    <aside
      className={`
        w-64 bg-[#070c14] border-r border-[#1a273b] flex flex-col justify-between shrink-0 select-none z-50
        fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out overflow-y-auto
        lg:static lg:translate-x-0
        ${isOpenMobile ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Top Brand & Main Nav */}
      <div className="p-4 space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              setCurrentWorkflow('CHATS');
              onCloseMobile?.();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                <span>CogniCSE</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded font-mono">v2</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono -mt-0.5">Pedagogical AI Engine</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Links */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentWorkflow === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentWorkflow(item.id as any);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#111b2b] text-white border border-[#1e2f47] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#0c1421]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Domain Track Filter */}
        <div className="pt-2 pb-1 border-t border-[#1a273b] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Track Filter</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800">
              {activeTrack === 'Mechanical Engineering (CAD)' ? 'MECH' : 'CSE'}
            </span>
          </div>
          <select
            value={activeTrack}
            onChange={e => setActiveTrack(e.target.value)}
            className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
          >
            <option value="All Tracks">All Tracks</option>
            <option value="Mechanical Engineering (CAD)">⚙️ Mechanical Engineering (CAD)</option>
            <option value="Web Application Development">🌐 Web App Development</option>
            <option value="Data Structures & Algorithms">🌳 Data Structures & Algorithms</option>
            <option value="Operating Systems">⚡ Operating Systems</option>
            <option value="Computer Networks">🔌 Computer Networks</option>
          </select>
        </div>

        {/* CHATS History Section matching the video */}
        <div className="pt-2 border-t border-[#1a273b] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider px-1">
            <span>Chats</span>
          </div>

          <button
            onClick={createNewChatSession}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {/* Recent Conversations */}
          <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
            {chatSessions.map(session => {
              const isSelected = currentChatSession.id === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => {
                    selectChatSession(session.id);
                    setCurrentWorkflow('CHATS');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#111b2b] text-blue-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1421]'
                  }`}
                >
                  <span className="truncate">{session.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEST HISTORY (when in Mock Test mode, as in video!) */}
        {currentWorkflow === 'MOCK_TEST' && (
          <div className="pt-2 border-t border-[#1a273b] space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1">
              Test History
            </div>
            <div className="p-2.5 bg-[#0c1421] rounded-xl border border-[#1a273b] text-[11px] space-y-0.5">
              <div className="font-semibold text-slate-200">Discrete mathematics</div>
              <div className="text-slate-500 text-[10px]">Today • 75% Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="p-3 border-t border-[#1a273b] space-y-3 bg-[#050911]">
        {/* Light/Dark Mode Switch (matching video!) */}
        <div className="flex items-center justify-between px-2 py-1 bg-[#0c1421] rounded-xl border border-[#1a273b]">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {isDarkMode ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
          </span>
          <button
            onClick={toggleTheme}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
              isDarkMode ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* User Card (matching video!) */}
        <div
          onClick={onOpenProfile}
          className="p-2 bg-[#0c1421] hover:bg-[#111b2b] border border-[#1a273b] rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                {userProfile.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{userProfile.plan}</div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* Security Audit & Logout Row */}
        <div className="flex items-center justify-between px-1 text-xs">
          <button
            onClick={onOpenSecurityAudit}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            title="System Security Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit</span>
          </button>

          <button
            onClick={handleLogout}
            className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
