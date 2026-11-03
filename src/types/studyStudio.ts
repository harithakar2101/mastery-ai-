export interface SummarySection {
  id: string;
  title: string;
  keyTakeaway: string;
  content: string;
  subtopics: string[];
}

export interface ExtractedConcept {
  id: string;
  name: string;
  mappedDkmNodeId?: string;
  category: string;
  masteryPrior: number;
  importance: 'high' | 'medium' | 'core';
}

export interface StudioFlashcard {
  id: string;
  conceptId: string;
  conceptName: string;
  question: string;
  answer: string;
  sourceRef: string;
  leitnerBox: 1 | 2 | 3 | 4;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewed?: string | null;
}

export interface StudioPracticeQuestion {
  id: string;
  conceptId: string;
  conceptName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRef: string;
}

export interface StudyDayTask {
  id: string;
  title: string;
  type: 'flashcards' | 'practice' | 'summary_review';
  completed: boolean;
  count?: number;
  conceptId?: string;
}

export interface StudyDaySchedule {
  date: string; // YYYY-MM-DD
  dayIndex: number;
  status: 'completed' | 'today' | 'upcoming';
  targetMinutes: number;
  focusConcepts: string[];
  scheduledCardsCount: number;
  practiceQuestionsCount: number;
  tasks: StudyDayTask[];
  rePlanReason?: string;
}

export interface StudyStudioConfig {
  courseTopic: string;
  examDate: string; // YYYY-MM-DD
  targetGrade: number; // 4 to 10
  targetPercentage: number; // e.g. 90%
  dailyStudyMinutes: number;
  tradeOffText: string;
}

export interface StudyStudioState {
  config: StudyStudioConfig;
  summary: SummarySection[];
  concepts: ExtractedConcept[];
  flashcards: StudioFlashcard[];
  practiceQuestions: StudioPracticeQuestion[];
  schedule: StudyDaySchedule[];
  latestRePlanNote: string;
  provenance: 'LIVE AI' | 'FALLBACK';
  generatedAt: string;
}
