import { PedagogicalEvent } from './store.ts';
import { StudyDefinition } from './studyRoutes.ts';
import {
  calculateMean,
  calculateSD,
  calculate95CI,
  calculatePairedTTest,
  calculateWelchTTest,
  calculateCohensD,
  calculateHedgesG,
  calculateNormalizedGain,
} from '../src/utils/statistics.ts';

export function computeStudyMetricsAndStats(
  study: StudyDefinition,
  studyEvents: PedagogicalEvent[]
) {
  const hasSynthetic = studyEvents.some(e => e.synthetic === true);
  const provenanceLabel = hasSynthetic ? 'DEMO DATA (synthetic)' : 'STUDY DATA';
  const masteryThreshold = study.masteryThreshold || 90;

  const armResults: Record<string, any> = {};

  study.arms.forEach(arm => {
    const armEvents = studyEvents.filter(e => e.payload?.armId === arm.id);

    const preEvents = armEvents.filter(e => e.type === 'STUDY_PRE_TEST_ANSWER');
    const postEvents = armEvents.filter(e => e.type === 'STUDY_POST_TEST_ANSWER');
    const learnEvents = armEvents.filter(e => e.type === 'STUDY_LEARNING_ATTEMPT');
    const retEvents = armEvents.filter(e => e.type === 'STUDY_RETENTION_ANSWER');

    // Extract student pre, post, and retention scores
    const studentPreMap = new Map<string, number>();
    preEvents.forEach(e => studentPreMap.set(e.studentId, e.payload?.score ?? 0));

    const studentPostMap = new Map<string, number>();
    postEvents.forEach(e => studentPostMap.set(e.studentId, e.payload?.score ?? 0));

    const studentRetMap = new Map<string, number>();
    retEvents.forEach(e => studentRetMap.set(e.studentId, e.payload?.score ?? 0));

    const preScores = Array.from(studentPreMap.values());
    const postScores = Array.from(studentPostMap.values());
    const retScores = Array.from(studentRetMap.values());

    const pairedStudents = Array.from(studentPostMap.keys()).filter(id => studentPreMap.has(id));
    const normalizedGains: number[] = pairedStudents.map(id => {
      const pre = studentPreMap.get(id)!;
      const post = studentPostMap.get(id)!;
      return calculateNormalizedGain(pre, post);
    });

    const meanPre = calculateMean(preScores);
    const ciPre = calculate95CI(preScores);
    const meanPost = calculateMean(postScores);
    const ciPost = calculate95CI(postScores);
    const meanNormGain = calculateMean(normalizedGains);
    const ciNormGain = calculate95CI(normalizedGains);

    const masteredCount = postScores.filter(s => s >= masteryThreshold).length;
    const masteryAttainment = postScores.length > 0
      ? Number(((masteredCount / postScores.length) * 100).toFixed(1))
      : 0;

    const totalLearnAttempts = learnEvents.length;
    const repeatedErrorAttempts = learnEvents.filter(e => e.payload?.repeatedError === true).length;
    const repeatedErrorRate = totalLearnAttempts > 0
      ? Number(((repeatedErrorAttempts / totalLearnAttempts) * 100).toFixed(1))
      : 0;

    const durations = learnEvents.map(e => Number(e.payload?.durationSec) || 0).filter(d => d > 0);
    const meanTimeSec = calculateMean(durations);

    const hints = learnEvents.map(e => Number(e.payload?.hintsRequested) || 0);
    const meanAssistance = calculateMean(hints);

    const passedTasks = learnEvents.filter(e => e.payload?.passed === true).length;
    const taskCompletionRate = totalLearnAttempts > 0
      ? Number(((passedTasks / totalLearnAttempts) * 100).toFixed(1))
      : 0;

    const firstPasses = postEvents.filter(e => e.payload?.firstAttemptPass === true || e.payload?.passed === true).length;
    const independentSuccessRate = postEvents.length > 0
      ? Number(((firstPasses / postEvents.length) * 100).toFixed(1))
      : 0;

    const meanRet = calculateMean(retScores);
    const retentionRate = meanPost > 0 ? Number(((meanRet / meanPost) * 100).toFixed(1)) : 0;

    const improvements = learnEvents.map(e => Number(e.payload?.improvementDelta) || 0).filter(i => i > 0);
    const improvementPerIntervention = calculateMean(improvements);

    const pairedPre = pairedStudents.map(id => studentPreMap.get(id)!);
    const pairedPost = pairedStudents.map(id => studentPostMap.get(id)!);
    const pairedT = calculatePairedTTest(pairedPre, pairedPost);

    armResults[arm.id] = {
      armId: arm.id,
      name: arm.name,
      condition: arm.condition,
      n: pairedStudents.length > 0 ? pairedStudents.length : Math.max(preScores.length, postScores.length),
      metrics: {
        preScore: { mean: Number(meanPre.toFixed(1)), sd: Number(calculateSD(preScores).toFixed(1)), ci95: ciPre },
        postScore: { mean: Number(meanPost.toFixed(1)), sd: Number(calculateSD(postScores).toFixed(1)), ci95: ciPost },
        normalizedGain: { mean: Number(meanNormGain.toFixed(3)), sd: Number(calculateSD(normalizedGains).toFixed(3)), ci95: ciNormGain },
        masteryAttainment: { percent: masteryAttainment, threshold: masteryThreshold, masteredCount, total: postScores.length },
        repeatedErrorRate: { percent: repeatedErrorRate, count: repeatedErrorAttempts, total: totalLearnAttempts },
        timeToCompleteSec: { mean: Number(meanTimeSec.toFixed(0)), sd: Number(calculateSD(durations).toFixed(0)) },
        assistanceRequests: { mean: Number(meanAssistance.toFixed(1)) },
        taskCompletionRate: { percent: taskCompletionRate },
        independentSuccessRate: { percent: independentSuccessRate },
        retentionRate: { percent: retentionRate, retentionMean: Number(meanRet.toFixed(1)) },
        improvementPerIntervention: { mean: Number(improvementPerIntervention.toFixed(1)) },
      },
      pairedTTest: pairedT,
      studentPairs: pairedStudents.map(sId => ({
        studentId: sId,
        pre: studentPreMap.get(sId) ?? 0,
        post: studentPostMap.get(sId) ?? 0,
        retention: studentRetMap.get(sId) ?? 0,
        gain: calculateNormalizedGain(studentPreMap.get(sId) ?? 0, studentPostMap.get(sId) ?? 0),
      })),
    };
  });

  let comparativeStats: any = null;
  if (armResults.ARM_A && armResults.ARM_B) {
    const postA = armResults.ARM_A.studentPairs.map((p: any) => p.post);
    const postB = armResults.ARM_B.studentPairs.map((p: any) => p.post);
    const gainA = armResults.ARM_A.studentPairs.map((p: any) => p.gain);
    const gainB = armResults.ARM_B.studentPairs.map((p: any) => p.gain);

    comparativeStats = {
      welchPost: calculateWelchTTest(postA, postB),
      welchGain: calculateWelchTTest(gainA, gainB),
      cohensDPost: calculateCohensD(postA, postB),
      hedgesGPost: calculateHedgesG(postA, postB),
      cohensDGain: calculateCohensD(gainA, gainB),
      hedgesGGain: calculateHedgesG(gainA, gainB),
    };
  }

  const totalN = Object.values(armResults).reduce((acc: number, a: any) => acc + (a.n || 0), 0);
  const isSmallSample = totalN < 30;

  return {
    studyId: study.id,
    title: study.title,
    topicName: study.topicName,
    totalN,
    isSmallSample,
    smallSampleCaution: isSmallSample
      ? `Caution: Small sample size (n = ${totalN} < 30). Statistical power may be limited; prioritize effect sizes (Cohen's d, Hedges' g) and 95% Confidence Intervals over p-values.`
      : null,
    provenance: provenanceLabel,
    isSynthetic: hasSynthetic,
    armResults,
    comparativeStats,
    eventCount: studyEvents.length,
  };
}
