import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Box,
  Code2,
  Globe,
  GitBranch,
  Video,
  Radio,
  FileCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  FileText,
  Download,
  Award,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Workflows' | 'Actions' | 'Labs' | 'Portfolio';
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-xl bg-[#0c1524] border border-[#223550] rounded-xl shadow-2xl overflow-hidden z-10 animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1b2b41] gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, workflow, or action... (e.g. Portfolio, CAD, Studio)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-[#142033] border border-[#1e2f47] rounded-sm">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands found for "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-300 hover:bg-[#142033]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                      {cmd.icon}
                    </span>
                    <span className="font-medium truncate">{cmd.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#111c2e] text-slate-400 border border-[#1e2f47]">
                      {cmd.category}
                    </span>
                  </div>
                  {cmd.shortcut ? (
                    <kbd className="text-[11px] font-mono text-slate-400 bg-[#142033] px-2 py-0.5 rounded-sm border border-[#1e2f47]">
                      {cmd.shortcut}
                    </kbd>
                  ) : (
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100 text-blue-400' : 'opacity-0'}`} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[#17253b] bg-[#09101d] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>↵ Select</span>
          </div>
          <span>Mastery.ai Quick Command</span>
        </div>
      </div>
    </div>
  );
};
