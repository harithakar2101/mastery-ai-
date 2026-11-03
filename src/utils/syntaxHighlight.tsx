import React from 'react';
import { SupportedLanguage } from '../types';

export function renderHighlightedCode(code: string, language: SupportedLanguage): React.ReactNode {
  const lines = code.split('\n');

  const keywords = new Set([
    'def', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'class',
    'try', 'except', 'finally', 'with', 'function', 'const', 'let', 'var', 'async', 'await',
    'public', 'private', 'static', 'void', 'int', 'float', 'double', 'char', 'bool', 'true',
    'false', 'null', 'undefined', 'new', 'this', 'package', 'fn', 'mut', 'impl', 'struct',
    'type', 'interface', 'export', 'default', 'extends', 'implements', 'in', 'of',
  ]);

  return lines.map((line, lineIdx) => {
    // Simple regex tokenizer for keywords, strings, comments, and identifiers
    const tokens: React.ReactNode[] = [];
    const commentMatch = line.match(/(\/\/|#).*$/);
    const commentIndex = commentMatch ? commentMatch.index! : -1;

    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : '';

    const wordRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*|"[^"]*"|'[^']*'|`[^`]*`|\d+|[^\s\w])/g;
    let match;
    let lastIdx = 0;

    while ((match = wordRegex.exec(codePart)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(codePart.slice(lastIdx, match.index));
      }
      const token = match[0];
      if (keywords.has(token)) {
        tokens.push(<span key={match.index} className="text-purple-400 font-semibold">{token}</span>);
      } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        tokens.push(<span key={match.index} className="text-emerald-400">{token}</span>);
      } else if (/^\d+$/.test(token)) {
        tokens.push(<span key={match.index} className="text-amber-400">{token}</span>);
      } else {
        tokens.push(<span key={match.index} className="text-slate-200">{token}</span>);
      }
      lastIdx = match.index + token.length;
    }

    if (lastIdx < codePart.length) {
      tokens.push(codePart.slice(lastIdx));
    }

    if (commentPart) {
      tokens.push(<span key="comment" className="text-slate-500 italic">{commentPart}</span>);
    }

    return (
      <div key={lineIdx} className="leading-[1.625rem]">
        {tokens.length > 0 ? tokens : ' '}
      </div>
    );
  });
}
