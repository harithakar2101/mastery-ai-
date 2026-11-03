import { GoogleGenAI, Type } from '@google/genai';
import {
  getTutoringFallback,
  getVideoFallback,
  getMockTestFallback,
  getLibraryVaultFallback,
  getVariantFallback,
  getLiveTranscriptFallback,
  getInterventionSuggestionsFallback,
} from './fallbacks.ts';

const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

export function cleanErrorMessage(err: any): string {
  if (!err) return 'Gemini API high load or offline; local Socratic fallback engaged';
  const str = typeof err === 'string' ? err : err.message || String(err);
  try {
    const parsed = JSON.parse(str);
    if (parsed.error?.message) {
      return `Gemini API: ${parsed.error.message}`;
    }
  } catch {
    // not json
  }
  if (str.includes('503') || str.includes('high demand') || str.includes('UNAVAILABLE')) {
    return 'Gemini service high demand; local Socratic fallback engaged';
  }
  return str;
}

if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY' && geminiApiKey.trim().length > 10) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// 10-second server-side timeout with single retry on failure
export async function callGeminiWithRetry<T>(
  prompt: string,
  systemInstruction?: string,
  responseSchema?: any,
  timeoutMs = 10000
): Promise<{ data: T | null; error: string | null }> {
  if (!aiClient) {
    return { data: null, error: 'GEMINI_API_KEY is not configured or invalid' };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const singleAttempt = async (): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          responseMimeType: 'application/json',
          ...(responseSchema ? { responseSchema } : {}),
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timer);

      const text = response.text;
      if (!text) {
        throw new Error('Empty text received from Gemini API');
      }

      return JSON.parse(text.trim()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  };

  // Attempt 1
  try {
    const data = await singleAttempt();
    return { data, error: null };
  } catch (err1: any) {
    console.warn(`[Gemini Attempt 1 Failed]: ${err1?.message || err1}. Retrying once...`);
    // Attempt 2 (Retry once on failure)
    try {
      const data = await singleAttempt();
      return { data, error: null };
    } catch (err2: any) {
      console.warn(`[Gemini Attempt 2 Failed]: ${err2?.message || err2}. Engaging fallback.`);
      return { data: null, error: err2?.message || String(err2) };
    }
  }
}

// Schemas using Type from @google/genai
const TUTORING_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    workflow: { type: Type.STRING },
    diagnosis: {
      type: Type.OBJECT,
      properties: {
        issue_type: { type: Type.STRING },
        identified_gap: { type: Type.STRING },
        confidence_score: { type: Type.NUMBER },
      },
      required: ['issue_type', 'identified_gap', 'confidence_score'],
    },
    scaffolding_response: {
      type: Type.OBJECT,
      properties: {
        current_tier: { type: Type.INTEGER },
        refusal_reason: { type: Type.STRING },
        tutor_message: { type: Type.STRING },
        socratic_question: { type: Type.STRING },
      },
      required: ['current_tier', 'tutor_message', 'socratic_question'],
    },
    visualizer_data: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING },
      },
    },
    islm_updates: {
      type: Type.OBJECT,
      properties: {
        increment_error_count: { type: Type.BOOLEAN },
        next_scaffolding_tier: { type: Type.INTEGER },
      },
    },
    content_hooks: {
      type: Type.OBJECT,
      properties: {
        trigger_ai_video: { type: Type.BOOLEAN },
        flag_for_mock_test: { type: Type.BOOLEAN },
      },
    },
    research_telemetry: {
      type: Type.OBJECT,
      properties: {
        scaffolding_fading_index: { type: Type.NUMBER },
        estimated_time_to_resolution_mins: { type: Type.NUMBER },
        error_recurrence_drop: { type: Type.STRING },
      },
    },
  },
  required: ['diagnosis', 'scaffolding_response'],
};

const VIDEO_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    concept: { type: Type.STRING },
    duration_secs: { type: Type.INTEGER },
    key_takeaway: { type: Type.STRING },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scene_num: { type: Type.INTEGER },
          time_range: { type: Type.STRING },
          title: { type: Type.STRING },
          visual_description: { type: Type.STRING },
          narration: { type: Type.STRING },
          animation_type: { type: Type.STRING },
          visual_elements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['scene_num', 'time_range', 'title', 'narration'],
      },
    },
  },
  required: ['title', 'scenes', 'key_takeaway'],
};

