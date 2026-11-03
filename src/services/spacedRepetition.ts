/**
 * Spaced Repetition (Retain) Engine using SuperMemo-2 (SM-2) algorithm
 * with Leitner 4-box scheduling and multilingual support (English, Tamil, Hindi).
 */

import { DKMNode } from '../types';

export interface LocalizedContent {
  en: string;
  ta: string;
  hi: string;
}

export interface LocalizedOptions {
  en: string[];
  ta: string[];
  hi: string[];
}

export interface SpacedReviewCard {
  id: string;
  studentId: string;
  conceptId: string;
  conceptName: string;
  track: string;
  question: LocalizedContent;
  codeSnippet?: string;
  options: LocalizedOptions;
  correctIndex: number;
  explanation: LocalizedContent;
  leitnerBox: 1 | 2 | 3 | 4;
  easeFactor: number; // Initial 2.5, floor 1.3
  intervalDays: number; // Days until next review
  repetitions: number; // Consecutive successful recalls
  dueDate: string; // ISO string
  lastReviewed: string | null;
  history: Array<{
    reviewedAt: string;
    quality: number; // 0 to 5
    wasOverdue: boolean;
    easeFactor: number;
    intervalDays: number;
    box: 1 | 2 | 3 | 4;
  }>;
}

/**
 * SuperMemo-2 (SM-2) schedule calculation
 */
export function calculateSM2Update(
  card: {
    leitnerBox: 1 | 2 | 3 | 4;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    dueDate: string;
  },
  quality: number, // 0 = complete blackout, 3 = pass with effort, 4 = good, 5 = perfect
  reviewDate: Date = new Date()
): {
  newBox: 1 | 2 | 3 | 4;
  newEaseFactor: number;
  newIntervalDays: number;
  newRepetitions: number;
  newDueDate: string;
  isOverdue: boolean;
} {
  const isOverdue = reviewDate.getTime() >= new Date(card.dueDate).getTime();
  const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)));

  let newRepetitions = card.repetitions;
  let newIntervalDays = card.intervalDays;
  let newEaseFactor = card.easeFactor;
  let newBox: 1 | 2 | 3 | 4 = card.leitnerBox;

  if (clampedQuality >= 3) {
    // Correct recall advances through Leitner boxes
    if (newRepetitions === 0) {
      newIntervalDays = 1;
      newBox = 2;
    } else if (newRepetitions === 1) {
      newIntervalDays = 3;
      newBox = 3;
    } else if (newRepetitions === 2) {
      newIntervalDays = 7;
      newBox = 4;
    } else {
      newIntervalDays = Math.round(card.intervalDays * card.easeFactor);
      newBox = 4;
    }

    newRepetitions += 1;

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const qDiff = 5 - clampedQuality;
    newEaseFactor = card.easeFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  } else {
    // Incorrect recall: drop back to Box 1, restart interval
    newRepetitions = 0;
    newIntervalDays = 1;
    newBox = 1;
    newEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
  }

  // Calculate new due date
  const nextDueDate = new Date(reviewDate.getTime() + newIntervalDays * 86400000);

  return {
    newBox,
    newEaseFactor: Number(newEaseFactor.toFixed(3)),
    newIntervalDays,
    newRepetitions,
    newDueDate: nextDueDate.toISOString(),
    isOverdue,
  };
}

/**
 * Generates spaced-repetition cards from weak concepts (RED nodes or pL < 0.50)
 */
export function generateCardsForWeakConcepts(
  nodes: DKMNode[],
  studentId: string
): SpacedReviewCard[] {
  // Select weak concepts: RED nodes first, or lowest mastery nodes
  const weakNodes = nodes
    .filter(n => n.status === 'RED' || n.mastery < 0.50)
    .sort((a, b) => a.mastery - b.mastery);

  // If no RED nodes, take the 3 lowest mastery nodes
  const targetNodes = weakNodes.length > 0 ? weakNodes : [...nodes].sort((a, b) => a.mastery - b.mastery).slice(0, 3);

  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Due immediately

  return targetNodes.map((node, idx) => ({
    id: `card_${studentId}_${node.id}`,
    studentId,
    conceptId: node.id,
    conceptName: node.name,
    track: node.track,
    question: {
      en: `Recall Question: What is the core invariant rule for ${node.name}?`,
      ta: `நினைவுபடுத்தும் கேள்வி: ${node.name} என்பதற்கான அடிப்படை விதி என்ன?`,
      hi: `पुनरावलोकन प्रश्न: ${node.name} के लिए मुख्य अनिवार्य नियम क्या है?`,
    },
    codeSnippet: node.typicalTrap?.includes('port')
      ? `$pdo = new PDO('mysql:host=localhost;port=3306;dbname=test', 'root', '');`
      : undefined,
    options: {
      en: [
        node.keyConcept || `Requires strict parameter validation and invariant boundary checking.`,
        `Can be omitted because default settings automatically resolve execution issues.`,
        `Always execute globally across unrestricted network or memory bounds.`,
        node.typicalTrap || `Relying on unverified assumptions without boundary checks.`,
      ],
      ta: [
        node.keyConcept || `கட்டாய அளவுரு சரிபார்ப்பு மற்றும் எல்லையளவு விதிகள் தேவை.`,
        `முன்னிருப்பு அமைப்புகள் பிழைகளைத் தானாகவே சரிசெய்யும் என்பதால் இதைத் தவிர்க்கலாம்.`,
        `வரம்பற்ற நினைவக அமைப்பில் எப்போதும் உலகளாவிய ரீதியில் இயக்கவும்.`,
        node.typicalTrap || `எல்லைச் சரிபார்ப்புகள் இல்லாமல் அனுமானங்களை நம்புவது.`,
      ],
      hi: [
        node.keyConcept || `सटीक पैरामीटर सत्यापन और सीमा नियमों की सख्त आवश्यकता होती है।`,
        `इसे छोड़ा जा सकता है क्योंकि डिफ़ॉल्ट सेटिंग्स निष्पादन त्रुटियों को स्वतः हल करती हैं।`,
        `बिना प्रतिबंध के इसे हमेशा वैश्विक स्तर पर निष्पादित करें।`,
        node.typicalTrap || `सीमा जाँच के बिना गलत मान्यताओं पर निर्भर रहना।`,
      ],
    },
    correctIndex: 0,
    explanation: {
      en: `Core Invariant: ${node.keyConcept}. Typical trap to avoid: ${node.typicalTrap}.`,
      ta: `அடிப்படை விதி: ${node.keyConcept}. தவிர்க்க வேண்டிய பொதுவான பிழை: ${node.typicalTrap}.`,
      hi: `मुख्य नियम: ${node.keyConcept}. बचने योग्य सामान्य त्रुटि: ${node.typicalTrap}.`,
    },
    leitnerBox: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
    dueDate: pastDate, // Overdue by default so student can review immediately!
    lastReviewed: null,
    history: [],
  }));
}
