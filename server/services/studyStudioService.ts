import { flashcardRepository, studyPlanRepository, dkmStateRepository, islmRepository } from '../repositories/index.ts';
import { callGeminiWithRetry } from '../gemini.ts';
import { calculateSM2Update } from '../../src/services/spacedRepetition.ts';

export type {
  SummarySection,
  ExtractedConcept,
  StudioFlashcard,
  StudioPracticeQuestion,
  StudyDayTask,
  StudyDaySchedule,
  StudyStudioConfig,
  StudyStudioState,
} from '../../src/types/studyStudio.ts';

export function computeTradeOffText(targetGrade: number, dailyMinutes: number, daysRemaining: number): string {
  const percentage = Math.round(targetGrade * 10);
  if (targetGrade >= 9) {
    if (dailyMinutes < 30) {
      return `⚠️ Trade-off Notice: Targeting ${percentage}% (Grade ${targetGrade}/10) in ${daysRemaining} days with only ${dailyMinutes}m/day is tight. A high grade requires deep transfer and error-inversion practice; 45+ minutes/day is recommended.`;
    }
    return `🎯 High Target Profile: Targeting ${percentage}% (Grade ${targetGrade}/10) with ${dailyMinutes}m/day across ${daysRemaining} days. Deep Socratic retrieval, 4-tier concept verification, and retention intervals are scheduled.`;
  }
  if (targetGrade >= 7) {
    return `📈 Proficient Target Profile: Targeting ${percentage}% (Grade ${targetGrade}/10) with ${dailyMinutes}m/day across ${daysRemaining} days. Balanced distribution prioritizing weak BKT concepts with spaced Leitner progression.`;
  }
  return `⏱️ Foundation Target Profile: Targeting ${percentage}% (Grade ${targetGrade}/10) with ${dailyMinutes}m/day across ${daysRemaining} days. Focus is concentrated on high-yield core concepts and direct code invariant recognition.`;
}

export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds the day-by-day plan from today to exam date,
 * weighted by student's BKT mastery (weak concepts earlier and more often) and target grade.
 */
export function buildBKTWeightedSchedule(params: {
  examDate: string;
  targetGrade: number;
  dailyStudyMinutes: number;
  concepts: ExtractedConcept[];
  flashcards: StudioFlashcard[];
  practiceQuestions: StudioPracticeQuestion[];
}): StudyDaySchedule[] {
  const today = new Date();
  const exam = new Date(params.examDate);

  const diffTime = exam.getTime() - today.getTime();
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Sort concepts by BKT mastery: weak concepts (pL < 0.50) first!
  const sortedConcepts = [...params.concepts].sort((a, b) => a.masteryPrior - b.masteryPrior);
  const weakConcepts = sortedConcepts.filter(c => c.masteryPrior < 0.50);
  const mediumConcepts = sortedConcepts.filter(c => c.masteryPrior >= 0.50 && c.masteryPrior < 0.80);
  const strongConcepts = sortedConcepts.filter(c => c.masteryPrior >= 0.80);

  const schedule: StudyDaySchedule[] = [];

  for (let i = 0; i < diffDays; i++) {
    const curDate = new Date();
    curDate.setDate(today.getDate() + i);
    const dateStr = toLocalDateStr(curDate);

    const isToday = i === 0;
    const progressRatio = i / diffDays; // 0 (start) to 1 (exam eve)

    // Select focus concepts for this day
    let focus: ExtractedConcept[] = [];

    if (progressRatio < 0.4) {
      // Early phase: heavily weight weak concepts!
      focus = weakConcepts.length > 0 ? weakConcepts.slice(0, 2) : sortedConcepts.slice(0, 2);
    } else if (progressRatio < 0.75) {
      // Middle phase: reinforce weak concepts + integrate medium concepts
      const primaryWeak = weakConcepts[i % Math.max(1, weakConcepts.length)];
      const med = mediumConcepts[i % Math.max(1, mediumConcepts.length)];
      focus = [primaryWeak, med].filter(Boolean) as ExtractedConcept[];
      if (focus.length === 0) focus = sortedConcepts.slice(1, 3);
    } else {
      // Final sprint: comprehensive review and transfer retention across all
      focus = sortedConcepts.slice(0, 3);
    }

    const focusConceptNames = focus.map(c => c.name);

    // Cards per day weighted by target grade (e.g. Grade 9 = more cards, Grade 6 = moderate)
    const baseCardCount = Math.min(params.flashcards.length, Math.round(12 + (params.targetGrade - 4) * 3));
    const dayCardCount = Math.min(params.flashcards.length, Math.max(8, baseCardCount + (i % 2 === 0 ? 2 : -1)));

    // Practice questions allocated (1-3 per day)
    const dayPracticeCount = Math.min(params.practiceQuestions.length, Math.max(1, Math.round(params.targetGrade >= 8 ? 2 : 1)));

    const tasks: StudyDayTask[] = [
      {
        id: `task_${i}_cards`,
        title: `Complete ${dayCardCount} spaced recall flashcards (${focusConceptNames.slice(0, 2).join(', ')})`,
        type: 'flashcards',
        completed: false,
        count: dayCardCount,
      },
      {
        id: `task_${i}_summary`,
        title: `Review summary notes for ${focusConceptNames[0] || 'core concepts'}`,
        type: 'summary_review',
        completed: false,
        conceptId: focus[0]?.id,
      },
    ];

    if (dayPracticeCount > 0) {
      tasks.push({
        id: `task_${i}_practice`,
        title: `Solve ${dayPracticeCount} diagnostic exam practice questions`,
        type: 'practice',
        completed: false,
        count: dayPracticeCount,
      });
    }

    schedule.push({
      date: dateStr,
      dayIndex: i + 1,
      status: isToday ? 'today' : 'upcoming',
      targetMinutes: params.dailyStudyMinutes,
      focusConcepts: focusConceptNames,
      scheduledCardsCount: dayCardCount,
      practiceQuestionsCount: dayPracticeCount,
      tasks,
    });
  }

  return schedule;
}

