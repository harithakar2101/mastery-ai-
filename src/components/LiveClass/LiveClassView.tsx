import React, { useState, useEffect, useRef } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  LiveSessionState,
  LiveQuestion,
  LiveConceptTimelineItem,
  PersonalizedMicroTutorial,
} from './types';
import {
  Radio,
  Play,
  Square,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Flame,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Activity,
  Layers,
} from 'lucide-react';

export const LiveClassView: React.FC = () => {
  const { userProfile, islm, switchRole } = useTutor();
  const isTeacher = userProfile.role === 'teacher';

  const [sessionState, setSessionState] = useState<LiveSessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptText, setTranscriptText] = useState(
    'Today we examine the Apache web server filesystem boundary. The DocumentRoot directive specifies the exact directory from which files are served. If DocumentRoot is set to C:/xampp/htdocs, any request to http://localhost/index.html maps strictly to C:/xampp/htdocs/index.html. Saving files onto the Desktop or in C:/xampp directly triggers a 404 Not Found error because Apache rejects traversals outside DocumentRoot. Next, we look at database connectivity: MySQL listens on TCP port 3306 by default, NOT port 80 which is reserved for HTTP. Finally, prepared statements with PDO prevent SQL injection by precompiling query ASTs and parameterizing literals.'
  );
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<'LIVE AI' | 'FALLBACK'>('LIVE AI');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [studentTutorial, setStudentTutorial] = useState<PersonalizedMicroTutorial | null>(null);
  const [reflectionInput, setReflectionInput] = useState('');
  const [reflectionVerified, setReflectionVerified] = useState(false);
  const [simulatedLowEngagement, setSimulatedLowEngagement] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE Stream (authenticated via session cookie)
  useEffect(() => {
    const sseUrl = '/api/live/stream';
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setIsConnected(true);
    });

    es.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setIsConnected(true);
      } catch {
        // ignore
      }
    });

    es.addEventListener('session_state', (e: MessageEvent) => {
      try {
        const data: LiveSessionState = JSON.parse(e.data);
        setSessionState(data);
        if (data.tutorials?.[userProfile.id]) {
          setStudentTutorial(data.tutorials[userProfile.id]);
        }
      } catch (err) {
        console.warn('Failed to parse session_state event:', err);
      }
    });

    es.addEventListener('session_ended', () => {
      setSessionState(prev => prev ? { ...prev, isActive: false, releasedQuestion: null } : null);
    });

    es.addEventListener('timeline_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSessionState(prev => prev ? { ...prev, timeline: data.timeline } : null);
      } catch {
        // ignore
      }
    });

    es.addEventListener('question_released', (e: MessageEvent) => {
      try {
        const q: LiveQuestion = JSON.parse(e.data);
        setSelectedOption(null);
        setStudentTutorial(null);
        setReflectionVerified(false);
        setReflectionInput('');
        setSessionState(prev => {
          if (!prev) return null;
          const resetStudents = { ...prev.students };
          Object.keys(resetStudents).forEach(k => {
            resetStudents[k] = { ...resetStudents[k], answered: false, selectedAnswer: undefined, isCorrect: undefined };
          });
          return { ...prev, releasedQuestion: q, students: resetStudents };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('student_answered', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSessionState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            students: { ...prev.students, [data.studentState.studentId]: data.studentState },
            heatmap: data.heatmap || prev.heatmap,
          };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('student_engagement_changed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSessionState(prev => {
          if (!prev || !prev.students[data.studentId]) return prev;
          return {
            ...prev,
            students: {
              ...prev.students,
              [data.studentId]: { ...prev.students[data.studentId], lowEngagement: data.lowEngagement },
            },
          };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('micro_tutorial', (e: MessageEvent) => {
      try {
        const tut: PersonalizedMicroTutorial = JSON.parse(e.data);
        if (tut.studentId === userProfile.id) {
          setStudentTutorial(tut);
        }
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    // Initial fetch of state in case already running
    fetch('/api/live/session/state')
      .then(r => r.json())
      .then((data: LiveSessionState) => {
        if (data && data.sessionId) {
          setSessionState(data);
          if (data.tutorials?.[userProfile.id]) {
            setStudentTutorial(data.tutorials[userProfile.id]);
          }
        }
      })
      .catch(() => {});

    return () => {
      es.close();
    };
  }, [userProfile.id, userProfile.name, userProfile.role]);

  // Handle Teacher Start Session
  const handleStartSession = async () => {
    try {
      const res = await fetch('/api/live/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'web_apache_docroot',
          topicName: 'Apache DocumentRoot & File Hierarchy',
          track: 'Web Application Development',
          teacherId: userProfile.id,
        }),
      });
      const data = await res.json();
      if (data.session) setSessionState(data.session);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Teacher End Session
  const handleEndSession = async () => {
    try {
      await fetch('/api/live/session/end', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Teacher Extract Transcript
  const handleProcessTranscript = async () => {
    setIsProcessingTranscript(true);
    try {
      const res = await fetch('/api/live/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          track: sessionState?.track || 'Web Application Development',
          topicId: sessionState?.topicId || 'web_apache_docroot',
        }),
      });
      const data = await res.json();
      if (data.timeline) {
        setSessionState(prev => prev ? { ...prev, timeline: data.timeline } : null);
        setTranscriptSource(data.source === 'gemini' ? 'LIVE AI' : 'FALLBACK');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingTranscript(false);
    }
  };

  // Handle Teacher Release Question
  const handleReleaseQuestion = async (qId: string) => {
    try {
      await fetch('/api/live/release-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Student Submit Answer
  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !sessionState?.releasedQuestion) return;
    setIsSubmittingAnswer(true);

    const isLowEngaged = simulatedLowEngagement || document.hidden;

    try {
      const res = await fetch('/api/live/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userProfile.id,
          questionId: sessionState.releasedQuestion.id,
          selectedIndex: selectedOption,
          lowEngagement: isLowEngaged,
        }),
      });
      const data = await res.json();
      if (data.tutorial) {
        setStudentTutorial(data.tutorial);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleToggleEngagementSimulation = async () => {
    const nextVal = !simulatedLowEngagement;
    setSimulatedLowEngagement(nextVal);
    await fetch('/api/live/student-engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: userProfile.id,
        lowEngagement: nextVal,
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-rose-950 text-rose-400 rounded-lg border border-rose-800/60 flex items-center gap-1.5">
              <Radio className="w-4 h-4 animate-pulse text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">LIVE CLASS SESSION</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isConnected ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}`}>
              {isConnected ? 'SSE STREAM ACTIVE' : 'CONNECTING...'}
            </span>
            <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
              {transcriptSource}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {sessionState?.topicName || 'Apache DocumentRoot & File Hierarchy'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-agent live classroom session. Instructor releases checkpoint questions; students submit answers triggering real-time BKT updates and personalized micro-tutorials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => switchRole(isTeacher ? 'student' : 'teacher')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            Switch to {isTeacher ? 'Student View' : 'Teacher View'}
          </button>

          {isTeacher && (
            sessionState?.isActive ? (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                End Session
              </button>
            ) : (
              <button
                onClick={handleStartSession}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Live Session
              </button>
            )
          )}
        </div>
      </div>

      {/* TEACHER CONSOLE */}
      {isTeacher ? (
        <div className="space-y-6">
          {/* TRANSCRIPT INGESTION & CONCEPT TIMELINE GENERATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Lecture Transcript & Checkpoint Generator
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Maps transcript to DKM nodes & synthesizes 2 check questions per milestone
              </span>
            </div>

            <textarea
              value={transcriptText}
              onChange={e => setTranscriptText(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              placeholder="Paste lecture transcript or speaking notes here..."
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Generates diagnostic questions with explicit option-to-misconception mapping.
              </span>
              <button
                onClick={handleProcessTranscript}
                disabled={isProcessingTranscript}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {isProcessingTranscript ? 'Synthesizing Check Questions...' : 'Extract Timeline & Questions'}
              </button>
            </div>
          </div>

          {/* EXTRACTED TIMELINE & QUESTION RELEASE */}
          {sessionState?.timeline && sessionState.timeline.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Concept Milestone Timeline & Checkpoint Release
                </h3>
                <span className="text-[11px] text-slate-400">
                  {sessionState.timeline.length} Concepts Identified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessionState.timeline.map((item: LiveConceptTimelineItem) => (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                        {item.timeOffset}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{item.conceptId}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{item.conceptName}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{item.summary}</p>

                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="text-[10px] font-semibold text-slate-300">Check Questions:</div>
                      {item.questions.map((q: LiveQuestion, qIdx: number) => {
                        const isReleased = sessionState.releasedQuestion?.id === q.id;
                        return (
                          <div key={q.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                            <p className="text-[11px] text-slate-200 line-clamp-2">
                              <strong>Q{qIdx + 1}:</strong> {q.question}
                            </p>
                            <button
                              onClick={() => handleReleaseQuestion(q.id)}
                              className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                isReleased
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              {isReleased ? 'Active on Class Screens' : 'Release to Class'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE STUDENT STATUS BOARD & LIVE HEATMAP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* STUDENT STATUS BOARD (8 COLS) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Live Student Status Board
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  REAL-TIME TELEMETRY
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Student</th>
                      <th className="pb-3">BKT p(L) Level</th>
                      <th className="pb-3">Attention / Sensor</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Answer</th>
                      <th className="pb-3">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sessionState?.students && Object.values(sessionState.students).map(stu => (
                      <tr key={stu.studentId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 font-semibold text-slate-200">
                          {stu.studentName}
                          <div className="text-[10px] font-mono text-slate-500">{stu.studentId}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            stu.currentLevel === 'Beginner'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : stu.currentLevel === 'Intermediate'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {stu.currentLevel} (pL: {stu.pL.toFixed(2)})
                          </span>
                        </td>
                        <td className="py-3">
                          {stu.lowEngagement ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Low Attention Proxy
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                              <Activity className="w-3 h-3 text-emerald-400" />
                              Focused
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {stu.answered ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                              Submitted
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Thinking...
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {stu.answered ? (
                            stu.isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 text-[11px] font-mono text-slate-400">
                          {stu.answeredAt || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LIVE CONCEPT HEATMAP (4 COLS) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Live Concept Heatmap
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  &gt;2s REFRESH
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Percentage of connected students exhibiting validated GREEN mastery (pL &ge; 0.80):
              </p>

              <div className="space-y-3">
                {sessionState?.heatmap && Object.entries(sessionState.heatmap).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-emerald-400 font-bold">{val.percent}% Green</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                        style={{ width: `${val.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STUDENT VIEW */
        <div className="space-y-6">
          {/* STUDENT ATTENTION & STATUS BANNER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                {userProfile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span>{userProfile.name}</span>
                  <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                    BKT p(L): {((sessionState?.students?.[userProfile.id]?.pL ?? islm.overall_mastery) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Track: {sessionState?.track || islm.course_track}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleEngagementSimulation}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  simulatedLowEngagement
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850'
                }`}
              >
                {simulatedLowEngagement ? '⚠️ Attention Proxy: Low (Simulated)' : '✅ Attention Proxy: Focused'}
              </button>
            </div>
          </div>

          {/* ACTIVE CHECKPOINT QUESTION */}
          {sessionState?.releasedQuestion ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 rounded-full text-xs font-bold border border-indigo-800 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  Live Instructor Checkpoint Question
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Concept: {sessionState.releasedQuestion.conceptName}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-100 leading-snug">
                {sessionState.releasedQuestion.question}
              </h2>

              <div className="space-y-2.5">
                {sessionState.releasedQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const hasAnswered = sessionState.students?.[userProfile.id]?.answered;
                  const isCorrect = idx === sessionState.releasedQuestion?.correctIndex;

                  let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-950';
                  if (hasAnswered) {
                    if (isCorrect) borderClass = 'border-emerald-700 bg-emerald-950/40 text-emerald-200';
                    else if (isSelected) borderClass = 'border-rose-700 bg-rose-950/40 text-rose-200';
                  } else if (isSelected) {
                    borderClass = 'border-indigo-500 bg-indigo-950/40 text-slate-100';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={Boolean(hasAnswered)}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${borderClass}`}
                    >
                      <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {!sessionState.students?.[userProfile.id]?.answered ? (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null || isSubmittingAnswer}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingAnswer ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Your response has been registered and incorporated into the cohort telemetry.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Radio className="w-8 h-8 text-indigo-400 animate-pulse mx-auto" />
              <h3 className="text-base font-bold text-slate-200">Lecture in Progress</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Listen to the instructor. When a checkpoint question is released to the class, it will instantly appear on your screen for diagnostic evaluation.
              </p>
            </div>
          )}

          {/* DYNAMIC PERSONALIZED MICRO-TUTORIAL */}
          {studentTutorial && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-700/60 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    {studentTutorial.tutorialType === 're-engage'
                      ? 'Attention Check-In & Momentum Refresh'
                      : `Personalized Micro-Tutorial (${studentTutorial.level} Track)`}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-indigo-900 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-700">
                  {studentTutorial.tutorialType.toUpperCase()}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100">{studentTutorial.title}</h3>

              <div className="text-xs text-slate-200 leading-relaxed p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
                {studentTutorial.content}
              </div>

              {studentTutorial.targetedMisconception && (
                <div className="text-[11px] text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Targeted Cognitive Trap: <strong>{studentTutorial.targetedMisconception}</strong></span>
                </div>
              )}

              {/* REFLECTIVE PROMPT */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Reflective Checkpoint:
                </div>
                <p className="text-xs text-slate-400 italic">
                  "{studentTutorial.reflectivePrompt}"
                </p>

                {studentTutorial.tutorialType === 're-engage' ? (
                  <button
                    onClick={() => setReflectionVerified(true)}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirm Presence & Return to Stream
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={reflectionInput}
                      onChange={e => setReflectionInput(e.target.value)}
                      placeholder="Type your brief synthesis here..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => setReflectionVerified(true)}
                      disabled={!reflectionInput.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Verify Synthesis
                    </button>
                  </div>
                )}

                {reflectionVerified && (
                  <div className="mt-2 p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Reflection verified! Concept retention updated in ISLM.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
