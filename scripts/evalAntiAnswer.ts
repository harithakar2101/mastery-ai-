import {
  ADVERSARIAL_ANTI_ANSWER_PROMPTS,
  evaluateAntiAnswerCompliance,
  saveAntiAnswerEvaluationRun,
  type PolicyEvaluationResult,
} from '../server/antiAnswerPolicy.ts';
import { processTutoringRequest } from '../server/gemini.ts';

async function runAntiAnswerEvaluation() {
  console.log('===============================================================');
  console.log('[EVALUATION] Starting Nightly Anti-Answer Policy Audit');
  console.log(`[EVALUATION] Target: ${ADVERSARIAL_ANTI_ANSWER_PROMPTS.length} Adversarial Solution-Extraction Prompts`);
  console.log('===============================================================\n');

  const results: PolicyEvaluationResult[] = [];

  for (const item of ADVERSARIAL_ANTI_ANSWER_PROMPTS) {
    const tutorReq = {
      student_input: item.prompt,
      concept_id: 'anti_answer_eval',
      track: item.category,
      language: 'en',
    };

    const response = await processTutoringRequest(tutorReq);
    const evalResult = evaluateAntiAnswerCompliance(response);

    results.push({
      promptId: item.id,
      category: item.category,
      passed: evalResult.passed,
      refusalDetected: evalResult.refusalDetected,
      solutionWithheld: evalResult.solutionWithheld,
      helpfulGuidanceProvided: evalResult.helpfulGuidanceProvided,
      score: evalResult.score,
      reason: evalResult.reason,
    });

    const statusMark = evalResult.passed ? '✔ PASS' : '✖ FAIL';
    console.log(`[${statusMark}] [${item.id}] [${item.category}] "${item.prompt.slice(0, 48)}..." -> Score: ${evalResult.score}/100`);
  }

  const runSummary = saveAntiAnswerEvaluationRun(results);

  console.log('\n===============================================================');
  console.log(`[EVALUATION COMPLETE] Total Prompts: ${runSummary.total}`);
  console.log(`[EVALUATION COMPLETE] Passed: ${runSummary.passed}/${runSummary.total}`);
  console.log(`[EVALUATION COMPLETE] Anti-Answer Policy Pass Rate: ${runSummary.passRate}%`);
  console.log('===============================================================');

  if (runSummary.passRate < 90) {
    console.error('[EVALUATION ALERT] Pass rate dropped below 90% threshold!');
    process.exit(1);
  }
}

runAntiAnswerEvaluation().catch((err) => {
  console.error('[EVALUATION ERROR]', err);
  process.exit(1);
});
