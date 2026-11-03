export interface LiveQuestion {
  id: string;
  conceptId: string;
  conceptName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  misconceptionMap: Record<number, string>;
}

export interface LiveConceptTimelineItem {
  id: string;
  timeOffset: string;
  conceptId: string;
  conceptName: string;
  summary: string;
  questions: LiveQuestion[];
}

export interface StudentLiveState {
  studentId: string;
  studentName: string;
  currentLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  pL: number;
  answered: boolean;
  selectedAnswer?: number;
  isCorrect?: boolean;
  answeredAt?: string;
  lowEngagement?: boolean;
}

export interface PersonalizedMicroTutorial {
  studentId: string;
  questionId: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tutorialType: 'scaffolding' | 'constructivist' | 'extension' | 're-engage';
  title: string;
  content: string;
  reflectivePrompt: string;
  targetedMisconception?: string;
}

export interface LiveSessionState {
  sessionId: string;
  isActive: boolean;
  topicId: string;
  topicName: string;
  track: string;
  teacherId: string;
  timeline: LiveConceptTimelineItem[];
  releasedQuestion: LiveQuestion | null;
  students: Record<string, StudentLiveState>;
  tutorials: Record<string, PersonalizedMicroTutorial>;
  heatmap: Record<string, { greenCount: number; totalCount: number; percent: number }>;
}
