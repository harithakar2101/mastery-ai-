import React, { useState, useEffect } from 'react';
import {
  Accessibility,
  LayoutDashboard,
  Cpu,
  Bell,
  User,
  Activity,
  Users,
  History,
  Settings,
  Sliders,
  Eye,
  LogOut,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  Wifi,
  Sun,
  Moon,
  VolumeX,
} from 'lucide-react';
import { InclusiveOverviewView } from './InclusiveOverviewView';
import { WearableSimulatorView } from './WearableSimulatorView';
import { LiveRequestsView } from './LiveRequestsView';
import { SensorMonitoringView } from './SensorMonitoringView';
import { TeacherConsoleView } from './TeacherConsoleView';
import { DeviceFleetView } from './DeviceFleetView';
import { StudentWearableProfileView } from './StudentWearableProfileView';
import { InclusiveHistoryView } from './InclusiveHistoryView';
import { InclusiveSettingsView } from './InclusiveSettingsView';

export type InclusiveSubTab =
  | 'overview'
  | 'simulator'
  | 'requests'
  | 'students'
  | 'devices'
  | 'sensors'
  | 'teacher'
  | 'history'
  | 'settings';

interface InclusiveHubLayoutProps {
  initialTab?: InclusiveSubTab;
  userRole?: string;
  userId?: string;
  userName?: string;
  onExit?: () => void;
}

