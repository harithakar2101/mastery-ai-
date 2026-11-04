import React, { useState, Suspense, lazy } from 'react';
import { TutorProvider, useTutor } from './context/TutorContext';
import { LoginPage } from './components/Auth/LoginPage';
import { ProfileModal } from './components/Profile/ProfileModal';
import { AppShell } from './components/Navigation/AppShell';
import { VisionSolveChat } from './components/Chat/VisionSolveChat';
import { VisionMockTest } from './components/MockTest/VisionMockTest';
import { CodeSandbox } from './components/CodeSandbox/CodeSandbox';
import { VisionLibraryVault } from './components/LibraryVault/VisionLibraryVault';
import { StudentDashboard } from './components/Dashboards/StudentDashboard';
import { TeacherDashboard } from './components/Dashboards/TeacherDashboard';
import { DiagnosticPretestModal } from './components/Pretest/DiagnosticPretestModal';
import { SecurityAuditModal } from './components/SecurityAudit/SecurityAuditModal';
import { WhyThisScoreDrawer } from './components/Mastery/WhyThisScoreDrawer';
import { LiveClassView } from './components/LiveClass/LiveClassView';
import { RetainView } from './components/Retain/RetainView';
import { StudyStudioView } from './components/StudyStudio/StudyStudioView';
import { WorkflowErrorBoundary } from './components/Common/WorkflowErrorBoundary';
import { ShowcaseLandingPage } from './components/Showcase/ShowcaseLandingPage';
import { PublicPortfolioPage } from './components/Portfolio/PublicPortfolioPage';
import { ResponsibleAIPage } from './components/Legal/ResponsibleAIPage';
import { PrivacyPolicyPage } from './components/Legal/PrivacyPolicyPage';
import { AdminConsoleView } from './components/Admin/AdminConsoleView';
import { InclusiveHubLayout } from './components/InclusiveHub/InclusiveHubLayout';
import { ToastProvider, SkeletonCard } from './components/UI';

// Route-level code splitting for heavy WebGL & Media libraries per Prompt G
const CADLab = lazy(() => import('./components/CADLab/CADLab').then(m => ({ default: m.CADLab })));
const WebDevLab = lazy(() => import('./components/WebDevLab/WebDevLab').then(m => ({ default: m.WebDevLab })));
const VisionMemoryTree = lazy(() => import('./components/MemoryTree/VisionMemoryTree').then(m => ({ default: m.VisionMemoryTree })));
const AIVideoPlayer = lazy(() => import('./components/AIVideo/AIVideoPlayer').then(m => ({ default: m.AIVideoPlayer })));
const ComparisonView = lazy(() => import('./components/ComparisonView/ComparisonView').then(m => ({ default: m.ComparisonView })));
const EngagementPanel = lazy(() => import('./components/Engagement/EngagementPanel').then(m => ({ default: m.EngagementPanel })));
const LearnerPortfolioView = lazy(() => import('./components/Portfolio/LearnerPortfolioView').then(m => ({ default: m.LearnerPortfolioView })));

const SuspenseFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="p-6 max-w-6xl mx-auto space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-6 bg-[#162438] rounded-md w-48" />
      <div className="h-6 bg-[#162438] rounded-md w-24" />
    </div>
    <div className="h-64 bg-[#0a121f] border border-[#1a293f] rounded-2xl flex items-center justify-center text-xs text-slate-500 font-mono">
      Loading {label}...
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

