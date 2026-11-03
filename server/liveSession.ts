import { Response } from 'express';
import { readStore, writeStoreAtomically, appendEvent, getDemoStore } from './store.ts';

export interface SSEClient {
  id: string;
  role: 'teacher' | 'student';
  studentId?: string;
  studentName?: string;
  res: Response;
}

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

let activeSession: LiveSessionState = {
  sessionId: 'live_init',
  isActive: false,
  topicId: 'web_apache_docroot',
  topicName: 'Apache DocumentRoot & File Hierarchy',
  track: 'Web Application Development',
  teacherId: 'FACULTY_402',
  timeline: [],
  releasedQuestion: null,
  students: {},
  tutorials: {},
  heatmap: {},
};

const clients = new Map<string, SSEClient>();

export function addSSEClient(client: SSEClient) {
  clients.set(client.id, client);

  // Send initial connected event
  client.res.write(`event: connected\ndata: ${JSON.stringify({ clientId: client.id, sessionActive: activeSession.isActive })}\n\n`);

  // If a live session is already running, push state
  if (activeSession.isActive) {
    client.res.write(`event: session_state\ndata: ${JSON.stringify(activeSession)}\n\n`);
  }
}

export function removeSSEClient(clientId: string) {
  clients.delete(clientId);
}

export function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function sendStudentSSE(studentId: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.studentId === studentId) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client.id);
      }
    }
  }
}

// Recompute live concept heatmap across connected students
export function updateLiveHeatmap(): Record<string, { greenCount: number; totalCount: number; percent: number }> {
  const store = readStore();
  const studentList = store.islm.filter(i => i.role === 'student');
  const heatmap: Record<string, { greenCount: number; totalCount: number; percent: number }> = {};

  const targetConcepts = ['web_apache_docroot', 'pdo_mysql_port', 'sql_injection_defense', 'async_event_loop', 'recursion_base_case'];

  targetConcepts.forEach(cId => {
    let green = 0;
    const total = studentList.length;
    studentList.forEach(s => {
      const mastery = s.topic_mastery?.[cId] ?? 0;
      if (mastery >= 0.8) green++;
    });
    const pct = total > 0 ? Math.round((green / total) * 100) : 0;
    heatmap[cId] = { greenCount: green, totalCount: total, percent: pct };
  });

  activeSession.heatmap = heatmap;
  return heatmap;
}

export function startLiveSession(params: {
  topicId: string;
  topicName: string;
  track: string;
  teacherId: string;
}): LiveSessionState {
  const store = readStore();
  const studentsMap: Record<string, StudentLiveState> = {};

  const allKnownStudents = [
    ...store.islm.filter(i => i.role === 'student'),
    ...getDemoStore().islm.filter(d => !store.islm.some(s => s.student_id === d.student_id)),
  ];

  allKnownStudents.forEach(s => {
    const pl = s.topic_mastery?.[params.topicId] ?? (s.overall_mastery || 0.5);
    const level: 'Beginner' | 'Intermediate' | 'Advanced' =
      pl < 0.35 ? 'Beginner' : pl <= 0.70 ? 'Intermediate' : 'Advanced';

    studentsMap[s.student_id] = {
      studentId: s.student_id,
      studentName: s.name,
      currentLevel: level,
      pL: pl,
      answered: false,
    };
  });

  activeSession = {
    sessionId: `live_${Date.now()}`,
    isActive: true,
    topicId: params.topicId,
    topicName: params.topicName,
    track: params.track || 'Web Application Development',
    teacherId: params.teacherId,
    timeline: [],
    releasedQuestion: null,
    students: studentsMap,
    tutorials: {},
    heatmap: updateLiveHeatmap(),
  };

  broadcastSSE('session_state', activeSession);
  return activeSession;
}

export function endLiveSession(): { success: boolean } {
  activeSession.isActive = false;
  activeSession.releasedQuestion = null;
  broadcastSSE('session_ended', { sessionId: activeSession.sessionId });
  return { success: true };
}

export function getLiveSessionState(): LiveSessionState {
  return activeSession;
}

export function setLiveTimeline(timeline: LiveConceptTimelineItem[]): LiveConceptTimelineItem[] {
  activeSession.timeline = timeline;
  broadcastSSE('timeline_updated', { timeline });
  return timeline;
}

export function updateStudentEngagement(studentId: string, lowEngagement: boolean) {
  if (activeSession.students[studentId]) {
    activeSession.students[studentId].lowEngagement = lowEngagement;
    broadcastSSE('student_engagement_changed', { studentId, lowEngagement });
  }
}

export function releaseLiveQuestion(questionId: string): LiveQuestion | null {
  let targetQ: LiveQuestion | null = null;
  for (const item of activeSession.timeline) {
    const found = item.questions.find(q => q.id === questionId);
    if (found) {
      targetQ = found;
      break;
    }
  }

  if (!targetQ) return null;

  activeSession.releasedQuestion = targetQ;
  // Reset student answers for this question
  for (const s of Object.values(activeSession.students)) {
    s.answered = false;
    s.selectedAnswer = undefined;
    s.isCorrect = undefined;
  }

  broadcastSSE('question_released', targetQ);
  return targetQ;
}

