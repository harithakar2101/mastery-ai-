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
  } = params;

  const isSandbox = workflow === 'CODE_SANDBOX_TUTORING';
  const payload = {
    workflow,
    student_id: studentId,
    course_track: selectedNode.track,
    current_topic: selectedNode.name,
    visualizer_mode: visualizerMode,
    language,
    islm_profile: {
      overall_mastery: islm.overall_mastery,
      topic_mastery: islm.topic_mastery,
      recent_misconceptions: islm.recent_misconceptions,
      scaffolding_tier_required: islm.scaffolding_tier_required,
    },
    student_input: studentInput,
    code_snippet: isSandbox ? codeSnippet || selectedNode.starterCodeSnippet : codeSnippet || '',
    execution_logs: isSandbox ? executionLogs || selectedNode.starterErrorLog : executionLogs || '',
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
      throw new Error(`HTTP error ${response.status}`);
    }

    const data: TutoringResponse = await response.json();
    return data;
  } catch (err: any) {
    console.warn('Tutoring engine client timeout/error, engaging fallback:', err?.message || err);

    return {
      workflow,
      diagnosis: {
        issue_type: 'CONCEPTUAL_GAP',
        identified_gap: 'Algorithmic Problem-Solving & Step-by-Step Breakdown',
        confidence_score: 0.95,
      },
      scaffolding_response: {
        current_tier: 1,
        refusal_reason: '',
        tutor_message: `Let's break down this concept from first principles: "${studentInput}". What initial hypothesis do you have about how the program or system should behave here?`,
        socratic_question: 'What is the expected output or state change you want to achieve at this step?',
      },
      visualizer_data: {
        mode: 'Text Response',
        structure: { nodes: [], edges: [] },
      },
      islm_updates: {
        updated_topic_mastery: { [selectedNode.name]: islm.overall_mastery },
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
        scaffolding_fading_index: islm.scaffolding_fading_index,
        estimated_time_to_resolution_mins: 2,
        error_recurrence_drop: '25%',
      },
      source: 'fallback',
      fallback_reason: 'Client 30s timeout or offline network condition',
    };
  }
}
