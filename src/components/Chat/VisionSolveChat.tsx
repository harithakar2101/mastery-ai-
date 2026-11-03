import React, { useState, useRef, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import { VisualizerMode, MockTestQuestion } from '../../types';
import {
  Sparkles,
  Send,
  Video,
  Layers,
  ChevronDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Mic,
  RotateCcw,
  BookOpen,
  ArrowRight,
  GitBranch,
  Terminal,
  Activity,
  BarChart2,
  Clock,
  Palette,
} from 'lucide-react';

export const VisionSolveChat: React.FC = () => {
  const {
    userProfile,
    currentChatSession,
    sendChatMessage,
    createNewChatSession,
    visualizerMode,
    setVisualizerMode,
    activeReviewQuestions,
    setCurrentWorkflow,
    setSelectedNode,
    dkmNodes,
  } = useTutor();

  const [inputPrompt, setInputPrompt] = useState('');
  const [showVisualizerDropdown, setShowVisualizerDropdown] = useState(false);
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatSession.messages, thinkingStep]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim()) return;

    setInputPrompt('');
    setIsThinking(true);
    setThinkingStep('CogniCSE Pedagogical Engine evaluating query...');

    try {
      await sendChatMessage(query);
    } finally {
      setIsThinking(false);
      setThinkingStep(null);
    }
  };

  const visualizerOptions: Array<{ mode: VisualizerMode; label: string; desc: string }> = [
    { mode: 'Text Response', label: 'Text Response', desc: 'Socratic dialogue' },
    { mode: 'Mind Map', label: 'Mind Map', desc: 'Visual concept mapping' },
    { mode: 'Flowchart', label: 'Flow Chart', desc: 'Step-by-step logic & diagrams' },
    { mode: 'Simulator', label: 'Simulator', desc: 'Interactive simulations' },
    { mode: 'Charts & Graphs', label: 'Charts & Graphs', desc: 'Data visualization' },
    { mode: 'Diagrams', label: 'Diagrams', desc: 'Technical illustrations' },
    { mode: 'Timeline', label: 'Timeline', desc: 'Historical milestones & traces' },
    { mode: 'Creative', label: 'Creative', desc: 'AI-powered creative visualisations' },
  ];

  const suggestionPrompts = [
    {
      title: 'Explore data structures through animated diagrams',
      prompt: 'Can you show me an animated diagram of how a Binary Search Tree maintains order compared to a linked list?',
    },
    {
      title: 'Unpack how algorithms shape everyday apps',
      prompt: 'How do navigation apps calculate the shortest driving route using Dijkstra or A* search algorithms?',
    },
    {
      title: 'Link computer science ideas to faster learning',
      prompt: 'Explain how CPU caching locality (spatial and temporal) connects to writing high-performance matrix loops in C++.',
    },
    {
      title: 'Trace code execution to understand it deeply',
      prompt: 'Walk me through a step-by-step memory trace of a recursive function that is missing its base case.',
    },
  ];

  const handleQuestionCardClick = (q: MockTestQuestion) => {
    const prompt = `Can you explain Question #${q.id}: "${q.question}"? I selected Option ${q.user_selected_index !== undefined ? String.fromCharCode(65 + q.user_selected_index) : 'none'} and got it wrong. What is the fundamental concept behind this?`;
    handleSend(prompt);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* MAIN CHAT & SPLIT PANE CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT / CENTER: CHAT STREAM */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Welcome Header (if new or few messages) */}
          {currentChatSession.messages.length === 0 && (
            <div className="max-w-2xl mx-auto text-center pt-8 pb-4 space-y-4 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Pedagogical Socratic AI Active</span>
              </div>

              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Hi, {userProfile.name} 👋
              </h1>
              <p className="text-sm text-slate-400">Ready to learn something new today?</p>

              {/* Suggestion prompt cards matching video */}
              <div className="pt-6 text-left">
                <div className="text-xs text-slate-400 font-medium mb-3">Try asking about:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestionPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className="p-3.5 rounded-xl bg-[#0c1421] hover:bg-[#111b2b] border border-[#1a273b] hover:border-blue-500/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {item.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="max-w-3xl w-full mx-auto space-y-5">
            {currentChatSession.messages.map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 shadow-md shadow-blue-500/20">
                      CG
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                        : 'bg-[#0c1421] border border-[#1a273b] text-slate-200 rounded-bl-none shadow-lg'
                    }`}
                  >
                    {/* Provenance Badge & Visualizer Mode Badge */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {msg.source === 'gemini' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            LIVE AI
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold"
                            title={msg.fallback_reason || 'Local Socratic Engine fallback'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            FALLBACK
                          </span>
                        )}

                        {msg.visualizerMode && msg.visualizerMode !== 'Text Response' && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#111b2b] border border-[#1e2f47] text-[10px] text-blue-400 font-mono font-semibold">
                            <Layers className="w-3 h-3" />
                            <span>Mode: {msg.visualizerMode}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                    {/* Socratic Anti-Answer Refusal Badge */}
                    {msg.refusalReason && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-200 text-[11px] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{msg.refusalReason}</span>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-blue-900/60 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {userProfile.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking Animation State */}
            {isThinking && (
              <div className="flex items-start gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-md shadow-blue-500/20">
                  CG
                </div>
                <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span className="font-semibold text-blue-400">CogniCSE Pedagogical Engine is thinking...</span>
                  </div>
                  {thinkingStep && (
                    <div className="text-[11px] text-slate-400 font-mono animate-pulse pl-4">
                      {thinkingStep}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* RIGHT: SPLIT-SCREEN TEST QUESTIONS REVIEW PANEL (as seen in video!) */}
        {activeReviewQuestions && activeReviewQuestions.length > 0 && (
          <div className="w-80 lg:w-96 border-l border-[#1a273b] bg-[#080e18] p-4 overflow-y-auto hidden md:flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a273b]">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Test Questions</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeReviewQuestions.length} Questions
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Click any question to get an instant AI Socratic breakdown and conceptual diagnosis.
            </p>

            <div className="space-y-2.5 pt-1">
              {activeReviewQuestions.map((q, idx) => {
                const isCorrect = q.user_selected_index === q.correct_option_index;
                return (
                  <button
                    key={q.id || idx}
                    onClick={() => handleQuestionCardClick(q)}
                    className="w-full text-left p-3 rounded-xl bg-[#0c1421] hover:bg-[#111b2b] border border-[#1a273b] hover:border-blue-500/60 transition-all cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {q.section || `Question ${idx + 1}`}
                      </span>
                      {q.user_selected_index !== undefined ? (
                        isCorrect ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Correct
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                          Unanswered
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
                      {q.question}
                    </p>
                    <div className="text-[10px] text-blue-400 group-hover:text-blue-300 flex items-center gap-1 font-semibold pt-0.5">
                      <span>Ask AI Tutor</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM INPUT BAR (Exact layout from the video!) */}
      <div className="p-4 bg-[#080e18] border-t border-[#1a273b] relative z-20">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Main Input Box */}
          <div className="relative flex items-center bg-[#0c1421] border border-[#1a273b] rounded-2xl p-2 shadow-2xl focus-within:border-blue-500/70 transition-all">
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask CogniCSE for Socratic guidance, code analysis, or concept visualization..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            {/* Controls Bar inside the input box matching video */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Video Selector Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoDropdown(!showVideoDropdown);
                    setShowVisualizerDropdown(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#111b2b] hover:bg-[#162235] text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-[#1e2f47] transition-colors cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span>Video</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showVideoDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 w-48 bg-[#0c1421] border border-[#1a273b] rounded-xl p-1.5 shadow-2xl z-30 space-y-1">
                    <button
                      onClick={() => {
                        setCurrentWorkflow('AI_VIDEO');
                        setShowVideoDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-[#111b2b] flex items-center gap-2 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>60s Micro Video</span>
                    </button>
                    <button
                      onClick={() => {
                        handleSend("Generate an educational video script with visual animation storyboards for this topic.");
                        setShowVideoDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-[#111b2b] flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Storyboard</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Visualizer Selector Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowVisualizerDropdown(!showVisualizerDropdown);
                    setShowVideoDropdown(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#111b2b] hover:bg-[#162235] text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-[#1e2f47] transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{visualizerMode}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showVisualizerDropdown && (
                  <div className="absolute bottom-full mb-2 right-0 w-64 bg-[#0c1421] border border-[#1a273b] rounded-xl p-2 shadow-2xl z-30 space-y-1 max-h-72 overflow-y-auto">
                    <div className="text-[10px] font-mono text-slate-400 px-2 py-0.5 uppercase">
                      Select Visualizer Engine
                    </div>
                    {visualizerOptions.map(opt => (
                      <button
                        key={opt.mode}
                        onClick={() => {
                          setVisualizerMode(opt.mode);
                          setShowVisualizerDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex flex-col ${
                          visualizerMode === opt.mode
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                            : 'text-slate-300 hover:bg-[#111b2b]'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] text-slate-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isThinking || !inputPrompt.trim()}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
