import React, { useState, useMemo } from 'react';
import { Code2, ChevronDown, Search, Check } from 'lucide-react';
import { SupportedLanguage } from '../../types';
import { SUPPORTED_LANGUAGES, LanguageConfig } from '../../data/languages';

interface LanguageSelectorDropdownProps {
  currentLangConfig: LanguageConfig;
  currentLangId: SupportedLanguage;
  onSelectLanguage: (langId: SupportedLanguage) => void;
}

export const LanguageSelectorDropdown: React.FC<LanguageSelectorDropdownProps> = ({
  currentLangConfig,
  currentLangId,
  onSelectLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return SUPPORTED_LANGUAGES;
    const q = searchQuery.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      l => l.name.toLowerCase().includes(q) || l.extension.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 bg-gradient-to-r from-[#101b2d] to-[#15233a] hover:from-[#142238] hover:to-[#1a2c48] text-white rounded-xl text-xs font-bold flex items-center gap-2.5 border border-[#223652] transition-all cursor-pointer shadow-md"
      >
        <Code2 className="w-4 h-4 text-indigo-400" />
        <span>Language: {currentLangConfig.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a111e] border border-[#1e2f47] rounded-2xl p-2.5 shadow-2xl z-40 space-y-2">
          {/* Search in dropdown */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full bg-[#050911] border border-[#1a273b] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="text-[10px] font-mono text-slate-500 px-1 uppercase tracking-wider">
            Supported Runtimes ({filteredLanguages.length})
          </div>

          {/* Language list */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filteredLanguages.map(lang => {
              const isSelected = currentLangId === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => {
                    onSelectLanguage(lang.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-[#121d2f]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">.{lang.extension}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
