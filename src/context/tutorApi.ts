import { TutoringResponse, VisualizerMode, ISLMProfile, DKMNode } from '../types';

export interface TutoringParams {
  studentInput: string;
  studentId: string;
  selectedNode: DKMNode;
  visualizerMode: VisualizerMode;
  islm: ISLMProfile;
  codeSnippet?: string;
  executionLogs?: string;
  workflow?: 'CODE_SANDBOX_TUTORING' | 'CHATS' | 'CAD_LAB_TUTORING';
  language?: string;
  history?: Array<{ sender: string; text: string; timestamp?: string }>;
}

export function synthesizeQuestionAwareFallback(
  studentInput: string,
  selectedNode: DKMNode
): { tutorMessage: string; socraticQuestion: string } {
  const qLower = `${studentInput} ${selectedNode.name || ''} ${selectedNode.keyConcept || ''}`.toLowerCase();

  if (qLower.includes('port') || qLower.includes('mysql') || qLower.includes('pdo') || qLower.includes('socket')) {
    return {
      tutorMessage: `In distributed web architecture, network daemons bind to distinct TCP ports. When configuring database connection strings, what distinguishes the database listener port from the web server HTTP port?`,
      socraticQuestion: `What default port does MySQL listen on (e.g. 3306) versus Apache (80/443)?`,
    };
  }

  if (qLower.includes('recurs') || qLower.includes('base case') || qLower.includes('stack') || qLower.includes('factorial')) {
    return {
      tutorMessage: `Every recursive function pushes an activation record onto the thread call stack. For the recursion to terminate safely before breaching memory limits, what boundary condition must return immediately without calling itself?`,
      socraticQuestion: `What base case condition ensures the function halts when n reaches 0 or 1?`,
    };
  }

  if (qLower.includes('cad') || qLower.includes('constraint') || qLower.includes('dof') || qLower.includes('sketch') || qLower.includes('fillet')) {
    return {
      tutorMessage: `In 2D parametric sketching, unconstrained geometric entities retain translational or rotational degrees of freedom. Which geometric constraint will lock the geometry without triggering an over-constrained conflict?`,
      socraticQuestion: `Are your sketch curves fully defined with concentric, coincident, or dimension constraints?`,
    };
  }

  if (qLower.includes('deadlock') || qLower.includes('mutex') || qLower.includes('thread') || qLower.includes('race')) {
    return {
      tutorMessage: `Concurrent race conditions and deadlocks occur when threads request resources in inconsistent hierarchical orders. How can a strict global lock acquisition protocol prevent circular wait conditions?`,
      socraticQuestion: `Can you trace which lock is currently held by Thread 1 while attempting to acquire Thread 2's mutex?`,
    };
  }

  if (qLower.includes('null') || qLower.includes('undefined') || qLower.includes('pointer') || qLower.includes('dereferenc')) {
    return {
      tutorMessage: `Dereferencing an unallocated pointer or reading attributes of an undefined variable triggers memory faults. What guard check or optional access pattern can ensure the reference is valid before reading properties?`,
      socraticQuestion: `Can you place an explicit null check or optional chaining (?.) before accessing nested properties?`,
    };
  }

  return {
    tutorMessage: `Let's break down this engineering concept from first principles: "${studentInput}". What is your working hypothesis about how this system or algorithm should execute?`,
    socraticQuestion: `What specific intermediate output or state transition are you expecting at this point?`,
  };
}

export async function requestTutoringApi(params: TutoringParams): Promise<TutoringResponse> {
  const {
    studentInput,
    studentId,
    selectedNode,
    visualizerMode,
    islm,
    codeSnippet,
    executionLogs,
    workflow = 'CODE_SANDBOX_TUTORING',
    language = 'en',
    history = [],
  } = params;

  const isSandbox = workflow === 'CODE_SANDBOX_TUTORING';
  const payload = {
    workflow,
    student_id: studentId,
    course_track: selectedNode.track,
    current_topic: selectedNode.name,
    visualizer_mode: visualizerMode,
    language,
    tier: islm.scaffolding_tier_required || 1,
    islm_profile: {
      overall_mastery: islm.overall_mastery,
      topic_mastery: islm.topic_mastery,
      recent_misconceptions: islm.recent_misconceptions,
      scaffolding_tier_required: islm.scaffolding_tier_required,
      frequent_cognitive_misconception: islm.frequent_cognitive_misconception,
    },
    student_input: studentInput,
    code_snippet: isSandbox ? codeSnippet || selectedNode.starterCodeSnippet : codeSnippet || '',
    execution_logs: isSandbox ? executionLogs || selectedNode.starterErrorLog : executionLogs || '',
    history: history.slice(-10),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('/api/tutoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg = errorBody?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`HTTP_${response.status}: ${errorMsg}`);
    }

    const data: TutoringResponse = await response.json();
    return data;
  } catch (err: any) {
    console.warn('Tutoring engine client exception, engaging question-aware Socratic fallback:', err?.message || err);

    let mappedReason = 'Client timeout or offline network condition';
    const errText = String(err?.message || err);

    if (errText.includes('HTTP_401')) {
      mappedReason = 'Authentication expired (HTTP 401). Local Socratic fallback active.';
    } else if (errText.includes('HTTP_429')) {
      mappedReason = 'Daily AI quota or rate limit exceeded (HTTP 429). Local Socratic mentor engaged.';
    } else if (errText.includes('HTTP_400')) {
      mappedReason = 'Payload validation check (HTTP 400). Local Socratic tutor engaged.';
    } else if (errText.includes('HTTP_500') || errText.includes('HTTP_503')) {
      mappedReason = 'Gemini service unavailable / high demand (HTTP 500/503). Local Socratic fallback engaged.';
    }

    const synthesized = synthesizeQuestionAwareFallback(studentInput, selectedNode);

    return {
      workflow,
      diagnosis: {
        issue_type: 'CONCEPTUAL_GAP',
        identified_gap: selectedNode.name || 'Algorithmic Problem-Solving & Step-by-Step Breakdown',
        confidence_score: 0.95,
      },
      scaffolding_response: {
        current_tier: islm.scaffolding_tier_required || 1,
        refusal_reason: '',
        tutor_message: synthesized.tutorMessage,
        socratic_question: synthesized.socraticQuestion,
      },
      visualizer_data: {
        mode: visualizerMode || 'Text Response',
        structure: { nodes: [], edges: [] },
      },
      islm_updates: {
        updated_topic_mastery: { [selectedNode.name]: islm.overall_mastery ?? 0.6 },
        memory_tree_node_status: {
          node_id: selectedNode.id,
          node_name: selectedNode.name,
          status: 'YELLOW',
        },
        increment_error_count: false,
        next_scaffolding_tier: 1,
      },
      content_hooks: {
        trigger_ai_video: false,
        flag_for_mock_test: false,
      },
      research_telemetry: {
        scaffolding_fading_index: islm.scaffolding_fading_index ?? 0.5,
        estimated_time_to_resolution_mins: 2,
        error_recurrence_drop: '25%',
      },
      source: 'fallback',
      fallback_reason: mappedReason,
    };
  }
}
