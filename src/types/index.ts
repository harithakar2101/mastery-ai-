export type SupportedLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'php';

export interface BKTTrace {
  id: string;
  conceptId: string;
  prior: number;
  observed: boolean;
  posterior: number;
  pLObserved: number;
  isCorrect: boolean;
  isIndependent: boolean;
  source: string;
  timestamp: string;
}

export interface CompositeMasteryBreakdown {
  composite: number;
  conceptual: number;
  practical: number;
  independent: number;
  retention: number | null;
  weights: {
    conceptual: number;
    practical: number;
    independent: number;
    retention: number;
  };
  status: 'Needs Attention' | 'Improving' | 'Mastered' | 'On Track';
  independentPassedCount: number;
}

export interface DKMNode {
  id: string;
  name: string;
  track: string;
  category: string;
  description: string;
  keyConcept: string;
  typicalTrap: string;
  starterCodeSnippet: string;
  codeLanguage: SupportedLanguage | string;
  starterErrorLog: string;
  prerequisites: string[];
  status: 'GREEN' | 'YELLOW' | 'RED' | 'NOT_ASSESSED';
  mastery: number; // 0.0 to 1.0 (pL)
  errorCount: number;
  solvedCount: number;
  bktTrace?: BKTTrace[];
  compositeMastery?: CompositeMasteryBreakdown;
  evidenceLabel?: string;
}

export interface ISLMProfile {
  student_id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  course_track: string;
  overall_mastery: number;
  topic_mastery: Record<string, number>;
  recent_misconceptions: string[];
  scaffolding_tier_required: number;
  error_count: number;
  independent_solves: number;
  scaffolding_fading_index: number;
  time_spent_mins: number;
  history?: any[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  degree?: string;
  plan?: string;
  streakDays?: number;
  testsCompleted?: number;
  overallMastery?: number;
  theme: 'dark' | 'light';
  preferredLanguages: SupportedLanguage[];
  targetMajor?: string;
  avatar?: string;
}

export type VisualizerMode =
  | 'AST'
  | 'CFG'
  | 'CALL_STACK'
  | 'MEMORY_GRAPH'
  | 'NONE'
  | 'Flowchart'
  | 'Text Response';

export interface TutoringResponse {
  workflow?: string;
  diagnosis?: {
    issue_type: string;
    identified_gap: string;
    confidence_score: number;
  };
  scaffolding_response?: {
    current_tier: number;
    refusal_reason: string;
    tutor_message: string;
    socratic_question: string;
  };
  visualizer_data?: any;
  islm_updates?: any;
  content_hooks?: any;
  research_telemetry?: any;
  source?: string;
  fallback_reason?: string | null;
}

export type VideoVisualType = 'diagram' | 'code_diff' | 'flowchart' | 'analogy' | 'architecture';

export interface VideoScene {
  id: string;
  scene_num?: number;
  scene_number?: number;
  time_range?: string;
  time?: string;
  duration?: number;
  duration_seconds?: number;
  title?: string;
  visual?: string;
  visual_description?: string;
  visual_type?: VideoVisualType;
  animation_type?: string;
  on_screen_text?: string;
  on_screen_code_or_diagram?: string;
  narration?: string;
  narration_script?: string;
  visual_elements?: string[];
  audio_fx?: string;
}

export interface VideoStoryboard {
  id?: string;
  title: string;
  concept?: string;
  topic?: string;
  misconception?: string;
  target_misconception?: string;
  duration_secs?: number;
  total_duration_seconds?: number;
  key_takeaway?: string;
  scenes: VideoScene[];
  source?: string;
  fallback_reason?: string | null;
  provider?: 'canvas_browser' | 'gemini_veo';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  fallback_reason?: string | null;
}

export interface ChatSession {
  id: string;
  studentId?: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export interface MockTestQuestion {
  id: string;
  conceptId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  codeSnippet?: string;
  targetMisconception?: string;
}

export interface ObservationInput {
  conceptId: string;
  isCorrect: boolean;
  source: string;
  isIndependent?: boolean;
}

export type AttemptKind = 'code_lab' | 'independent' | 'quiz' | 'mock_test';

export interface AttemptRecord {
  id: string;
  studentId: string;
  conceptId?: string;
  kind?: AttemptKind;
  passed?: boolean;
  tierUsed?: number;
  hintsRequested?: number;
  durationSec?: number;
  errorCategory?: string;
  repeatedError?: boolean;
  ts?: string;
  timestamp?: string;
  codeSnippet?: string;
  language?: string;
  details?: string;
  isSuccess?: boolean;
  errorLog?: string;
  topicId?: string;
}

export interface VariantTask {
  id: string;
  conceptId: string;
  conceptName: string;
  problemStatement: string;
  starterCode: string;
  solutionTemplate?: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  hint: string;
  source?: string;
}

export interface EvaluationOutcome {
  passed: boolean;
  message: string;
}

export interface PedagogicalEvent {
  id?: string;
  timestamp?: string;
  ts?: string;
  studentId?: string;
  type: string;
  conceptId?: string;
  topicId?: string;
  payload?: Record<string, any>;
  synthetic?: boolean;
}
