import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Brain,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  Award,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  SpacedReviewCard,
  generateCardsForWeakConcepts,
  calculateSM2Update,
} from '../../services/spacedRepetition';
import { UILanguage, t } from '../../utils/i18n';

interface RetainViewProps {
  language: UILanguage;
  isOpen: boolean;
  onClose: () => void;
}

export const RetainView: React.FC<RetainViewProps> = ({ language, isOpen, onClose }) => {
  const { dkmNodes, islm, recordObservation } = useTutor();
  const [cards, setCards] = useState<SpacedReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [lastOutcome, setLastOutcome] = useState<{
    isCorrect: boolean;
    boxChange: string;
    priorComposite?: number;
    newComposite?: number;
  } | null>(null);

  // Initialize review cards from student's weak/RED concepts
  useEffect(() => {
    if (dkmNodes && dkmNodes.length > 0) {
      const generated = generateCardsForWeakConcepts(dkmNodes, islm.student_id);
      setCards(generated);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setLastOutcome(null);
    }
  }, [dkmNodes, islm.student_id]);

  if (!isOpen) return null;

  const currentCard = cards[currentIndex];
  const boxCounts = {
    1: cards.filter(c => c.leitnerBox === 1).length,
    2: cards.filter(c => c.leitnerBox === 2).length,
    3: cards.filter(c => c.leitnerBox === 3).length,
    4: cards.filter(c => c.leitnerBox === 4).length,
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentCard || isAnswered) return;

    const isCorrect = selectedOption === currentCard.correctIndex;
    const quality = isCorrect ? 5 : 1; // 5 = perfect recall, 1 = error

    // Target node to check prior composite
    const targetNode = dkmNodes.find(n => n.id === currentCard.conceptId);
    const priorComposite = targetNode?.compositeMastery?.composite ?? 0;

    // 1. Calculate SM-2 and Leitner updates
    const sm2 = calculateSM2Update(currentCard, quality);

    // 2. Record retention observation in BKT and composite mastery
    const { updatedNode } = recordObservation({
      conceptId: currentCard.conceptId,
      isCorrect,
      source: 'retention', // Triggers retention component activation
      isIndependent: true,
    });

    const newComposite = updatedNode.compositeMastery?.composite ?? priorComposite;

    // 3. Update local card state
    const updatedCards = cards.map((c, i) => {
      if (i === currentIndex) {
        return {
          ...c,
          leitnerBox: sm2.newBox,
          easeFactor: sm2.newEaseFactor,
          intervalDays: sm2.newIntervalDays,
          repetitions: sm2.newRepetitions,
          dueDate: sm2.newDueDate,
          lastReviewed: new Date().toISOString(),
        };
      }
      return c;
    });

    setCards(updatedCards);
    setIsAnswered(true);
    setLastOutcome({
      isCorrect,
      boxChange: `Box ${currentCard.leitnerBox} \u2192 Box ${sm2.newBox} (${sm2.newIntervalDays}d interval)`,
      priorComposite,
      newComposite,
    });
  };

  const handleNextCard = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setLastOutcome(null);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/60">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">{t('retain_title', language)}</h2>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                  SM-2 Algorithm
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t('retain_subtitle', language)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Leitner Box Matrix */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(boxNum => {
              const isCurrent = currentCard?.leitnerBox === boxNum;
              return (
                <div
                  key={boxNum}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-slate-400">
                    {t(`retain_box_${boxNum}`, language)}
                  </div>
                  <div className="text-lg font-bold text-slate-100 mt-1">
                    {boxCounts[boxNum as 1 | 2 | 3 | 4]}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {boxNum === 1 ? '1 day' : boxNum === 2 ? '3 days' : boxNum === 3 ? '7 days' : '14+ days'}
                  </div>
                </div>
              );
            })}
          </div>

          {currentCard ? (
            <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
              {/* Card Meta */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-400 font-bold">
                    Card {currentIndex + 1} of {cards.length}
                  </span>
                  <span className="text-slate-400">&bull; {currentCard.conceptName}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-bold">{t('retain_overdue', language)}</span>
                </div>
              </div>

              {/* Question Text in Selected Language */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  {currentCard.question[language] || currentCard.question.en}
                </h3>

                {currentCard.codeSnippet && (
                  <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {currentCard.codeSnippet}
                  </pre>
                )}
              </div>

              {/* Multiple Choice Options in Selected Language */}
              <div className="space-y-2">
                {(currentCard.options[language] || currentCard.options.en).map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrect = isAnswered && optIdx === currentCard.correctIndex;
                  const isWrongSelected = isAnswered && isSelected && !isCorrect;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={isAnswered}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                          : isWrongSelected
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                          : isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-xs">{opt}</span>
                      </div>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {isWrongSelected && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Post-Answer Outcome & SM-2 Feedback */}
              {isAnswered && lastOutcome && (
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    lastOutcome.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {lastOutcome.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {t('retain_success_msg', language)}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400" />
                          Recall Missed. Card reset to Box 1 for daily practice.
                        </>
                      )}
                    </span>
                    <span className="font-mono text-[11px] font-bold">{lastOutcome.boxChange}</span>
                  </div>

                  <p className="text-[11px] opacity-90">
                    {currentCard.explanation[language] || currentCard.explanation.en}
                  </p>

                  {lastOutcome.isCorrect && (
                    <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between text-[11px] font-mono">
                      <span>Composite Topic Mastery:</span>
                      <strong className="text-emerald-300">
                        {lastOutcome.priorComposite}% &rarr; {lastOutcome.newComposite}% (+Retention 10% active)
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {!isAnswered ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {t('btn_submit', language)}
                  </button>
                ) : (
                  <button
                    onClick={handleNextCard}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{t('btn_next', language)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2 text-slate-400">
              <Award className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                {t('retain_all_caught_up', language)}
              </div>
              <p className="text-xs text-slate-500">
                All spaced repetition review cards are consolidated in upper Leitner boxes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