const MainApplication: React.FC = () => {
  const {
    isAuthenticated,
    userProfile,
    currentWorkflow,
    setCurrentWorkflow,
    setSelectedNode,
    activeDrawerNode,
    isWhyDrawerOpen,
    closeWhyScoreDrawer,
    uiLanguage,
  } = useTutor();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState(false);
  const [isPretestOpen, setIsPretestOpen] = useState(false);
  const [isRetainOpen, setIsRetainOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check for public portfolio URL: /p/:slug
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicPortfolio = pathname.startsWith('/p/');
  const publicSlug = isPublicPortfolio
    ? pathname.replace(/^\/p\//, '').split('?')[0].split('#')[0]
    : '';

  if (isPublicPortfolio && publicSlug) {
    return <PublicPortfolioPage slug={publicSlug} />;
  }

  // Check for Inclusive Assistive Hub route or workflow
  const isInclusiveHub = pathname.startsWith('/inclusive-hub') || currentWorkflow === 'INCLUSIVE_HUB';
  if (isInclusiveHub && isAuthenticated) {
    return (
      <WorkflowErrorBoundary workflowName="Inclusive Assistive Hub">
        <InclusiveHubLayout
          userRole={userProfile?.role || 'teacher'}
          userId={userProfile?.id || 'STU_SIM_A'}
          userName={userProfile?.name || 'Student'}
          onExit={() => {
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState(null, '', '/');
            }
            setCurrentWorkflow('STUDY_STUDIO');
          }}
        />
      </WorkflowErrorBoundary>
    );
  }

  // If not authenticated, show Showcase Landing Page with Login & Demo modes
  if (!isAuthenticated) {
    return (
      <>
        <ShowcaseLandingPage onOpenLogin={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute -top-10 right-0 text-slate-400 hover:text-white text-xs font-mono bg-[#142033] px-3 py-1 rounded-lg border border-[#1e2f47] cursor-pointer"
              >
                ✕ Close
              </button>
              <LoginPage
                onSuccess={() => setShowLoginModal(false)}
                onOpenProfileBuilder={() => setIsProfileOpen(true)}
              />
            </div>
          </div>
        )}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </>
    );
  }

  return (
    <AppShell
      onOpenProfile={() => setIsProfileOpen(true)}
      onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
      onOpenPretest={() => setIsPretestOpen(true)}
      onOpenRetain={() => setIsRetainOpen(true)}
    >
      {/* Dynamic Workflow Rendering */}
      {currentWorkflow === 'STUDY_STUDIO' && (
        <WorkflowErrorBoundary workflowName="Study Studio Workspace">
          <StudyStudioView />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'PORTFOLIO' && (
        <Suspense fallback={<SuspenseFallback label="Learner Portfolio" />}>
          <WorkflowErrorBoundary workflowName="Learner Portfolio">
            <LearnerPortfolioView />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

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
        <WorkflowErrorBoundary workflowName="Polyglot Code Sandbox">
          <CodeSandbox />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'CAD_LAB' && (
        <Suspense fallback={<SuspenseFallback label="3D CAD Lab" />}>
          <WorkflowErrorBoundary workflowName="3D Parametric CAD Lab">
            <CADLab />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'WEB_DEV_LAB' && (
        <Suspense fallback={<SuspenseFallback label="Web Dev Lab" />}>
          <WorkflowErrorBoundary workflowName="Interactive Web Dev Lab">
            <WebDevLab />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'MEMORY_TREE' && (
        <Suspense fallback={<SuspenseFallback label="Cognitive Memory Tree" />}>
          <WorkflowErrorBoundary workflowName="Cognitive Memory Tree">
            <VisionMemoryTree />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'LIBRARY_VAULT' && (
        <WorkflowErrorBoundary workflowName="Curriculum Library Vault">
          <VisionLibraryVault />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'AI_VIDEO' && (
        <Suspense fallback={<SuspenseFallback label="AI Video Studio" />}>
          <WorkflowErrorBoundary workflowName="60s Micro-Learning Video">
            <AIVideoPlayer />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'COMPARISON_STUDY' && (
        <Suspense fallback={<SuspenseFallback label="Empirical Comparison Study" />}>
          <WorkflowErrorBoundary workflowName="Empirical Comparison Study">
            <ComparisonView />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'STUDENT_DASHBOARD' && (
        <WorkflowErrorBoundary workflowName="Student ISLM Dashboard">
          <StudentDashboard />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'TEACHER_DASHBOARD' && (
        <WorkflowErrorBoundary workflowName="Teacher Cohort Console">
          <TeacherDashboard />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'ENGAGEMENT' && (
        <Suspense fallback={<SuspenseFallback label="Sensors & Engagement Simulator" />}>
          <WorkflowErrorBoundary workflowName="Sensors & Engagement Simulator">
            <EngagementPanel />
          </WorkflowErrorBoundary>
        </Suspense>
      )}

      {currentWorkflow === 'INCLUSIVE_HUB' && (
        <WorkflowErrorBoundary workflowName="Inclusive Assistive Hub">
          <InclusiveHubLayout
            userRole={userProfile?.role || 'teacher'}
            userId={userProfile?.id || 'STU_SIM_A'}
            userName={userProfile?.name || 'Student'}
            onExit={() => setCurrentWorkflow('STUDY_STUDIO')}
          />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'LIVE_CLASS' && (
        <WorkflowErrorBoundary workflowName="Live Class Interactive Stream">
          <LiveClassView />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'ADMIN_CONSOLE' && (
        <WorkflowErrorBoundary workflowName="Admin Console">
          <AdminConsoleView />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'RESPONSIBLE_AI' && (
        <WorkflowErrorBoundary workflowName="Responsible AI Charter">
          <ResponsibleAIPage onBack={() => setCurrentWorkflow('STUDY_STUDIO')} />
        </WorkflowErrorBoundary>
      )}

      {currentWorkflow === 'PRIVACY_POLICY' && (
        <WorkflowErrorBoundary workflowName="Privacy Policy">
          <PrivacyPolicyPage onBack={() => setCurrentWorkflow('STUDY_STUDIO')} />
        </WorkflowErrorBoundary>
      )}

      {/* Global Modals */}
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
    </AppShell>
  );
};

export default function App() {
  return (
    <TutorProvider>
      <ToastProvider>
        <MainApplication />
      </ToastProvider>
    </TutorProvider>
  );
}
