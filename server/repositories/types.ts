import { PaginationOptions, PaginatedResult } from '../utils/pagination.ts';
import { UserRole, StoreUser } from '../store.ts';

export type { PaginationOptions, PaginatedResult, UserRole, StoreUser };

export interface ISLMRecord {
  student_id: string;
  name: string;
  email: string;
  role: UserRole;
  course_track: string;
  overall_mastery: number;
  topic_mastery: Record<string, number>;
  recent_misconceptions: string[];
  scaffolding_tier_required: number;
  error_count: number;
  independent_solves: number;
  scaffolding_fading_index: number;
  time_spent_mins: number;
  current_concept_id?: string;
  concept_name?: string;
  frequent_cognitive_misconception?: string;
  recent_failure_category?: string;
  history?: any[];
  synthetic?: boolean;
}

export interface PedagogicalEventRecord {
  id: string;
  studentId: string;
  type: string;
  conceptId?: string;
  topicId?: string;
  payload: Record<string, any>;
  synthetic: boolean;
  ts: string;
  createdAt: string;
}

export interface AttemptDbRecord {
  id: string;
  studentId: string;
  conceptId?: string;
  kind?: string;
  passed?: boolean;
  tierUsed?: number;
  hintsRequested?: number;
  durationSec?: number;
  errorCategory?: string;
  repeatedError?: boolean;
  codeSnippet?: string;
  language?: string;
  details?: string;
  ts: string;
  timestamp?: string;
  isSuccess?: boolean;
  synthetic?: boolean;
}

export interface InterventionDbRecord {
  id: string;
  studentId: string;
  studentName?: string;
  conceptId?: string;
  conceptName?: string;
  tier: number;
  issueType: string;
  refusalReason?: string;
  tutorMessage?: string;
  socraticQuestion?: string;
  status: 'suggested' | 'Teacher-approved' | 'dismissed';
  outcome?: 'pending' | 'resolved' | 'repeated error';
  approvedAt?: string;
  outcomeRecordedAt?: string;
  timestamp?: string;
  ts: string;
  synthetic?: boolean;
}

export interface SessionDbRecord {
  id: string;
  studentId: string;
  title: string;
  messages: any[];
  ts: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardDbRecord {
  id: string;
  studentId: string;
  conceptId: string;
  conceptName: string;
  track: string;
  leitnerBox: 1 | 2 | 3 | 4;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewed?: string | null;
  cardJson: any;
  updatedAt: string;
}

export interface StudyPlanDbRecord {
  id: string;
  studentId: string;
  title: string;
  status: string;
  goals: any[];
  schedule: any[];
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioDbRecord {
  id: string;
  studentId: string;
  artifactType: string;
  title: string;
  content: any;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProfileDbRecord {
  studentId: string;
  slug: string;
  visibility: 'private' | 'link_only' | 'public';
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: Record<string, string>;
  customSections?: any[];
  updatedAt: string;
}

export interface RenderedVideoDbRecord {
  id: string;
  studentId: string;
  title: string;
  conceptId?: string;
  topic: string;
  durationSeconds: number;
  storyboard: any;
  renderSettings?: Record<string, any>;
  videoUrl?: string;
  vttContent?: string;
  shareToken: string;
  provider: 'canvas_browser' | 'gemini_veo';
  createdAt: string;
}