export async function submitLiveAnswer(params: {
  studentId: string;
  questionId: string;
  selectedIndex: number;
  lowEngagement?: boolean;
}): Promise<{ studentState: StudentLiveState; tutorial: PersonalizedMicroTutorial }> {
  const q = activeSession.releasedQuestion;
  const isCorrect = q ? params.selectedIndex === q.correctIndex : false;

  const store = readStore();
  const allKnownStudents = [
    ...(store.islm || []),
    ...getDemoStore().islm.filter(d => !(store.islm || []).some(s => s.student_id === d.student_id)),
  ];
  const student = allKnownStudents.find(i => i.student_id === params.studentId);
  const currentPL = student?.topic_mastery?.[activeSession.topicId] ?? (activeSession.students[params.studentId]?.pL ?? 0.45);

  const level: 'Beginner' | 'Intermediate' | 'Advanced' =
    currentPL < 0.35 ? 'Beginner' : currentPL <= 0.70 ? 'Intermediate' : 'Advanced';

  const wrongMisconception = q?.misconceptionMap?.[params.selectedIndex] || 'General logic trap';

  // 1. Generate Per-Student Personalised Micro-Tutorial
  let tutorial: PersonalizedMicroTutorial;

  if (params.lowEngagement) {
    tutorial = {
      studentId: params.studentId,
      questionId: params.questionId,
      level,
      tutorialType: 're-engage',
      title: 'Attention Check-In & Momentum Refresh',
      content: `We noticed you've been inactive or focused away from the live lecture stream. Before diving deeper, let's reset: take a sip of water, shake out your hands, and re-anchor your attention on ${activeSession.topicName}.`,
      reflectivePrompt: 'Ready to re-engage with the class? Click below to confirm your presence.',
    };
  } else if (level === 'Beginner') {
    tutorial = {
      studentId: params.studentId,
      questionId: params.questionId,
      level: 'Beginner',
      tutorialType: 'scaffolding',
      title: `Step-by-Step Scaffolding: ${q?.conceptName || activeSession.topicName}`,
      content: isCorrect
        ? `Great job getting this right! Remember the fundamental rule: ${q?.explanation}. Anchoring to this concept will make complex system interactions feel natural.`
        : `Diagnostic Insight: You selected an answer rooted in the misconception: "${wrongMisconception}". Let's scaffold this: 1) Identify where the server daemon lives. 2) Remember that client requests never bypass the DocumentRoot. 3) ${q?.explanation}`,
      reflectivePrompt: 'What is the exact physical or directory boundary that differentiates this concept?',
      targetedMisconception: wrongMisconception,
    };
  } else if (level === 'Intermediate') {
    tutorial = {
      studentId: params.studentId,
      questionId: params.questionId,
      level: 'Intermediate',
      tutorialType: 'constructivist',
      title: `Constructivist Drill: ${q?.conceptName || activeSession.topicName}`,
      content: isCorrect
        ? `Solid conceptual grasp! Now connect this to production: How would this architecture behave if you introduced a reverse proxy (like Nginx) in front of Apache?`
        : `Constructive Analysis: Your choice reflected "${wrongMisconception}". Think through the request-response lifecycle from first principles: When the browser requests http://localhost/, what exact path mapping occurs?`,
      reflectivePrompt: 'How would you explain the underlying mechanism to a peer who just made the same mistake?',
      targetedMisconception: wrongMisconception,
    };
  } else {
    // Advanced
    tutorial = {
      studentId: params.studentId,
      questionId: params.questionId,
      level: 'Advanced',
      tutorialType: 'extension',
      title: `Advanced Extension Challenge: ${q?.conceptName || activeSession.topicName}`,
      content: `Mastery demonstrated! Here is your extension challenge: Consider an enterprise multi-tenant configuration with dynamic virtual hosts (vhosts.conf) mapping subdomains to arbitrary user directories. How would you prevent directory traversal outside DocumentRoot while preserving per-user symbolic links?`,
      reflectivePrompt: 'Formulate an Apache directive configuration that enforces strict chroot or DocumentRoot boundaries.',
    };
  }

  // 2. Update Student Live State
  const studentState: StudentLiveState = {
    studentId: params.studentId,
    studentName: student?.name || params.studentId,
    currentLevel: level,
    pL: isCorrect ? Math.min(0.99, +(currentPL + 0.12).toFixed(2)) : Math.max(0.01, +(currentPL - 0.08).toFixed(2)),
    answered: true,
    selectedAnswer: params.selectedIndex,
    isCorrect,
    answeredAt: new Date().toLocaleTimeString(),
    lowEngagement: params.lowEngagement,
  };

  activeSession.students[params.studentId] = studentState;
  activeSession.tutorials[params.studentId] = tutorial;

  // 3. Update Server Store ISLM and Attempts atomically
  await writeStoreAtomically(s => {
    const islmEntry = s.islm.find(i => i.student_id === params.studentId);
    if (islmEntry) {
      if (!islmEntry.topic_mastery) islmEntry.topic_mastery = {};
      islmEntry.topic_mastery[activeSession.topicId] = studentState.pL;
      if (!isCorrect && wrongMisconception) {
        islmEntry.recent_misconceptions = [wrongMisconception, ...(islmEntry.recent_misconceptions || []).filter(m => m !== wrongMisconception)].slice(0, 5);
        islmEntry.error_count = (islmEntry.error_count || 0) + 1;
      } else if (isCorrect) {
        islmEntry.independent_solves = (islmEntry.independent_solves || 0) + 1;
      }
    }
  });

  // Record pedagogical event
  appendEvent({
    studentId: params.studentId,
    type: 'LIVE_CLASS_ANSWER',
    conceptId: activeSession.topicId,
    topicId: activeSession.topicName,
    payload: {
      questionId: params.questionId,
      selectedIndex: params.selectedIndex,
      isCorrect,
      level,
      lowEngagement: params.lowEngagement,
    },
    synthetic: false,
  }).catch(e => console.warn('Live event append error:', e));

  // 4. Update live heatmap and broadcast
  updateLiveHeatmap();

  broadcastSSE('student_answered', {
    studentState,
    heatmap: activeSession.heatmap,
  });

  sendStudentSSE(params.studentId, 'micro_tutorial', tutorial);

  return { studentState, tutorial };
}