const MOCK_TEST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    test_id: { type: Type.STRING },
    title: { type: Type.STRING },
    time_limit_mins: { type: Type.INTEGER },
    total_questions: { type: Type.INTEGER },
    negative_marking_rate: { type: Type.NUMBER },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          topic_id: { type: Type.STRING },
          topic_name: { type: Type.STRING },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correct_option_index: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          distractor_explanations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['id', 'topic_name', 'question', 'options', 'correct_option_index', 'explanation'],
      },
    },
  },
  required: ['test_id', 'title', 'questions'],
};

const LIBRARY_PROCESS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    extracted_concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          concept_id: { type: Type.STRING },
          name: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          prerequisites: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          frequent_misconception: { type: Type.STRING },
        },
        required: ['concept_id', 'name', 'difficulty', 'frequent_misconception'],
      },
    },
    recommended_socratic_drills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          drill_id: { type: Type.STRING },
          prompt: { type: Type.STRING },
          concept_mapped: { type: Type.STRING },
          socratic_tier: { type: Type.INTEGER },
        },
        required: ['drill_id', 'prompt', 'concept_mapped'],
      },
    },
    suggested_video_topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['summary', 'extracted_concepts', 'recommended_socratic_drills'],
};

const SOCRATIC_SYSTEM_INSTRUCTION = `You are the central pedagogical AI engine for CogniCSE, an Intelligent 1-on-1 Learning Support System for Computer Science & Engineering (CSE) and Mechanical Engineering (CAD) students.
Your primary objective is to continuously diagnose student knowledge gaps, misconceptions, and practical execution errors, maintain a persistent Individual Student Learning Model (ISLM), enforce progressive Socratic scaffolding, and prove independent problem-solving improvement without directly giving away code, parametric values, or final answers.

You must NEVER simply output direct solutions, complete written code blocks, final CAD dimensions, or full written assignments. You operate strictly as a real-time, empathetic, and highly structured technical tutor using hints, diagnostic questions, sandbox error mapping, and visual learning modes.

CRITICAL RULES:
1. 4-Tier Socratic Guardrails (Teacher-visible 5-hint ladders from the source are merged into 4 tiers; the old "full explanation" tier becomes Tier 4 direct-line guidance without the final answer):
   - Tier 1 (Metacognitive Hint): Point out the general area, degree of freedom, or logic flaw. Hints must NAME THE CONCEPT (e.g. "degrees of freedom", "coaxial datum", "shear stress", "volume vs mass density", "FOS margin"), NEVER target numerical values. Ask a reflective question.
   - Tier 2 (Conceptual Guidance): Explain the underlying concept or engineering relationship (e.g. m = rho * V with 1 cm³ = 1000 mm³, FOS = yield / max_stress >= 2.0, G1 slope tangency) and provide a generic, non-identical pattern. Do not reveal target values.
   - Tier 3 (Socratic Micro-Drill): Provide a single-line diagnostic prompt or micro-quiz to isolate the missing constraint, unit factor, or geometry relationship.
   - Tier 4 (Direct Line Guidance): Highlight the specific entity, sketch constraint, or parameter causing the issue and explain the exact mechanical/computational mechanism, but force the student to write/apply the actual fix themselves without giving the final answer or code.
2. Anti-Answer Protocol:
   - If a student asks for the answer, complete code, exact dimension, or direct fix: REFUSE direct answers. State: "I'm here to help you master this step-by-step so you can solve it independently! Let's break down where you're currently stuck." Then provide a Tier 1 or Tier 2 hint.
3. Diagnose issue_type into:
   - 'CONCEPTUAL_GAP'
   - 'MISCONCEPTION'
   - 'PRACTICAL_EXECUTION_ERROR'
   - 'cad_constraint_error' (e.g. unconstrained blue sketch geometry with free DOF, over-constrained loops, missing tangency/coincidence)
   - 'cad_tolerance_mismatch' (e.g. hub/bore eccentric runout, unit scale mismatch mm vs cm, FOS < 2.0, confusing volume with mass)
4. Specific CAD Misconceptions & Corrective Strategies:
   - Extruding an under-constrained (blue) sketch assuming it is finished (frequency 82%): In Fusion 360/SolidWorks, blue lines signify free translational or rotational degrees of freedom (0 DOF = black). Extruding blue sketches leads to unpredictable model distortion during parametric revisions. Guide student to anchor points to datum/origin with Coincident and apply non-redundant constraints.
   - Confusing volume with mass: Mass = density * volume (m = rho * V). 1 cm³ = 1000 mm³. Differentiate geometric spatial volume from physical mass across materials (e.g. 1018 Steel 7.85 g/cm³ vs 6061 Aluminum 2.70 g/cm³).
   - Assuming a low FOS is acceptable: FOS = yield_strength / max_stress. Engineering standards mandate target FOS >= 2.0 for ductile static machinery to prevent plastic deformation and account for dynamic shock. Adding internal transition fillets (R >= 2.5-3mm) relieves peak Von Mises stress concentrations.
   - Mixing mm and cm units: Standardize on millimeters (mm) per ISO/ASME mechanical standards. Entering 10 without units into cm documents causes 10x scale errors.
5. Output valid JSON matching the exact schema specified.`;

