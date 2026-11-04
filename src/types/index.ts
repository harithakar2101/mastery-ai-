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

export type NodeStatus = 'RED' | 'YELLOW' | 'GREEN' | 'NOT_ASSESSED';

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
  status: NodeStatus;
  mastery: number; // 0.0 to 1.0 (pL)
  errorCount: number;
  solvedCount: number;
  bktTrace?: BKTTrace[];
  compositeMastery?: CompositeMasteryBreakdown;
  evidenceLabel?: string;
  domain?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  course: string;
  avatarUrl?: string;
  studyArm?: 'personalized' | 'generic' | 'control';
  degree?: string;
  targetMajor?: string;
  preferredLanguages?: string[];
  theme?: 'dark' | 'light' | 'system';
  retentionDays?: number;
  overallMastery?: number;
  streakDays?: number;
  testsCompleted?: number;
}

export interface ISLMHistoryItem {
  id: string;
  timestamp: string;
  topic_name: string;
  topic_id?: string;
  tier_used: number;
  issue_type: string;
  resolved_independently?: boolean;
  notes?: string;
}

export interface ISLMProfile {
  student_id: string;
  name?: string;
  email?: string;
  role?: string;
  current_concept_id: string;
  concept_name: string;
  scaffolding_tier_required: number;
  frequent_cognitive_misconception: string;
  recent_failure_category: string;
  course_track: string;
  overall_mastery?: number;
  topic_mastery?: Record<string, number>;
  independent_solves?: number;
  error_count?: number;
  recent_misconceptions?: string[];
  retrieval_strength?: number;
  storage_strength?: number;
  half_life_days?: number;
  next_review_due?: string;
  leitner_box?: number;
  review_count?: number;
  last_review_date?: string;
  history?: ISLMHistoryItem[];
  scaffolding_fading_index?: number;
  time_spent_mins?: number;
}

export type VisualizerMode =
  | 'Flowchart'
  | 'AST'
  | 'CallStack'
  | 'MemoryLayout'
  | 'StateMachine'
  | 'Graph'
  | 'Sequence'
  | 'ERD'
  | 'XYChart'
  | 'Text Response'
  | 'Mind Map'
  | 'Simulator'
  | 'Charts & Graphs'
  | 'Diagrams'
  | 'Timeline'
  | 'Creative';

export interface TutoringResponse {
  workflow?: string;
  diagnosis?: any;
  socratic_dialogue?: string;
  scaffolding_tier?: number;
  scaffolding_response?: {
    tutor_message?: string;
    socratic_question?: string;
    tier_hint?: string;
    remediation_concept?: string;
    micro_drill?: string;
    current_tier?: number;
    refusal_reason?: string | null;
  };
  visualizer_recommendation?: {
    diagram_type: string;
    mermaid_code?: string;
    explanation?: string;
    visualizer_mode?: VisualizerMode;
  };
  visualizer_data?: any;
  recommended_visualizer_mode?: VisualizerMode;
  mermaid_syntax?: string;
  code_correction_preview?: string;
  recommended_action?: string;
  islm_updates?: any;
  content_hooks?: any;
  research_telemetry?: any;
  source?: string;
  fallback_reason?: string | null;
}

export type VideoVisualType = 'diagram' | 'code_diff' | 'flowchart' | 'analogy' | 'architecture';

export interface VideoScene {
  id?: string;
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
  visualizerMode?: VisualizerMode;
  socraticTier?: number;
  refusalReason?: string | null;
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
  conceptId?: string;
  topic_id?: string;
  topic_name?: string;
  section?: string;
  question: string;
  options: string[];
  correctIndex?: number;
  correct_option_index?: number;
  user_selected_index?: number;
  explanation: string;
  distractor_explanations?: string[];
  codeSnippet?: string;
  targetMisconception?: string;
  time_spent_secs?: number;
}

export interface MockTestSectionResult {
  name: string;
  score: number;
  max_score: number;
  correct: number;
  wrong: number;
  accuracy: number;
  time_secs: number;
}

export interface MockTestResult {
  test_id: string;
  title: string;
  subject?: string;
  total_marks: number;
  score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  accuracy: number;
  total_time_secs: number;
  average_time_per_question_secs: number;
  questions: MockTestQuestion[];
  sections: MockTestSectionResult[];
}

export interface MockTest {
  id: string;
  title: string;
  course_track?: string;
  track?: string;
  total_questions?: number;
  time_limit_mins?: number;
  negative_marking_rate?: number;
  questions: MockTestQuestion[];
}

export interface LibraryDocument {
  id: string;
  title: string;
  category: string;
  uploadedBy: string;
  pages: number;
  dateAdded: string;
  tags: string[];
  content: string;
}

export interface ObservationInput {
  conceptId: string;
  isCorrect: boolean;
  source: string;
  isIndependent?: boolean;
  tierUsed?: number;
  errorCategory?: string;
  studentId?: string;
}

export type AttemptKind = 'code_lab' | 'independent' | 'quiz' | 'mock_test' | 'cad_lab';

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
  title?: string;
  conceptId: string;
  conceptName: string;
  problemStatement?: string;
  prompt?: string;
  description?: string;
  starterCode?: string;
  code?: string;
  language?: string;
  solutionTemplate?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  hint?: string;
  source?: string;
}

export interface EvaluationOutcome {
  passed: boolean;
  message?: string;
  attempt?: any;
  priorPL?: number;
  posteriorPL?: number;
  deltaPL?: number;
  tierUsed?: number;
  repeatedError?: boolean;
  nextTier?: number;
  isTransferUnlocked?: boolean;
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
