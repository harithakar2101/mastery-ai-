import { DKMNode, ObservationInput, BKTTrace, CompositeMasteryBreakdown } from '../types';

export const BKT_PARAMS = {
  S: 0.10, // Slip
  G: 0.20, // Guess
  T: 0.15, // Transition
};

export function deriveNodeComposite(node: DKMNode): CompositeMasteryBreakdown {
  const current = node.compositeMastery;
  const conceptual = current?.conceptual ?? Math.round(node.mastery * 100);
  const practical = current?.practical ?? Math.round(node.mastery * 100);
  const independent = current?.independent ?? Math.round(node.mastery * 100);
  const retention = current?.retention ?? null;

  let weights: { conceptual: number; practical: number; independent: number; retention: number };
  let composite: number;

  if (retention !== null) {
    weights = {
      conceptual: 0.35,
      practical: 0.35,
      independent: 0.20,
      retention: 0.10,
    };
    composite = Math.round(
      weights.conceptual * conceptual +
      weights.practical * practical +
      weights.independent * independent +
      weights.retention * retention
    );
  } else {
    weights = {
      conceptual: 0.3889,
      practical: 0.3889,
      independent: 0.2222,
      retention: 0,
    };
    composite = Math.round(
      weights.conceptual * conceptual +
      weights.practical * practical +
      weights.independent * independent
    );
  }

  const status =
    composite >= 80 ? 'Mastered' : composite >= 60 ? 'On Track' : composite >= 40 ? 'Improving' : 'Needs Attention';

  return {
    composite,
    conceptual,
    practical,
    independent,
    retention,
    weights,
    status,
    independentPassedCount: current?.independentPassedCount ?? (node.solvedCount || 0),
  };
}

export function updateBKT(prior: number, isCorrect: boolean): { pLObs: number; posterior: number } {
  const { S, G, T } = BKT_PARAMS;

  let pLObs: number;
  if (isCorrect) {
    pLObs = (prior * (1 - S)) / (prior * (1 - S) + (1 - prior) * G);
  } else {
    pLObs = (prior * S) / (prior * S + (1 - prior) * (1 - G));
  }

  let posterior = pLObs + (1 - pLObs) * T;
  // Strictly clamp between [0.01, 0.99]
  posterior = Math.max(0.01, Math.min(0.99, posterior));

  return {
    pLObs: +(pLObs.toFixed(4)),
    posterior: +(posterior.toFixed(4)),
  };
}

export function applyObservationToNode(
  node: DKMNode,
  obs: ObservationInput
): { updatedNode: DKMNode; trace: BKTTrace } {
  const prior = node.mastery;
  const { pLObs, posterior } = updateBKT(prior, obs.isCorrect);

  const status = posterior >= 0.80 ? 'GREEN' : posterior >= 0.50 ? 'YELLOW' : 'RED';

  const trace: BKTTrace = {
    id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conceptId: obs.conceptId,
    prior,
    observed: obs.isCorrect,
    posterior,
    pLObserved: pLObs,
    isCorrect: obs.isCorrect,
    isIndependent: Boolean(obs.isIndependent),
    source: obs.source,
    timestamp: new Date().toISOString(),
  };

  const existingComposite = deriveNodeComposite(node);
  let retention = existingComposite.retention;
  let weights = existingComposite.weights;

  if (obs.source === 'retention') {
    retention = obs.isCorrect ? 100 : Math.max(0, (retention ?? 50) - 20);
    weights = {
      conceptual: 0.35,
      practical: 0.35,
      independent: 0.20,
      retention: 0.10,
    };
  }

  let conceptual = existingComposite.conceptual;
  let practical = existingComposite.practical;
  let independent = existingComposite.independent;

  if (obs.source === 'quiz' || obs.source === 'conceptual') {
    conceptual = Math.round(posterior * 100);
  } else if (obs.source === 'code_lab' || obs.source === 'practical') {
    practical = Math.round(posterior * 100);
  }

  if (obs.isIndependent && obs.isCorrect) {
    independent = Math.min(100, Math.round(Math.max(independent, posterior * 100)));
  }

  let composite: number;
  if (retention !== null) {
    composite = Math.round(
      weights.conceptual * conceptual +
      weights.practical * practical +
      weights.independent * independent +
      weights.retention * retention
    );
  } else {
    composite = Math.round(
      weights.conceptual * conceptual +
      weights.practical * practical +
      weights.independent * independent
    );
  }

  const compositeStatus =
    composite >= 80 ? 'Mastered' : composite >= 60 ? 'On Track' : composite >= 40 ? 'Improving' : 'Needs Attention';

  const updatedComposite: CompositeMasteryBreakdown = {
    composite,
    conceptual,
    practical,
    independent,
    retention,
    weights,
    status: compositeStatus,
    independentPassedCount: existingComposite.independentPassedCount + (obs.isIndependent && obs.isCorrect ? 1 : 0),
  };

  const updatedNode: DKMNode = {
    ...node,
    mastery: posterior,
    status,
    errorCount: obs.isCorrect ? node.errorCount : node.errorCount + 1,
    solvedCount: obs.isCorrect ? node.solvedCount + 1 : node.solvedCount,
    bktTrace: [...(node.bktTrace || []), trace],
    compositeMastery: updatedComposite,
  };

  return { updatedNode, trace };
}
