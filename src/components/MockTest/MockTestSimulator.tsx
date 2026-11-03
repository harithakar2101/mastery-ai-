import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import { MockTest, MockTestQuestion } from '../../types';
import { Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight, ArrowLeft, Bookmark, RefreshCw, Send, Award, GitGraph, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export const MockTestSimulator: React.FC = () => {
  const { islm, dkmNodes, recordObservation, updateNodeStatus, setCurrentWorkflow, setSelectedNode, activeTrack } = useTutor();

  const [testData, setTestData] = useState<MockTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  // Load or generate mock test on mount
  const fetchMockTest = async () => {
    setIsLoadingTest(true);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setCurrentQuestionIndex(0);
    setTimeLeft(15 * 60);

    try {
      const redNodes = dkmNodes.filter(n => n.status === 'RED').map(n => n.id);
      const res = await fetch('/api/generate-mock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: activeTrack === 'All Tracks' ? islm.course_track : activeTrack,
          red_nodes: redNodes,
        }),
      });
      const data: MockTest = await res.json();
      setTestData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTest(false);
    }
  };

  useEffect(() => {
    fetchMockTest();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isSubmitted && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSubmitted, timeLeft]);

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const toggleFlag = (qIndex: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    if (!testData) return;

    let correctCount = 0;
    let wrongCount = 0;

    testData.questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      if (userAns !== undefined) {
        const isCorrect = userAns === q.correct_option_index;
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
        // Bayesian Knowledge Tracing update per question
        recordObservation({
          conceptId: q.topic_id,
          isCorrect,
          isIndependent: true,
          source: 'mock-test',
          errorCategory: isCorrect ? undefined : (q.distractor_explanations?.[userAns] || 'Conceptual Distractor Trap'),
        });
      }
    });

    const netScore = Math.max(0, +(correctCount - wrongCount * testData.negative_marking_rate).toFixed(2));
    if (netScore >= 3.5) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
  };

  if (isLoadingTest || !testData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-300 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-base">Assembling Tailored Adaptive Mock Test...</p>
        <p className="text-xs text-slate-500 mt-1">Calibrating questions against your RED memory tree gap nodes.</p>
      </div>
    );
  }

  const currentQ: MockTestQuestion = testData.questions[currentQuestionIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Calculate scores
  let correctTotal = 0;
  let wrongTotal = 0;
  let unattemptedTotal = 0;

  testData.questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === undefined) {
      unattemptedTotal++;
    } else if (selectedAnswers[idx] === q.correct_option_index) {
      correctTotal++;
    } else {
      wrongTotal++;
    }
  });

  const finalScore = +(correctTotal - wrongTotal * testData.negative_marking_rate).toFixed(2);
  const accuracyPct = (testData.questions.length - unattemptedTotal) > 0
    ? Math.round((correctTotal / (testData.questions.length - unattemptedTotal)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER BAR & TIMER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              CSE Realistic Test Environment Simulator
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{testData.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Negative Marking: -{testData.negative_marking_rate} per wrong answer. Time Limit: {testData.time_limit_mins} mins.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isSubmitted ? (
            <div className={`px-4 py-2 rounded-xl border font-mono text-sm font-bold flex items-center gap-2 ${
              timeLeft < 180 ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}>
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
            </div>
          ) : (
            <button
              onClick={fetchMockTest}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retake / New Test
            </button>
          )}

          {!isSubmitted && (
            <button
              onClick={handleSubmitTest}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Submit Exam
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY RESULT SCOREBOARD (IF SUBMITTED) */}
      {isSubmitted && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-800/60 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-amber-400" />
                Adaptive Examination Report & Memory Tree Sync
              </div>
              <h2 className="text-2xl font-bold text-slate-100">
                Net Score: {finalScore} / {testData.total_questions}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Identified gaps have been automatically synchronized to your Memory Tree.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-center min-w-[80px]">
                <div className="text-lg font-bold text-emerald-400">{correctTotal}</div>
                <div className="text-[10px] text-emerald-300 uppercase font-semibold">Correct (+1)</div>
              </div>
              <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-center min-w-[80px]">
                <div className="text-lg font-bold text-rose-400">{wrongTotal}</div>
                <div className="text-[10px] text-rose-300 uppercase font-semibold">Wrong (-0.25)</div>
              </div>
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-center min-w-[80px]">
                <div className="text-lg font-bold text-slate-300">{accuracyPct}%</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</div>
              </div>
              <button
                onClick={() => setCurrentWorkflow('MEMORY_TREE')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <GitGraph className="w-4 h-4" />
                Inspect Memory Tree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QUESTION DISPLAY (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
            {/* Question Top Meta */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                Question {currentQuestionIndex + 1} of {testData.questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Topic: {currentQ.topic_name}</span>
                {!isSubmitted && (
                  <button
                    onClick={() => toggleFlag(currentQuestionIndex)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                      flaggedQuestions[currentQuestionIndex]
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title="Flag for review"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{flaggedQuestions[currentQuestionIndex] ? 'Flagged' : 'Flag'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Prompt */}
            <h3 className="text-sm font-semibold text-slate-100 leading-relaxed font-mono">
              {currentQ.question}
            </h3>

            {/* Multiple Choice Options */}
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
                const isCorrect = currentQ.correct_option_index === optIdx;

                let optionStyles = 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60';
                if (!isSubmitted) {
                  if (isSelected) {
                    optionStyles = 'bg-indigo-950/70 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/50';
                  }
                } else {
                  if (isCorrect) {
                    optionStyles = 'bg-emerald-950/70 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500/60';
                  } else if (isSelected && !isCorrect) {
                    optionStyles = 'bg-rose-950/70 border-rose-500 text-rose-100 ring-1 ring-rose-500/60';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs font-mono transition-all flex items-start gap-3 cursor-pointer ${optionStyles}`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {isSubmitted && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {isSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* IN-DEPTH POST-TEST DIAGNOSTIC REVIEW (IF SUBMITTED) */}
            {isSubmitted && (
              <div className="mt-5 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  MOCK_TEST_AI_REVIEW: Side-by-Side Option Analysis
                </div>
                <div className="text-xs text-slate-200 leading-relaxed bg-indigo-950/30 p-3 rounded-lg border border-indigo-800/40">
                  <span className="font-bold text-emerald-400 block mb-1">Why Option {String.fromCharCode(65 + currentQ.correct_option_index)} is Correct:</span>
                  {currentQ.explanation}
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400">Distractor Misconception Explanations:</div>
                  {currentQ.distractor_explanations.map((dExp, dIdx) => (
                    <div key={dIdx} className="text-[11px] text-slate-400 flex items-start gap-2">
                      <span className="font-mono text-slate-500 font-bold">{String.fromCharCode(65 + dIdx)}:</span>
                      <span>{dExp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Navigation Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(testData.questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex === testData.questions.length - 1}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* QUESTION NAVIGATOR GRID (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Question Navigator
            </div>

            <div className="grid grid-cols-5 gap-2">
              {testData.questions.map((q, idx) => {
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isFlagged = flaggedQuestions[idx];

                let bgClass = 'bg-slate-950 border-slate-800 text-slate-400';
                if (!isSubmitted) {
                  if (isCurrent) bgClass = 'bg-indigo-600 border-indigo-400 text-white shadow-sm';
                  else if (isFlagged) bgClass = 'bg-amber-950 border-amber-700 text-amber-300';
                  else if (isAnswered) bgClass = 'bg-slate-800 border-slate-700 text-slate-200';
                } else {
                  const isCorrect = selectedAnswers[idx] === q.correct_option_index;
                  if (isCorrect) bgClass = 'bg-emerald-950 border-emerald-600 text-emerald-300';
                  else bgClass = 'bg-rose-950 border-rose-600 text-rose-300';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Attempted:</span>
                <span className="font-mono text-slate-200">{Object.keys(selectedAnswers).length} / {testData.questions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Flagged:</span>
                <span className="font-mono text-amber-300">{Object.values(flaggedQuestions).filter(Boolean).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
