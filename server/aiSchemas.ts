import { z } from 'zod';

export const tutoringResponseZodSchema = z.object({
  workflow: z.string().optional(),
  diagnosis: z.object({
    issue_type: z.string(),
    identified_gap: z.string(),
    confidence_score: z.number(),
  }),
  scaffolding_response: z.object({
    current_tier: z.number(),
    refusal_reason: z.string().optional().nullable(),
    tutor_message: z.string(),
    socratic_question: z.string(),
  }),
  visualizer_data: z.record(z.string(), z.any()).optional().nullable(),
  islm_updates: z.record(z.string(), z.any()).optional().nullable(),
  content_hooks: z.record(z.string(), z.any()).optional().nullable(),
  research_telemetry: z.record(z.string(), z.any()).optional().nullable(),
});

export const videoSceneZodSchema = z.object({
  scene_num: z.number(),
  time_range: z.string().optional(),
  duration: z.number().optional(),
  on_screen_text: z.string().optional(),
  visual_type: z.string().optional(),
  title: z.string(),
  visual_description: z.string().optional(),
  narration: z.string(),
  animation_type: z.string().optional(),
  visual_elements: z.array(z.string()).optional(),
});

export const videoResponseZodSchema = z.object({
  title: z.string(),
  concept: z.string().optional(),
  duration_secs: z.number().optional(),
  key_takeaway: z.string().optional(),
  scenes: z.array(videoSceneZodSchema).min(1),
});

export const mockTestQuestionZodSchema = z.object({
  id: z.string(),
  topic_name: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correct_option_index: z.number(),
  explanation: z.string(),
  distractor_explanations: z.array(z.string()).optional(),
});

export const mockTestZodSchema = z.object({
  test_id: z.string().optional(),
  title: z.string(),
  questions: z.array(mockTestQuestionZodSchema).min(1),
});

export const libraryVaultZodSchema = z.object({
  summary: z.string(),
  extracted_concepts: z.array(z.object({
    concept_id: z.string(),
    name: z.string(),
    difficulty: z.string(),
    frequent_misconception: z.string(),
  })).min(1),
  recommended_socratic_drills: z.array(z.any()).optional(),
  suggested_video_topics: z.array(z.string()).optional(),
});

export const variantTaskZodSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  description: z.string().optional(),
  code: z.string(),
  testCases: z.array(z.any()).optional(),
});

export const studyStudioZodSchema = z.object({
  summary: z.object({
    title: z.string(),
    overview: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string(),
      keyPoints: z.array(z.string()).optional(),
    })).min(1),
  }),
  concepts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    mappedDkmId: z.string().optional(),
    difficulty: z.string().optional(),
  })).min(1),
  flashcards: z.array(z.object({
    id: z.string().optional(),
    conceptId: z.string(),
    front: z.string(),
    back: z.string(),
    sourceRef: z.string().optional(),
  })).min(1),
  practiceQuestions: z.array(z.object({
    id: z.string().optional(),
    conceptId: z.string(),
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctIndex: z.number(),
    explanation: z.string(),
  })).min(1),
});
