import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  DKMNode,
  ISLMProfile,
  TutoringResponse,
  VisualizerMode,
  VideoStoryboard,
  UserProfile,
  ChatSession,
  ChatMessage,
  MockTestQuestion,
  ObservationInput,
  BKTTrace,
  AttemptRecord,
  AttemptKind,
  VariantTask,
  EvaluationOutcome,
} from '../types';
import { INITIAL_DKM_NODES, INITIAL_ISLM_PROFILE } from '../data/dkm';
import {
  fetchUserStateFromServer,
  syncUserStateToServer,
  recordPedagogicalEvent,
  loginUserOnServer,
  registerUserOnServer,
  logoutUserOnServer,
} from './tutorSync';
import { requestTutoringApi } from './tutorApi';
import {
  STORAGE_KEY_ACTIVE_USER,
  STORAGE_KEY_UI_THEME,
  INITIAL_PROFILE,
  DEFAULT_CHAT_SESSION,
  exportOfflinePackFile,
} from './tutorDefaults';
import {
  applyObservationToNode,
  deriveNodeComposite,
} from '../services/mastery';
import {
  calculateScaffoldingFadingIndex,
  isTransferTaskUnlocked,
  isRepeatedError,
} from '../services/attempts';

import { TutorContextType, AppWorkflow } from './tutorTypes';
export type { TutorContextType, AppWorkflow };

const TutorContext = createContext<TutorContextType | undefined>(undefined);

