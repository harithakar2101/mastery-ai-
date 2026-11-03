import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import { MockTest, MockTestQuestion, MockTestResult } from '../../types';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BarChart2,
  Layers,
  HelpCircle,
  FolderOpen,
  Send,
  Flag,
  Award,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { MECH_DIAGNOSTIC_QUESTIONS } from '../../data/dkmMechQuestions';

export const VisionMockTest: React.FC = () => {
  const {
    userProfile,
    setCurrentWorkflow,
    setActiveReviewQuestions,
    dkmNodes,
    updateNodeStatus,
    recordObservation,
    activeTrack,
  } = useTutor();

  // Wizard state: 'wizard_step1' | 'wizard_step2' | 'loading' | 'exam' | 'results'
  const [stage, setStage] = useState<'wizard_step1' | 'wizard_step2' | 'loading' | 'exam' | 'results'>('wizard_step1');

  // Step 1 Options
  const isInitiallyMech =
    activeTrack === 'Mechanical Engineering (CAD)' ||
    activeTrack.toLowerCase().includes('mech') ||
    activeTrack.toLowerCase().includes('cad');

  const [subjectSource, setSubjectSource] = useState<'dropdown' | 'file' | 'custom'>('dropdown');
  const [selectedSubject, setSelectedSubject] = useState(
    isInitiallyMech ? 'Mechanical Engineering (CAD)' : 'Computer Science'
  );
  const [customSubjectText, setCustomSubjectText] = useState('discrete mathematics');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Sync when activeTrack changes
  useEffect(() => {
    if (activeTrack === 'Mechanical Engineering (CAD)') {
      setSelectedSubject('Mechanical Engineering (CAD)');
    }
  }, [activeTrack]);

  // Loading animation items
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // Active exam state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [reviewLater, setReviewLater] = useState<Record<number, boolean>>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState(10 * 60); // 10 minutes
  const [questionTime, setQuestionTime] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Results state
  const [activeResultTab, setActiveResultTab] = useState<'Summary' | 'Sections' | 'Time' | 'Answers'>('Summary');
  const [resultData, setResultData] = useState<MockTestResult | null>(null);

  // Pre-configured questions database for Discrete Mathematics & Computer Science
  const [examQuestions, setExamQuestions] = useState<MockTestQuestion[]>([
    {
      id: '1',
      section: 'Properties of Boolean Algebra',
      topic_id: 'boolean_algebra_properties',
      topic_name: 'Properties of Boolean Algebra',
      question:
        'In a Boolean algebra, which law is used to show that a + 1 = 1? (Think of it like a switch that is always ON; once one input is ON, a useful way to picture an OR gate.)',
      options: [
        'Identity Law',
        'Complement Law, then Associative Law, Idempotent Law, and Complement Law',
        'De Morgan\'s Law only',
        'Distributive Law only',
      ],
      correct_option_index: 1,
      explanation:
        'The proof writes a + 1 = 1 by writing 1 as a + a\' (Complement Law), applying the Associative Law, then the Idempotent Law (a + a = a), and finally the Complement Law again to get 1.',
      distractor_explanations: [
        'Identity Law states a + 0 = a and a · 1 = a, not a + 1 = 1.',
        'Correct proof sequence!',
        'De Morgan\'s laws apply to negations of conjunctions and disjunctions.',
        'Distributive law alone does not eliminate variable a.',
      ],
      time_spent_secs: 4,
    },
    {
      id: '2',
      section: 'Properties of Boolean Algebra',
      topic_id: 'boolean_absorption_law',
      topic_name: 'Properties of Boolean Algebra',
      question: 'Which law is used in the notes to prove the Absorption Law: a · (a + b) = a?',
      options: [
        'Idempotent Law only',
        'Identity Law, Distributive Law, Commutative Law, and Identity Law',
        'De Morgan\'s Law',
        'Involution Law',
      ],
      correct_option_index: 1,
      explanation:
        'The proof writes a · (a + b) = (a + 0) · (a + b) using Identity Law, applies Distributive Law to get a + (0 · b), which simplifies to a + 0 = a.',
      distractor_explanations: [
        'Idempotent law is a · a = a.',
        'Correct proof steps in discrete mathematics standard notes!',
        'De Morgan relates complements of operations.',
        'Involution is double negation: (a\')\' = a.',
      ],
      time_spent_secs: 6,
    },
    {
      id: '3',
      section: 'Properties of Boolean Algebra',
      topic_id: 'boolean_idempotent_law',
      topic_name: 'Properties of Boolean Algebra',
      question: 'In the notes, the Idempotent Law a + a = a is proven by first writing a + a = (a + a) · 1 and then applying which law?',
      options: [
        'Associative Law',
        'Distributive Law',
        'Involution Law',
        'Absorption Law',
      ],
      correct_option_index: 1,
      explanation:
        'After substituting 1 = a + a\', the notes apply the Distributive Law to get (a + a) · (a + a\') = a + (a · a\'), then use the Complement Law to simplify to a + 0 = a.',
      distractor_explanations: [
        'Associative law regroup parentheses, not distributed terms.',
        'Correct answer: Distributive law is applied over the complement.',
        'Involution deals with double negation.',
        'Absorption is what is being verified later.',
      ],
      time_spent_secs: 5,
    },
    {
      id: '4',
      section: 'Boolean Algebra Axioms and Equivalences',
      topic_id: 'boolean_annihilation',
      topic_name: 'Boolean Algebra Axioms and Equivalences',
      question: 'In a Boolean algebra, if a + b = 1, which statement is proven to follow?',
      options: [
        'a · b = a',
        'a · b = b',
        'a · b = 0',
        'a + b = a',
      ],
      correct_option_index: 0,
      explanation:
        'Multiplying both sides by a: a · (a + b) = a · 1 = a. By absorption/distributive laws, a · (a + b) yields a.',
      distractor_explanations: [
        'Correct answer!',
        'Does not hold unless a and b have symmetric values.',
        'Only holds if b is strictly the complement a\'.',
        'a + b = 1 is given; a + b = a would imply a = 1.',
      ],
      time_spent_secs: 4,
    },
    {
      id: '5',
      section: 'Boolean Algebra Axioms and Equivalences',
      topic_id: 'boolean_orthogonality',
      topic_name: 'Boolean Algebra Axioms and Equivalences',
      question: 'In a Boolean algebra, the statement a · b\' = 0 is shown to be equivalent to which of the following?',
      options: [
        'a + b = 1',
        'a\' + b = 1',
        'a · b = 1',
        'a · b = 0',
      ],
      correct_option_index: 1,
      explanation:
        'Taking the complement of both sides using De Morgan\'s Law: (a · b\')\' = 0\'. This yields a\' + (b\')\' = 1, which simplifies to a\' + b = 1.',
      distractor_explanations: [
        'Missing negation on a.',
        'Correct answer by De Morgan\'s dual complementation!',
        'Requires both a and b to be 1.',
        'States mutual exclusivity rather than subset implication.',
      ],
      time_spent_secs: 6,
    },
  ]);

  // Exam timer
  useEffect(() => {
    let timer: any = null;
    if (stage === 'exam' && examTimeRemaining > 0) {
      timer = setInterval(() => {
        setExamTimeRemaining(prev => Math.max(0, prev - 1));
        setQuestionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, examTimeRemaining]);

  // Wizard Loading Steps simulation (matching the video!)
  const handleStartLoading = () => {
    setStage('loading');
    setLoadingStepIndex(0);

    const isMech =
      selectedSubject === 'Mechanical Engineering (CAD)' ||
      activeTrack === 'Mechanical Engineering (CAD)' ||
      (selectedSubject &&
        (selectedSubject.toLowerCase().includes('mech') ||
          selectedSubject.toLowerCase().includes('cad')));

    if (isMech) {
      const cadQuestions: MockTestQuestion[] = [
        MECH_DIAGNOSTIC_QUESTIONS['cad_dof_2d'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_geometric_constraints'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_driving_parameters'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_extrude_operations'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_fillets_chamfers_g1'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_hub_bore_concentricity'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_material_mass_properties'][0],
        MECH_DIAGNOSTIC_QUESTIONS['cad_stress_fos'][0],
      ].filter(Boolean);
      setExamQuestions(cadQuestions);
    }

    const steps = [
      'Analyzing test configuration...',
      'Generating questions based on your criteria...',
      'Preparing test environment...',
      'Almost ready...',
      'Redirecting to test...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setLoadingStepIndex(current);
      if (current >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setStage('exam');
          setCurrentQuestionIdx(0);
          setSelectedAnswers({});
          setReviewLater({});
          setExamTimeRemaining(10 * 60);
        }, 500);
      }
    }, 600);
  };

  const handleFinishExam = () => {
    setShowSubmitConfirm(false);

    // Calculate score
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    const evaluatedQuestions = examQuestions.map((q, idx) => {
      const userChoice = selectedAnswers[idx];
      const isCorrect = userChoice === q.correct_option_index;
      if (userChoice === undefined) {
        unattempted++;
      } else {
        if (isCorrect) correct++;
        else wrong++;

        recordObservation({
          conceptId: q.topic_id || 'boolean_algebra',
          isCorrect,
          isIndependent: true,
          source: 'mock-test',
          errorCategory: isCorrect ? undefined : (q.distractor_explanations?.[userChoice] || 'Mock Test Misconception'),
        });
      }

      return {
        ...q,
        user_selected_index: userChoice,
      };
    });

    const netScore = Math.max(0, +(correct - wrong * 0.25).toFixed(2));
    const percentage = +((netScore / examQuestions.length) * 100).toFixed(1);
    const accuracy = correct + wrong > 0 ? +((correct / (correct + wrong)) * 100).toFixed(1) : 0;

    const result: MockTestResult = {
      test_id: `TEST_${Date.now()}`,
      title: 'Full-length Mock: Boolean Algebra & Discrete Mathematics',
      subject: customSubjectText || selectedSubject,
      total_marks: examQuestions.length,
      score: netScore,
      percentage,
      correct_count: correct,
      incorrect_count: wrong,
      unattempted_count: unattempted,
      accuracy,
      total_time_secs: 25,
      average_time_per_question_secs: 5,
      questions: evaluatedQuestions,
      sections: [
        {
          name: 'Properties of Boolean Algebra',
          score: 1.75,
          max_score: 3,
          correct: 2,
          wrong: 1,
          accuracy: 67,
          time_secs: 15,
        },
        {
          name: 'Boolean Algebra Axioms and Equivalences',
          score: 2.0,
          max_score: 2,
          correct: 2,
          wrong: 0,
          accuracy: 100,
          time_secs: 10,
        },
      ],
    };

    setResultData(result);
    setStage('results');

    if (percentage >= 70) {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    }
  };

  // "Review with AI" button (From Video!)
  const handleReviewWithAI = () => {
    if (resultData) {
      // Send the questions to the Chat's right pane!
      setActiveReviewQuestions(resultData.questions);
      setCurrentWorkflow('CHATS');
    }
  };

  const handleFileUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setSubjectSource('file');
    }
  };

  // --- STAGE 1: WIZARD STEP 1 (Choose Your Subject) ---
  if (stage === 'wizard_step1') {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
        {/* Header Title */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Your Perfect Test</h1>
          <p className="text-xs text-slate-400">Let's build a personalized learning experience just for you</p>

          {/* Stepper Dots (1 - 2) */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-blue-600/30">
              1
            </span>
            <div className="w-12 h-0.5 bg-[#1a273b]" />
            <span className="w-7 h-7 rounded-full bg-[#111b2b] text-slate-500 font-bold text-xs flex items-center justify-center border border-[#1a273b]">
              2
            </span>
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center pb-2">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              <span>Choose Your Subject</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select how you want to provide your subject material
            </p>
          </div>

          <div className="space-y-4">
            {/* Option 1: Dropdown */}
            <div
              onClick={() => setSubjectSource('dropdown')}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                subjectSource === 'dropdown'
                  ? 'bg-[#111b2b] border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-[#070d18] border-[#1a273b] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={subjectSource === 'dropdown'}
                  onChange={() => setSubjectSource('dropdown')}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">Choose Subject from Dropdown</div>
                  <div className="text-[11px] text-slate-400">Select from predefined subjects and exams</div>
                </div>
              </div>

              {subjectSource === 'dropdown' && (
                <div className="pt-2">
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Select Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Mechanical Engineering (CAD)">⚙️ Mechanical Engineering (CAD)</option>
                    <option value="Computer Science">Computer Science & Engineering</option>
                    <option value="discrete mathematics">Discrete Mathematics & Boolean Logic</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Engineering">Engineering Fundamentals</option>
                    <option value="JEE">JEE (Joint Entrance Examination)</option>
                    <option value="NEET">NEET (Medical Entrance)</option>
                    <option value="SAT">SAT (Scholastic Assessment Test)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Option 2: Upload File / Reference Library */}
            <div
              onClick={() => setSubjectSource('file')}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                subjectSource === 'file'
                  ? 'bg-[#111b2b] border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-[#070d18] border-[#1a273b] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={subjectSource === 'file'}
                  onChange={() => setSubjectSource('file')}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">Upload File / Add Reference from Library</div>
                  <div className="text-[11px] text-slate-400">Upload your own files or select from library vault</div>
                </div>
              </div>

              {subjectSource === 'file' && (
                <div className="pt-2 space-y-3">
                  <div className="p-4 border-2 border-dashed border-[#1e2f47] rounded-xl text-center hover:border-blue-500/50 transition-colors">
                    <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-xs font-medium text-slate-200">
                      {uploadedFileName ? (
                        <span className="text-emerald-400 font-bold">{uploadedFileName}</span>
                      ) : (
                        'Upload your notes, books, or study materials'
                      )}
                    </div>
                    <label className="mt-2 inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
                      <span>Choose Files</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.docx,.md"
                        onChange={handleFileUploadSim}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {uploadedFileName && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => setUploadedFileName(null)}
                        className="text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        Remove All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Option 3: Custom Subject Textbox */}
            <div
              onClick={() => setSubjectSource('custom')}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                subjectSource === 'custom'
                  ? 'bg-[#111b2b] border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-[#070d18] border-[#1a273b] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={subjectSource === 'custom'}
                  onChange={() => setSubjectSource('custom')}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">Enter Your Own Subject</div>
                  <div className="text-[11px] text-slate-400">Type in your custom subject or topic</div>
                </div>
              </div>

              {subjectSource === 'custom' && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customSubjectText}
                    onChange={e => setCustomSubjectText(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Calculus, discrete mathematics"
                    className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStage('wizard_step2')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 2: WIZARD STEP 2 (Launch Mode) ---
  if (stage === 'wizard_step2') {
    const activeSubjectName =
      subjectSource === 'custom'
        ? customSubjectText
        : subjectSource === 'file' && uploadedFileName
        ? uploadedFileName
        : selectedSubject;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Your Perfect Test</h1>
          <p className="text-xs text-slate-400">Let's build a personalized learning experience just for you</p>

          <div className="flex items-center justify-center gap-3 pt-3">
            <span className="w-7 h-7 rounded-full bg-[#111b2b] text-slate-400 font-bold text-xs flex items-center justify-center border border-[#1a273b]">
              ✓
            </span>
            <div className="w-12 h-0.5 bg-blue-600" />
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-blue-600/30">
              2
            </span>
          </div>
        </div>

        <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Quick Start Card (From Video!) */}
          <div className="p-5 bg-gradient-to-r from-blue-950/60 via-[#111b2b] to-blue-950/40 border border-blue-500/50 rounded-2xl text-center space-y-3 shadow-md">
            <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Quick Start with Default Settings</span>
            </div>
            <p className="text-xs text-slate-300">
              Start immediately with recommended settings for <strong className="text-blue-300">{activeSubjectName}</strong>
            </p>
            <button
              onClick={handleStartLoading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>⚡ Start Test Now</span>
            </button>
          </div>

          {/* Customize Card */}
          <div className="p-4 bg-[#070d18] border border-[#1a273b] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Customize Your Test</div>
              <div className="text-[10px] text-slate-400">Adjust timer, negative marking rate, and questions</div>
            </div>
            <button
              onClick={handleStartLoading}
              className="px-4 py-2 bg-[#111b2b] hover:bg-[#162235] text-slate-200 border border-[#1e2f47] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Start Custom Test
            </button>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <button
              onClick={() => setStage('wizard_step1')}
              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 3: ANIMATED PREPARATION LOADING SCREEN (Matching Video!) ---
  if (stage === 'loading') {
    const steps = [
      'Analyzing test configuration...',
      'Generating questions based on your criteria...',
      'Preparing test environment...',
      'Almost ready...',
      'Redirecting to test...',
    ];

    return (
      <div className="min-h-[500px] flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md bg-[#0c1421] border border-[#1a273b] rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isDone = loadingStepIndex > idx;
              const isCurrent = loadingStepIndex === idx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 text-xs transition-all ${
                    isDone
                      ? 'text-white font-medium'
                      : isCurrent
                      ? 'text-blue-400 font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${
                      isDone
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : isCurrent
                        ? 'border-blue-400 text-blue-400 animate-spin'
                        : 'border-slate-800 text-transparent'
                    }`}
                  >
                    {isDone ? '✓' : isCurrent ? '○' : ''}
                  </div>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 4: FULL-LENGTH MOCK EXAM INTERFACE ---
  if (stage === 'exam') {
    const q = examQuestions[currentQuestionIdx];
    const minutes = Math.floor(examTimeRemaining / 60);
    const seconds = examTimeRemaining % 60;

    return (
      <div className="max-w-6xl mx-auto space-y-4 py-4 animate-fade-in">
        {/* Top Header Bar */}
        <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Full-length mock • Question {currentQuestionIdx + 1} of {examQuestions.length}
            </span>
            <div className="text-sm font-bold text-white mt-0.5">
              Discrete Mathematics & Boolean Logic
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock Countdown */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#070d18] border border-[#1a273b] flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Finish test
            </button>
          </div>
        </div>

        {/* Exam Two-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sections Sidebar (as seen in video!) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-200">Sections</div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#111b2b] border border-blue-500/50 text-xs text-white">
                  <div className="font-semibold">Properties of Boolean Algebra</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {Object.keys(selectedAnswers).filter(k => parseInt(k) < 3).length} of 3 answered
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#070d18] border border-[#1a273b] text-xs text-slate-300">
                  <div className="font-semibold">Boolean Algebra Axioms and Equivalences</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {Object.keys(selectedAnswers).filter(k => parseInt(k) >= 3).length} of 2 answered
                  </div>
                </div>
              </div>

              {/* Quick Question Buttons */}
              <div className="pt-2 border-t border-[#1a273b]">
                <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Jump to Question</div>
                <div className="flex gap-1.5 flex-wrap">
                  {examQuestions.map((_, i) => {
                    const isAns = selectedAnswers[i] !== undefined;
                    const isRev = reviewLater[i];
                    const isCurr = currentQuestionIdx === i;

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentQuestionIdx(i)}
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
                          isCurr
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : isRev
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : isAns
                            ? 'bg-slate-700 text-white'
                            : 'bg-[#070d18] text-slate-500 border border-[#1a273b]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Center Question Workspace */}
          <div className="lg:col-span-9 space-y-4">
            <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 shadow-xl space-y-6">
              {/* Question Header */}
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  {q.section}
                </span>
                <h2 className="text-base font-bold text-white mt-1">Question {currentQuestionIdx + 1}</h2>
              </div>

              {/* Question Body */}
              <p className="text-sm text-slate-200 leading-relaxed font-sans">{q.question}</p>

              {/* Options Cards */}
              <div className="space-y-3 pt-2">
                {q.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentQuestionIdx] === oIdx;

                  return (
                    <button
                      key={oIdx}
                      onClick={() =>
                        setSelectedAnswers(prev => ({
                          ...prev,
                          [currentQuestionIdx]: oIdx,
                        }))
                      }
                      className={`w-full text-left p-4 rounded-xl border text-xs font-sans transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500 text-white ring-1 ring-blue-500/50'
                          : 'bg-[#070d18] border-[#1a273b] text-slate-300 hover:bg-[#111b2b]'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#0c1421] border border-[#1a273b] flex items-center justify-center font-bold text-xs shrink-0 text-slate-400">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="leading-relaxed mt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Control Row */}
              <div className="pt-4 border-t border-[#1a273b] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!reviewLater[currentQuestionIdx]}
                      onChange={e =>
                        setReviewLater(prev => ({
                          ...prev,
                          [currentQuestionIdx]: e.target.checked,
                        }))
                      }
                      className="accent-blue-500"
                    />
                    <span>Review later</span>
                  </label>

                  {selectedAnswers[currentQuestionIdx] !== undefined && (
                    <button
                      onClick={() => {
                        const copy = { ...selectedAnswers };
                        delete copy[currentQuestionIdx];
                        setSelectedAnswers(copy);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Clear answer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                    className="px-4 py-2 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>

                  {currentQuestionIdx < examQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Review & submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal (From Video!) */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Submit your mock test?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Check the summary before finishing. You won't be able to change answers after submission.
              </p>

              <div className="grid grid-cols-3 gap-2 text-center py-2">
                <div className="p-2.5 bg-[#070d18] rounded-xl border border-[#1a273b]">
                  <div className="text-lg font-bold text-blue-400">
                    {Object.keys(selectedAnswers).length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Answered</div>
                </div>
                <div className="p-2.5 bg-[#070d18] rounded-xl border border-[#1a273b]">
                  <div className="text-lg font-bold text-slate-400">
                    {examQuestions.length - Object.keys(selectedAnswers).length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Unanswered</div>
                </div>
                <div className="p-2.5 bg-[#070d18] rounded-xl border border-[#1a273b]">
                  <div className="text-lg font-bold text-amber-400">
                    {Object.values(reviewLater).filter(Boolean).length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">For review</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2 bg-[#111b2b] text-slate-300 hover:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  Keep reviewing
                </button>
                <button
                  onClick={handleFinishExam}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Submit test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STAGE 5: COMPREHENSIVE RESULTS DASHBOARD (Exact Replica of the Video!) ---
  if (stage === 'results' && resultData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fade-in">
        {/* Results Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1a273b]">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">Tests &gt; Results</span>
            <h1 className="text-2xl font-bold text-white mt-0.5">Mock test results</h1>
          </div>
          <button
            onClick={() => setStage('wizard_step1')}
            className="px-3.5 py-1.5 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-xl text-xs font-semibold border border-[#1e2f47] cursor-pointer"
          >
            New Test
          </button>
        </div>

        {/* Score Card Banner & Review with AI Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Score Box (8 cols) */}
          <div className="md:col-span-8 bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Final score</span>
                <span className="text-4xl font-extrabold text-white">
                  {resultData.score}{' '}
                  <span className="text-lg text-slate-400 font-normal">/ {resultData.total_marks} marks</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-blue-400">{resultData.percentage}%</span>
                <span className="text-[11px] text-slate-400 block">score percentage</span>
              </div>
            </div>

            {/* How scoring works text */}
            <div className="pt-3 border-t border-[#1a273b] space-y-2">
              <div className="text-xs font-semibold text-slate-300">How scoring works</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <div>
                    <div className="font-semibold text-white">Right answer</div>
                    <div className="text-[10px] text-slate-400">You get 1 point</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center text-[10px]">
                    ✖
                  </span>
                  <div>
                    <div className="font-semibold text-white">Wrong answer</div>
                    <div className="text-[10px] text-slate-400">You lose 0.25 point</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                    -
                  </span>
                  <div>
                    <div className="font-semibold text-white">Skipped question</div>
                    <div className="text-[10px] text-slate-400">Score stays the same</div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Your result: You got {resultData.correct_count} right, {resultData.incorrect_count} wrong, and{' '}
                {resultData.unattempted_count} skipped. Your final score is {resultData.score}.
              </div>
            </div>
          </div>

          {/* Right Card: "Turn mistakes into a study plan" (From Video!) */}
          <div className="md:col-span-4 bg-gradient-to-br from-blue-950/70 to-[#0c1421] border border-blue-500/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Turn mistakes into a study plan</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Open every question in AI Chat to ask follow-ups, compare approaches, and review weak areas.
              </p>
            </div>

            <button
              onClick={handleReviewWithAI}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review with AI</span>
            </button>
          </div>
        </div>

        {/* Stats Metric Bar (From Video!) */}
        <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div>
            <div className="text-base font-bold text-white">{resultData.correct_count}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Correct</div>
          </div>
          <div>
            <div className="text-base font-bold text-white">{resultData.incorrect_count}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Incorrect</div>
          </div>
          <div>
            <div className="text-base font-bold text-white">{resultData.unattempted_count}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Unattempted</div>
          </div>
          <div>
            <div className="text-base font-bold text-blue-400">{resultData.accuracy}%</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</div>
          </div>
          <div>
            <div className="text-base font-bold text-white">0:{resultData.total_time_secs}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total time</div>
          </div>
        </div>

        {/* Tabs: Summary / Sections / Time / Answers */}
        <div className="flex bg-[#070d18] border border-[#1a273b] rounded-xl p-1 gap-1 max-w-md">
          {(['Summary', 'Sections', 'Time', 'Answers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveResultTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeResultTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB 1: SUMMARY */}
        {activeResultTab === 'Summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attempt Breakdown */}
            <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">Attempt breakdown</h4>
              <div className="w-full h-3 bg-[#070d18] rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(resultData.correct_count / examQuestions.length) * 100}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${(resultData.incorrect_count / examQuestions.length) * 100}%` }}
                />
              </div>

              <div className="flex justify-between text-xs pt-2">
                <span className="text-slate-400">Attempt Rate: <strong className="text-white">100.0%</strong></span>
                <span className="text-slate-400">Avg Time / Question: <strong className="text-white">0:04</strong></span>
              </div>
            </div>

            {/* Where to focus */}
            <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">Where to focus</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-[#070d18] rounded-xl">
                  <span className="text-slate-200">Boolean Algebra Axioms and Equivalences</span>
                  <span className="text-emerald-400 font-bold font-mono">100.0%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#070d18] rounded-xl">
                  <span className="text-slate-200">Properties of Boolean Algebra</span>
                  <span className="text-amber-400 font-bold font-mono">67.0%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECTIONS */}
        {activeResultTab === 'Sections' && (
          <div className="space-y-4">
            {resultData.sections.map((sec, idx) => (
              <div key={idx} className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{sec.name}</h4>
                    <span className="text-xs text-slate-400">
                      {sec.score} of {sec.max_score} marks • 0:{sec.time_secs} Total
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-400 text-xs font-bold border border-emerald-800">
                      {sec.correct} Correct
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-400 text-xs font-bold border border-rose-800">
                      {sec.wrong} Wrong
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#070d18] rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${sec.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: TIME */}
        {activeResultTab === 'Time' && (
          <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white">Longest questions</h4>
            <div className="space-y-2 text-xs">
              {resultData.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#070d18] rounded-xl flex items-center justify-between gap-4 border border-[#1a273b]"
                >
                  <span className="text-slate-300 truncate max-w-lg">
                    {idx + 1}. {q.question}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 font-mono">0:{q.time_spent_secs || 5}</span>
                    {q.user_selected_index === q.correct_option_index ? (
                      <span className="text-emerald-400 font-bold">✓ Correct</span>
                    ) : (
                      <span className="text-rose-400 font-bold">✖ Incorrect</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ANSWERS (Detailed Option Explanations from Video!) */}
        {activeResultTab === 'Answers' && (
          <div className="space-y-4">
            {resultData.questions.map((q, idx) => {
              const isCorrect = q.user_selected_index === q.correct_option_index;

              return (
                <div
                  key={idx}
                  className={`bg-[#0c1421] border rounded-2xl p-6 space-y-4 ${
                    isCorrect ? 'border-[#1a273b]' : 'border-rose-900/60 ring-1 ring-rose-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#1a273b]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                      {q.section}
                    </span>
                    {isCorrect ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-relaxed">
                    {idx + 1}. {q.question}
                  </h3>

                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isOptionCorrect = q.correct_option_index === oIdx;
                      const isUserChoice = q.user_selected_index === oIdx;

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                            isOptionCorrect
                              ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100 font-medium'
                              : isUserChoice
                              ? 'bg-rose-950/60 border-rose-500/70 text-rose-100 font-medium'
                              : 'bg-[#070d18] border-[#1a273b] text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold font-mono">{String.fromCharCode(65 + oIdx)}</span>
                            <span>{opt}</span>
                          </div>
                          {isOptionCorrect && (
                            <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                              Correct answer
                            </span>
                          )}
                          {isUserChoice && !isOptionCorrect && (
                            <span className="text-[10px] bg-rose-900/80 text-rose-300 px-2 py-0.5 rounded font-bold uppercase">
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Collapsible / Visible Explanation Box */}
                  <div className="p-4 bg-[#070d18] rounded-xl border border-[#1a273b] space-y-1 text-xs">
                    <div className="text-[11px] font-bold text-blue-400 uppercase">Explanation:</div>
                    <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};
