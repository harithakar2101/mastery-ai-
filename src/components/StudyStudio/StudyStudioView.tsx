import React, { useState, useEffect, useRef } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  RotateCw,
  Edit3,
  AlertTriangle,
  TrendingUp,
  Upload,
  FileText,
  File,
  ArrowRight,
  ChevronDown,
  Check,
  Search,
  RefreshCw,
  ExternalLink,
  Target,
  Zap,
  Sliders,
  BrainCircuit,
  Save,
  X,
} from 'lucide-react';
import type {
  StudyStudioState,
  StudyDaySchedule,
  StudioFlashcard,
  SummarySection,
  StudioPracticeQuestion,
} from '../../types/studyStudio';

export const StudyStudioView: React.FC = () => {
  const { userProfile, activeTrack, dkmNodes, setDkmNodes } = useTutor();

  // Mode: 'wizard' | 'uploading' | 'studio'
  const [viewStep, setViewStep] = useState<'wizard' | 'uploading' | 'studio'>('wizard');
  const [activeTab, setActiveTab] = useState<'plan' | 'flashcards' | 'summary' | 'practice'>('plan');

  // Wizard state
  const [courseTopic, setCourseTopic] = useState(
    activeTrack !== 'All Tracks' ? activeTrack : 'Web Application Development'
  );
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [targetGrade, setTargetGrade] = useState<number>(9); // 4 to 10 scale
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number>(45);

  // Upload state
  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload & Extraction Progress state
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [extractionStage, setExtractionStage] = useState<string>('');

  // Studio data state
  const [studioState, setStudioState] = useState<StudyStudioState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Flashcard review state
  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardSearch, setCardSearch] = useState<string>('');
  const [editingCard, setEditingCard] = useState<StudioFlashcard | null>(null);

  // Practice questions state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});
  const [editingQuestion, setEditingQuestion] = useState<StudioPracticeQuestion | null>(null);

  // Summary edit state
  const [editingSection, setEditingSection] = useState<SummarySection | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch active studio state on initial load
  useEffect(() => {
    fetchStudioState();
  }, []);

  const fetchStudioState = async () => {
    try {
      const res = await fetch('/api/study-studio/state');
      if (res.ok) {
        const data = await res.json();
        if (data.hasActivePlan && data.config) {
          setStudioState({
            config: data.config,
            summary: data.summary,
            concepts: data.concepts,
            flashcards: data.flashcards,
            practiceQuestions: data.practiceQuestions,
            schedule: data.schedule,
            latestRePlanNote: data.latestRePlanNote,
            provenance: data.provenance,
            generatedAt: data.config.generatedAt || new Date().toISOString(),
          });
          setViewStep('studio');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch existing studio state:', err);
    }
  };

  // Trade-off Calculation
  const daysDiff = Math.max(1, Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const targetPercent = Math.round(targetGrade * 10);

  const getTradeOffText = () => {
    if (targetGrade >= 9) {
      if (dailyStudyMinutes < 30) {
        return `⚠️ Trade-off Alert: Targeting ${targetPercent}% (Grade ${targetGrade}/10) in ${daysDiff} days with only ${dailyStudyMinutes} mins/day is mathematically constrained. We recommend 45+ mins/day to ensure full concept retention.`;
      }
      return `🎯 Excellence Target: Targeting ${targetPercent}% (Grade ${targetGrade}/10) with ${dailyStudyMinutes} mins/day across ${daysDiff} days. The system will schedule deep retrieval practice and early weak-concept reinforcement.`;
    }
    if (targetGrade >= 7) {
      return `📈 Proficient Target: Targeting ${targetPercent}% (Grade ${targetGrade}/10) with ${dailyStudyMinutes} mins/day across ${daysDiff} days. A steady SM-2 schedule balances core theory with targeted question practice.`;
    }
    return `⏱️ Foundation Target: Targeting ${targetPercent}% (Grade ${targetGrade}/10) with ${dailyStudyMinutes} mins/day across ${daysDiff} days. Focus is prioritized strictly on high-yield core code invariants.`;
  };

  // Handle file drop & selection
  const handleFileProcess = (file: File) => {
    setUploadError(null);
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File exceeds the 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError(`Unsupported file format. Please upload a PDF, DOCX, or TXT file.`);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1] || result;
      setFileBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Load sample course text for instant 1-click test
  const handleLoadSample = () => {
    setUploadTab('text');
    setPastedText(`Course Syllabus & Module Notes: Web Application Development (CSE-304)
Instructor: Prof. David Thorne | Exam Weight: 100%

Module 1: Server Architecture & DocumentRoot Mapping
The web server binds to incoming network sockets and maps the URL path directly to a root filesystem location defined by DocumentRoot. When DocumentRoot is misconfigured or lacks DirectoryIndex permissions, error AH01276 (HTTP 403 Forbidden) is logged. Directories outside the DocumentRoot require explicit Alias directives combined with Directory permission container blocks.

Module 2: Database Protocols & Port Segregation
Database servers run as background daemons distinct from web application workers. The MySQL daemon listens on standard TCP port 3306. A common developer pitfall is attempting connection over web ports (80/8080) or failing to distinguish between localhost (UNIX domain socket) and 127.0.0.1 (TCP loopback). Error SQLSTATE[HY000] [2002] indicates connection refused due to port or daemon state.

Module 3: Defensive Data Access & SQL Injection Invariants
Prepared statements guarantee that parameter tokens are separated from SQL syntax compilation. Using parameter placeholders (?) ensures that user input cannot alter the execution logic of the query. Column names and LIMIT directives cannot be parameterized and must be verified against strict whitelist maps.

Module 4: Concurrency, Asynchronous Loops & Memory Safety
The JavaScript runtime uses an event loop with strict microtask queue prioritization. Promise resolution microtasks run before macrotasks (setTimeout). In native systems, recursive algorithms must prove base-case termination invariants to prevent stack overflow memory corruption. Mutual exclusion must employ strict lock ordering to avoid the 4 Coffman deadlock conditions.`);
  };

  // Trigger Study Studio Generation
  const handleGeneratePlan = async () => {
    setViewStep('uploading');
    setProgressPercent(10);
    setExtractionStage('Uploading study materials (validating payload < 20 MB)...');

    try {
      const timer1 = setTimeout(() => {
        setProgressPercent(35);
        setExtractionStage('Analyzing syllabus structure and extracting core concept nodes...');
      }, 700);

      const timer2 = setTimeout(() => {
        setProgressPercent(65);
        setExtractionStage('Formulating BKT-weighted day-by-day study schedule & Leitner cards...');
      }, 1400);

      const timer3 = setTimeout(() => {
        setProgressPercent(88);
        setExtractionStage('Synthesizing hierarchical summary & practice questions...');
      }, 2100);

      const res = await fetch('/api/study-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTopic,
          examDate,
          targetGrade,
          dailyStudyMinutes,
          fileBase64: selectedFile ? fileBase64 : undefined,
          fileName: selectedFile?.name,
          fileMimeType: selectedFile?.type || (selectedFile?.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
          pastedText: uploadTab === 'text' || !selectedFile ? pastedText : undefined,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setProgressPercent(100);
      setExtractionStage('Finalizing Study Studio Workspace...');

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || 'Generation failed');
      }

      const data = await res.json();
      setStudioState({
        config: data.config,
        summary: data.summary,
        concepts: data.concepts,
        flashcards: data.flashcards,
        practiceQuestions: data.practiceQuestions,
        schedule: data.schedule,
        latestRePlanNote: data.latestRePlanNote,
        provenance: data.provenance,
        generatedAt: data.generatedAt,
      });

      setTimeout(() => {
        setViewStep('studio');
      }, 400);
    } catch (err: any) {
      setUploadError(err?.message || 'Generation failed. Please try again.');
      setViewStep('wizard');
    }
  };

  // Rate a flashcard (Feeding SM-2 & BKT and Adaptive Re-planning!)
  const handleRateCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!studioState || !studioState.flashcards || studioState.flashcards.length === 0) return;
    const currentCard = studioState.flashcards[currentCardIdx];
    if (!currentCard) return;

    try {
      const res = await fetch('/api/study-studio/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
          conceptId: currentCard.conceptId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update studio state with updated card, schedule, and re-plan note!
        setStudioState(prev => {
          if (!prev) return prev;
          const updatedCards = [...prev.flashcards];
          updatedCards[currentCardIdx] = data.updatedCard;
          return {
            ...prev,
            flashcards: updatedCards,
            schedule: data.updatedSchedule || prev.schedule,
            latestRePlanNote: data.rePlanNote || prev.latestRePlanNote,
          };
        });

        // Also update local DKM nodes retention if present
        if (data.updatedMastery && dkmNodes) {
          setDkmNodes(prev =>
            prev.map(n =>
              n.id === currentCard.conceptId
                ? {
                    ...n,
                    mastery: data.updatedMastery,
                    status: data.updatedMastery >= 0.8 ? 'GREEN' : data.updatedMastery >= 0.5 ? 'YELLOW' : 'RED',
                  }
                : n
            )
          );
        }

        // Advance to next card
        setIsFlipped(false);
        if (currentCardIdx < studioState.flashcards.length - 1) {
          setCurrentCardIdx(c => c + 1);
        } else {
          setCurrentCardIdx(0);
        }
      }
    } catch (err) {
      console.error('Failed to rate card:', err);
    }
  };

  // Save student edited content
  const handleSaveEditedCard = async () => {
    if (!editingCard || !studioState) return;
    const updatedCards = studioState.flashcards.map(c => (c.id === editingCard.id ? editingCard : c));
    setStudioState(prev => (prev ? { ...prev, flashcards: updatedCards } : prev));
    setEditingCard(null);

    await fetch('/api/study-studio/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcards: updatedCards }),
    });
  };

  const handleSaveEditedSection = async () => {
    if (!editingSection || !studioState) return;
    const updatedSummary = studioState.summary.map(s => (s.id === editingSection.id ? editingSection : s));
    setStudioState(prev => (prev ? { ...prev, summary: updatedSummary } : prev));
    setEditingSection(null);

    await fetch('/api/study-studio/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: updatedSummary }),
    });
  };

  const handleSaveEditedQuestion = async () => {
    if (!editingQuestion || !studioState) return;
    const updatedQuestions = studioState.practiceQuestions.map(q => (q.id === editingQuestion.id ? editingQuestion : q));
    setStudioState(prev => (prev ? { ...prev, practiceQuestions: updatedQuestions } : prev));
    setEditingQuestion(null);

    await fetch('/api/study-studio/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practiceQuestions: updatedQuestions }),
    });
  };

  // ------------------------------------------------------------------------------------------------
  // RENDER: Loading / Extraction View
  // ------------------------------------------------------------------------------------------------
  if (viewStep === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 animate-pulse">
          <BrainCircuit className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Architecting Your Study Studio</h2>
        <p className="text-slate-400 text-sm mb-8">{extractionStage}</p>

        {/* Progress bar */}
        <div className="w-full bg-[#111c2e] border border-[#1e2f47] rounded-full h-3 p-0.5 overflow-hidden mb-4">
          <div
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between w-full text-xs text-slate-500 font-mono">
          <span>Psychometric Analysis</span>
          <span>{progressPercent}% Complete</span>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------------------------------
  // RENDER: Setup Wizard & Material Upload View
  // ------------------------------------------------------------------------------------------------
  if (viewStep === 'wizard') {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Exam Preparation & Psychometric Mastery</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Mastery.ai Study Studio
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Design an adaptive, BKT-weighted exam preparation curriculum. Upload your syllabus or lecture notes to automatically generate hierarchical summaries, spaced flashcards, and a day-by-day plan.
          </p>
        </div>

        {uploadError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Wizard Card */}
        <div className="bg-[#0b1320] border border-[#1a293f] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
          {/* Step 1: Course & Goal Configuration */}
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Step 1: Exam & Pacing Target</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course / Topic */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Course / Exam Topic
                </label>
                <select
                  value={courseTopic}
                  onChange={e => setCourseTopic(e.target.value)}
                  className="w-full bg-[#101b2d] border border-[#1e2e47] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Web Application Development">Web Application Development (Apache, PHP PDO, SQL)</option>
                  <option value="Systems & Artificial Intelligence">Systems & Operating Systems (Deadlocks, Concurrency, Virtual Memory)</option>
                  <option value="Data Structures & Algorithms">Data Structures & Algorithms (Trees, Graphs, Recursion)</option>
                  <option value="Mechanical Engineering Design & CAD">Mechanical Engineering (CAD, Constraints, Degrees of Freedom)</option>
                  <option value="Computer Networks & Protocols">Computer Networks (TCP 3-Way Handshake, Sockets, OSI)</option>
                </select>
              </div>

              {/* Exam Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Exam Date ({daysDiff} days remaining)
                </label>
                <input
                  type="date"
                  value={examDate}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full bg-[#101b2d] border border-[#1e2e47] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Target Grade Slider */}
              <div className="md:col-span-2 bg-[#080e18] p-4 rounded-xl border border-[#152336]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Target Grade Slider
                  </label>
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Grade {targetGrade}/10 ({targetPercent}% Target)
                  </span>
                </div>

                <input
                  type="range"
                  min="4"
                  max="10"
                  step="1"
                  value={targetGrade}
                  onChange={e => setTargetGrade(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg mb-2"
                />

                <div className="flex justify-between text-[11px] text-slate-500 font-mono px-1">
                  <span>4 (40% Pass)</span>
                  <span>6 (60% Good)</span>
                  <span>8 (80% Advanced)</span>
                  <span className="text-blue-400 font-bold">10 (100% Mastery)</span>
                </div>

                {/* Trade-off dynamic text */}
                <div className="mt-3 p-3 rounded-lg bg-blue-950/30 border border-blue-800/30 text-xs text-blue-200">
                  {getTradeOffText()}
                </div>
              </div>

              {/* Daily Study Minutes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Daily Study Commitment: <strong className="text-blue-400">{dailyStudyMinutes} minutes/day</strong>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[15, 30, 45, 60, 90].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyStudyMinutes(mins)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                        dailyStudyMinutes === mins
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-[#101b2d] text-slate-400 border-[#1e2e47] hover:bg-[#16253d]'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Study Material Upload */}
          <div className="border-t border-[#1a293f] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Step 2: Upload Syllabus, Notes or Slides (Max 20 MB)</span>
              </h2>

              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Use Sample Material (1-Click Demo)</span>
              </button>
            </div>

            {/* Upload Method Selector */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setUploadTab('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  uploadTab === 'file'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'bg-[#101b2d] text-slate-400 border border-transparent'
                }`}
              >
                Upload File (PDF / DOCX / TXT)
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  uploadTab === 'text'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'bg-[#101b2d] text-slate-400 border border-transparent'
                }`}
              >
                Paste Text / Outline
              </button>
            </div>

            {uploadTab === 'file' ? (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-500/10'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-[#1e2f47] bg-[#0c1524] hover:border-slate-600'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white mb-1">{selectedFile.name}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Server-Side Gemini Extraction
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFileBase64('');
                      }}
                      className="mt-3 text-xs text-red-400 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/60 text-slate-400 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-1">
                      Drag & Drop your course PDF, DOCX, or TXT here
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      Max file size: 20 MB (Validated & sent server-side via inline document parts)
                    </p>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-md">
                      Browse Computer
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your course outline, lecture transcripts, or textbook chapters here..."
                  className="w-full h-44 bg-[#0c1524] border border-[#1e2f47] rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 font-mono block mt-1 text-right">
                  {pastedText.length} characters
                </span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="border-t border-[#1a293f] pt-6 flex items-center justify-between">
            {studioState ? (
              <button
                type="button"
                onClick={() => setViewStep('studio')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Return to Active Studio</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                AI Socratic Engine will analyze materials and generate 20+ cards
              </span>
            )}

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isLoading || (!selectedFile && !pastedText.trim())}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                !selectedFile && !pastedText.trim()
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Study Studio Package</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------------------------------
  // RENDER: Active Study Studio Workspace
  // ------------------------------------------------------------------------------------------------
  if (!studioState) return null;

  const currentCard = studioState.flashcards[currentCardIdx] || studioState.flashcards[0];
  const todaySchedule = studioState.schedule.find(s => s.status === 'today') || studioState.schedule[0];

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-[#0b1320] border border-[#1a293f] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Exam Studio
            </span>
            <span
              className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                studioState.provenance === 'LIVE AI'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {studioState.provenance === 'LIVE AI' ? '● LIVE AI' : '● FALLBACK ENGINE'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: Grade {studioState.config.targetGrade}/10 ({studioState.config.targetPercentage}%)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {studioState.config.courseTopic}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Exam: {studioState.config.examDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {studioState.config.dailyStudyMinutes} mins/day
            </span>
            <span>•</span>
            <span className="text-slate-300 font-semibold">
              {studioState.flashcards.length} Flashcards
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewStep('wizard')}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#121c2d] hover:bg-[#1a293f] border border-[#1e2f47] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Re-configure Target</span>
          </button>
        </div>
      </div>

      {/* Adaptive Re-planning Note Banner */}
      {studioState.latestRePlanNote && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-[#0b1320] border border-blue-500/30 shadow-lg flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-300 tracking-wide uppercase">
                Adaptive Re-planning Note
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Dynamic BKT Feedback</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {studioState.latestRePlanNote}
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[#1a293f] gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('plan')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'plan'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Study Plan & Today</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'flashcards'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Flashcards ({studioState.flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'summary'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Hierarchical Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('practice')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'practice'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Practice Questions ({studioState.practiceQuestions.length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------------------------------------------- */}
      {/* TAB 1: STUDY PLAN & TODAY */}
      {/* ---------------------------------------------------------------------------------------- */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Today's Focus Action Card */}
          {todaySchedule && (
            <div className="bg-[#0b1320] border border-blue-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-[11px] font-bold font-mono text-emerald-400 uppercase tracking-wider">
                    ● Today's Action Plan ({todaySchedule.date})
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Daily Goal: {todaySchedule.targetMinutes} Study Minutes
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-mono">Today's Cards</span>
                    <strong className="text-sm text-white">0 / {todaySchedule.scheduledCardsCount}</strong>
                  </div>
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Flashcard Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todaySchedule.tasks?.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#101b2d] border border-[#1e2f47]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-200">{task.title}</span>
                  </div>
                ))}
              </div>

              {/* Priority Concepts today */}
              {todaySchedule.focusConcepts && todaySchedule.focusConcepts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#1a293f] flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 font-mono">Priority Focus:</span>
                  {todaySchedule.focusConcepts.map((fc, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-[#16253c] text-blue-300 font-medium text-[11px]"
                    >
                      {fc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Day-by-Day Timeline Calendar */}
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Full Schedule (Today through Exam Date)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studioState.schedule.map((day, idx) => (
                <div
                  key={day.date}
                  className={`p-4 rounded-xl border transition-all ${
                    day.status === 'today'
                      ? 'bg-blue-950/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : 'bg-[#0b1320] border-[#1a293f] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white font-mono">
                      Day {day.dayIndex} • {day.date}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        day.status === 'today'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {day.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mb-3 font-mono flex items-center gap-2">
                    <span>{day.targetMinutes} mins</span>
                    <span>•</span>
                    <span>{day.scheduledCardsCount} flashcards</span>
                  </div>

                  {day.focusConcepts && day.focusConcepts.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Focus Topics:</span>
                      {day.focusConcepts.map((c, i) => (
                        <div key={i} className="text-xs text-slate-300 truncate">
                          • {c}
                        </div>
                      ))}
                    </div>
                  )}

                  {day.rePlanReason && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 mt-2 font-mono">
                      ⚡ Re-scheduled: {day.rePlanReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------------- */}
      {/* TAB 2: FLASHCARDS (SM-2 & LEITNER ENGINE) */}
      {/* ---------------------------------------------------------------------------------------- */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Review Progress Counter */}
          <div className="bg-[#0b1320] border border-[#1a293f] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                {currentCardIdx + 1}
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-mono">
                  Card {currentCardIdx + 1} of {studioState.flashcards.length}
                </span>
                <span className="text-sm font-bold text-white">
                  Today's Counter: 0 / {studioState.flashcards.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Box {currentCard?.leitnerBox || 1} • Interval: {currentCard?.intervalDays || 1}d
              </span>
              <button
                onClick={() => setEditingCard(currentCard)}
                className="p-1.5 rounded-lg bg-[#121c2d] hover:bg-[#1a293f] text-slate-300 border border-[#1e2f47] cursor-pointer"
                title="Edit Card"
              >
                <Edit3 className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>

          {/* 3D Flip Card */}
          {currentCard && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-[#0d1626] border border-[#1e2f47] rounded-2xl p-8 min-h-[300px] flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-all shadow-xl select-none relative group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-4">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {currentCard.conceptName}
                </span>
                <span className="text-[11px] text-amber-400">
                  {currentCard.sourceRef}
                </span>
              </div>

              <div className="my-auto text-center py-6">
                {!isFlipped ? (
                  <div>
                    <span className="text-xs uppercase font-mono text-slate-500 tracking-wider block mb-2">
                      Prompt / Question
                    </span>
                    <p className="text-lg sm:text-xl font-bold text-white max-w-2xl mx-auto leading-relaxed">
                      {currentCard.question}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs uppercase font-mono text-emerald-400 tracking-wider block mb-2">
                      Verified Answer & Invariant
                    </span>
                    <p className="text-base sm:text-lg text-slate-100 max-w-2xl mx-auto leading-relaxed">
                      {currentCard.answer}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click card to {isFlipped ? 'view prompt' : 'reveal answer'}</span>
              </div>
            </div>
          )}

          {/* Recall Rating Buttons (Again, Hard, Good, Easy) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleRateCard('again')}
              className="p-3.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <span className="text-sm font-bold">Again</span>
              <span className="text-[10px] text-red-400 font-mono">Reset to 1d (Move to Tomorrow)</span>
            </button>

            <button
              onClick={() => handleRateCard('hard')}
              className="p-3.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 text-amber-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <span className="text-sm font-bold">Hard</span>
              <span className="text-[10px] text-amber-400 font-mono">1 day interval</span>
            </button>

            <button
              onClick={() => handleRateCard('good')}
              className="p-3.5 rounded-xl bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/30 text-blue-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <span className="text-sm font-bold">Good</span>
              <span className="text-[10px] text-blue-400 font-mono">+3 days expansion</span>
            </button>

            <button
              onClick={() => handleRateCard('easy')}
              className="p-3.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <span className="text-sm font-bold">Easy</span>
              <span className="text-[10px] text-emerald-400 font-mono">+7 days bonus</span>
            </button>
          </div>

          {/* All Cards Table / Browser */}
          <div className="bg-[#0b1320] border border-[#1a293f] rounded-2xl p-5 mt-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white">
                All Course Flashcards ({studioState.flashcards.length})
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter cards by concept..."
                  value={cardSearch}
                  onChange={e => setCardSearch(e.target.value)}
                  className="bg-[#101b2d] border border-[#1e2f47] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {studioState.flashcards
                .filter(
                  c =>
                    !cardSearch ||
                    c.question.toLowerCase().includes(cardSearch.toLowerCase()) ||
                    c.conceptName.toLowerCase().includes(cardSearch.toLowerCase())
                )
                .map((card, idx) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-xl bg-[#0f1827] border border-[#18263a] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 truncate">
                      <span className="text-blue-400 font-medium mr-2">[{card.conceptName}]</span>
                      <span className="text-slate-300">{card.question}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-amber-400 font-mono">{card.sourceRef}</span>
                      <button
                        onClick={() => {
                          setCurrentCardIdx(idx);
                          setIsFlipped(false);
                        }}
                        className="px-2 py-1 rounded bg-[#18263a] hover:bg-[#20334e] text-slate-300 text-[11px] cursor-pointer"
                      >
                        Study
                      </button>
                      <button
                        onClick={() => setEditingCard(card)}
                        className="p-1 rounded bg-[#18263a] hover:bg-[#20334e] text-slate-400 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------------- */}
      {/* TAB 3: HIERARCHICAL SUMMARY */}
      {/* ---------------------------------------------------------------------------------------- */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Extracted hierarchical summary organized by core architectural modules. Available anytime for review.
            </p>
          </div>

          {studioState.summary.map(section => (
            <div
              key={section.id}
              className="bg-[#0b1320] border border-[#1a293f] rounded-2xl p-5 shadow-lg relative group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">{section.title}</h3>
                <button
                  onClick={() => setEditingSection(section)}
                  className="px-2.5 py-1 rounded-lg bg-[#121c2d] hover:bg-[#1a293f] text-slate-300 border border-[#1e2f47] text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-blue-400" />
                  <span>Edit Section</span>
                </button>
              </div>

              {section.keyTakeaway && (
                <div className="mb-3 p-3 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200">
                  <strong className="text-blue-300 mr-1.5">Key Invariant:</strong>
                  {section.keyTakeaway}
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed mb-4 whitespace-pre-line font-sans">
                {section.content}
              </p>

              {section.subtopics && section.subtopics.length > 0 && (
                <div className="pt-3 border-t border-[#162438]">
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block mb-1.5">
                    Core Subtopics & Proofs:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    {section.subtopics.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------------------------------- */}
      {/* TAB 4: PRACTICE QUESTIONS */}
      {/* ---------------------------------------------------------------------------------------- */}
      {activeTab === 'practice' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            Psychometric practice questions generated from material source references. Check answers for instant rationale.
          </p>

          {studioState.practiceQuestions.map((q, idx) => {
            const selectedOpt = selectedAnswers[q.id];
            const isAnswered = selectedOpt !== undefined;
            const isCorrect = selectedOpt === q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-[#0b1320] border border-[#1a293f] rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="text-blue-400 font-bold">
                    Question {idx + 1} • {q.conceptName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-[11px]">{q.sourceRef}</span>
                    <button
                      onClick={() => setEditingQuestion(q)}
                      className="p-1 rounded bg-[#121c2d] hover:bg-[#1a293f] text-slate-400 cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed">{q.question}</p>

                {/* Options */}
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isThisSelected = selectedOpt === optIdx;
                    let optionClass = 'bg-[#101b2d] border-[#1e2f47] text-slate-200 hover:bg-[#16253d]';

                    if (isAnswered) {
                      if (optIdx === q.correctIndex) {
                        optionClass = 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 font-semibold';
                      } else if (isThisSelected) {
                        optionClass = 'bg-red-950/30 border-red-500/50 text-red-200';
                      } else {
                        optionClass = 'bg-[#101b2d]/50 border-slate-800 text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                        className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${optionClass}`}
                      >
                        <span>{opt}</span>
                        {isAnswered && optIdx === q.correctIndex && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {isAnswered && isThisSelected && optIdx !== q.correctIndex && (
                          <X className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isAnswered && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-red-950/20 border-red-500/30 text-red-200'
                    }`}
                  >
                    <strong className="block mb-1">
                      {isCorrect ? '✅ Correct Invariant:' : '❌ Pedagogical Explanation:'}
                    </strong>
                    <p>{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------------------------------- */}
      {/* MODAL: EDIT FLASHCARD */}
      {/* ---------------------------------------------------------------------------------------- */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1320] border border-[#1a293f] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>Edit Flashcard</span>
              <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Concept Name</label>
              <input
                type="text"
                value={editingCard.conceptName}
                onChange={e => setEditingCard({ ...editingCard, conceptName: e.target.value })}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prompt / Question</label>
              <textarea
                value={editingCard.question}
                onChange={e => setEditingCard({ ...editingCard, question: e.target.value })}
                rows={3}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg p-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Answer</label>
              <textarea
                value={editingCard.answer}
                onChange={e => setEditingCard({ ...editingCard, answer: e.target.value })}
                rows={3}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg p-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Reference</label>
              <input
                type="text"
                value={editingCard.sourceRef}
                onChange={e => setEditingCard({ ...editingCard, sourceRef: e.target.value })}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedCard}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------------- */}
      {/* MODAL: EDIT SUMMARY SECTION */}
      {/* ---------------------------------------------------------------------------------------- */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1320] border border-[#1a293f] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>Edit Summary Section</span>
              <button onClick={() => setEditingSection(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Section Title</label>
              <input
                type="text"
                value={editingSection.title}
                onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Key Takeaway</label>
              <input
                type="text"
                value={editingSection.keyTakeaway}
                onChange={e => setEditingSection({ ...editingSection, keyTakeaway: e.target.value })}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Summary Content</label>
              <textarea
                value={editingSection.content}
                onChange={e => setEditingSection({ ...editingSection, content: e.target.value })}
                rows={5}
                className="w-full bg-[#101b2d] border border-[#1e2f47] rounded-lg p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedSection}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
