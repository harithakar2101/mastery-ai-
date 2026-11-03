import React, { useState, useRef, useEffect } from 'react';
import { SupportedLanguage } from '../../types';
import { renderHighlightedCode } from '../../utils/syntaxHighlight';
import { Copy, Check, Code, Eye, Columns } from 'lucide-react';

interface SyntaxCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  language: SupportedLanguage;
  languageName: string;
  extension: string;
  onReset: () => void;
}

export const SyntaxCodeEditor: React.FC<SyntaxCodeEditorProps> = ({
  code,
  onChange,
  language,
  languageName,
  extension,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'highlight' | 'split'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Support Tab key inside editor for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="bg-[#050911] border border-[#1a273b] rounded-xl overflow-hidden font-mono text-xs">
      {/* Editor Sub-header with syntax controls */}
      <div className="bg-[#0a1120] px-3.5 py-2 border-b border-[#1a273b] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span className="text-[11px] text-slate-300 font-semibold">
            solution.{extension}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-semibold">
            {languageName} Syntax Active
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#060c16] rounded-lg p-0.5 border border-[#1a273b]">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive code editor with live syntax coloring preview"
            >
              <Code className="w-3 h-3" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('highlight')}
              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'highlight'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full syntax highlighted token view"
            >
              <Eye className="w-3 h-3" />
              <span>Syntax View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex px-2 py-1 rounded text-[10px] font-semibold items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side Editor & Highlighted Token display"
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded text-[10px] flex items-center gap-1 border border-[#1e2f47] transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative min-h-[280px] max-h-[460px] overflow-auto flex">
        {/* VIEW 1: INTERACTIVE EDITOR */}
        {viewMode === 'editor' && (
          <div className="flex w-full min-w-full">
            {/* Line Numbers Gutter */}
            <div className="select-none py-3 px-2 bg-[#060a12] text-slate-600 text-right font-mono text-[11px] leading-[1.625rem] border-r border-[#1a273b] min-w-[2.75rem]">
              {Array.from({ length: Math.max(lineCount, 8) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editable Textarea with monospaced caret and syntax preview */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                rows={Math.max(lineCount + 1, 12)}
                className="w-full h-full bg-[#050911] text-emerald-100 font-mono text-xs leading-[1.625rem] p-3 resize-none focus:outline-none focus:ring-0 border-0 selection:bg-blue-600/40"
                style={{
                  tabSize: 4,
                  whiteSpace: 'pre',
                  fontVariantLigatures: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: PURE SYNTAX HIGHLIGHTED CODE */}
        {viewMode === 'highlight' && (
          <div className="flex w-full min-w-full">
            {/* Line Numbers Gutter */}
            <div className="select-none py-3 px-2 bg-[#060a12] text-slate-600 text-right font-mono text-[11px] leading-[1.625rem] border-r border-[#1a273b] min-w-[2.75rem]">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Rendered Syntax Tokens */}
            <div className="p-3 font-mono text-xs leading-[1.625rem] whitespace-pre flex-1 overflow-x-auto select-text">
              {renderHighlightedCode(code, language)}
            </div>
          </div>
        )}

        {/* VIEW 3: SPLIT VIEW (EDITOR ON LEFT, LIVE SYNTAX ON RIGHT) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 w-full divide-x divide-[#1a273b]">
            {/* Left: Input */}
            <div className="flex">
              <div className="select-none py-3 px-2 bg-[#060a12] text-slate-600 text-right font-mono text-[11px] leading-[1.625rem] border-r border-[#1a273b] min-w-[2.25rem]">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                rows={Math.max(lineCount + 1, 10)}
                className="w-full bg-[#050911] text-slate-200 font-mono text-xs leading-[1.625rem] p-3 resize-none focus:outline-none border-0"
              />
            </div>

            {/* Right: Live Syntax Rendering */}
            <div className="p-3 font-mono text-xs leading-[1.625rem] whitespace-pre overflow-x-auto bg-[#070d18]">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 border-b border-[#1a273b] pb-1">
                Live {languageName} Tokenizer
              </div>
              {renderHighlightedCode(code, language)}
            </div>
          </div>
        )}
      </div>

      {/* Editor Status Footer */}
      <div className="bg-[#070c16] px-3.5 py-1.5 border-t border-[#1a273b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span>{code.length} characters</span>
          <span className="text-blue-400 font-semibold">{languageName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>UTF-8</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
};
