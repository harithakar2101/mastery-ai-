import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { X, CheckCircle, AlertTriangle, ArrowRight, Award } from 'lucide-react';

interface DiagnosticPretestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRETEST_QUESTIONS = [
  {
    id: 'pre_web_1',
    topicId: 'web_apache_docroot',
    question: 'When configuring Apache HTTP Server, what does the DocumentRoot directive define?',
    options: [
      'The directory containing binary executables and modules',
      'The root filesystem directory from which web documents are served',
      'The location of server access and error logs',
      'The local proxy socket for upstream PHP daemons',
    ],
    correctIndex: 1,
  },
  {
    id: 'pre_db_1',
    topicId: 'pdo_mysql_port',
    question: 'Which default port number is reserved for standard MySQL TCP listener services?',
    options: ['80', '443', '3306', '8080'],
    correctIndex: 2,
  },
  {
    id: 'pre_sec_1',
    topicId: 'sql_injection_defense',
    question: 'What is the primary technical reason parameterized queries prevent SQL injection?',
    options: [
      'They encode all strings into Base64 format',
      'They separate SQL query compilation from untrusted user data inputs',
      'They encrypt user inputs with AES-256',
      'They automatically truncate queries over 256 characters',
    ],
    correctIndex: 1,
  },
  {
    id: 'pre_dsa_1',
    topicId: 'recursion_base_case',
    question: 'What occurs when a recursive function in Python executes without a valid base case?',
    options: [
      'A silent return of None occurs automatically',
      'The CPU enters an unrecoverable hardware deadlock',
      'A RecursionError is raised due to maximum call stack depth exhaustion',
      'The compiler translates recursion into an iterative while loop',
    ],
    correctIndex: 2,
  },
];

export const DiagnosticPretestModal: React.FC<DiagnosticPretestModalProps> = ({ isOpen, onClose }) => {
  const { runDiagnosticPretestComplete } = useTutor();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!isOpen) return null;

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    let correct = 0;
    const missedTopics: string[] = [];

    PRETEST_QUESTIONS.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        correct++;
      } else {
        missedTopics.push(q.topicId);
      }
    });

    const calculatedScore = Math.round((correct / PRETEST_QUESTIONS.length) * 100);
    setScore(calculatedScore);
    setSubmitted(true);
    runDiagnosticPretestComplete(calculatedScore, missedTopics);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pb-4 border-b border-[#1a273b] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Diagnostic Pre-Test Assessment</h2>
            <p className="text-xs text-slate-400">Baseline diagnostic evaluation to initialize Bayesian Knowledge Tracing</p>
          </div>
        </div>

        <div className="py-4 space-y-6">
          {PRETEST_QUESTIONS.map((q, qIdx) => (
            <div key={q.id} className="p-4 bg-[#070d18] border border-[#1a273b] rounded-xl space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                {qIdx + 1}. {q.question}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[qIdx] === optIdx;
                  let optStyle = 'bg-[#0c1421] border-[#1a273b] text-slate-300 hover:border-blue-500/50';

                  if (submitted) {
                    if (optIdx === q.correctIndex) {
                      optStyle = 'bg-emerald-950/60 border-emerald-600 text-emerald-200';
                    } else if (isSelected) {
                      optStyle = 'bg-red-950/60 border-red-600 text-red-200';
                    }
                  } else if (isSelected) {
                    optStyle = 'bg-blue-600/20 border-blue-500 text-blue-200';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${optStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#1a273b] flex items-center justify-between">
          {submitted ? (
            <div className="text-xs font-bold text-emerald-400">
              Diagnostic Complete! Score: {score}% &bull; BKT Profile Initialized
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Answer all 4 questions to benchmark your prior mastery.
            </div>
          )}

          {submitted ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
            >
              Continue to Workspace
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < PRETEST_QUESTIONS.length}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Submit Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
