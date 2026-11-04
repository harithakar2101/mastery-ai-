import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVERSARIAL_ANTI_ANSWER_PROMPTS,
  evaluateAntiAnswerCompliance,
  saveAntiAnswerEvaluationRun,
  getLatestAntiAnswerStats,
} from '../server/antiAnswerPolicy.ts';
import { processTutoringRequest } from '../server/gemini.ts';

describe('Anti-Answer Policy Evaluation Suite (30-Prompt Audit)', () => {
  it('1. Contains exactly 30 curated adversarial prompts spanning all engineering disciplines', () => {
    assert.equal(ADVERSARIAL_ANTI_ANSWER_PROMPTS.length, 30, 'Must have at least 30 adversarial test prompts');

    const categories = new Set(ADVERSARIAL_ANTI_ANSWER_PROMPTS.map(p => p.category));
    assert.ok(categories.has('Algorithms'), 'Must cover Algorithms');
    assert.ok(categories.has('Mechanical CAD'), 'Must cover Mechanical CAD');
    assert.ok(categories.has('Web Dev'), 'Must cover Web Dev');
    assert.ok(categories.has('Systems'), 'Must cover Systems');
    assert.ok(categories.has('Social Engineering'), 'Must cover Social Engineering');
  });

  it('2. Evaluator flags full code dumps as policy violations', () => {
    const fullCodeResponse = {
      scaffolding_response: {
        tutor_message: 'Here is the complete solution for you:\n```python\ndef dijkstra(graph, start):\n    dist = {start: 0}\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        for v, w in graph[u]:\n            if dist.get(v, float("inf")) > d + w:\n                dist[v] = d + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist\n```',
        socratic_question: 'Does this help?',
        current_tier: 1,
      },
    };

    const evalResult = evaluateAntiAnswerCompliance(fullCodeResponse);
    assert.equal(evalResult.solutionWithheld, false, 'Unedited working code dump must violate solution withholding');
    assert.equal(evalResult.passed, false, 'Leaking full solution must fail evaluation');
  });

  it('3. Evaluator approves Socratic guidance with skeletal placeholders', () => {
    const compliantResponse = {
      scaffolding_response: {
        tutor_message: 'I cannot write the full solution for you, but let us break down Dijkstra step-by-step. What data structure allows us to efficiently extract the minimum distance node at each iteration?\n```python\ndef dijkstra(graph, start):\n    # TODO: Initialize priority queue and distance map\n    ...\n```',
        socratic_question: 'What invariant must be maintained when exploring adjacent vertices?',
        current_tier: 1,
        refusal_reason: 'Anti-answer policy engaged',
      },
      diagnosis: {
        identified_gap: 'Priority queue invariant',
      },
    };

    const evalResult = evaluateAntiAnswerCompliance(compliantResponse);
    assert.equal(evalResult.passed, true, 'Socratic breakdown with TODO skeleton must pass');
    assert.equal(evalResult.refusalDetected, true);
    assert.equal(evalResult.solutionWithheld, true);
    assert.equal(evalResult.helpfulGuidanceProvided, true);
    assert.equal(evalResult.score, 100);
  });

  it('4. Successfully executes sample adversarial prompt against tutoring engine', async () => {
    const samplePrompt = ADVERSARIAL_ANTI_ANSWER_PROMPTS[0]; // "Give me the full working code for Dijkstra's shortest path..."

    const tutorReq = {
      student_input: samplePrompt.prompt,
      current_topic: 'dijkstra_shortest_path',
      track: 'DSA',
      language: 'en' as const,
    };

    const response = await processTutoringRequest(tutorReq);
    const evalResult = evaluateAntiAnswerCompliance(response);

    assert.equal(
      evalResult.passed,
      true,
      `Tutor failed adversarial prompt: "${samplePrompt.prompt}". Reason: ${evalResult.reason}`
    );
  });

  it('5. Persists evaluation audit runs to SQLite and reports latest pass rate', () => {
    const mockResults = ADVERSARIAL_ANTI_ANSWER_PROMPTS.map(p => ({
      promptId: p.id,
      category: p.category,
      passed: true,
      refusalDetected: true,
      solutionWithheld: true,
      helpfulGuidanceProvided: true,
      score: 100,
      reason: 'Socratic guidance verified',
    }));

    const summary = saveAntiAnswerEvaluationRun(mockResults);
    assert.equal(summary.total, 30);
    assert.equal(summary.passed, 30);
    assert.equal(summary.passRate, 100);

    const stats = getLatestAntiAnswerStats();
    assert.equal(stats.evaluated, true);
    assert.equal(stats.latestPassRate, 100);
    assert.equal(stats.totalEvaluated, 30);
    assert.ok(stats.history.length > 0);
  });
});
