import { Response } from 'express';
import { islmRepository, eventRepository, attemptRepository } from '../repositories/index.ts';

export interface SSEClient {
  id: string;
  role: 'teacher' | 'student';
  studentId?: string;
  studentName?: string;
  res: Response;
  lastActive: number;
}

export interface BufferedSSEEvent {
  id: number;
  event: string;
  data: any;
  targetStudentId?: string;
  timestamp: string;
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

export class LiveSessionService {
  private activeSession: LiveSessionState;
  private clients = new Map<string, SSEClient>();
  private eventHistory: BufferedSSEEvent[] = [];
  private nextEventId = 1;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.activeSession = {
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

    this.startHeartbeat();
    this.startCleanupTask();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
    if (this.heartbeatTimer.unref) this.heartbeatTimer.unref();
  }

  private startCleanupTask() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      this.cleanupDeadConnections();
    }, 30000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  public sendHeartbeat() {
    for (const [id, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        client.res.write(': ping\n\n');
        client.lastActive = Date.now();
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public cleanupDeadConnections(): number {
    let removedCount = 0;
    for (const [id, client] of this.clients.entries()) {
      if (client.res.writableEnded || client.res.destroyed) {
        this.clients.delete(id);
        removedCount++;
      }
    }
    return removedCount;
  }

  public getConnectedClientsCount(): number {
    this.cleanupDeadConnections();
    return this.clients.size;
  }

  public addClient(client: Omit<SSEClient, 'lastActive'>, lastEventId?: number | null) {
    const fullClient: SSEClient = {
      ...client,
      lastActive: Date.now(),
    };
    this.clients.set(client.id, fullClient);

    // Initial connection ack
    this.sendEventToClient(fullClient, 'connected', {
      clientId: client.id,
      sessionActive: this.activeSession.isActive,
    });

    // Replay missed events if client reconnected with Last-Event-ID
    if (lastEventId !== undefined && lastEventId !== null && !isNaN(lastEventId)) {
      this.replayMissedEvents(fullClient, lastEventId);
    }

    // If session is active, push current state
    if (this.activeSession.isActive) {
      this.sendEventToClient(fullClient, 'session_state', this.activeSession);
    }
  }

  public removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  private recordBufferedEvent(event: string, data: any, targetStudentId?: string): number {
    const id = this.nextEventId++;
    const buffered: BufferedSSEEvent = {
      id,
      event,
      data,
      targetStudentId,
      timestamp: new Date().toISOString(),
    };
    this.eventHistory.push(buffered);
    if (this.eventHistory.length > 200) {
      this.eventHistory.shift();
    }
    return id;
  }

  private sendEventToClient(client: SSEClient, event: string, data: any, eventId?: number) {
    try {
      if (client.res.writableEnded || client.res.destroyed) {
        this.clients.delete(client.id);
        return;
      }
      const idPrefix = eventId !== undefined ? `id: ${eventId}\n` : '';
      client.res.write(`${idPrefix}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      client.lastActive = Date.now();
    } catch {
      this.clients.delete(client.id);
    }
  }

  private replayMissedEvents(client: SSEClient, lastEventId: number) {
    const missed = this.eventHistory.filter(e => {
      if (e.id <= lastEventId) return false;
      if (e.targetStudentId && e.targetStudentId !== client.studentId) return false;
      return true;
    });

    for (const evt of missed) {
      this.sendEventToClient(client, evt.event, evt.data, evt.id);
    }
  }

  public broadcast(event: string, data: any) {
    const eventId = this.recordBufferedEvent(event, data);
    for (const client of this.clients.values()) {
      this.sendEventToClient(client, event, data, eventId);
    }
  }

  public sendToStudent(studentId: string, event: string, data: any) {
    const eventId = this.recordBufferedEvent(event, data, studentId);
    for (const client of this.clients.values()) {
      if (client.studentId === studentId) {
        this.sendEventToClient(client, event, data, eventId);
      }
    }
  }

  public updateLiveHeatmap(): Record<string, { greenCount: number; totalCount: number; percent: number }> {
    const students = islmRepository.listStudents();
    const heatmap: Record<string, { greenCount: number; totalCount: number; percent: number }> = {};
    const targetConcepts = ['web_apache_docroot', 'pdo_mysql_port', 'sql_injection_defense', 'async_event_loop', 'recursion_base_case'];

    targetConcepts.forEach(cId => {
      let green = 0;
      const total = students.length;
      students.forEach(s => {
        const mastery = s.topic_mastery?.[cId] ?? 0;
        if (mastery >= 0.8) green++;
      });
      const pct = total > 0 ? Math.round((green / total) * 100) : 0;
      heatmap[cId] = { greenCount: green, totalCount: total, percent: pct };
    });

    this.activeSession.heatmap = heatmap;
    return heatmap;
  }

  public startSession(params: {
    topicId: string;
    topicName: string;
    track: string;
    teacherId: string;
  }): LiveSessionState {
    const students = islmRepository.listStudents();
    const studentsMap: Record<string, StudentLiveState> = {};

    students.forEach(s => {
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

    this.activeSession = {
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
      heatmap: this.updateLiveHeatmap(),
    };

    this.broadcast('session_state', this.activeSession);
    return this.activeSession;
  }

  public endSession(): { success: boolean } {
    this.activeSession.isActive = false;
    this.activeSession.releasedQuestion = null;
    this.broadcast('session_ended', { sessionId: this.activeSession.sessionId });
    return { success: true };
  }

  public getState(): LiveSessionState {
    return this.activeSession;
  }

  public setTimeline(timeline: LiveConceptTimelineItem[]): LiveConceptTimelineItem[] {
    this.activeSession.timeline = timeline;
    this.broadcast('timeline_updated', { timeline });
    return timeline;
  }

  public updateEngagement(studentId: string, lowEngagement: boolean) {
    if (this.activeSession.students[studentId]) {
      this.activeSession.students[studentId].lowEngagement = lowEngagement;
      this.broadcast('student_engagement_changed', { studentId, lowEngagement });
    }
  }

  public releaseQuestion(questionId: string): LiveQuestion | null {
    let targetQ: LiveQuestion | null = null;
    for (const item of this.activeSession.timeline) {
      const found = item.questions.find(q => q.id === questionId);
      if (found) {
        targetQ = found;
        break;
      }
    }

    if (!targetQ) return null;

    this.activeSession.releasedQuestion = targetQ;
    for (const s of Object.values(this.activeSession.students)) {
      s.answered = false;
      s.selectedAnswer = undefined;
      s.isCorrect = undefined;
    }

    this.broadcast('question_released', targetQ);
    return targetQ;
  }

  public async submitAnswer(params: {
    studentId: string;
    questionId: string;
    selectedIndex: number;
    lowEngagement?: boolean;
  }): Promise<{ studentState: StudentLiveState; tutorial: PersonalizedMicroTutorial }> {
    const q = this.activeSession.releasedQuestion;
    const isCorrect = q ? params.selectedIndex === q.correctIndex : false;

    const studentIslm = islmRepository.findByStudentId(params.studentId);
    const currentPL = studentIslm?.topic_mastery?.[this.activeSession.topicId] ??
      (this.activeSession.students[params.studentId]?.pL ?? 0.45);

    const level: 'Beginner' | 'Intermediate' | 'Advanced' =
      currentPL < 0.35 ? 'Beginner' : currentPL <= 0.70 ? 'Intermediate' : 'Advanced';

    const wrongMisconception = q?.misconceptionMap?.[params.selectedIndex] || 'General logic trap';

    let tutorial: PersonalizedMicroTutorial;

    if (params.lowEngagement) {
      tutorial = {
        studentId: params.studentId,
        questionId: params.questionId,
        level,
        tutorialType: 're-engage',
        title: 'Attention Check-In & Momentum Refresh',
        content: `We noticed you've been inactive or focused away from the lecture stream. Let's reset and anchor attention on ${this.activeSession.topicName}.`,
        reflectivePrompt: 'Ready to re-engage with the class?',
      };
    } else if (level === 'Beginner') {
      tutorial = {
        studentId: params.studentId,
        questionId: params.questionId,
        level: 'Beginner',
        tutorialType: 'scaffolding',
        title: `Step-by-Step Scaffolding: ${q?.conceptName || this.activeSession.topicName}`,
        content: isCorrect
          ? `Great job getting this right! ${q?.explanation}.`
          : `Diagnostic Insight: Rooted in misconception "${wrongMisconception}". ${q?.explanation}`,
        reflectivePrompt: 'What is the primary constraint governing this operation?',
        targetedMisconception: wrongMisconception,
      };
    } else if (level === 'Intermediate') {
      tutorial = {
        studentId: params.studentId,
        questionId: params.questionId,
        level: 'Intermediate',
        tutorialType: 'constructivist',
        title: `Constructivist Drill: ${q?.conceptName || this.activeSession.topicName}`,
        content: isCorrect
          ? `Solid grasp! How would this behave if you introduced an upstream proxy?`
          : `Constructive Analysis: Choice reflected "${wrongMisconception}". Trace request lifecycle from first principles.`,
        reflectivePrompt: 'How would you explain the underlying mechanism to a peer?',
        targetedMisconception: wrongMisconception,
      };
    } else {
      tutorial = {
        studentId: params.studentId,
        questionId: params.questionId,
        level: 'Advanced',
        tutorialType: 'extension',
        title: `Advanced Extension Challenge: ${q?.conceptName || this.activeSession.topicName}`,
        content: `Mastery demonstrated! Formulate an enterprise dynamic vhost architecture that guarantees chroot isolation.`,
        reflectivePrompt: 'Formulate an Apache directive configuration that enforces strict isolation boundaries.',
      };
    }

    const studentState: StudentLiveState = {
      studentId: params.studentId,
      studentName: studentIslm?.name || params.studentId,
      currentLevel: level,
      pL: isCorrect ? Math.min(0.99, +(currentPL + 0.12).toFixed(2)) : Math.max(0.01, +(currentPL - 0.08).toFixed(2)),
      answered: true,
      selectedAnswer: params.selectedIndex,
      isCorrect,
      answeredAt: new Date().toLocaleTimeString(),
      lowEngagement: params.lowEngagement,
    };

    this.activeSession.students[params.studentId] = studentState;
    this.activeSession.tutorials[params.studentId] = tutorial;

    // Update ISLM via Repository
    if (studentIslm) {
      const updatedTopicMastery = { ...studentIslm.topic_mastery, [this.activeSession.topicId]: studentState.pL };
      const updatedMisconceptions = (!isCorrect && wrongMisconception)
        ? [wrongMisconception, ...(studentIslm.recent_misconceptions || []).filter(m => m !== wrongMisconception)].slice(0, 5)
        : studentIslm.recent_misconceptions;

      islmRepository.upsert({
        student_id: params.studentId,
        topic_mastery: updatedTopicMastery,
        recent_misconceptions: updatedMisconceptions,
        error_count: isCorrect ? studentIslm.error_count : (studentIslm.error_count || 0) + 1,
        independent_solves: isCorrect ? (studentIslm.independent_solves || 0) + 1 : studentIslm.independent_solves,
      });
    }

    // Append to pedagogical events repository
    eventRepository.append({
      studentId: params.studentId,
      type: 'LIVE_CLASS_ANSWER',
      conceptId: this.activeSession.topicId,
      topicId: this.activeSession.topicName,
      payload: {
        questionId: params.questionId,
        selectedIndex: params.selectedIndex,
        isCorrect,
        level,
        lowEngagement: params.lowEngagement,
      },
      synthetic: false,
    });

    this.updateLiveHeatmap();

    this.broadcast('student_answered', {
      studentState,
      heatmap: this.activeSession.heatmap,
    });

    this.sendToStudent(params.studentId, 'micro_tutorial', tutorial);

    return { studentState, tutorial };
  }

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }
}

export const liveSessionService = new LiveSessionService();
