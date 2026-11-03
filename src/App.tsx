import React, { useState } from 'react';
import { TutorProvider, useTutor } from './context/TutorContext';
import { LoginPage } from './components/Auth/LoginPage';
import { ProfileModal } from './components/Profile/ProfileModal';
import { VisionSidebar } from './components/Navigation/VisionSidebar';
import { VisionSolveChat } from './components/Chat/VisionSolveChat';
import { VisionMockTest } from './components/MockTest/VisionMockTest';
import { CodeSandbox } from './components/CodeSandbox/CodeSandbox';
import { VisionMemoryTree } from './components/MemoryTree/VisionMemoryTree';
import { VisionLibraryVault } from './components/LibraryVault/VisionLibraryVault';
import { AIVideoPlayer } from './components/AIVideo/AIVideoPlayer';
import { ComparisonView } from './components/ComparisonView/ComparisonView';
import { StudentDashboard } from './components/Dashboards/StudentDashboard';
import { TeacherDashboard } from './components/Dashboards/TeacherDashboard';
import { DiagnosticPretestModal } from './components/Pretest/DiagnosticPretestModal';
import { SecurityAuditModal } from './components/SecurityAudit/SecurityAuditModal';
import { WhyThisScoreDrawer } from './components/Mastery/WhyThisScoreDrawer';
import { CADLab } from './components/CADLab/CADLab';
import { WebDevLab } from './components/WebDevLab/WebDevLab';
import { EngagementPanel } from './components/Engagement/EngagementPanel';
import { LiveClassView } from './components/LiveClass/LiveClassView';
import { RetainView } from './components/Retain/RetainView';
import { WorkflowErrorBoundary } from './components/Common/WorkflowErrorBoundary';
import { RotateCcw, Menu } from 'lucide-react';

const MainApplication: React.FC = () => {
  const {
    isAuthenticated,
    currentWorkflow,
    setCurrentWorkflow,
    setSelectedNode,
    activeDrawerNode,
    isWhyDrawerOpen,
    closeWhyScoreDrawer,
    activeTrack,
    uiLanguage,
    setUiLanguage,
  } = useTutor();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState(false);
  const [isPretestOpen, setIsPretestOpen] = useState(false);
  const [isRetainOpen, setIsRetainOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If not authenticated, render Login Page before everything as requested
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onSuccess={() => {}}
          onOpenProfileBuilder={() => setIsProfileOpen(true)}
        />
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b13] text-[#f1f5f9] flex flex-row overflow-x-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar (Responsive slide-over on mobile & tablet) */}
      <VisionSidebar
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace on the right */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Top Cognitive Status Bar */}
        <header className="bg-[#080e18] border-b border-[#1a273b] px-3 sm:px-4 py-2 flex items-center justify-between text-xs shrink-0 select-none gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-lg border border-[#1e2f47] transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-blue-400" />
            </button>
            <span className="flex items-center gap-1.5 font-bold text-white tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CogniCSE Matrix</span>
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              Track: <strong className="text-blue-300">{activeTrack === 'All Tracks' ? 'All Engineering Tracks' : activeTrack}</strong>
            </span>
            <span className="text-slate-500 hidden md:inline">•</span>
            <span className="text-slate-400 font-mono text-[11px] hidden md:inline">
              ISLM Scaffolding: <strong className="text-indigo-300">Tier 1 Socratic</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Multilingual Selector */}
            <div className="flex items-center rounded-lg bg-[#111b2b] border border-[#1e2f47] p-0.5 text-[10px] font-semibold">
              {(['en', 'ta', 'hi'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setUiLanguage(lang)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    uiLanguage === lang
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'en' ? 'English' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                >
                  {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsRetainOpen(true)}
              className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-800/60 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Spaced Repetition Review (SM-2 / Leitner)"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Retain</span>
            </button>

            <span className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
              <span>🛡️ Anti-Answer Shield</span>
            </span>
            <button
              onClick={() => setIsPretestOpen(true)}
              className="px-2.5 py-1 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-lg text-[11px] font-semibold border border-[#1e2f47] transition-colors cursor-pointer"
            >
              Diagnostic
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
            >
              ISLM Profile
            </button>
          </div>
        </header>

        {currentWorkflow === 'CHATS' && (
          <WorkflowErrorBoundary workflowName="Socratic Tutor Chat">
            <VisionSolveChat />
          </WorkflowErrorBoundary>
        )}
        {currentWorkflow === 'MOCK_TEST' && (
          <WorkflowErrorBoundary workflowName="Diagnostic Mock Test">
            <VisionMockTest />
          </WorkflowErrorBoundary>
        )}
        {currentWorkflow === 'CODE_SANDBOX' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Polyglot Code Sandbox">
              <CodeSandbox />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'CAD_LAB' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="3D Parametric CAD Lab">
              <CADLab />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'WEB_DEV_LAB' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Interactive Web Dev Lab">
              <WebDevLab />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'MEMORY_TREE' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full flex-1">
            <WorkflowErrorBoundary workflowName="Cognitive Memory Tree">
              <VisionMemoryTree />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'LIBRARY_VAULT' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Curriculum Library Vault">
              <VisionLibraryVault />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'AI_VIDEO' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="60s Micro-Learning Video">
              <AIVideoPlayer />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'COMPARISON_STUDY' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Empirical Comparison Study">
              <ComparisonView />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'STUDENT_DASHBOARD' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Student ISLM Dashboard">
              <StudentDashboard />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'TEACHER_DASHBOARD' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Teacher Cohort Console">
              <TeacherDashboard />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'ENGAGEMENT' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Sensors & Engagement Simulator">
              <EngagementPanel />
            </WorkflowErrorBoundary>
          </div>
        )}
        {currentWorkflow === 'LIVE_CLASS' && (
          <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <WorkflowErrorBoundary workflowName="Live Class Interactive Stream">
              <LiveClassView />
            </WorkflowErrorBoundary>
          </div>
        )}
      </main>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <SecurityAuditModal
        isOpen={isSecurityAuditOpen}
        onClose={() => setIsSecurityAuditOpen(false)}
      />
      <DiagnosticPretestModal
        isOpen={isPretestOpen}
        onClose={() => setIsPretestOpen(false)}
      />
      <RetainView
        isOpen={isRetainOpen}
        onClose={() => setIsRetainOpen(false)}
        language={uiLanguage}
      />
      <WhyThisScoreDrawer
        node={activeDrawerNode}
        isOpen={isWhyDrawerOpen}
        onClose={closeWhyScoreDrawer}
        onOpenSandbox={node => {
          setSelectedNode(node);
          setCurrentWorkflow('CODE_SANDBOX');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <TutorProvider>
      <MainApplication />
    </TutorProvider>
  );
}