export async function processTutoringRequest(tutorReq: any) {
  const isGreeting = /^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening)|yo|hola|start|sup|welcome)(\s+.*)?$/i.test(
    (tutorReq.student_input || '').trim()
  );

  if (isGreeting) {
    const fallback = getTutoringFallback(tutorReq);
    return { ...fallback, source: 'gemini' as const, fallback_reason: null };
  }

  const langInstruction =
    tutorReq.language === 'ta'
      ? '\nLANGUAGE DIRECTIVE: Student requested Tamil. Respond in natural Tamil, but KEEP all code snippets, programming keywords, syntax, function names, and technical terms strictly in English.'
      : tutorReq.language === 'hi'
      ? '\nLANGUAGE DIRECTIVE: Student requested Hindi. Respond in natural Hindi, but KEEP all code snippets, programming keywords, syntax, function names, and technical terms strictly in English.'
      : '';

  const prompt = `Input Context:
${JSON.stringify(tutorReq, null, 2)}

Diagnose student knowledge gaps and provide Socratic guidance adhering strictly to the Anti-Answer protocol.${langInstruction}`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    SOCRATIC_SYSTEM_INSTRUCTION,
    TUTORING_RESPONSE_SCHEMA,
    25000
  );

  if (data && data.scaffolding_response) {
    return { ...data, source: 'gemini' as const, fallback_reason: null };
  }

  const fallback = getTutoringFallback(tutorReq);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processVideoRequest(topic: string, misconception: string, track: string) {
  const prompt = `Generate a 60-second animated educational video storyboard script for Computer Science or Mechanical Engineering (CAD) students explaining "${topic || 'Engineering Concept'}" (${track || 'Engineering'}) and debunking the misconception: "${misconception || 'Common misconception'}".`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are an award-winning CSE and Mechanical Engineering pedagogical content animator creating concise, visually rich 60-second micro-learning video storyboards.',
    VIDEO_RESPONSE_SCHEMA,
    10000
  );

  if (data && data.scenes) {
    return { ...data, source: 'gemini' as const, fallback_reason: null };
  }

  const fallback = getVideoFallback(topic, misconception);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processMockTestRequest(track: string, redNodes: string[], difficulty: string) {
  const isMech =
    track === 'Mechanical Engineering (CAD)' ||
    (track && (track.toLowerCase().includes('mech') || track.toLowerCase().includes('cad')));
  const subjectName = isMech ? 'Mechanical Engineering (CAD)' : (track || 'CSE Core');

  const prompt = `Generate a 5-question adaptive assessment for ${subjectName} students focusing on problematic topics: ${JSON.stringify(redNodes || [])} at difficulty: "${difficulty || 'INTERMEDIATE'}". Include deep distractor explanations. If CAD, include topics like Degrees of Freedom (blue vs black sketches), geometric constraints, mm vs cm units, volume vs mass, and FOS >= 2.0.`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are a senior technical academic examiner producing rigorous, high-fidelity mock test items with deep distractor analyses.',
    MOCK_TEST_SCHEMA,
    10000
  );

  if (data && data.questions) {
    return { ...data, source: 'gemini' as const, fallback_reason: null };
  }

  const fallback = getMockTestFallback(track);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processLibraryRequest(documentTitle: string, textContent: string, subjectTrack: string) {
  const prompt = `Analyze this engineering study document titled "${documentTitle || 'Engineering Notes'}" (${subjectTrack || 'General Engineering'}).
Document excerpt:
"""
${(textContent || '').slice(0, 4000)}
"""

Extract structured pedagogical insights for the Individual Student Learning Model (ISLM).`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are a curriculum analyst extracting concept ontologies and cognitive traps for an adaptive intelligent tutoring system.',
    LIBRARY_PROCESS_SCHEMA,
    10000
  );

  if (data && data.extracted_concepts) {
    return { ...data, source: 'gemini' as const, fallback_reason: null };
  }

  const fallback = getLibraryVaultFallback(documentTitle, subjectTrack);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processVariantRequest(
  conceptId?: string,
  conceptName?: string,
  track?: string,
  language?: string
) {
  const isMech =
    track === 'Mechanical Engineering (CAD)' ||
    (conceptId && conceptId.startsWith('cad_'));

  const prompt = `Generate a transfer variant problem for the concept "${conceptName || conceptId || 'Core Concept'}" (${track || 'Engineering'}).
The variant must evaluate the EXACT SAME skill or misconception, but with DIFFERENT parameters, numbers, or domain context so the student demonstrates independent mastery.
Language: ${language || 'javascript'}.
Return JSON containing title, prompt, description, code, and test cases.`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are an intelligent tutoring assessment designer crafting transfer problems that test identical cognitive skills with fresh parameters.',
    undefined,
    10000
  );

  if (data && data.title && data.code) {
    return {
      ...data,
      id: `var_${Date.now()}`,
      conceptId: conceptId || data.conceptId || 'concept_variant',
      source: 'gemini' as const,
      fallback_reason: null,
    };
  }

  const fallback = getVariantFallback(conceptId, track, language);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processLiveTranscriptRequest(
  transcript: string,
  track?: string,
  topicId?: string
) {
  const prompt = `Extract a lecture timeline and pedagogical check questions from the following lecture transcript or notes:
Track: ${track || 'Engineering'}
Topic: ${topicId || 'Core'}
Transcript:
"""
${(transcript || '').slice(0, 4000)}
"""

Extract an array of timeline items. Each timeline item represents a milestone concept and must include:
- id: string
- timeOffset: string (e.g. "05:00")
- conceptId: string
- conceptName: string
- summary: string
- questions: array of exactly 2 check questions. Each question must include:
  - id: string
  - conceptId: string
  - conceptName: string
  - question: string
  - options: array of 4 distinct choices
  - correctIndex: number (0 to 3)
  - explanation: string
  - misconceptionMap: object mapping wrong option indexes to specific cognitive misconceptions.
Return JSON with key { timeline: [...] }.`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are an expert pedagogical curriculum designer extracting real-time concept milestones and diagnostic check questions for live lectures.',
    undefined,
    10000
  );

  if (data && Array.isArray(data.timeline) && data.timeline.length > 0) {
    return {
      ...data,
      source: 'gemini' as const,
      fallback_reason: null,
    };
  }

  const fallback = getLiveTranscriptFallback(transcript, track, topicId);
  return {
    ...fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

export async function processInterventionSuggestionsRequest(
  students: any[],
  dkmNodes?: any[]
) {
  const atRiskStudents = students.filter(s => {
    const redCount = Object.values(s.topic_mastery || {}).filter((v: any) => Number(v) < 0.5).length;
    return redCount >= 3 || (s.overall_mastery || 0) < 0.40;
  });

  const prompt = `Analyze at-risk student telemetry and suggest targeted pedagogical interventions:
At-risk count: ${atRiskStudents.length}
Students summary: ${JSON.stringify(
    atRiskStudents.map(s => ({
      id: s.student_id,
      name: s.name,
      overall: s.overall_mastery,
      fading: s.scaffolding_fading_index,
      misconceptions: s.recent_misconceptions,
      errors: s.error_count,
    }))
  )}

Return a JSON array of intervention objects with:
- id: string
- studentId: string
- studentName: string
- conceptId: string
- conceptName: string
- severity: 'high' | 'medium' | 'low'
- issueType: string
- suggestedAction: string
- rationale: string
- tutorMessage: string
- socraticQuestion: string
- status: 'pending'
- outcome: 'pending'
- createdAt: string (ISO)`;

  const { data, error } = await callGeminiWithRetry<any>(
    prompt,
    'You are an automated pedagogical intervention advisor for university professors.',
    undefined,
    10000
  );

  if (Array.isArray(data) && data.length > 0) {
    return {
      interventions: data,
      source: 'gemini' as const,
      fallback_reason: null,
    };
  }

  const fallback = getInterventionSuggestionsFallback(students, dkmNodes);
  return {
    interventions: fallback,
    source: 'fallback' as const,
    fallback_reason: cleanErrorMessage(error),
  };
}

