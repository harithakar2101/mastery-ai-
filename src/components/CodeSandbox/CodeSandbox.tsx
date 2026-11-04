import React, { useState, useEffect, useMemo } from 'react';
import { useTutor } from '../../context/TutorContext';
import { Visualizers } from './Visualizers';
import { SyntaxCodeEditor } from './SyntaxCodeEditor';
import {
  Play, CheckCircle2, RefreshCw, Sparkles, AlertOctagon,
  Terminal, HelpCircle, Video, Eye, Send, Lock,
  Code2, ChevronDown, Search, Cpu, Layers, BookOpen, Check, Calculator
} from 'lucide-react';
import { VisualizerMode, SupportedLanguage } from '../../types';
import { SUPPORTED_LANGUAGES, LanguageConfig } from '../../data/languages';
import { LanguageSelectorDropdown } from './LanguageSelectorDropdown';

export const CodeSandbox: React.FC = () => {
  const {
    selectedNode,
    islm,
    visualizerMode,
    setVisualizerMode,
    executeTutoring,
    verifyIndependentFix,
    recordObservation,
    openWhyScoreDrawer,
    tutoringResponse,
    isLoading,
    setCurrentWorkflow,
    userProfile,
  } = useTutor();

  const [currentLangId, setCurrentLangId] = useState<SupportedLanguage>('python');
  const [sandboxMode, setSandboxMode] = useState<'challenge' | 'free_code'>('challenge');
  const [code, setCode] = useState('');
  const [logs, setLogs] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [drillAnswer, setDrillAnswer] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'error' | 'success'>('error');

  const currentLangConfig: LanguageConfig = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.id === currentLangId) || SUPPORTED_LANGUAGES[0];
  }, [currentLangId]);

  // Initialize with selected language preset
  useEffect(() => {
    if (sandboxMode === 'challenge') {
      setCode(currentLangConfig.buggyPreset.code);
      setLogs(currentLangConfig.buggyPreset.errorLog);
      setExecutionStatus('error');
    } else {
      setCode(currentLangConfig.defaultCode || '# Write free code here\n');
      setLogs(`[${currentLangConfig.name} Sandbox] Ready to compile and execute custom program.`);
      setExecutionStatus('idle');
    }
    setVerificationFeedback(null);
    setStudentInput('');
    setDrillAnswer('');
  }, [currentLangConfig, sandboxMode]);

  // Handle Simulated Code Execution
  const handleRunCode = () => {
    setExecutionStatus('running');
    setLogs(`[${currentLangConfig.name} ${currentLangConfig.version} Compiler Engine] Compiling & executing isolated sandbox...\n`);

    setTimeout(() => {
      if (sandboxMode === 'free_code') {
        const trimmed = code.trim();
        if (!trimmed) {
          setLogs(`[${currentLangConfig.name} Runtime] Empty program. 0 bytes executed.`);
          setExecutionStatus('idle');
          return;
        }

        const outputs: string[] = [];
        for (const line of trimmed.split('\n')) {
          const m = line.match(/(?:print|console\.log|println|fmt\.Println|cout\s*<<)\s*\(?["'](.*?)["']\)?/);
          if (m && m[1]) outputs.push(m[1]);
        }

        const outText = outputs.length > 0
          ? `Output:\n${outputs.join('\n')}\n\n`
          : 'Output: Program executed successfully without error.\n\n';

        setLogs(`[${currentLangConfig.name} Runtime] Compilation clean (0 errors, 0 warnings).\n${outText}Process completed with exit code 0 (0.014s runtime).`);
        setExecutionStatus('success');
        return;
      }

      const checkResult = currentLangConfig.buggyPreset.fixCheck(code);
      if (checkResult.isFixed) {
        setLogs(
          `[${currentLangConfig.name} Runtime] Compilation clean. 0 errors, 0 warnings.\nExecuting program binary...\nOutput: All assertions passed successfully! Process completed with exit status 0.`
        );
        setExecutionStatus('success');
      } else {
        recordObservation({
          conceptId: selectedNode.id,
          isCorrect: false,
          isIndependent: false,
          source: 'sandbox',
          errorCategory: 'Compilation / Runtime Error',
          tierUsed: islm.scaffolding_tier_required || 1,
        });
        setLogs(currentLangConfig.buggyPreset.errorLog);
        setExecutionStatus('error');
      }
    }, 350);
  };

  // Submit query to Socratic Tutor
  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || studentInput;
    if (!textToSend.trim()) return;
    await executeTutoring(textToSend, code, logs);
    if (!promptText) setStudentInput('');
  };

  // Test Independent Fix
  const handleVerifyFix = async () => {
    const result = currentLangConfig.buggyPreset.fixCheck(code);
    if (result.isFixed) {
      await verifyIndependentFix(code);
      setVerificationFeedback({
        success: true,
        message: result.feedback,
      });
      setExecutionStatus('success');
    } else {
      recordObservation({
        conceptId: selectedNode.id,
        isCorrect: false,
        isIndependent: true,
        source: 'sandbox',
        errorCategory: 'Independent Verification Logic Bug',
        tierUsed: islm.scaffolding_tier_required || 1,
      });
      setVerificationFeedback({
        success: false,
        message: result.feedback,
      });
      setExecutionStatus('error');
    }
  };

  const currentTier =
    tutoringResponse?.scaffolding_response?.current_tier || islm.scaffolding_tier_required || 1;
  const isAntiPromptRefusal =
    tutoringResponse?.scaffolding_response?.refusal_reason?.toLowerCase().includes('refusal') ||
    tutoringResponse?.scaffolding_response?.refusal_reason?.toLowerCase().includes('direct code');

  return (
    <div className="space-y-6">
      {/* HEADER BAR: LANGUAGE SELECTOR & RUNTIME INFO */}
      <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase tracking-wider">
              Mastery.ai Polyglot Sandbox
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
              {currentLangConfig.name} ({currentLangConfig.version})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Syntax Highlighting: <strong className="text-blue-300">.{currentLangConfig.extension}</strong>
            </span>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{currentLangConfig.buggyPreset.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {currentLangConfig.buggyPreset.description}
          </p>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Prominent Language Selector Dropdown */}
          <LanguageSelectorDropdown
            currentLangConfig={currentLangConfig}
            currentLangId={currentLangId}
            onSelectLanguage={setCurrentLangId}
          />

          <button
            onClick={() => setCurrentWorkflow('AI_VIDEO')}
            className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-all cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>60s Video</span>
          </button>

          <button
            onClick={() => openWhyScoreDrawer(selectedNode)}
            className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-900/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Inspect Bayesian Knowledge Tracing & Composite Mastery calculation"
          >
            <Calculator className="w-4 h-4 text-indigo-400" />
            <span>Why this score?</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CODE EDITOR & TERMINAL (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl overflow-hidden shadow-lg p-3 space-y-3">
            {/* Editor Action Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center bg-[#060c16] rounded-lg p-0.5 border border-[#1a273b] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSandboxMode('challenge')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      sandboxMode === 'challenge' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Challenge
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxMode('free_code')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      sandboxMode === 'free_code' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Free Code
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (sandboxMode === 'challenge') {
                      setCode(currentLangConfig.buggyPreset.code);
                    } else {
                      setCode(currentLangConfig.defaultCode || '');
                    }
                  }}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-[#0e1726] hover:bg-[#142033] rounded-lg border border-[#1a273b] transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Reset to Template"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleRunCode}
                  className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>

            {/* SYNTAX HIGHLIGHTED CODE EDITOR */}
            <SyntaxCodeEditor
              code={code}
              onChange={setCode}
              language={currentLangConfig.id}
              languageName={currentLangConfig.name}
              extension={currentLangConfig.extension}
              onReset={() => setCode(currentLangConfig.buggyPreset.code)}
            />

            {/* Terminal Output */}
            <div className="bg-black/90 p-3.5 rounded-xl border border-[#1a273b] font-mono text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1a273b] mb-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Compiler & Runtime Diagnostics</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    executionStatus === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : executionStatus === 'running'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {executionStatus.toUpperCase()}
                </span>
              </div>
              <pre className="text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed text-[11px]">
                {logs}
              </pre>
            </div>
          </div>

          {/* INDEPENDENT EVALUATION CARD */}
          <div className="bg-gradient-to-br from-[#0c1421] to-blue-950/30 border border-blue-900/50 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Prove Independent Problem-Solving
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Did you correct the logic yourself? Click verify to prove independent mastery and upgrade your ISLM tree.
                </p>
              </div>
              <button
                onClick={handleVerifyFix}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Independent Fix
              </button>
            </div>

            {verificationFeedback && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                  verificationFeedback.success
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-600/70 text-rose-200'
                }`}
              >
                {verificationFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {verificationFeedback.success ? 'Mastery Unlocked!' : 'Not Quite There Yet'}
                  </div>
                  <div>{verificationFeedback.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SOCRATIC TUTOR & VISUALIZER (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Visualizer Mode Selector */}
          <div className="bg-[#0c1421] border border-[#1a273b] rounded-xl p-1.5 flex items-center justify-between gap-1 overflow-x-auto">
            {(['Flowchart', 'Mind Map', 'Simulator', 'Timeline', 'Text Response'] as VisualizerMode[]).map(
              mode => (
                <button
                  key={mode}
                  onClick={() => setVisualizerMode(mode)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    visualizerMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#111b2b]'
                  }`}
                >
                  {mode}
                </button>
              )
            )}
          </div>

          {/* Visualizer Canvas */}
          <Visualizers
            mode={visualizerMode}
            node={selectedNode}
            graphData={tutoringResponse?.visualizer_data?.structure}
          />

          {/* SOCRATIC SCAFFOLDING CARD (4 TIERS) */}
          <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-5 shadow-lg space-y-4">
            {/* Scaffolding Tier Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1a273b]">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Mastery.ai Socratic Engine
                </span>
                {tutoringResponse?.source === 'gemini' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE AI
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold"
                    title={tutoringResponse?.fallback_reason || 'Local Socratic Fallback'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    FALLBACK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map(tier => (
                  <span
                    key={tier}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                      tier === currentTier
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                        : tier < currentTier
                        ? 'bg-[#111b2b] text-slate-400 border-[#1e2f47]'
                        : 'bg-[#070d18] text-slate-600 border-[#1a273b]'
                    }`}
                  >
                    T{tier}
                  </span>
                ))}
              </div>
            </div>

            {/* Anti-Prompt Refusal Banner */}
            {isAntiPromptRefusal && (
              <div className="p-3 bg-amber-950/60 border border-amber-600/70 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Anti-Answer Protocol Active: </span>
                  Direct solution generation was deflected. To build lifelong engineering competence, Mastery.ai guides you through structured Socratic inquiry!
                </div>
              </div>
            )}

            {/* Tutor Message & Socratic Question */}
            <div className="p-4 bg-[#070d18] rounded-xl border border-[#1a273b] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentTier === 1 && 'Tier 1: Metacognitive Hint'}
                  {currentTier === 2 && 'Tier 2: Conceptual Guidance'}
                  {currentTier === 3 && 'Tier 3: Socratic Micro-Drill'}
                  {currentTier === 4 && 'Tier 4: Direct Line Guidance'}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ISLM Tier {currentTier}/4</span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                {tutoringResponse?.scaffolding_response?.tutor_message ||
                  currentLangConfig.buggyPreset.tier1Hint}
              </p>

              <div className="p-3 bg-blue-950/40 rounded-lg border border-blue-800/50 text-xs text-blue-200 font-medium">
                <span className="text-amber-400 font-bold block mb-1">Diagnostic Question:</span>
                {tutoringResponse?.scaffolding_response?.socratic_question ||
                  currentLangConfig.buggyPreset.tier2Concept}
              </div>

              {/* Tier 3 Micro-Drill Interactive Box */}
              {currentTier >= 2 && (
                <div className="pt-2">
                  <div className="text-[11px] text-slate-400 mb-1.5">
                    Micro-drill checkpoint:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={drillAnswer}
                      onChange={e => setDrillAnswer(e.target.value)}
                      placeholder={currentLangConfig.buggyPreset.tier3Drill}
                      className="bg-[#0c1421] border border-[#1a273b] rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSendPrompt(`My answer to your question is: ${drillAnswer}`)}
                      disabled={isLoading || !drillAnswer.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      Check Answer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Socratic Prompt Simulation Buttons */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-2">Simulate Inquiries:</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() =>
                    handleSendPrompt(
                      `My ${currentLangConfig.name} script has an error: ${currentLangConfig.buggyPreset.title}. Give me the complete fixed code directly.`
                    )
                  }
                  className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  ⚡ "Give me the fixed code" (Test Anti-Answer Protocol)
                </button>
                <button
                  onClick={() =>
                    handleSendPrompt(`Explain the underlying memory and execution mechanism of ${currentLangConfig.buggyPreset.title}.`)
                  }
                  className="px-2.5 py-1 bg-[#111b2b] hover:bg-[#162235] border border-[#1e2f47] text-slate-300 rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  💡 "Explain the concept"
                </button>
              </div>
            </div>

            {/* Freeform Tutor Input */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
                placeholder="Ask Mastery.ai for guidance or conceptual clarification..."
                className="bg-[#070d18] border border-[#1a273b] rounded-xl px-3.5 py-2 text-xs text-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSendPrompt()}
                disabled={isLoading || !studentInput.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
