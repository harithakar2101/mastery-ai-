import React from 'react';
import {
  DKMNode,
  ISLMProfile,
  TutoringResponse,
  VisualizerMode,
  VideoStoryboard,
  UserProfile,
  ChatSession,
  MockTestQuestion,
  ObservationInput,
  BKTTrace,
  AttemptRecord,
  AttemptKind,
  VariantTask,
  EvaluationOutcome,
} from '../types';

export type AppWorkflow =
  | 'CHATS'
  | 'MOCK_TEST'
  | 'CODE_SANDBOX'
  | 'CAD_LAB'
  | 'WEB_DEV_LAB'
  | 'MEMORY_TREE'
  | 'LIBRARY_VAULT'
  | 'AI_VIDEO'
  | 'COMPARISON_STUDY'
  | 'STUDENT_DASHBOARD'
  | 'TEACHER_DASHBOARD'
  | 'ENGAGEMENT'
  | 'LIVE_CLASS'
  | 'STUDY_STUDIO'
  | 'PORTFOLIO'
  | 'ADMIN_CONSOLE'
  | 'RESPONSIBLE_AI'
  | 'PRIVACY_POLICY'
  | 'INCLUSIVE_HUB';

export interface TutorContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  islm: ISLMProfile;
  dkmNodes: DKMNode[];
  selectedNode: DKMNode;
  activeTrack: string;
  currentWorkflow: AppWorkflow;
  tutoringResponse: TutoringResponse | null;
  isLoading: boolean;
  visualizerMode: VisualizerMode;
  activeVideoStoryboard: VideoStoryboard | null;
  chatSessions: ChatSession[];
  currentChatSession: ChatSession;
  activeReviewQuestions: MockTestQuestion[] | null;
  activeDrawerNode: DKMNode | null;
  isWhyDrawerOpen: boolean;
  attempts: AttemptRecord[];
  uiLanguage: 'en' | 'ta' | 'hi';
  setUiLanguage: (lang: 'en' | 'ta' | 'hi') => void;
  setActiveReviewQuestions: (questions: MockTestQuestion[] | null) => void;
  setActiveTrack: (track: string) => void;
  setSelectedNode: (node: DKMNode) => void;
  setCurrentWorkflow: (workflow: AppWorkflow) => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setActiveVideoStoryboard: (storyboard: VideoStoryboard | null) => void;
  executeTutoring: (
    studentInput: string,
    codeSnippet?: string,
    executionLogs?: string,
    workflow?: 'CODE_SANDBOX_TUTORING' | 'CHATS' | 'CAD_LAB_TUTORING'
  ) => Promise<TutoringResponse | null>;
  verifyIndependentFix: (fixedCode: string) => Promise<{ success: boolean; message: string }>;
  recordAttempt: (params: {
    conceptId: string;
    kind: AttemptKind;
    passed: boolean;
    tierUsed: number;
    hintsRequested: number;
    durationSec: number;
    errorCategory?: string;
    codeSnippet?: string;
    language?: string;
    details?: string;
  }) => Promise<EvaluationOutcome>;
  fetchVariantTask: (conceptId: string, track?: string, language?: string) => Promise<VariantTask>;
  switchRole: (role: 'student' | 'teacher') => void;
  updateNodeStatus: (nodeId: string, status: 'GREEN' | 'YELLOW' | 'RED', masteryDelta?: number) => void;
  recordObservation: (input: ObservationInput) => { updatedNode: DKMNode; trace: BKTTrace };
  openWhyScoreDrawer: (node?: DKMNode) => void;
  closeWhyScoreDrawer: () => void;
  exportOfflinePack: () => void;
  runDiagnosticPretestComplete: (score: number, missedTopicIds: string[]) => void;
  sendChatMessage: (text: string) => Promise<void>;
  selectChatSession: (sessionId: string) => void;
  createNewChatSession: () => void;
  loginWithServer: (params: { email: string; password?: string; name?: string; role?: 'student' | 'teacher'; degree?: string; id?: string }) => Promise<void>;
  registerWithServer: (params: { email: string; password?: string; name: string; degree?: string; inviteCode?: string }) => Promise<void>;
  logoutUser: () => Promise<void>;
}
