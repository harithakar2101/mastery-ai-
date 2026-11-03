import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSM2Update,
  generateCardsForWeakConcepts,
} from '../src/services/spacedRepetition.ts';
import { applyObservationToNode, deriveNodeComposite } from '../src/services/mastery.ts';
import { DKMNode } from '../src/types/index.ts';

describe('Spaced Repetition (Retain) - SM-2 & Leitner Box Engine', () => {
  it('initializes weak concept cards in Leitner Box 1 with past due date for review', () => {
    const mockNodes: DKMNode[] = [
      {
        id: 'node_red_1',
        name: 'Deadlock Conditions',
        track: 'Operating Systems',
        category: 'Concurrency',
        description: 'Deadlock conditions and handling',
        starterCodeSnippet: '',
        codeLanguage: 'c',
        starterErrorLog: '',
        prerequisites: [],
        status: 'RED',
        mastery: 0.32,
        keyConcept: 'Mutual exclusion, hold and wait, no preemption, circular wait',
        typicalTrap: 'Assuming preemption happens automatically without OS intervention',
        evidenceLabel: 'Likely Misconception',
        compositeMastery: {
          composite: 32,
          conceptual: 35,
          practical: 30,
          independent: 20,
          retention: null,
          weights: { conceptual: 0.3889, practical: 0.3889, independent: 0.2222, retention: 0 },
          status: 'Needs Attention',
          independentPassedCount: 0,
        },
        errorCount: 3,
        solvedCount: 1,
        bktTrace: [],
      },
    ];

    const cards = generateCardsForWeakConcepts(mockNodes, 'STU_101');
    assert.equal(cards.length, 1);
    assert.equal(cards[0].leitnerBox, 1);
    assert.equal(cards[0].easeFactor, 2.5);
    assert.equal(cards[0].intervalDays, 1);
    assert.ok(new Date(cards[0].dueDate).getTime() < Date.now());
  });

  it('promotes card across Leitner boxes (1 to 2 to 3 to 4) on consecutive quality recalls', () => {
    const initialCard = {
      leitnerBox: 1 as const,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: new Date(Date.now() - 3600000).toISOString(), // Due 1 hour ago
    };

    // Review 1: Perfect recall (q = 5) -> Box 2, interval 1 day
    const review1 = calculateSM2Update(initialCard, 5);
    assert.equal(review1.newBox, 2);
    assert.equal(review1.newRepetitions, 1);
    assert.equal(review1.newIntervalDays, 1);
    assert.equal(review1.isOverdue, true);

    // Review 2: Quality 4 -> Box 3, interval 3 days
    const card2 = {
      leitnerBox: review1.newBox,
      easeFactor: review1.newEaseFactor,
      intervalDays: review1.newIntervalDays,
      repetitions: review1.newRepetitions,
      dueDate: new Date(Date.now() - 3600000).toISOString(),
    };
    const review2 = calculateSM2Update(card2, 4);
    assert.equal(review2.newBox, 3);
    assert.equal(review2.newRepetitions, 2);
    assert.equal(review2.newIntervalDays, 3);

    // Review 3: Quality 5 -> Box 4, interval 7 days
    const card3 = {
      leitnerBox: review2.newBox,
      easeFactor: review2.newEaseFactor,
      intervalDays: review2.newIntervalDays,
      repetitions: review2.newRepetitions,
      dueDate: new Date(Date.now() - 3600000).toISOString(),
    };
    const review3 = calculateSM2Update(card3, 5);
    assert.equal(review3.newBox, 4);
    assert.equal(review3.newRepetitions, 3);
    assert.equal(review3.newIntervalDays, 7);
  });

  it('drops card back to Box 1 and resets interval to 1 day on failed recall (q < 3)', () => {
    const advancedCard = {
      leitnerBox: 3 as const,
      easeFactor: 2.6,
      intervalDays: 7,
      repetitions: 2,
      dueDate: new Date().toISOString(),
    };

    const failedReview = calculateSM2Update(advancedCard, 1);
    assert.equal(failedReview.newBox, 1);
    assert.equal(failedReview.newRepetitions, 0);
    assert.equal(failedReview.newIntervalDays, 1);
    assert.equal(failedReview.newEaseFactor, 2.4); // 2.6 - 0.2
  });

  it('acceptance: a card answered correctly after its due date raises the retention component', () => {
    // 1. Start with node lacking retention data (retention === null)
    const nodeWithoutRetention: DKMNode = {
      id: 'pdo_mysql_port',
      name: 'PDO MySQL Port Binding',
      track: 'Web Application Development',
      category: 'Databases',
      description: 'PHP Data Objects database connection configuration',
      starterCodeSnippet: 'new PDO("mysql:host=localhost;port=3306;dbname=test", "root", "");',
      codeLanguage: 'php',
      starterErrorLog: '',
      prerequisites: [],
      status: 'YELLOW',
      mastery: 0.60,
      keyConcept: 'MySQL listens on dedicated daemon port 3306',
      typicalTrap: 'Using port 80 for database connections',
      evidenceLabel: 'Possible Difficulty',
      compositeMastery: {
        composite: 64,
        conceptual: 60,
        practical: 70,
        independent: 60,
        retention: null, // No retention data exists yet
        weights: { conceptual: 0.3889, practical: 0.3889, independent: 0.2222, retention: 0 },
        status: 'Improving',
        independentPassedCount: 0,
      },
      errorCount: 2,
      solvedCount: 3,
      bktTrace: [
        {
          id: 'tr_1',
          conceptId: 'pdo_mysql_port',
          prior: 0.20,
          observed: true,
          posterior: 0.60,
          pLObserved: 0.60,
          isCorrect: true,
          isIndependent: false,
          source: 'quiz',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Assert initial state has NO retention component
    assert.equal(nodeWithoutRetention.compositeMastery!.retention, null);
    assert.equal(nodeWithoutRetention.compositeMastery!.weights.retention, 0);

    // 2. Student correctly answers a spaced repetition review card after its due date
    const overdueCardDueDate = new Date(Date.now() - 86400000).toISOString(); // Overdue by 1 day
    const sm2Update = calculateSM2Update(
      {
        leitnerBox: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        dueDate: overdueCardDueDate,
      },
      5, // Perfect recall after due date
      new Date()
    );

    assert.equal(sm2Update.isOverdue, true);

    // 3. Record delayed retention observation
    const { updatedNode } = applyObservationToNode(nodeWithoutRetention, {
      conceptId: 'pdo_mysql_port',
      isCorrect: true,
      source: 'retention', // Recorded as retention / delayed recheck
      isIndependent: true,
    });

    // 4. Verification: Retention component now exists and is active!
    assert.notEqual(updatedNode.compositeMastery!.retention, null);
    assert.equal(updatedNode.compositeMastery!.retention, 100);
    assert.equal(updatedNode.compositeMastery!.weights.retention, 0.10);
    assert.ok(updatedNode.compositeMastery!.composite > 0);
  });
});
