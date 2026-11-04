import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateBKT, deriveNodeComposite, applyObservationToNode, BKT_PARAMS } from '../src/services/mastery.ts';
import { DKMNode } from '../src/types/index.ts';

describe('Bayesian Knowledge Tracing (BKT) & Mastery Engine Suite', () => {
  it('1. Computes correct observation BKT update according to canonical equations', () => {
    const prior = 0.50;
    const { S, G, T } = BKT_PARAMS; // S=0.10, G=0.20, T=0.15

    // Manual calculation:
    // pLObs = (0.50 * 0.90) / (0.50 * 0.90 + 0.50 * 0.20) = 0.45 / (0.45 + 0.10) = 0.45 / 0.55 = 0.81818...
    // posterior = 0.81818... + (1 - 0.81818...) * 0.15 = 0.81818 + 0.02727 = 0.84545...
    const result = updateBKT(prior, true);

    assert.ok(Math.abs(result.pLObs - 0.8182) < 0.001, `Expected pLObs ~0.8182, got ${result.pLObs}`);
    assert.ok(Math.abs(result.posterior - 0.8455) < 0.001, `Expected posterior ~0.8455, got ${result.posterior}`);
  });

  it('2. Computes incorrect observation BKT update according to canonical equations', () => {
    const prior = 0.50;
    const { S, G, T } = BKT_PARAMS; // S=0.10, G=0.20, T=0.15

    // Manual calculation:
    // pLObs = (0.50 * 0.10) / (0.50 * 0.10 + 0.50 * 0.80) = 0.05 / (0.05 + 0.40) = 0.05 / 0.45 = 0.1111...
    // posterior = 0.1111... + (1 - 0.1111...) * 0.15 = 0.1111 + 0.1333 = 0.2444...
    const result = updateBKT(prior, false);

    assert.ok(Math.abs(result.pLObs - 0.1111) < 0.001, `Expected pLObs ~0.1111, got ${result.pLObs}`);
    assert.ok(Math.abs(result.posterior - 0.2444) < 0.001, `Expected posterior ~0.2444, got ${result.posterior}`);
  });

  it('3. Converges towards mastery (pL -> 0.99) over consecutive successful attempts', () => {
    let pL = 0.20; // Weak initial mastery

    for (let step = 1; step <= 6; step++) {
      const res = updateBKT(pL, true);
      assert.ok(res.posterior >= pL, `Step ${step}: posterior (${res.posterior}) must be >= prior (${pL})`);
      pL = res.posterior;
    }

    assert.ok(pL >= 0.95, `After 6 consecutive correct solves, pL (${pL}) should reach master tier >= 0.95`);
  });

  it('4. Correctly categorizes composite mastery score and weights with retention component', () => {
    const mockNode: DKMNode = {
      id: 'dsa_tree_traversal',
      name: 'Tree Traversal',
      track: 'DSA',
      category: 'Trees',
      description: 'DFS & BFS Tree Traversal',
      keyConcept: 'Recursion over children',
      typicalTrap: 'Null base case omitted',
      starterCodeSnippet: 'def traverse(root): pass',
      codeLanguage: 'python',
      starterErrorLog: '',
      prerequisites: [],
      status: 'YELLOW',
      mastery: 0.65,
      errorCount: 1,
      solvedCount: 4,
      compositeMastery: {
        composite: 65,
        conceptual: 85,
        practical: 70,
        independent: 60,
        retention: 90,
        weights: { conceptual: 0.35, practical: 0.35, independent: 0.20, retention: 0.10 },
        status: 'On Track',
        independentPassedCount: 3,
      },
    };

    const breakdown = deriveNodeComposite(mockNode);
    // 0.35*85 + 0.35*70 + 0.20*60 + 0.10*90 = 29.75 + 24.5 + 12 + 9 = 75.25 -> 75
    assert.equal(breakdown.composite, 75);
    assert.equal(breakdown.status, 'On Track');
    assert.equal(breakdown.weights.retention, 0.10);
  });

  it('5. Node updates generate chronological BKT trace audit records', () => {
    const initialNode: DKMNode = {
      id: 'cad_fillet_min_radius',
      name: 'Minimum Fillet Radius',
      track: 'CAD',
      category: 'Stress Concentration',
      description: 'Notch sensitivity',
      keyConcept: 'Fillet radius reduces SCF',
      typicalTrap: 'Zero radius re-entrant corner',
      starterCodeSnippet: '',
      codeLanguage: 'python',
      starterErrorLog: '',
      prerequisites: [],
      status: 'RED',
      mastery: 0.30,
      errorCount: 2,
      solvedCount: 1,
    };

    const { updatedNode, trace } = applyObservationToNode(initialNode, {
      conceptId: 'cad_fillet_min_radius',
      isCorrect: true,
      source: 'code_lab',
      isIndependent: true,
    });

    assert.ok(updatedNode.mastery > 0.30, 'Mastery should increase');
    assert.equal(trace.conceptId, 'cad_fillet_min_radius');
    assert.equal(trace.prior, 0.30);
    assert.equal(trace.isCorrect, true);
    assert.equal(trace.isIndependent, true);
    assert.ok(trace.posterior > trace.prior);
  });
});