export const InclusiveHubLayout: React.FC<InclusiveHubLayoutProps> = ({
  initialTab,
  userRole = 'teacher',
  userId = 'STU_SIM_A',
  userName = 'Student',
  onExit,
}) => {
  // Sync tab with pathname or initialTab
  const getSubTabFromURL = (): InclusiveSubTab => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/$/, '');
      if (path.includes('/simulator')) return 'simulator';
      if (path.includes('/requests')) return 'requests';
      if (path.includes('/students')) return 'students';
      if (path.includes('/devices')) return 'devices';
      if (path.includes('/sensors')) return 'sensors';
      if (path.includes('/teacher')) return 'teacher';
      if (path.includes('/history')) return 'history';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/overview')) return 'overview';
    }
    return initialTab || (userRole === 'student' ? 'students' : 'overview');
  };

  const [activeTab, setActiveTab] = useState<InclusiveSubTab>(getSubTabFromURL);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [sseConnected, setSseConnected] = useState<boolean>(true);

  // Keep URL updated when tab changes
  const switchTab = (tab: InclusiveSubTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined' && window.history.pushState) {
      const newPath = `/inclusive-hub/${tab}`;
      window.history.pushState(null, '', newPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getSubTabFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

  // Navigation definition with role restriction checks
  const navItems: { id: InclusiveSubTab; label: string; icon: React.FC<any>; restricted?: boolean }[] = [
    { id: 'overview', label: 'Hub Overview', icon: LayoutDashboard },
    { id: 'simulator', label: 'Wearable Simulator', icon: Sliders },
    { id: 'requests', label: 'Live Requests', icon: Bell, restricted: true },
    { id: 'students', label: 'Student Profile', icon: User },
    { id: 'devices', label: 'Device Fleet', icon: Cpu, restricted: true },
    { id: 'sensors', label: 'Sensor Telemetry', icon: Activity },
    { id: 'teacher', label: 'Teacher Console', icon: Users, restricted: true },
    { id: 'history', label: 'Audit History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col ${
        highContrast
          ? 'bg-black text-white selection:bg-yellow-400 selection:text-black font-sans'
          : 'bg-[#060b13] text-slate-100 selection:bg-blue-600 selection:text-white font-sans'
      } ${reducedMotion ? 'motion-reduce' : ''}`}
      role="application"
      aria-label="Mastery.ai Inclusive Assistive Hub"
    >
      {/* Keyboard Accessibility: Skip to Content Link */}
      <a
        href="#inclusive-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-400 focus:text-black focus:font-bold focus:rounded-lg focus:outline-4 focus:outline-black"
      >
        Skip to main content
      </a>

      {/* Dedicated Inclusive Hub Header */}
      <header
        className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between z-40 sticky top-0 backdrop-blur-md ${
          highContrast
            ? 'bg-black border-b-4 border-white'
            : 'bg-[#09101d]/90 border-[#1a273b]'
        }`}
        role="banner"
      >
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white border border-[#23354f]"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                highContrast
                  ? 'bg-white text-black border-2 border-white'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              }`}
            >
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Mastery.ai
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Inclusive Assistive Hub
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                ESP32 Tactile & Visual Assistance Ecosystem
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* High Contrast Toggle Button */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              highContrast
                ? 'bg-yellow-400 text-black border-2 border-black'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-[#23354f]'
            }`}
            title="Toggle WCAG AAA High Contrast Mode"
            aria-pressed={highContrast}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{highContrast ? 'Contrast: AAA' : 'High Contrast'}</span>
          </button>

          {/* SSE Stream Online Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono ${
              sseConnected
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{sseConnected ? 'Live Stream Active' : 'Disconnected'}</span>
          </div>

          {/* Exit / Return to Main Learning Workspace */}
          {onExit && (
            <button
              onClick={onExit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                highContrast
                  ? 'bg-white text-black hover:bg-neutral-200 border-2 border-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#23354f]'
              }`}
              title="Return to Mastery.ai Courseware & Studio"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mastery.ai</span>
            </button>
          )}
        </div>
      </header>

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dedicated Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 top-[57px] z-30 w-64 p-4 border-r flex flex-col justify-between shrink-0
            lg:static lg:translate-x-0 transition-transform duration-200
            ${isMobileMenuOpen ? 'translate-x-0 bg-[#070c15] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
            ${highContrast ? 'bg-black border-r-4 border-white' : 'bg-[#080d17] border-[#1a273b]'}
          `}
          role="navigation"
          aria-label="Inclusive Hub Navigation"
        >
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-2">
              Inclusive Navigation
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isBlocked = item.restricted && !isTeacherOrAdmin;

              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition text-left
                    ${
                      isActive
                        ? highContrast
                          ? 'bg-white text-black font-bold border-2 border-black'
                          : 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : highContrast
                        ? 'text-white hover:bg-neutral-900'
                        : 'text-slate-300 hover:bg-[#142033] hover:text-white'
                    }
                    ${isBlocked ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.restricted && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                      Faculty
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="pt-4 border-t border-[#1a273b] text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span>Active Role:</span>
              <span className="font-bold text-slate-200 uppercase">{userRole}</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Wearable events are isolated from BKT cognitive evaluation models.
            </div>
          </div>
        </aside>

        {/* Main View Container */}
        <main
          id="inclusive-main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 focus:outline-none"
        >
          {/* Role Access Barrier Check */}
          {(activeTab === 'requests' || activeTab === 'devices' || activeTab === 'teacher') && !isTeacherOrAdmin ? (
            <div
              className={`p-8 rounded-2xl border text-center space-y-4 max-w-lg mx-auto ${
                highContrast ? 'bg-black border-4 border-white text-white' : 'bg-[#0f172a] border-[#1e293b]'
              }`}
              role="alert"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Faculty Role Required</h3>
              <p className="text-xs text-slate-400">
                This page ({activeTab.toUpperCase()}) is restricted to faculty educators and administrators to protect student privacy and cohort telemetry.
              </p>
              <button
                onClick={() => switchTab('students')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Go to My Student Wearable Profile
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <InclusiveOverviewView
                  onNavigate={(tab) => switchTab(tab as InclusiveSubTab)}
                  userRole={userRole}
                  highContrast={highContrast}
                />
              )}

              {activeTab === 'simulator' && (
                <WearableSimulatorView highContrast={highContrast} />
              )}

              {activeTab === 'requests' && (
                <LiveRequestsView
                  userRole={userRole}
                  userId={userId}
                  highContrast={highContrast}
                />
              )}

              {activeTab === 'students' && (
                <StudentWearableProfileView
                  userId={userId}
                  userName={userName}
                  highContrast={highContrast}
                />
              )}

              {activeTab === 'devices' && (
                <DeviceFleetView highContrast={highContrast} />
              )}

              {activeTab === 'sensors' && (
                <SensorMonitoringView highContrast={highContrast} />
              )}

              {activeTab === 'teacher' && (
                <TeacherConsoleView highContrast={highContrast} />
              )}

              {activeTab === 'history' && (
                <InclusiveHistoryView highContrast={highContrast} />
              )}

              {activeTab === 'settings' && (
                <InclusiveSettingsView
                  highContrast={highContrast}
                  onToggleHighContrast={() => setHighContrast(!highContrast)}
                  reducedMotion={reducedMotion}
                  onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
                  userRole={userRole}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
