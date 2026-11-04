import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Brain,
  Search,
  Bell,
  Sun,
  Moon,
  RotateCcw,
  Menu,
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  Award,
  BookOpen,
  Box,
  Code2,
  Globe,
  GitBranch,
  Video,
  Radio,
  FileCheck,
  GraduationCap,
  Sparkles,
  BarChart3,
  HeartPulse,
  LayoutDashboard,
  Check,
} from 'lucide-react';
import { CommandPalette, CommandItem } from '../UI/CommandPalette';
import { Badge } from '../UI/Badge';
import { Tooltip } from '../UI/Tooltip';
import { VisionSidebar } from './VisionSidebar';
import { applyTheme, getSystemTheme, ThemeMode } from '../../styles/tokens';

interface AppShellProps {
  children: React.ReactNode;
  onOpenProfile: () => void;
  onOpenSecurityAudit: () => void;
  onOpenPretest: () => void;
  onOpenRetain: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  onOpenProfile,
  onOpenSecurityAudit,
  onOpenPretest,
  onOpenRetain,
}) => {
  const {
    currentWorkflow,
    setCurrentWorkflow,
    userProfile,
    setUserProfile,
    setIsAuthenticated,
    activeTrack,
    uiLanguage,
    setUiLanguage,
  } = useTutor();

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (userProfile.theme as ThemeMode) || 'dark'
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const newTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    setUserProfile(prev => ({ ...prev, theme: newTheme }));
    applyTheme(newTheme);
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setIsAuthenticated(false);
  };

  // Human-readable breadcrumb label
  const workflowLabels: Record<string, string> = {
    STUDY_STUDIO: 'Study Studio Workspace',
    PORTFOLIO: 'Verified Learner Portfolio',
    CHATS: 'Socratic Tutor Chat',
    MOCK_TEST: 'Diagnostic Mock Test',
    CAD_LAB: '3D Parametric CAD Lab',
    LIVE_CLASS: 'Live Class Stream',
    CODE_SANDBOX: 'Polyglot Code Sandbox',
    WEB_DEV_LAB: 'Interactive Web Dev Lab',
    MEMORY_TREE: 'Cognitive Memory Tree',
    LIBRARY_VAULT: 'Curriculum Library Vault',
    AI_VIDEO: '60s AI Video Studio',
    COMPARISON_STUDY: 'Empirical Comparison Study',
    STUDENT_DASHBOARD: 'Student ISLM Analytics',
    TEACHER_DASHBOARD: 'Teacher Cohort Console',
    ENGAGEMENT: 'Sensors & Attention Monitor',
    ADMIN_CONSOLE: 'Admin & Integrity Console',
    RESPONSIBLE_AI: 'Responsible AI Charter',
    PRIVACY_POLICY: 'Privacy Policy',
  };

  // Commands for Ctrl+K Command Palette
  const commands: CommandItem[] = [
    {
      id: 'cmd_portfolio',
      title: 'Open Learner Portfolio',
      category: 'Portfolio',
      icon: <Award className="w-4 h-4 text-emerald-400" />,
      shortcut: 'P',
      onSelect: () => setCurrentWorkflow('PORTFOLIO'),
    },
    {
      id: 'cmd_study_studio',
      title: 'Open Study Studio Workspace',
      category: 'Workflows',
      icon: <GraduationCap className="w-4 h-4 text-blue-400" />,
      shortcut: 'S',
      onSelect: () => setCurrentWorkflow('STUDY_STUDIO'),
    },
    {
      id: 'cmd_cad_lab',
      title: 'Launch 3D CAD Lab',
      category: 'Labs',
      icon: <Box className="w-4 h-4 text-indigo-400" />,
      onSelect: () => setCurrentWorkflow('CAD_LAB'),
    },
    {
      id: 'cmd_code_sandbox',
      title: 'Open Polyglot Code Sandbox',
      category: 'Labs',
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
      onSelect: () => setCurrentWorkflow('CODE_SANDBOX'),
    },
    {
      id: 'cmd_web_dev',
      title: 'Open Interactive Web Dev Lab',
      category: 'Labs',
      icon: <Globe className="w-4 h-4 text-teal-400" />,
      onSelect: () => setCurrentWorkflow('WEB_DEV_LAB'),
    },
    {
      id: 'cmd_memory_tree',
      title: 'View Cognitive Memory Tree',
      category: 'Workflows',
      icon: <GitBranch className="w-4 h-4 text-purple-400" />,
      onSelect: () => setCurrentWorkflow('MEMORY_TREE'),
    },
    {
      id: 'cmd_ai_video',
      title: 'AI Video Production Studio',
      category: 'Workflows',
      icon: <Video className="w-4 h-4 text-pink-400" />,
      onSelect: () => setCurrentWorkflow('AI_VIDEO'),
    },
    {
      id: 'cmd_retain',
      title: 'Spaced Repetition Review (SM-2)',
      category: 'Actions',
      icon: <RotateCcw className="w-4 h-4 text-amber-400" />,
      onSelect: onOpenRetain,
    },
    {
      id: 'cmd_pretest',
      title: 'Run Diagnostic Pretest',
      category: 'Actions',
      icon: <FileCheck className="w-4 h-4 text-blue-400" />,
      onSelect: onOpenPretest,
    },
    {
      id: 'cmd_security_audit',
      title: 'System Security & Integrity Audit',
      category: 'Actions',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      onSelect: onOpenSecurityAudit,
    },
    {
      id: 'cmd_theme_toggle',
      title: `Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Actions',
      icon: themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />,
      onSelect: toggleTheme,
    },
  ];

  return (
    <div className="min-h-screen bg-[#060b13] text-[#f1f5f9] flex flex-row overflow-x-hidden relative selection:bg-blue-600 selection:text-white">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpenMobile && (
        <div
          onClick={() => setIsSidebarOpenMobile(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Responsive Collapsible Sidebar */}
      <VisionSidebar
        onOpenProfile={onOpenProfile}
        onOpenSecurityAudit={onOpenSecurityAudit}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Modern Commercial Top Bar */}
        <header className="bg-[#080e18] border-b border-[#18263a] px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs shrink-0 select-none gap-3 sticky top-0 z-30 shadow-xs">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="lg:hidden p-1.5 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-lg border border-[#1e2f47] transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-blue-400" />
            </button>

            {/* Breadcrumb Path */}
            <nav className="flex items-center gap-1.5 font-medium text-xs text-slate-400 truncate" aria-label="Breadcrumb">
              <span className="text-slate-300 font-bold hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentWorkflow('STUDY_STUDIO')}>
                CogniCSE
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-blue-300 font-semibold truncate">
                {workflowLabels[currentWorkflow] || currentWorkflow}
              </span>
            </nav>
          </div>

          {/* Center: Global Search Bar Trigger (Ctrl+K) */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-[#0d1626] hover:bg-[#121e33] border border-[#1e304b] hover:border-blue-500/50 rounded-xl text-slate-400 text-xs transition-all cursor-pointer max-w-sm w-full mx-4 shadow-inner"
            aria-label="Open global search and command palette"
          >
            <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="flex-1 text-left truncate">Search workflows, concepts, labs...</span>
            <kbd className="text-[10px] font-mono text-slate-400 bg-[#142033] border border-[#20334e] px-1.5 py-0.5 rounded-sm">
              Ctrl K
            </kbd>
          </button>

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Action: Spaced Repetition (Retain) */}
            <button
              onClick={onOpenRetain}
              className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded-lg text-xs font-semibold border border-amber-800/60 transition-colors cursor-pointer flex items-center gap-1.5 hidden sm:flex"
              title="Daily Spaced Repetition Flashcards"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Retain</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-[#0e1728] border border-[#1e2f47] p-0.5 text-[10px] font-semibold hidden sm:flex">
              {(['en', 'ta', 'hi'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setUiLanguage(lang)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    uiLanguage === lang
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'en' ? 'English' : lang === 'ta' ? 'Tamil' : 'Hindi'}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 bg-[#0e1728] hover:bg-[#15233c] text-slate-400 hover:text-slate-100 rounded-lg border border-[#1e2f47] transition-colors cursor-pointer"
              aria-label="Toggle theme"
              title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="p-1.5 bg-[#0e1728] hover:bg-[#15233c] text-slate-400 hover:text-slate-100 rounded-lg border border-[#1e2f47] transition-colors cursor-pointer relative"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1 right-1" />
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0c1524] border border-[#1e304b] rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-scale-in">
                  <div className="flex items-center justify-between pb-2 border-b border-[#18263a] text-xs">
                    <span className="font-bold text-slate-100">Pedagogical Notifications</span>
                    <span className="text-[10px] text-blue-400 font-mono">Real-time</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="p-2 rounded-lg bg-[#08101c] border border-[#16253c] space-y-0.5">
                      <div className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Mastery Milestone Achieved</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        BKT posterior mastery on Recursive Tree Traversal reached 88%.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#08101c] border border-[#16253c] space-y-0.5">
                      <div className="font-semibold text-amber-400 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        <span>SM-2 Review Queue Ready</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        4 flashcards due today for optimal memory consolidation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-[#0e1728] hover:bg-[#15233c] border border-[#1e2f47] rounded-xl transition-colors cursor-pointer"
                aria-label="User account menu"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs">
                  {(userProfile.name || 'S').substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline max-w-[100px] truncate">
                  {userProfile.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#0c1524] border border-[#1e304b] rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-scale-in"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-[#18263a] mb-1">
                    <div className="font-bold text-xs text-slate-100 truncate">{userProfile.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{userProfile.email}</div>
                    <div className="mt-1">
                      <Badge variant="purple" size="xs">
                        {userProfile.role === 'teacher' ? 'Faculty Member' : 'Verified Student'}
                      </Badge>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentWorkflow('PORTFOLIO')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#142236] hover:text-white transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Learner Portfolio</span>
                  </button>

                  <button
                    onClick={onOpenProfile}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#142236] hover:text-white transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Account Profile</span>
                  </button>

                  <button
                    onClick={onOpenSecurityAudit}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#142236] hover:text-white transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Audit</span>
                  </button>

                  <button
                    onClick={() => setCurrentWorkflow('RESPONSIBLE_AI')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#142236] hover:text-white transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Responsible AI</span>
                  </button>

                  <button
                    onClick={() => setCurrentWorkflow('PRIVACY_POLICY')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#142236] hover:text-white transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                    <span>Privacy Policy</span>
                  </button>

                  <div className="pt-1 border-t border-[#18263a] mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto min-h-0">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};
