import fs from 'fs';
import path from 'path';
import {
  userRepository,
  islmRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  studyRepository,
  cohortRepository,
} from './repositories/index.ts';
import { runMigrations } from './db/migrations.ts';

export interface PedagogicalEvent {
  id: string;
  ts: string;
  studentId: string;
  type: string;
  conceptId: string;
  topicId: string;
  payload: Record<string, any>;
  synthetic: boolean;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: string;
  degree?: string;
  preferredLanguages?: string[];
  streakDays?: number;
  testsCompleted?: number;
  overallMastery?: number;
  theme?: 'dark' | 'light';
  passwordHash?: string;
  tokenVersion?: number;
  retentionDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreData {
  users: StoreUser[];
  islm: Array<{
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
    history?: any[];
  }>;
  events: PedagogicalEvent[];
  attempts: Array<{
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
    ts?: string;
    timestamp?: string;
    codeSnippet?: string;
    language?: string;
    isSuccess?: boolean;
    errorLog?: string;
    topicId?: string;
    details?: any;
  }>;
  interventions: Array<{
    id: string;
    studentId: string;
    studentName?: string;
    timestamp: string;
    tier: number;
    issueType: string;
    refusalReason?: string;
    tutorMessage: string;
    socraticQuestion: string;
    conceptId?: string;
    conceptName?: string;
    suggestedAction?: string;
    status?: 'pending' | 'Teacher-approved' | 'dismissed';
    outcome?: 'pending' | 'resolved' | 'repeated error';
    approvedAt?: string;
    outcomeRecordedAt?: string;
  }>;
  sessions: Array<{
    id: string;
    studentId: string;
    title: string;
    timestamp: string;
    messages: any[];
  }>;
  cohorts: Array<{
    id: string;
    name: string;
    studentsCount: number;
    averageMastery: number;
    activeInterventions: number;
    track: string;
  }>;
  studies: Array<{
    id: string;
    title: string;
    sampleSize: number;
    metrics: Record<string, any>;
    provenance: string;
  }>;
  dkmStates?: Record<string, any[]>; // studentId -> dkmNodes
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const STORE_TMP_FILE = path.join(DATA_DIR, 'store.json.tmp');

export function getEmptyStore(): StoreData {
  return {
    users: [],
    islm: [],
    events: [],
    attempts: [],
    interventions: [],
    sessions: [],
    cohorts: [],
    studies: [],
    dkmStates: {},
  };
}

export function getDemoStore(): StoreData {
  const defaultPasswordHash = '$2b$10$49dpOl7qIuncJvpKbScOIu.0Afira2XT/HEZqWqBKCsqZtrl6o/Dq'; // 'Password123!'
  return {
    users: [
      {
        id: 'CSE_STU_8810',
        name: 'haritha karthikkumar',
        email: 'haritha.k@university.edu',
        role: 'student',
        plan: 'Free Plan',
        degree: 'B.Tech in Computer Science & Engineering',
        preferredLanguages: ['python', 'javascript', 'java', 'cpp', 'php'],
        streakDays: 7,
        testsCompleted: 3,
        overallMastery: 0.75,
        theme: 'dark',
        passwordHash: defaultPasswordHash,
        tokenVersion: 1,
      },
      {
        id: 'CSE_STU_9021',
        name: 'Alex Rivera',
        email: 'alex.r@cs.university.edu',
        role: 'student',
        plan: 'Free Plan',
        degree: 'B.Tech in Computer Science',
        preferredLanguages: ['javascript', 'python'],
        streakDays: 3,
        testsCompleted: 2,
        overallMastery: 0.28,
        theme: 'dark',
        passwordHash: defaultPasswordHash,
        tokenVersion: 1,
      },
      {
        id: 'CSE_STU_7734',
        name: 'Maya Lin',
        email: 'maya.lin@cs.university.edu',
        role: 'student',
        plan: 'Pro Student',
        degree: 'B.Tech in Computer Science',
        preferredLanguages: ['python', 'cpp', 'rust'],
        streakDays: 24,
        testsCompleted: 14,
        overallMastery: 0.88,
        theme: 'dark',
        passwordHash: defaultPasswordHash,
        tokenVersion: 1,
      },
      {
        id: 'FACULTY_402',
        name: 'Prof. David Thorne',
        email: 'd.thorne@cs.university.edu',
        role: 'teacher',
        plan: 'Campus License',
        degree: 'Department of Computer Science & Engineering',
        preferredLanguages: ['cpp', 'python', 'go', 'rust'],
        streakDays: 42,
        testsCompleted: 18,
        overallMastery: 0.94,
        theme: 'dark',
        passwordHash: defaultPasswordHash,
        tokenVersion: 1,
      },
      {
        id: 'ADMIN_001',
        name: 'System Administrator',
        email: 'admin@cognicse.edu',
        role: 'admin',
        plan: 'Enterprise',
        degree: 'School of Computing Administration',
        preferredLanguages: ['python', 'typescript'],
        streakDays: 99,
        testsCompleted: 50,
        overallMastery: 1.0,
        theme: 'dark',
        passwordHash: defaultPasswordHash,
        tokenVersion: 1,
      },
    ],
    islm: [
      {
        student_id: 'CSE_STU_8810',
        name: 'haritha karthikkumar',
        email: 'haritha.k@university.edu',
        role: 'student',
        course_track: 'Web Application Development',
        overall_mastery: 0.75,
        topic_mastery: {
          pdo_mysql_port: 0.25,
          recursion_base_case: 0.3,
          tcp_three_way_handshake: 0.88,
          async_event_loop: 0.85,
        },
        recent_misconceptions: [
          'Confusing MySQL database port (3306) with HTTP web port (80)',
          'Omitting recursive base cases leading to call stack exhaustion',
        ],
        scaffolding_tier_required: 1,
        error_count: 5,
        independent_solves: 14,
        scaffolding_fading_index: 0.4,
        time_spent_mins: 142,
        history: [],
      },
      {
        student_id: 'CSE_STU_9021',
        name: 'Alex Rivera',
        email: 'alex.r@cs.university.edu',
        role: 'student',
        course_track: 'Web Application Development',
        overall_mastery: 0.28,
        topic_mastery: {
          web_apache_docroot: 0.28,
          pdo_mysql_port: 0.20,
          sql_injection_defense: 0.30,
        },
        recent_misconceptions: ['Saved file outside DocumentRoot'],
        scaffolding_tier_required: 1,
        error_count: 5,
        independent_solves: 2,
        scaffolding_fading_index: 0.22,
        time_spent_mins: 80,
        history: [],
      },
      {
        student_id: 'CSE_STU_7734',
        name: 'Maya Lin',
        email: 'maya.lin@cs.university.edu',
        role: 'student',
        course_track: 'Web Application Development',
        overall_mastery: 0.88,
        topic_mastery: {
          web_apache_docroot: 0.88,
          pdo_mysql_port: 0.90,
          sql_injection_defense: 0.92,
        },
        recent_misconceptions: [],
        scaffolding_tier_required: 4,
        error_count: 1,
        independent_solves: 28,
        scaffolding_fading_index: 0.92,
        time_spent_mins: 320,
        history: [],
      },
    ],
    events: [
      {
        id: 'evt_init_1',
        ts: new Date(Date.now() - 86400000).toISOString(),
        studentId: 'CSE_STU_8810',
        type: 'SYSTEM_ONBOARDING',
        conceptId: 'cse_orientation',
        topicId: 'orientation',
        payload: { action: 'initial_login', role: 'student' },
        synthetic: false,
      },
      {
        id: 'evt_init_2',
        ts: new Date(Date.now() - 43200000).toISOString(),
        studentId: 'CSE_STU_8810',
        type: 'CODE_EXECUTION_ERROR',
        conceptId: 'pdo_mysql_port',
        topicId: 'pdo_mysql_port',
        payload: { error: 'Connection refused on port 80', tier: 1 },
        synthetic: false,
      },
    ],
    attempts: [
      {
        id: 'att_1',
        studentId: 'CSE_STU_8810',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        codeSnippet: '$dsn = "mysql:host=$host;port=80;dbname=$db";',
        language: 'php',
        isSuccess: false,
        errorLog: 'SQLSTATE[HY000] [2002] Connection refused',
        topicId: 'pdo_mysql_port',
      },
    ],
    interventions: [
      {
        id: 'int_1',
        studentId: 'CSE_STU_8810',
        timestamp: new Date(Date.now() - 43100000).toISOString(),
        tier: 1,
        issueType: 'PRACTICAL_EXECUTION_ERROR',
        refusalReason: 'Anti-Answer Protocol Active: Direct code generation withheld.',
        tutorMessage: 'In computer networking, port 80 is reserved for standard HTTP web traffic. What is the standard default port number where MySQL servers listen for client queries?',
        socraticQuestion: 'What port does MySQL listen on by default?',
        conceptId: 'pdo_mysql_port',
      },
    ],
    sessions: [
      {
        id: 'chat_greeting',
        studentId: 'CSE_STU_8810',
        title: 'Greeting',
        timestamp: 'Today',
        messages: [
          {
            id: 'msg_1',
            sender: 'user',
            text: 'Hi',
            timestamp: '10:00 AM',
          },
          {
            id: 'msg_2',
            sender: 'assistant',
            text: 'Hello! I am your CogniCSE Technical Tutor. How can I help you master Computer Science & Engineering today?',
            timestamp: '10:00 AM',
            source: 'gemini',
            fallback_reason: null,
          },
        ],
      },
    ],
    cohorts: [
      {
        id: 'cohort_systems_ai_2026',
        name: 'CSE Batch 2026 - Systems & Artificial Intelligence',
        studentsCount: 48,
        averageMastery: 0.74,
        activeInterventions: 12,
        track: 'Systems & Artificial Intelligence',
      },
      {
        id: 'cohort_web_arch_2026',
        name: 'CSE Batch 2026 - Web Architectures & Protocols',
        studentsCount: 52,
        averageMastery: 0.81,
        activeInterventions: 7,
        track: 'Web Application Development',
      },
    ],
    studies: [
      {
        id: 'study_socratic_vs_direct',
        title: 'Socratic Scaffolding vs Direct Solution In CSE Problem Solving',
        sampleSize: 120,
        metrics: {
          fadingIndexGain: '+38%',
          retentionRate: '84%',
          independentSolveDelta: '+41%',
          misconceptionRecurrenceDrop: '-62%',
        },
        provenance: 'STUDY DATA',
      },
    ],
    dkmStates: {},
  };
}

function getInitialStore(): StoreData {
  return getEmptyStore();
}

export async function seedDemoStore(): Promise<StoreData> {
  const demo = getDemoStore();
  runMigrations();
  for (const u of demo.users) {
    userRepository.upsert(u);
  }
  for (const i of demo.islm) {
    islmRepository.upsert(i);
  }
  for (const c of demo.cohorts) {
    cohortRepository.upsert(c);
  }
  for (const s of demo.studies || []) {
    if (!studyRepository.findById(s.id)) {
      studyRepository.create(s);
    }
  }
  return readStore();
}

let writeQueue: Promise<void> = Promise.resolve();

export function ensureStoreExists(): StoreData {
  return readStore();
}

export async function writeStoreAtomically(mutator: (store: StoreData) => void): Promise<StoreData> {
  const store = readStore();
  mutator(store);

  for (const u of store.users) {
    userRepository.upsert(u);
  }
  for (const i of store.islm) {
    islmRepository.upsert(i);
  }
  for (const c of store.cohorts || []) {
    cohortRepository.upsert(c);
  }

  return store;
}

export function readStore(): StoreData {
  try {
    runMigrations();
    const users = userRepository.listPaginated({ limit: 1000 }).items;
    const islm = islmRepository.listPaginated({ limit: 1000 }).items as any;
    const events = eventRepository.listAllPaginated({ limit: 10000 }).items as any;
    const attempts = attemptRepository.listAll() as any;
    const interventions = interventionRepository.listAllPaginated({ limit: 1000 }).items as any;
    const cohorts = cohortRepository.findAll();
    const studies = studyRepository.findAll();

    return {
      users,
      islm,
      events,
      attempts,
      interventions,
      sessions: [],
      cohorts,
      studies,
      dkmStates: {},
    };
  } catch {
    return getEmptyStore();
  }
}

export async function appendEvent(eventData: Omit<PedagogicalEvent, 'id' | 'ts'> & { id?: string; ts?: string }): Promise<PedagogicalEvent> {
  const event: PedagogicalEvent = {
    id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ts: eventData.ts || new Date().toISOString(),
    studentId: eventData.studentId,
    type: eventData.type,
    conceptId: eventData.conceptId || 'general',
    topicId: eventData.topicId || 'general',
    payload: eventData.payload || {},
    synthetic: typeof eventData.synthetic === 'boolean' ? eventData.synthetic : false,
  };

  await writeStoreAtomically(store => {
    if (!store.events) store.events = [];
    store.events.push(event);
  });

  return event;
}

export async function loginOrCreateUser(params: {
  email: string;
  name?: string;
  role?: 'student' | 'teacher';
  degree?: string;
  id?: string;
}) {
  let matchedUser: any = null;
  let islmProfile: any = null;

  await writeStoreAtomically(store => {
    if (!store.users) store.users = [];
    if (!store.islm) store.islm = [];

    const normEmail = params.email.trim().toLowerCase();
    matchedUser = store.users.find(
      u => (params.id && u.id === params.id) || u.email.toLowerCase() === normEmail
    );

    if (!matchedUser) {
      const generatedId =
        params.id ||
        (params.role === 'teacher'
          ? `FACULTY_${Math.floor(100 + Math.random() * 900)}`
          : `CSE_STU_${Math.floor(1000 + Math.random() * 9000)}`);

      matchedUser = {
        id: generatedId,
        name: params.name?.trim() || (params.role === 'teacher' ? 'Faculty Instructor' : 'CSE Student'),
        email: params.email.trim(),
        role: params.role || 'student',
        plan: params.role === 'teacher' ? 'Campus License' : 'Free Plan',
        degree: params.degree || 'B.Tech Computer Science & Engineering',
        preferredLanguages: ['python', 'javascript', 'cpp', 'java'],
        streakDays: 1,
        testsCompleted: 0,
        overallMastery: 0.6,
        theme: 'dark',
      };
      store.users.push(matchedUser);
    } else {
      if (params.name) matchedUser.name = params.name;
      if (params.role) matchedUser.role = params.role;
      if (params.degree) matchedUser.degree = params.degree;
    }

    // Ensure ISLM profile exists for this user
    islmProfile = store.islm.find(i => i.student_id === matchedUser.id);
    if (!islmProfile) {
      islmProfile = {
        student_id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        course_track: 'Web Application Development',
        overall_mastery: matchedUser.overallMastery || 0.65,
        topic_mastery: {
          pdo_mysql_port: 0.25,
          recursion_base_case: 0.3,
          tcp_three_way_handshake: 0.88,
        },
        recent_misconceptions: ['Confusing MySQL database port (3306) with HTTP web port (80)'],
        scaffolding_tier_required: 1,
        error_count: 0,
        independent_solves: 0,
        scaffolding_fading_index: 0.3,
        time_spent_mins: 0,
        history: [],
      };
      store.islm.push(islmProfile);
    }
  });

  return { user: matchedUser, islm: islmProfile };
}
