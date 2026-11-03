import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { DKMNode } from '../../types';
import { Search, Filter, GitGraph, Video, Terminal, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, BookOpen, Layers, Calculator } from 'lucide-react';

export const MemoryTree: React.FC = () => {
  const {
    dkmNodes,
    selectedNode,
    setSelectedNode,
    setCurrentWorkflow,
    activeTrack,
    setActiveTrack,
    islm,
    openWhyScoreDrawer,
  } = useTutor();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [activeModalNode, setActiveModalNode] = useState<DKMNode | null>(null);

  // Filtered nodes
  const filteredNodes = dkmNodes.filter(node => {
    const matchesTrack = activeTrack === 'All Tracks' || node.track === activeTrack;
    const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;
    const matchesQuery =
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.keyConcept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.typicalTrap.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTrack && matchesStatus && matchesQuery;
  });

  const greenCount = dkmNodes.filter(n => n.status === 'GREEN').length;
  const yellowCount = dkmNodes.filter(n => n.status === 'YELLOW').length;
  const redCount = dkmNodes.filter(n => n.status === 'RED').length;

  const handleOpenSandbox = (node: DKMNode) => {
    setSelectedNode(node);
    setCurrentWorkflow('CODE_SANDBOX');
  };

  const handleOpenVideo = (node: DKMNode) => {
    setSelectedNode(node);
    setCurrentWorkflow('AI_VIDEO');
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER & METRICS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
                <GitGraph className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                CSE Domain Knowledge Model (DKM)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Interactive Cognitive Memory Tree</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Real-time cognitive map of your Computer Science competencies. Concepts update continuously between Green (Mastered), Yellow (In Progress), and Red (Active Misconceptions).
            </p>
          </div>

          {/* STATUS PILLS */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center min-w-[90px]">
              <div className="text-xl font-bold text-emerald-400">{greenCount}</div>
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">Mastered</div>
            </div>
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-center min-w-[90px]">
              <div className="text-xl font-bold text-amber-400">{yellowCount}</div>
              <div className="text-[10px] text-amber-300 uppercase font-semibold">In Progress</div>
            </div>
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-center min-w-[90px]">
              <div className="text-xl font-bold text-rose-400">{redCount}</div>
              <div className="text-[10px] text-rose-300 uppercase font-semibold">Active Gaps</div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Track selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['All Tracks', 'Mechanical Engineering (CAD)', 'Web Application Development', 'Data Structures & Algorithms', 'Operating Systems', 'Computer Networks'].map(track => (
              <button
                key={track}
                onClick={() => setActiveTrack(track)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTrack === track
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {track}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              {(['ALL', 'GREEN', 'YELLOW', 'RED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? st === 'GREEN' ? 'bg-emerald-900/80 text-emerald-200' :
                        st === 'YELLOW' ? 'bg-amber-900/80 text-amber-200' :
                        st === 'RED' ? 'bg-rose-900/80 text-rose-200' :
                        'bg-slate-800 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search concepts or traps..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* NODE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map(node => {
          const isSelected = selectedNode.id === node.id;
          return (
            <div
              key={node.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                node.status === 'GREEN'
                  ? 'border-emerald-900/50 hover:border-emerald-500/60'
                  : node.status === 'YELLOW'
                  ? 'border-amber-900/50 hover:border-amber-500/60'
                  : 'border-rose-900/50 hover:border-rose-500/60 ring-1 ring-rose-500/20'
              }`}
            >
              <div>
                {/* Header line */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {node.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {node.status === 'GREEN' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Mastered
                      </span>
                    )}
                    {node.status === 'YELLOW' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> In Progress
                      </span>
                    )}
                    {node.status === 'RED' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-full animate-pulse">
                        <AlertCircle className="w-3 h-3" /> Active Gap
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-100 mb-1">{node.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{node.description}</p>

                {/* Key Concept Box */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 mb-3 text-xs">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                    Target Concept:
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">{node.keyConcept}</div>
                </div>

                {/* Misconception Trap */}
                <div className="p-2.5 bg-rose-950/30 rounded-xl border border-rose-900/40 mb-3 text-xs">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Frequent Trap:
                  </div>
                  <div className="text-rose-200 text-[11px] leading-relaxed font-mono">{node.typicalTrap}</div>
                </div>

                {/* Mastery Meter & Evidence Info */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <button
                      onClick={() => openWhyScoreDrawer(node)}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                      title="Inspect Bayesian Knowledge Tracing equation and evidence trace"
                    >
                      <Calculator className="w-3 h-3" />
                      <span className="underline decoration-dotted">Why this score?</span>
                    </button>
                    <span className="font-bold text-slate-200">{(node.mastery * 100).toFixed(0)}% (pL: {node.mastery.toFixed(2)})</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        node.status === 'GREEN' ? 'bg-emerald-500' :
                        node.status === 'YELLOW' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.round(node.mastery * 100)}%` }}
                    />
                  </div>
                  {node.evidenceLabel && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                      <span>Evidence:</span>
                      <span className="text-slate-300 font-mono">{node.evidenceLabel}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenSandbox(node)}
                  className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Code Sandbox
                </button>
                <button
                  onClick={() => handleOpenVideo(node)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="Generate 60s AI Video"
                >
                  <Video className="w-3.5 h-3.5 text-violet-400" />
                  Video
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