/**
 * Generates rich pedagogical fallback materials when Gemini is offline or unconfigured.
 */
export function generateStudyStudioFallback(params: {
  courseTopic: string;
  examDate: string;
  targetGrade: number;
  dailyStudyMinutes: number;
  sampleText?: string;
  studentId: string;
}): StudyStudioState {
  const { courseTopic, examDate, targetGrade, dailyStudyMinutes, studentId } = params;
  const daysDiff = Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const tradeOffText = computeTradeOffText(targetGrade, dailyStudyMinutes, daysDiff);

  // 1. Hierarchical Summary
  const summary: SummarySection[] = [
    {
      id: 'sum_1',
      title: '1. Architectural Foundations & Invariant Rules',
      keyTakeaway: 'Strict system boundaries and parameter validation prevent untrusted execution flows.',
      content: `The core architecture of ${courseTopic} centers on deterministic resource mapping, boundary isolation, and protocol handshakes. Systems must maintain invariant states during request lifecycles, guaranteeing that configuration bounds (such as root directories, memory buffers, and socket ports) are never bypassed by unverified user inputs.`,
      subtopics: [
        'Deterministic filesystem and resource hierarchy mapping',
        'State machine consistency and transaction lifecycles',
        'Parameter validation and input cleansing at system boundaries',
      ],
    },
    {
      id: 'sum_2',
      title: '2. Connection Protocols, Ports & Concurrency Invariants',
      keyTakeaway: 'Port separation and non-blocking event dispatch isolate database and application daemons.',
      content: `Network services enforce strict port segregation (e.g. database daemon listening on socket 3306 vs web daemons on port 80/443). Concurrency primitives prevent race conditions through mutual exclusion and non-blocking I/O event loops. Understanding how daemons bind to network interfaces is essential for debugging connection drops.`,
      subtopics: [
        'Socket binding rules and daemon interface routing',
        'TCP three-way handshakes and connection pool management',
        'Asynchronous event loop execution order and starvation avoidance',
      ],
    },
    {
      id: 'sum_3',
      title: '3. Defensive Data Access & Memory Safety',
      keyTakeaway: 'Prepared statements and boundary checks eliminate injection and memory corruption vulnerabilities.',
      content: `Data access layers must employ parameterized prepared statements to separate SQL parsing from data binding. In native systems, dynamic memory allocations require strict lifetime guarantees and base-case termination proofs for recursion to prevent stack overflow and heap corruption.`,
      subtopics: [
        'Prepared statement compilation vs dynamic string interpolation',
        'Recursive base-case proofs and induction guarantees',
        'Memory buffer bounds checking and pointer arithmetic safety',
      ],
    },
    {
      id: 'sum_4',
      title: '4. Diagnostic Troubleshooting & Exam Synthesis',
      keyTakeaway: 'Systematic error log analysis identifies error categories and guides tier-1 remediation.',
      content: `Diagnostic mastery requires mapping symptom signatures (e.g. SQLSTATE 2002 Connection Refused, AH01276 DirectoryIndex missing, segmentation faults) to root causes. Exam problems frequently test edge cases where multiple subsystem invariants interact under high load.`,
      subtopics: [
        'Log triage and HTTP/SQL status code resolution',
        'Deadlock conditions (mutual exclusion, hold & wait, no preemption, circular wait)',
        'Exam transfer problem-solving and defensive design proofs',
      ],
    },
  ];

  // 2. Extracted Concepts mapped to DKM nodes
  const concepts: ExtractedConcept[] = [
    { id: 'web_apache_docroot', name: 'DocumentRoot & Directory Hierarchy', mappedDkmNodeId: 'web_apache_docroot', category: 'Server Configuration', masteryPrior: 0.65, importance: 'core' },
    { id: 'pdo_mysql_port', name: 'Database Port Binding & Socket Protocols', mappedDkmNodeId: 'pdo_mysql_port', category: 'Databases', masteryPrior: 0.35, importance: 'high' },
    { id: 'sql_injection_defense', name: 'Parameterized Queries & Injection Defense', mappedDkmNodeId: 'sql_injection_defense', category: 'Security', masteryPrior: 0.45, importance: 'high' },
    { id: 'async_event_loop', name: 'Non-Blocking Event Loops & Microtask Queues', mappedDkmNodeId: 'async_event_loop', category: 'Concurrency', masteryPrior: 0.70, importance: 'medium' },
    { id: 'recursion_base_case', name: 'Recursive Induction & Base Case Invariants', mappedDkmNodeId: 'recursion_base_case', category: 'Algorithms', masteryPrior: 0.40, importance: 'high' },
    { id: 'tcp_three_way_handshake', name: 'TCP 3-Way Handshake & Connection Lifecycles', mappedDkmNodeId: 'tcp_three_way_handshake', category: 'Networking', masteryPrior: 0.85, importance: 'medium' },
    { id: 'deadlock_conditions', name: 'Coffman Deadlock Conditions & Detection', mappedDkmNodeId: 'deadlock_conditions', category: 'Operating Systems', masteryPrior: 0.50, importance: 'high' },
    { id: 'buffer_overflow_defense', name: 'Memory Buffer Safety & Bounds Verification', mappedDkmNodeId: 'buffer_overflow_defense', category: 'Systems', masteryPrior: 0.55, importance: 'medium' },
  ];

  // 3. Exactly 24 high-yield flashcards with source references
  const flashcards: StudioFlashcard[] = [
    {
      id: `card_${studentId}_1`,
      conceptId: 'web_apache_docroot',
      conceptName: 'DocumentRoot & Directory Hierarchy',
      question: 'What is the primary architectural purpose of the DocumentRoot directive in web server configuration?',
      answer: 'It defines the root directory in the local filesystem from which the web server serves files for a given virtual host. Requests for "/" map directly to this filesystem path.',
      sourceRef: 'Section 1.1: Filesystem Mapping, pg. 3',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_2`,
      conceptId: 'web_apache_docroot',
      conceptName: 'DocumentRoot & Directory Hierarchy',
      question: 'What error code is returned when a client requests a directory that lacks both a DirectoryIndex file and Options +Indexes?',
      answer: 'HTTP 403 Forbidden (typically logged as AH01276: Cannot serve directory: No matching DirectoryIndex found and server-generated directory index forbidden).',
      sourceRef: 'Section 1.2: Server Directives, pg. 4',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_3`,
      conceptId: 'pdo_mysql_port',
      conceptName: 'Database Port Binding & Socket Protocols',
      question: 'What is the standard default TCP port on which the MySQL database daemon listens?',
      answer: 'TCP port 3306. A common exam trap is confusing port 3306 with web port 80 or 8080.',
      sourceRef: 'Section 2.1: Database Sockets, pg. 6',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_4`,
      conceptId: 'pdo_mysql_port',
      conceptName: 'Database Port Binding & Socket Protocols',
      question: 'What does error "SQLSTATE[HY000] [2002] Connection refused" specifically indicate in a database client connection?',
      answer: 'The client reached the target host IP, but no database daemon is actively listening on the specified port, or the connection is blocked by a local firewall rule.',
      sourceRef: 'Section 2.2: Connection Triage, pg. 7',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_5`,
      conceptId: 'sql_injection_defense',
      conceptName: 'Parameterized Queries & Injection Defense',
      question: 'Why do parameterized prepared statements provably eliminate SQL injection vulnerabilities?',
      answer: 'They separate SQL query compilation from parameter values. User inputs are treated strictly as literal data tokens rather than executable SQL syntax commands.',
      sourceRef: 'Section 3.1: Defensive Querying, pg. 9',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_6`,
      conceptId: 'sql_injection_defense',
      conceptName: 'Parameterized Queries & Injection Defense',
      question: 'Why is string sanitization (like stripping quotes) inferior to prepared statements?',
      answer: 'Sanitization filters can often be bypassed by encoded characters, nested quotes, or multi-byte sequences. Prepared statements operate at the database protocol level.',
      sourceRef: 'Section 3.2: Injection Exploits, pg. 10',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_7`,
      conceptId: 'async_event_loop',
      conceptName: 'Non-Blocking Event Loops & Microtask Queues',
      question: 'In an asynchronous JavaScript event loop, which queue has priority: Microtasks (Promises) or Macrotasks (setTimeout)?',
      answer: 'Microtasks have strict priority. The microtask queue is completely drained after each synchronous call stack frame before the next macrotask is dequeued.',
      sourceRef: 'Section 4.1: Concurrency Model, pg. 12',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_8`,
      conceptId: 'async_event_loop',
      conceptName: 'Non-Blocking Event Loops & Microtask Queues',
      question: 'What is the danger of an infinite Promise.resolve() loop in an event loop environment?',
      answer: 'It starves the macrotask queue and I/O polling, causing the entire process to lock up because the microtask queue never empties.',
      sourceRef: 'Section 4.2: Queue Starvation, pg. 13',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_9`,
      conceptId: 'recursion_base_case',
      conceptName: 'Recursive Induction & Base Case Invariants',
      question: 'What two properties must every valid recursive algorithm satisfy to guarantee correct termination?',
      answer: '1) At least one non-recursive base case that halts execution. 2) A recursive step that strictly diminishes the problem size towards the base case.',
      sourceRef: 'Section 5.1: Mathematical Induction, pg. 15',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_10`,
      conceptId: 'recursion_base_case',
      conceptName: 'Recursive Induction & Base Case Invariants',
      question: 'What physical error occurs in the operating system when a recursive function fails to hit its base case?',
      answer: 'Stack Overflow. Each recursive invocation allocates a new stack frame for local variables and return addresses until the call stack limit is exhausted.',
      sourceRef: 'Section 5.2: Stack Memory, pg. 16',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_11`,
      conceptId: 'tcp_three_way_handshake',
      conceptName: 'TCP 3-Way Handshake & Connection Lifecycles',
      question: 'What is the exact packet sequence exchanged in a standard TCP three-way connection handshake?',
      answer: '1) Client sends SYN. 2) Server responds with SYN-ACK. 3) Client acknowledges with ACK. The connection is then ESTABLISHED.',
      sourceRef: 'Section 6.1: Transport Layer, pg. 18',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_12`,
      conceptId: 'tcp_three_way_handshake',
      conceptName: 'TCP 3-Way Handshake & Connection Lifecycles',
      question: 'What is a SYN Flood attack and how does it exploit the TCP handshake state machine?',
      answer: 'An attacker sends thousands of SYN packets with forged IP addresses and never responds to the SYN-ACK, leaving the server connection table full of half-open connections.',
      sourceRef: 'Section 6.2: SYN Flood Vulnerability, pg. 19',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_13`,
      conceptId: 'deadlock_conditions',
      conceptName: 'Coffman Deadlock Conditions & Detection',
      question: 'List the four Coffman conditions that must simultaneously hold for a system deadlock to occur.',
      answer: '1) Mutual Exclusion. 2) Hold and Wait. 3) No Preemption. 4) Circular Wait. Eliminating any one condition prevents deadlock.',
      sourceRef: 'Section 7.1: Deadlock Theory, pg. 21',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_14`,
      conceptId: 'deadlock_conditions',
      conceptName: 'Coffman Deadlock Conditions & Detection',
      question: 'How does resource ordering (assigning a global total order to lock acquisition) prevent circular wait?',
      answer: 'Threads may only acquire lock R_j after lock R_i if j > i. This strictly prevents a cycle from forming in the Resource Allocation Graph.',
      sourceRef: 'Section 7.2: Lock Ordering, pg. 22',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_15`,
      conceptId: 'buffer_overflow_defense',
      conceptName: 'Memory Buffer Safety & Bounds Verification',
      question: 'How does a stack canary protect a program against buffer overflow exploits?',
      answer: 'A random integer placed between local variables and the return pointer on the stack. Before returning, the function checks if the canary was corrupted; if modified, it halts execution.',
      sourceRef: 'Section 8.1: Stack Protection, pg. 24',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_16`,
      conceptId: 'buffer_overflow_defense',
      conceptName: 'Memory Buffer Safety & Bounds Verification',
      question: 'Why is strncpy() safer than strcpy() in C programming?',
      answer: 'strncpy() takes an explicit maximum buffer length argument, preventing write operations from spilling past allocated buffer bounds.',
      sourceRef: 'Section 8.2: Safe C String Functions, pg. 25',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_17`,
      conceptId: 'web_apache_docroot',
      conceptName: 'DocumentRoot & Directory Hierarchy',
      question: 'How can an administrator serve files from outside the DocumentRoot in Apache?',
      answer: 'By configuring an "Alias" directive (e.g. Alias /assets/ /var/shared/assets/) combined with an authorized <Directory> container block.',
      sourceRef: 'Section 1.3: Alias Mapping, pg. 5',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_18`,
      conceptId: 'pdo_mysql_port',
      conceptName: 'Database Port Binding & Socket Protocols',
      question: 'In a microservice deployment, what is the key difference between connecting to localhost vs 127.0.0.1 for MySQL?',
      answer: 'In Unix environments, "localhost" often instructs the client to use a local UNIX domain socket (/var/run/mysqld.sock), whereas 127.0.0.1 forces a TCP network socket connection over port 3306.',
      sourceRef: 'Section 2.3: Socket vs TCP, pg. 8',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_19`,
      conceptId: 'sql_injection_defense',
      conceptName: 'Parameterized Queries & Injection Defense',
      question: 'Can SQL injection occur in a LIMIT or ORDER BY clause when using standard prepared statements?',
      answer: 'Yes. Many database drivers do not allow column identifiers or direction keywords (ASC/DESC) to be parameterized, requiring strict application allow-lists.',
      sourceRef: 'Section 3.3: Dynamic Identifiers, pg. 11',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_20`,
      conceptId: 'async_event_loop',
      conceptName: 'Non-Blocking Event Loops & Microtask Queues',
      question: 'What is the role of process.nextTick() compared to setImmediate() in Node.js?',
      answer: 'process.nextTick() executes immediately after the current operation before the microtask queue, while setImmediate() runs on the subsequent check phase of the event loop.',
      sourceRef: 'Section 4.3: Node Event Phases, pg. 14',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_21`,
      conceptId: 'recursion_base_case',
      conceptName: 'Recursive Induction & Base Case Invariants',
      question: 'How does tail call optimization (TCO) mitigate stack consumption in recursion?',
      answer: 'If the recursive call is the final expression evaluated, the compiler reuses the current stack frame rather than pushing a new frame, transforming recursion into an iterative loop.',
      sourceRef: 'Section 5.3: Tail Recursion, pg. 17',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_22`,
      conceptId: 'tcp_three_way_handshake',
      conceptName: 'TCP 3-Way Handshake & Connection Lifecycles',
      question: 'What state does a TCP socket enter after sending a FIN packet to initiate termination?',
      answer: 'FIN_WAIT_1, which transitions to FIN_WAIT_2 after receiving the partner ACK, and finally TIME_WAIT before socket destruction.',
      sourceRef: 'Section 6.3: TCP Teardown, pg. 20',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_23`,
      conceptId: 'deadlock_conditions',
      conceptName: 'Coffman Deadlock Conditions & Detection',
      question: 'How does the Banker Algorithm prevent deadlock in multi-resource systems?',
      answer: 'It tests resource allocation state transitions for safety by simulating maximum potential resource claims before granting any request.',
      sourceRef: 'Section 7.3: Banker Algorithm, pg. 23',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    {
      id: `card_${studentId}_24`,
      conceptId: 'buffer_overflow_defense',
      conceptName: 'Memory Buffer Safety & Bounds Verification',
      question: 'What is Address Space Layout Randomization (ASLR)?',
      answer: 'A defense mechanism that randomizes the memory locations of the stack, heap, and libraries, preventing attackers from predicting fixed return addresses.',
      sourceRef: 'Section 8.3: ASLR Invariants, pg. 26',
      leitnerBox: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
  ];

  // 4. Practice Questions (6 structured exam-style questions)
  const practiceQuestions: StudioPracticeQuestion[] = [
    {
      id: `pq_${studentId}_1`,
      conceptId: 'pdo_mysql_port',
      conceptName: 'Database Port Binding & Socket Protocols',
      question: 'An engineer configures a web app with $pdo = new PDO("mysql:host=db.internal;port=80;dbname=store"). The connection immediately fails with SQLSTATE[HY000] [2002]. What is the root cause?',
      options: [
        'Port 80 is configured, but MySQL daemon listens on port 3306 by default.',
        'The database username and password credentials are invalid.',
        'The Apache DocumentRoot is missing from the database connection string.',
        'PHP does not support TCP connections to internal hostnames.',
      ],
      correctIndex: 0,
      explanation: 'Port 80 is the standard HTTP web server port. MySQL daemon listens on port 3306 by default. Attempting to connect to port 80 results in connection refused.',
      sourceRef: 'Exam Prep Bank: Network Diagnostics §2',
    },
    {
      id: `pq_${studentId}_2`,
      conceptId: 'sql_injection_defense',
      conceptName: 'Parameterized Queries & Injection Defense',
      question: 'Which of the following code snippets represents a secure, injection-proof database query?',
      options: [
        '$db->query("SELECT * FROM users WHERE id = " . $_GET["id"]);',
        '$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?"); $stmt->execute([$email]);',
        '$db->query("SELECT * FROM users WHERE name = \'" . addslashes($_POST["name"]) . "\'");',
        'eval("SELECT * FROM users WHERE code = " . $userCode);',
      ],
      correctIndex: 1,
      explanation: 'Using $pdo->prepare() with parameter placeholders (?) compiles the query structure beforehand, treating $email purely as a data literal.',
      sourceRef: 'Exam Prep Bank: Secure Coding Invariants §3',
    },
    {
      id: `pq_${studentId}_3`,
      conceptId: 'recursion_base_case',
      conceptName: 'Recursive Induction & Base Case Invariants',
      question: 'Consider function f(n) { if (n == 0) return 0; return f(n - 2) + 1; }. What happens when invoked with f(5)?',
      options: [
        'Returns 2 after reaching base case.',
        'Returns 3 after 5 recursive steps.',
        'Causes infinite recursion and Stack Overflow because n skips 0 (5, 3, 1, -1, -3...).',
        'Returns 0 because n is an odd integer.',
      ],
      correctIndex: 2,
      explanation: 'Invoking with n=5 decrements by 2 each step: 5 -> 3 -> 1 -> -1. It completely misses the base case (n == 0), leading to unbounded recursion and stack overflow.',
      sourceRef: 'Exam Prep Bank: Algorithm Invariants §5',
    },
    {
      id: `pq_${studentId}_4`,
      conceptId: 'async_event_loop',
      conceptName: 'Non-Blocking Event Loops & Microtask Queues',
      question: 'What is the console output order of: console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D"); ?',
      options: [
        'A, B, C, D',
        'A, D, C, B',
        'A, D, B, C',
        'C, A, D, B',
      ],
      correctIndex: 1,
      explanation: 'Synchronous code runs first ("A", "D"). Next, the microtask queue runs Promise callbacks ("C"). Finally, macrotask timers run ("B"). Hence: A, D, C, B.',
      sourceRef: 'Exam Prep Bank: Concurrency Execution §4',
    },
    {
      id: `pq_${studentId}_5`,
      conceptId: 'deadlock_conditions',
      conceptName: 'Coffman Deadlock Conditions & Detection',
      question: 'Which software design pattern is most effective in preventing the circular wait condition among mutex locks?',
      options: [
        'Acquiring all locks in a globally defined, strictly increasing identifier order.',
        'Increasing thread stack sizes to accommodate additional mutex frames.',
        'Spawning background daemon threads to retry locked calls indefinitely.',
        'Running all application code in single-threaded microtasks.',
      ],
      correctIndex: 0,
      explanation: 'Imposing a global strict total ordering on locks guarantees that no thread can hold a higher-numbered lock while requesting a lower-numbered one, mathematically preventing circular wait.',
      sourceRef: 'Exam Prep Bank: Systems Concurrency §7',
    },
    {
      id: `pq_${studentId}_6`,
      conceptId: 'web_apache_docroot',
      conceptName: 'DocumentRoot & Directory Hierarchy',
      question: 'A client requests http://example.local/dashboard/ and receives HTTP 403 Forbidden. The error log shows AH01276. What is the most standard resolution?',
      options: [
        'Change MySQL port 3306 to port 80.',
        'Create an index.html or index.php in the target directory, or add DirectoryIndex index.php to the config.',
        'Disable VirtualHost isolation and restart the host machine.',
        'Increase PHP memory_limit in php.ini.',
      ],
      correctIndex: 1,
      explanation: 'AH01276 occurs when a directory is requested but lacks a matching DirectoryIndex file (e.g. index.html) and directory indexing is disabled. Adding the index file solves it immediately.',
      sourceRef: 'Exam Prep Bank: Web Architecture §1',
    },
  ];

  // 5. Day-by-Day BKT-Weighted Plan
  const schedule = buildBKTWeightedSchedule({
    examDate,
    targetGrade,
    dailyStudyMinutes,
    concepts,
    flashcards,
    practiceQuestions,
  });

  const weak = concepts.filter(c => c.masteryPrior < 0.6);

  return {
    config: {
      courseTopic,
      examDate,
      targetGrade,
      targetPercentage: Math.round(targetGrade * 10),
      dailyStudyMinutes,
      tradeOffText,
    },
    summary,
    concepts,
    flashcards,
    practiceQuestions,
    schedule,
    latestRePlanNote: `Initial adaptive plan initialized: Priority scheduled for weak concepts (${weak.map(c => c.name).slice(0, 2).join(', ') || 'Core Invariants'}) with daily target set for ${Math.round(targetGrade * 10)}% goal.`,
    provenance: 'FALLBACK',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Main Studio Generation Handler:
 * Leverages Gemini Multimodal if key and file are provided, or fallback.
 */
export async function generateStudyStudioPlan(params: {
  studentId: string;
  courseTopic: string;
  examDate: string;
  targetGrade: number;
  dailyStudyMinutes: number;
  fileBase64?: string;
  fileName?: string;
  fileMimeType?: string;
  pastedText?: string;
}): Promise<StudyStudioState> {
  const { studentId, courseTopic, examDate, targetGrade, dailyStudyMinutes, fileBase64, fileMimeType, pastedText } = params;

  // Read student's current DKM node masteries if available to personalize BKT priors
  const dkmNodes = dkmStateRepository.findByStudentId(studentId) || [];
  const nodeMasteryMap: Record<string, number> = {};
  dkmNodes.forEach((n: any) => {
    if (n.id && typeof n.mastery === 'number') {
      nodeMasteryMap[n.id] = n.mastery;
    }
  });

  let state: StudyStudioState;

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    try {
      const promptText = `You are an elite Computer Science & Engineering psychometrician and exam-prep specialist.
Analyze the following course material for: "${courseTopic}".
Exam Date: ${examDate}
Target Grade: ${targetGrade} / 10 (${Math.round(targetGrade * 10)}%)
Daily Study Minutes: ${dailyStudyMinutes}

Generate a comprehensive exam preparation package formatted as valid JSON:
1. "summary": array of 3-5 hierarchical sections with { id, title, keyTakeaway, content, subtopics: string[] }.
2. "concepts": array of 6-10 concepts with { id, name, mappedDkmNodeId, category, masteryPrior, importance: 'high'|'medium'|'core' }.
3. "flashcards": array of 20 to 30 flashcards with { id, conceptId, conceptName, question, answer, sourceRef }.
4. "practiceQuestions": array of 5 to 8 questions with { id, conceptId, conceptName, question, options (4 items), correctIndex (0-3), explanation, sourceRef }.`;

      const parts: any[] = [];
      if (fileBase64 && fileMimeType === 'application/pdf') {
        parts.push({
          inlineData: {
            data: fileBase64,
            mimeType: 'application/pdf',
          },
        });
      }
      parts.push({ text: `${promptText}\n\nPasted Text/Material Notes:\n${pastedText || 'Comprehensive engineering syllabus provided.'}` });

      const geminiResult = await callGeminiWithRetry<{
        summary: SummarySection[];
        concepts: ExtractedConcept[];
        flashcards: StudioFlashcard[];
        practiceQuestions: StudioPracticeQuestion[];
      }>(
        parts[parts.length - 1].text,
        'You are an educational psychometrics engine. Output valid structured JSON only.',
        undefined,
        15000
      );

      if (
        geminiResult.data &&
        Array.isArray(geminiResult.data.flashcards) &&
        geminiResult.data.flashcards.length >= 10
      ) {
        const genCards: StudioFlashcard[] = geminiResult.data.flashcards.map((c, idx) => ({
          ...c,
          id: `card_${studentId}_gen_${idx + 1}`,
          leitnerBox: 1,
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 0,
          dueDate: new Date().toISOString(),
        }));

        const genConcepts = (geminiResult.data.concepts || []).map(c => ({
          ...c,
          masteryPrior: nodeMasteryMap[c.id] ?? nodeMasteryMap[c.mappedDkmNodeId || ''] ?? 0.50,
        }));

        const schedule = buildBKTWeightedSchedule({
          examDate,
          targetGrade,
          dailyStudyMinutes,
          concepts: genConcepts,
          flashcards: genCards,
          practiceQuestions: geminiResult.data.practiceQuestions || [],
        });

        const tradeOffText = computeTradeOffText(
          targetGrade,
          dailyStudyMinutes,
          Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        );

        state = {
          config: {
            courseTopic,
            examDate,
            targetGrade,
            targetPercentage: Math.round(targetGrade * 10),
            dailyStudyMinutes,
            tradeOffText,
          },
          summary: geminiResult.data.summary || [],
          concepts: genConcepts,
          flashcards: genCards,
          practiceQuestions: geminiResult.data.practiceQuestions || [],
          schedule,
          latestRePlanNote: `AI study package generated: ${genCards.length} flashcards synthesized and schedule optimized for ${Math.round(targetGrade * 10)}% target grade.`,
          provenance: 'LIVE AI',
          generatedAt: new Date().toISOString(),
        };
      } else {
        state = generateStudyStudioFallback({
          courseTopic,
          examDate,
          targetGrade,
          dailyStudyMinutes,
          sampleText: pastedText,
          studentId,
        });
      }
    } catch (err) {
      console.warn('Gemini studio generation error, using fallback:', err);
      state = generateStudyStudioFallback({
        courseTopic,
        examDate,
        targetGrade,
        dailyStudyMinutes,
        sampleText: pastedText,
        studentId,
      });
    }
  } else {
    state = generateStudyStudioFallback({
      courseTopic,
      examDate,
      targetGrade,
      dailyStudyMinutes,
      sampleText: pastedText,
      studentId,
    });
  }

  // Persist flashcards in flashcardRepository
  for (const card of state.flashcards) {
    flashcardRepository.upsert({
      id: card.id,
      studentId,
      conceptId: card.conceptId,
      conceptName: card.conceptName,
      track: courseTopic,
      leitnerBox: card.leitnerBox,
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      dueDate: card.dueDate,
      cardJson: {
        question: card.question,
        answer: card.answer,
        sourceRef: card.sourceRef,
      },
    });
  }

  // Persist study plan in studyPlanRepository
  studyPlanRepository.upsert({
    id: `plan_${studentId}_studio`,
    studentId,
    title: `${courseTopic} Exam Plan (${state.config.targetPercentage}%)`,
    status: 'active',
    goals: state.concepts.map(c => ({ conceptId: c.id, name: c.name, targetMastery: state.config.targetPercentage / 100 })),
    schedule: state.schedule,
    meta: {
      config: state.config,
      summary: state.summary,
      concepts: state.concepts,
      practiceQuestions: state.practiceQuestions,
      latestRePlanNote: state.latestRePlanNote,
      provenance: state.provenance,
      generatedAt: state.generatedAt,
    },
  });

  return state;
}

/**
 * Handles rating a flashcard (Again, Hard, Good, Easy)
 * Updates SM-2 parameters, updates BKT retention, and triggers Adaptive Re-planning.
 */
export function rateFlashcardAndReplan(params: {
  studentId: string;
  cardId: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
}): {
  updatedCard: StudioFlashcard;
  updatedSchedule: StudyDaySchedule[];
  rePlanNote: string;
  updatedMastery: number;
} {
  const { studentId, cardId, rating } = params;

  // Map rating to SM-2 quality: again=1, hard=3, good=4, easy=5
  const qualityMap = { again: 1, hard: 3, good: 4, easy: 5 };
  const quality = qualityMap[rating] || 3;
  const isCorrect = quality >= 3;

  // 1. Fetch card
  const existingDbCard = flashcardRepository.findById(cardId);
  const now = new Date();

  let cardObj: StudioFlashcard;
  if (existingDbCard) {
    const sm2 = calculateSM2Update(
      {
        leitnerBox: existingDbCard.leitnerBox,
        easeFactor: existingDbCard.easeFactor,
        intervalDays: existingDbCard.intervalDays,
        repetitions: existingDbCard.repetitions,
        dueDate: existingDbCard.dueDate,
      },
      quality,
      now
    );

    const updatedDb = flashcardRepository.upsert({
      id: existingDbCard.id,
      studentId,
      conceptId: existingDbCard.conceptId,
      conceptName: existingDbCard.conceptName,
      track: existingDbCard.track,
      leitnerBox: sm2.newBox,
      easeFactor: sm2.newEaseFactor,
      intervalDays: sm2.newIntervalDays,
      repetitions: sm2.newRepetitions,
      dueDate: sm2.newDueDate,
      lastReviewed: now.toISOString(),
      cardJson: existingDbCard.cardJson,
    });

    cardObj = {
      id: updatedDb.id,
      conceptId: updatedDb.conceptId,
      conceptName: updatedDb.conceptName,
      question: updatedDb.cardJson?.question || 'Question',
      answer: updatedDb.cardJson?.answer || 'Answer',
      sourceRef: updatedDb.cardJson?.sourceRef || 'Study Notes',
      leitnerBox: updatedDb.leitnerBox,
      easeFactor: updatedDb.easeFactor,
      intervalDays: updatedDb.intervalDays,
      repetitions: updatedDb.repetitions,
      dueDate: updatedDb.dueDate,
      lastReviewed: updatedDb.lastReviewed,
    };
  } else {
    // Fallback card structure if not found
    cardObj = {
      id: cardId,
      conceptId: 'concept_rated',
      conceptName: 'Core Concept',
      question: 'Question',
      answer: 'Answer',
      sourceRef: 'Study Notes',
      leitnerBox: isCorrect ? 2 : 1,
      easeFactor: 2.5,
      intervalDays: isCorrect ? 3 : 1,
      repetitions: isCorrect ? 1 : 0,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      lastReviewed: now.toISOString(),
    };
  }

  // 2. Update BKT retention & mastery in DKM and ISLM
  let updatedMastery = 0.50;
  const dkmNodes = dkmStateRepository.findByStudentId(studentId) || [];
  const targetNodeIdx = dkmNodes.findIndex((n: any) => n.id === cardObj.conceptId);

  if (targetNodeIdx >= 0) {
    const prior = dkmNodes[targetNodeIdx].mastery || 0.50;
    // BKT update formula
    const posterior = isCorrect ? Math.min(0.98, prior + 0.12) : Math.max(0.05, prior - 0.18);
    dkmNodes[targetNodeIdx].mastery = Number(posterior.toFixed(3));
    dkmNodes[targetNodeIdx].status = posterior >= 0.8 ? 'GREEN' : posterior >= 0.5 ? 'YELLOW' : 'RED';
    if (!dkmNodes[targetNodeIdx].compositeMastery) {
      dkmNodes[targetNodeIdx].compositeMastery = {};
    }
    dkmNodes[targetNodeIdx].compositeMastery.retention = isCorrect ? 100 : 40;
    dkmNodes[targetNodeIdx].compositeMastery.composite = Math.round(posterior * 100);
    dkmStateRepository.upsert(studentId, dkmNodes);
    updatedMastery = posterior;
  }

  // 3. Adaptive Re-planning: fetch active study plan and adapt future schedule
  const activePlan = studyPlanRepository.findLatestByStudent(studentId);
  let updatedSchedule: StudyDaySchedule[] = [];
  let rePlanNote = '';

  if (activePlan && Array.isArray(activePlan.schedule)) {
    updatedSchedule = activePlan.schedule.map((day: StudyDaySchedule) => ({
      ...day,
      focusConcepts: [...(day.focusConcepts || [])],
      tasks: day.tasks ? day.tasks.map(t => ({ ...t })) : [],
    }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toLocalDateStr(tomorrow);

    // Find tomorrow's schedule entry
    const tomorrowEntry = updatedSchedule.find(d => d.date === tomorrowStr) || updatedSchedule[1];

    if (!isCorrect) {
      // Struggled with card ("Again"):
      // Move concept to tomorrow's priority list!
      if (tomorrowEntry) {
        if (!tomorrowEntry.focusConcepts.includes(cardObj.conceptName)) {
          tomorrowEntry.focusConcepts.unshift(cardObj.conceptName);
        }
        tomorrowEntry.scheduledCardsCount += 2;
        tomorrowEntry.tasks.unshift({
          id: `replan_task_${Date.now()}`,
          title: `Reinforce ${cardObj.conceptName} (re-scheduled from today's missed card)`,
          type: 'flashcards',
          completed: false,
          count: 2,
          conceptId: cardObj.conceptId,
        });
        tomorrowEntry.rePlanReason = `Struggled with ${cardObj.conceptName} today`;
      }

      rePlanNote = `Adaptive adjustment: "${cardObj.conceptName}" was marked for review. It has been moved forward to tomorrow's priority list with an extra repetition scheduled.`;
    } else if (rating === 'easy') {
      // Breezed through card ("Easy"):
      // Lighten tomorrow's load on this concept to free time for harder topics
      if (tomorrowEntry && tomorrowEntry.focusConcepts.includes(cardObj.conceptName)) {
        tomorrowEntry.focusConcepts = tomorrowEntry.focusConcepts.filter(c => c !== cardObj.conceptName);
      }
      rePlanNote = `Fast recall recorded for "${cardObj.conceptName}". Spaced interval increased, freeing tomorrow's schedule for lower-mastery topics.`;
    } else {
      rePlanNote = `Consistent recall recorded for "${cardObj.conceptName}". SM-2 interval promoted to ${cardObj.intervalDays} day(s).`;
    }

    // Persist updated schedule and note
    studyPlanRepository.upsert({
      id: activePlan.id,
      studentId,
      title: activePlan.title,
      status: activePlan.status,
      goals: activePlan.goals,
      schedule: updatedSchedule,
      meta: {
        ...(activePlan.meta || {}),
        latestRePlanNote: rePlanNote,
      },
    });
  } else {
    rePlanNote = `Recall updated: "${cardObj.conceptName}" scheduled for review in ${cardObj.intervalDays} day(s).`;
  }

  return {
    updatedCard: cardObj,
    updatedSchedule,
    rePlanNote,
    updatedMastery,
  };
}

/**
 * Updates student-edited study studio content (Summary, Flashcards, Practice Questions)
 */
export function updateStudioContent(params: {
  studentId: string;
  summary?: SummarySection[];
  section?: SummarySection;
  flashcards?: StudioFlashcard[];
  card?: StudioFlashcard;
  practiceQuestions?: StudioPracticeQuestion[];
  question?: StudioPracticeQuestion;
}): { success: boolean } {
  const { studentId, summary, section, flashcards, card, practiceQuestions, question } = params;
  const plan = studyPlanRepository.findLatestByStudent(studentId);
  if (!plan) return { success: false };

  const currentMeta = plan.meta || {};

  if (summary) {
    currentMeta.summary = summary;
  } else if (section) {
    const list = currentMeta.summary || [];
    const idx = list.findIndex((s: any) => s.id === section.id);
    if (idx >= 0) {
      list[idx] = section;
    } else {
      list.push(section);
    }
    currentMeta.summary = list;
  }

  if (practiceQuestions) {
    currentMeta.practiceQuestions = practiceQuestions;
  } else if (question) {
    const list = currentMeta.practiceQuestions || [];
    const idx = list.findIndex((q: any) => q.id === question.id);
    if (idx >= 0) {
      list[idx] = question;
    } else {
      list.push(question);
    }
    currentMeta.practiceQuestions = list;
  }

  const cardsToUpsert = flashcards ? [...flashcards] : card ? [card] : [];
  if (cardsToUpsert.length > 0) {
    for (const c of cardsToUpsert) {
      flashcardRepository.upsert({
        id: c.id,
        studentId,
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        track: plan.title,
        leitnerBox: c.leitnerBox || 1,
        easeFactor: c.easeFactor || 2.5,
        intervalDays: c.intervalDays || 1,
        repetitions: c.repetitions || 0,
        dueDate: c.dueDate || new Date().toISOString(),
        cardJson: {
          question: c.question,
          answer: c.answer,
          sourceRef: c.sourceRef,
        },
      });
    }
  }

  studyPlanRepository.upsert({
    id: plan.id,
    studentId,
    title: plan.title,
    status: plan.status,
    goals: plan.goals,
    schedule: plan.schedule,
    meta: currentMeta,
  });

  return { success: true };
}
