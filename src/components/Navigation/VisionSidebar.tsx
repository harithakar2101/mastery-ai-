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
  ChevronLeft,
  ShieldCheck,
  Settings,
  Box,
  Globe,
  HeartPulse,
  Radio,
  LayoutDashboard,
  GraduationCap,
  Award,
  Scale,
  FileText,
  X,
} from 'lucide-react';

interface VisionSidebarProps {
  onOpenProfile: () => void;
  onOpenSecurityAudit: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const VisionSidebar: React.FC<VisionSidebarProps> = ({
  onOpenProfile,
  onOpenSecurityAudit,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
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
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setIsAuthenticated(false);
  };

  const isMech =
    activeTrack === 'All Tracks' ||
    activeTrack === 'Mechanical Engineering (CAD)' ||
    activeTrack.toLowerCase().includes('mech') ||
    activeTrack.toLowerCase().includes('cad') ||
    currentWorkflow === 'CAD_LAB';

  const navItems = [
    { id: 'STUDY_STUDIO', label: 'Study Studio', icon: GraduationCap },
    { id: 'PORTFOLIO', label: 'Learner Portfolio', icon: Award },
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
    ...(userProfile.role === 'admin' ? [{ id: 'ADMIN_CONSOLE', label: 'Admin Console', icon: ShieldCheck }] : []),
    { id: 'RESPONSIBLE_AI', label: 'Responsible AI', icon: Scale },
  ];

  return (
    <aside
      className={`
        bg-[#070c14] border-r border-[#1a273b] flex flex-col justify-between shrink-0 select-none z-50
        fixed inset-y-0 left-0 transition-all duration-300 ease-in-out overflow-y-auto
        lg:static lg:translate-x-0
        ${isOpenMobile ? 'translate-x-0 shadow-2xl shadow-black w-64' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-18' : 'lg:w-64'}
      `}
    >
      {/* Top Brand & Main Nav */}
      <div className="p-3 sm:p-4 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              setCurrentWorkflow('PORTFOLIO');
              onCloseMobile?.();
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                  <span>CogniCSE</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-950 text-blue-400 border border-blue-800 rounded font-mono">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono -mt-0.5">Autonomous Mastery</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse toggle button for desktop */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-[#111b2b] text-white border border-[#1e2f47] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#0c1421]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Domain Track Filter (Hidden when collapsed) */}
        {!isCollapsed && (
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
              className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="All Tracks">All Engineering Tracks</option>
              <option value="Mechanical Engineering (CAD)">⚙️ Mechanical Engineering (CAD)</option>
              <option value="Web Application Development">🌐 Web App Development</option>
              <option value="Data Structures & Algorithms">🌳 Data Structures & Algorithms</option>
              <option value="Operating Systems">⚡ Operating Systems</option>
              <option value="Computer Networks">🔌 Computer Networks</option>
            </select>
          </div>
        )}

        {/* CHATS History Section */}
        {!isCollapsed && (
          <div className="pt-2 border-t border-[#1a273b] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider px-1">
              <span>Socratic Sessions</span>
            </div>

            <button
              onClick={createNewChatSession}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            {/* Recent Conversations */}
            <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
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
        )}
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="p-3 border-t border-[#1a273b] space-y-2.5 bg-[#050911]">
        {/* User Card (No fake plan names) */}
        <div
          onClick={onOpenProfile}
          className={`p-2 bg-[#0c1421] hover:bg-[#111b2b] border border-[#1a273b] rounded-xl flex items-center transition-colors cursor-pointer group ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title={isCollapsed ? userProfile.name : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile.name.slice(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                  {userProfile.name}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono truncate">
                  {userProfile.role === 'teacher' ? 'Faculty Member' : 'Verified Learner'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors shrink-0" />
          )}
        </div>

        {/* Security Audit & Logout Row */}
        {!isCollapsed && (
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
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