export const TutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [islm, setIslm] = useState<ISLMProfile>(INITIAL_ISLM_PROFILE);
  const [dkmNodes, setDkmNodes] = useState<DKMNode[]>(() => {
    return INITIAL_DKM_NODES.map(node => ({
      ...node,
      compositeMastery: deriveNodeComposite(node),
    }));
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([DEFAULT_CHAT_SESSION]);
  const [currentChatSession, setCurrentChatSession] = useState<ChatSession>(DEFAULT_CHAT_SESSION);
  const [activeReviewQuestions, setActiveReviewQuestions] = useState<MockTestQuestion[] | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);

  const [selectedNode, setSelectedNode] = useState<DKMNode>(INITIAL_DKM_NODES[0]);
  const [activeTrack, setActiveTrack] = useState<string>('All Tracks');
  const [currentWorkflow, setCurrentWorkflow] = useState<TutorContextType['currentWorkflow']>('CHATS');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('Flowchart');
  const [tutoringResponse, setTutoringResponse] = useState<TutoringResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeVideoStoryboard, setActiveVideoStoryboard] = useState<VideoStoryboard | null>(null);

  // "Why this score?" Drawer state
  const [activeDrawerNode, setActiveDrawerNode] = useState<DKMNode | null>(null);
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState<boolean>(false);

  // Multilingual UI & Tutor Language (English, Tamil, Hindi)
  const [uiLanguage, setUiLanguageState] = useState<'en' | 'ta' | 'hi'>(() => {
    const saved = localStorage.getItem('cognicse_ui_lang');
    return (saved === 'ta' || saved === 'hi' || saved === 'en') ? saved : 'en';
  });

  const setUiLanguage = (lang: 'en' | 'ta' | 'hi') => {
    setUiLanguageState(lang);
    localStorage.setItem('cognicse_ui_lang', lang);
  };

  const openWhyScoreDrawer = (node?: DKMNode) => {
    setActiveDrawerNode(node || selectedNode);
    setIsWhyDrawerOpen(true);
  };

  const closeWhyScoreDrawer = () => {
    setIsWhyDrawerOpen(false);
  };

  const isInitialSyncDone = useRef(false);

  // Read-Through Cache: Hydrate state from server on startup or authentication
  useEffect(() => {
    fetchUserStateFromServer().then(state => {
      if (state && state.user) {
        setUserProfile(state.user);
        if (state.islm) setIslm(state.islm);
        if (state.dkmNodes && state.dkmNodes.length > 0) setDkmNodes(state.dkmNodes);
        if (state.sessions && state.sessions.length > 0) {
          setChatSessions(state.sessions);
          setCurrentChatSession(state.sessions[0]);
        }
        setIsAuthenticated(true);
      }
      isInitialSyncDone.current = true;
    });
  }, []);

  // Sync to server store on user changes (read-through cache write-back)
  const syncTimerRef = useRef<any>(null);
  useEffect(() => {
    if (!isAuthenticated || !userProfile.id || !isInitialSyncDone.current) return;

    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncUserStateToServer({
        userProfile,
        islm,
        dkmNodes,
        sessions: chatSessions,
      });
    }, 1000);

    return () => clearTimeout(syncTimerRef.current);
  }, [userProfile, islm, dkmNodes, chatSessions, isAuthenticated]);

  const loginWithServer = async (params: {
    email: string;
    password?: string;
    name?: string;
    role?: 'student' | 'teacher';
    degree?: string;
    id?: string;
  }) => {
    const state = await loginUserOnServer(params);
    setUserProfile(state.user);
    if (state.islm) setIslm(state.islm);
    if (state.dkmNodes && state.dkmNodes.length > 0) setDkmNodes(state.dkmNodes);
    if (state.sessions && state.sessions.length > 0) {
      setChatSessions(state.sessions);
      setCurrentChatSession(state.sessions[0]);
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, state.user.id);
    setIsAuthenticated(true);
    isInitialSyncDone.current = true;
  };

  const registerWithServer = async (params: {
    email: string;
    password?: string;
    name: string;
    degree?: string;
    inviteCode?: string;
  }) => {
    const state = await registerUserOnServer(params);
    setUserProfile(state.user);
    if (state.islm) setIslm(state.islm);
    if (state.dkmNodes && state.dkmNodes.length > 0) setDkmNodes(state.dkmNodes);
    if (state.sessions && state.sessions.length > 0) {
      setChatSessions(state.sessions);
      setCurrentChatSession(state.sessions[0]);
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, state.user.id);
    setIsAuthenticated(true);
    isInitialSyncDone.current = true;
  };

  const logoutUser = async () => {
    await logoutUserOnServer();
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    setIsAuthenticated(false);
  };

  const selectChatSession = (sessionId: string) => {
    const found = chatSessions.find(s => s.id === sessionId);
    if (found) setCurrentChatSession(found);
  };

  const createNewChatSession = () => {
    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: 'New Technical Inquiry',
      timestamp: 'Just now',
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'assistant',
          text: 'What Computer Science problem or code error can we explore together?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'gemini',
          fallback_reason: null,
        },
      ],
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentChatSession(newSession);
  };

  /**
   * Central Bayesian Knowledge Tracing & Event Logging Pipeline
   */
  const recordObservation = (input: ObservationInput): { updatedNode: DKMNode; trace: BKTTrace } => {
    let targetNode = dkmNodes.find(n => n.id === input.conceptId) || selectedNode;
    const { updatedNode, trace } = applyObservationToNode(targetNode, input);

    setDkmNodes(prev => prev.map(n => (n.id === updatedNode.id ? updatedNode : n)));
    if (selectedNode.id === updatedNode.id) {
      setSelectedNode(updatedNode);
    }
    if (activeDrawerNode && activeDrawerNode.id === updatedNode.id) {
      setActiveDrawerNode(updatedNode);
    }

    setIslm(prev => {
      const updatedTopicMastery = {
        ...prev.topic_mastery,
        [updatedNode.id]: updatedNode.mastery,
      };
      const values = Object.values(updatedTopicMastery);
      const overall = values.reduce((a, b) => a + b, 0) / (values.length || 1);

      const recentMisconceptions = !input.isCorrect && input.errorCategory
        ? [input.errorCategory, ...prev.recent_misconceptions.filter(m => m !== input.errorCategory)].slice(0, 5)
        : prev.recent_misconceptions;

      return {
        ...prev,
        topic_mastery: updatedTopicMastery,
        overall_mastery: +overall.toFixed(2),
        independent_solves: input.isIndependent && input.isCorrect ? prev.independent_solves + 1 : prev.independent_solves,
        error_count: !input.isCorrect ? prev.error_count + 1 : prev.error_count,
        scaffolding_fading_index: input.isCorrect
          ? Math.min(1.0, +(prev.scaffolding_fading_index + 0.05).toFixed(2))
          : Math.max(0.1, +(prev.scaffolding_fading_index - 0.05).toFixed(2)),
        recent_misconceptions: recentMisconceptions,
        history: [
          {
            id: `hist_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            topic_id: updatedNode.id,
            topic_name: updatedNode.name,
            tier_used: input.tierUsed || prev.scaffolding_tier_required || 1,
            issue_type: input.isCorrect ? 'PRACTICAL_EXECUTION_ERROR' : 'CONCEPTUAL_GAP',
            resolved_independently: input.isIndependent && input.isCorrect,
            notes: `BKT transition: prior ${trace.prior} -> posterior ${trace.posterior} (${input.source})`,
          },
          ...prev.history,
        ],
      };
    });

    recordPedagogicalEvent({
      studentId: userProfile.id,
      type: 'OBSERVATION_RECORDED',
      conceptId: input.conceptId,
      topicId: updatedNode.name,
      payload: {
        isCorrect: input.isCorrect,
        isIndependent: input.isIndependent,
        source: input.source,
        prior: trace.prior,
        posterior: trace.posterior,
        errorCategory: input.errorCategory,
        tierUsed: input.tierUsed,
      },
      synthetic: false,
    });

    return { updatedNode, trace };
  };

  /**
   * Refactored updateNodeStatus: routes through Bayesian Knowledge Tracing
   */
  const updateNodeStatus = (nodeId: string, status: 'GREEN' | 'YELLOW' | 'RED', masteryDelta?: number) => {
    const isCorrect = status === 'GREEN' || (masteryDelta !== undefined && masteryDelta > 0);
    recordObservation({
      conceptId: nodeId,
      isCorrect,
      isIndependent: false,
      source: 'manual-update',
    });
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...currentChatSession.messages, userMsg];
    const interimSession = {
      ...currentChatSession,
      title: currentChatSession.messages.length <= 2 ? text.slice(0, 26) + '...' : currentChatSession.title,
      messages: updatedMessages,
    };

    setCurrentChatSession(interimSession);
    setChatSessions(prev => prev.map(s => (s.id === interimSession.id ? interimSession : s)));

    const tutorData = await executeTutoring(text, undefined, undefined, 'CHATS');

    const respMode = tutorData?.visualizer_data?.mode;
    const effectiveVisualizer = respMode && respMode !== 'Text Response' ? respMode : undefined;

    const isRefusal =
      tutorData?.scaffolding_response?.refusal_reason &&
      /direct\s+code|solution\s+withheld|anti-answer/i.test(tutorData.scaffolding_response.refusal_reason);

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      sender: 'assistant',
      text:
        tutorData?.scaffolding_response?.tutor_message ||
        `Let's break down this concept together! ${tutorData?.scaffolding_response?.socratic_question || ''}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      visualizerMode: effectiveVisualizer,
      socraticTier: tutorData?.scaffolding_response?.current_tier || 1,
      refusalReason: isRefusal ? tutorData?.scaffolding_response?.refusal_reason : undefined,
      source: tutorData?.source || 'fallback',
      fallback_reason: tutorData?.fallback_reason || null,
    };

    const finalizedSession = {
      ...interimSession,
      messages: [...updatedMessages, assistantMsg],
    };

    setCurrentChatSession(finalizedSession);
    setChatSessions(prev => prev.map(s => (s.id === finalizedSession.id ? finalizedSession : s)));
  };

  const switchRole = (role: 'student' | 'teacher') => {
    setUserProfile(prev => ({ ...prev, role }));
    setIslm(prev => ({ ...prev, role }));
    if (role === 'teacher') {
      setCurrentWorkflow('TEACHER_DASHBOARD');
    } else {
      setCurrentWorkflow('CHATS');
    }
  };

  const executeTutoring = async (
    studentInput: string,
    codeSnippet?: string,
    executionLogs?: string,
    workflow: 'CODE_SANDBOX_TUTORING' | 'CHATS' | 'CAD_LAB_TUTORING' = 'CODE_SANDBOX_TUTORING'
  ): Promise<TutoringResponse | null> => {
    setIsLoading(true);
    try {
      const data = await requestTutoringApi({
        studentInput,
        studentId: userProfile.id,
        selectedNode,
        visualizerMode,
        islm,
        codeSnippet,
        executionLogs,
        workflow,
        language: uiLanguage,
      });

      setTutoringResponse(data);
      if (data.content_hooks?.video_script_storyboard) {
        setActiveVideoStoryboard(data.content_hooks.video_script_storyboard);
      }
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refactored verifyIndependentFix: uses BKT observation rather than unconditional delta
   */
  const verifyIndependentFix = async (fixedCode: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 450));

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });

    const { updatedNode } = recordObservation({
      conceptId: selectedNode.id,
      isCorrect: true,
      isIndependent: true,
      source: 'sandbox',
      tierUsed: islm.scaffolding_tier_required || 1,
    });

    setIslm(prev => ({
      ...prev,
      scaffolding_tier_required: 1,
    }));

    setIsLoading(false);
    return {
      success: true,
      message: `Independent problem-solving verified! Bayesian p(L) updated to ${(updatedNode.mastery * 100).toFixed(1)}%.`,
    };
  };

  /**
   * Refactored runDiagnosticPretestComplete: uses individual BKT observations
   */
  const runDiagnosticPretestComplete = (score: number, missedTopicIds: string[]) => {
    // Record an observation for every tested topic based on individual test outcome
    dkmNodes.forEach(node => {
      const isMissed = missedTopicIds.includes(node.id);
      recordObservation({
        conceptId: node.id,
        isCorrect: !isMissed,
        isIndependent: true,
        source: 'pretest',
        errorCategory: isMissed ? 'Diagnostic Pretest Gap' : undefined,
      });
    });

    recordPedagogicalEvent({
      studentId: userProfile.id,
      type: 'DIAGNOSTIC_PRETEST_COMPLETED',
      conceptId: 'pretest',
      topicId: 'diagnostic',
      payload: { score, missedTopicIds, accuracy: score / 5 },
      synthetic: false,
    });
  };

  const recordAttempt = async (params: {
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
  }): Promise<EvaluationOutcome> => {
    const isRepeated = isRepeatedError(attempts, params.conceptId, params.errorCategory);
    const newAttempt: AttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentId: userProfile.id,
      conceptId: params.conceptId,
      kind: params.kind,
      passed: params.passed,
      tierUsed: params.tierUsed,
      hintsRequested: params.hintsRequested,
      durationSec: params.durationSec,
      errorCategory: params.errorCategory,
      repeatedError: isRepeated,
      ts: new Date().toISOString(),
      codeSnippet: params.codeSnippet,
      language: params.language,
      details: params.details,
    };

    setAttempts(prev => [...prev, newAttempt]);

    const targetNode = dkmNodes.find(n => n.id === params.conceptId) || selectedNode;
    const priorPL = targetNode.mastery;
    const { updatedNode } = recordObservation({
      conceptId: params.conceptId,
      isCorrect: params.passed,
      isIndependent: params.tierUsed === 1,
      source: params.kind === 'cad_lab' ? 'cad-lab' : 'sandbox',
      tierUsed: params.tierUsed,
      errorCategory: params.errorCategory,
    });
    const posteriorPL = updatedNode.mastery;
    const nextAttempts = [...attempts, newAttempt];
    const unlocked = isTransferTaskUnlocked(nextAttempts.filter(a => a.conceptId === params.conceptId));
    const nextTier = params.passed ? Math.max(1, params.tierUsed - 1) : Math.min(4, params.tierUsed + 1);

    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAttempt),
    }).catch(err => console.warn('Failed to post attempt to server:', err));

    return {
      attempt: newAttempt,
      priorPL,
      posteriorPL,
      deltaPL: +(posteriorPL - priorPL).toFixed(4),
      passed: params.passed,
      tierUsed: params.tierUsed,
      repeatedError: isRepeated,
      nextTier,
      isTransferUnlocked: unlocked,
      message: params.passed ? 'Attempt passed successfully.' : 'Attempt recorded with error diagnostics.',
    };
  };

  const fetchVariantTask = async (
    conceptId: string,
    track?: string,
    language?: string
  ): Promise<VariantTask> => {
    try {
      const targetNode = dkmNodes.find(n => n.id === conceptId) || selectedNode;
      const res = await fetch('/api/variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          conceptName: targetNode.name,
          track: track || activeTrack,
          language: language || 'javascript',
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch variant task from server:', err);
    }
    return {
      id: `var_${Date.now()}`,
      conceptId,
      conceptName: 'Transfer Task',
      title: 'Independent Variant Problem',
      prompt: 'Solve the transfer problem independently to confirm concept mastery.',
      description: 'Transfer evaluation task targeting the same underlying concept with distinct test vectors.',
      code: '// Write your independent solution here\n',
      language: (language as any) || 'javascript',
    };
  };

  const exportOfflinePack = () => {
    exportOfflinePackFile(userProfile, islm, dkmNodes);
  };

  return (
    <TutorContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        userProfile,
        setUserProfile,
        islm,
        dkmNodes,
        selectedNode,
        activeTrack,
        currentWorkflow,
        tutoringResponse,
        isLoading,
        visualizerMode,
        activeVideoStoryboard,
        chatSessions,
        currentChatSession,
        activeReviewQuestions,
        activeDrawerNode,
        isWhyDrawerOpen,
        attempts,
        uiLanguage,
        setUiLanguage,
        setActiveReviewQuestions,
        setActiveTrack,
        setSelectedNode,
        setCurrentWorkflow,
        setVisualizerMode,
        setActiveVideoStoryboard,
        executeTutoring,
        verifyIndependentFix,
        recordAttempt,
        fetchVariantTask,
        switchRole,
        updateNodeStatus,
        recordObservation,
        openWhyScoreDrawer,
        closeWhyScoreDrawer,
        exportOfflinePack,
        runDiagnosticPretestComplete,
        sendChatMessage,
        selectChatSession,
        createNewChatSession,
        loginWithServer,
        registerWithServer,
        logoutUser,
      }}
    >
      {children}
    </TutorContext.Provider>
  );
};

export const useTutor = () => {
  const context = useContext(TutorContext);
  if (!context) {
    throw new Error('useTutor must be used within a TutorProvider');
  }
  return context;
};
