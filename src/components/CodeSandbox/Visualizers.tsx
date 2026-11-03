import React, { useState } from 'react';
import { VisualizerMode, DKMNode } from '../../types';
import { Activity, GitBranch, Layers, Clock, MessageSquare, AlertTriangle, CheckCircle, ArrowRight, Server, Database, Globe } from 'lucide-react';

interface VisualizersProps {
  mode: VisualizerMode;
  node: DKMNode;
  graphData?: {
    nodes: Array<{ id: string; label: string; details?: string; type?: string }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
}

export const Visualizers: React.FC<VisualizersProps> = ({ mode, node, graphData }) => {
  const [simulationStep, setSimulationStep] = useState(0);

  // Fallback structures if graphData is empty
  const nodes = graphData?.nodes?.length ? graphData.nodes : [
    { id: '1', label: '1. PHP Script Execution Started', type: 'start' },
    { id: '2', label: '2. Parse DSN ("mysql:host=localhost;port=80")', type: 'process' },
    { id: '3', label: '3. TCP Socket Connection to Port 80', type: 'error' },
    { id: '4', label: '4. Web Server Rejection: SQLSTATE[HY000]', type: 'failure' },
    { id: '5', label: '5. Socratic Target: Switch Port to 3306', type: 'solution' },
  ];

  const edges = graphData?.edges?.length ? graphData.edges : [
    { from: '1', to: '2' },
    { from: '2', to: '3' },
    { from: '3', to: '4' },
    { from: '4', to: '5', label: 'Socratic Resolution' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[360px] flex flex-col justify-between text-slate-100">
      {/* FLOWCHART MODE */}
      {mode === 'Flowchart' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-sm text-slate-200">Execution Flowchart & Divergence Path</span>
            </div>
            <span className="text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/50">
              Interactive Execution Trace
            </span>
          </div>

          <div className="relative py-4 flex flex-col items-center gap-3">
            {nodes.map((n, idx) => {
              const isError = n.type === 'error' || n.type === 'failure' || n.label.toLowerCase().includes('reject') || n.label.toLowerCase().includes('error');
              const isSolution = n.type === 'solution' || n.label.toLowerCase().includes('target') || n.label.toLowerCase().includes('3306');
              return (
                <div key={n.id} className="w-full max-w-md flex flex-col items-center">
                  <div
                    className={`w-full p-3 rounded-lg border text-sm font-mono flex items-center justify-between shadow-sm transition-all ${
                      isError
                        ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                        : isSolution
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isError ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : isSolution ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      )}
                      <span>{n.label}</span>
                    </div>
                    {isError && <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded uppercase">Divergence</span>}
                    {isSolution && <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded uppercase">Goal</span>}
                  </div>

                  {idx < nodes.length - 1 && (
                    <div className="flex flex-col items-center my-1">
                      <div className="w-0.5 h-3 bg-slate-700" />
                      <div className="text-[10px] text-slate-400 italic">
                        {edges[idx]?.label || 'evaluates to'}
                      </div>
                      <div className="w-0.5 h-2 bg-slate-700" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MIND MAP MODE */}
      {mode === 'Mind Map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-sm text-slate-200">Domain Concept Hierarchy & Cognitive Linkages</span>
            </div>
            <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50">
              {node.track}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Prerequisite Node */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Prerequisites</span>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {node.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                Foundational building blocks
              </div>
            </div>

            {/* Core Target Node */}
            <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-700/60 flex flex-col justify-between ring-1 ring-indigo-500/30">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">2. Core Concept</span>
                <div className="mt-1 text-sm font-medium text-slate-100">{node.name}</div>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{node.keyConcept}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-indigo-800/60 text-[11px] text-indigo-300 flex items-center justify-between">
                <span>Current Mastery</span>
                <span className="font-bold">{(node.mastery * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Cognitive Trap / Misconception */}
            <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-700/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">3. Identified Trap</span>
                <p className="mt-2 text-xs text-rose-200 leading-relaxed font-mono">{node.typicalTrap}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Target of current scaffold
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATOR MODE */}
      {mode === 'Simulator' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-sm text-slate-200">Virtual Machine Runtime & Memory Inspector</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSimulationStep(prev => (prev > 0 ? prev - 1 : 2))}
                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              >
                Prev Step
              </button>
              <span className="text-xs font-mono text-amber-400 px-2">Step {simulationStep + 1} of 3</span>
              <button
                onClick={() => setSimulationStep(prev => (prev < 2 ? prev + 1 : 0))}
                className="text-xs px-2 py-1 bg-amber-900/60 hover:bg-amber-800/80 rounded text-amber-200 transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Call Stack / Socket Frame */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>Active Call Stack Frame</span>
                <span className="text-[10px] text-slate-500 font-mono">0x7FFE_4A80</span>
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className={`p-2 rounded border transition-all ${simulationStep >= 0 ? 'bg-slate-800/90 border-slate-700' : 'opacity-40'}`}>
                  <div className="text-indigo-300">Frame 0: main()</div>
                  <div className="text-slate-400 text-[11px]">$host = "localhost"</div>
                </div>
                <div className={`p-2 rounded border transition-all ${simulationStep >= 1 ? 'bg-slate-800/90 border-slate-700' : 'opacity-40'}`}>
                  <div className="text-indigo-300">Frame 1: PDO-&gt;__construct()</div>
                  <div className={`text-[11px] ${simulationStep === 2 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                    DSN = "mysql:host=localhost;port={simulationStep === 2 ? '80 [ERROR: HTTP PORT]' : '80'}"
                  </div>
                </div>
                {simulationStep === 2 && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-700 text-rose-300 text-xs">
                    SIGSEGV / Exception: Connection refused on port 80
                  </div>
                )}
              </div>
            </div>

            {/* Network / Variable State */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Socket / Variable Inspector</span>
                  <span className="text-[10px] text-emerald-400 font-mono">TCP / IP</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400">Target IP:</span>
                    <span className="font-mono text-slate-200">127.0.0.1 (localhost)</span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400">Target Port:</span>
                    <span className={`font-mono font-bold ${simulationStep === 2 ? 'text-rose-400' : 'text-slate-200'}`}>
                      80 (HTTP Web Daemon)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400">Expected MySQL Port:</span>
                    <span className="font-mono text-emerald-400 font-bold">3306 (mysqld)</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-400">
                {simulationStep === 0 && 'Program initialized variables and prepared database driver.'}
                {simulationStep === 1 && 'PDO instantiated TCP client handshake packet aimed at port 80.'}
                {simulationStep === 2 && 'HTTP server on port 80 rejected MySQL handshake bytes.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE MODE */}
      {mode === 'Timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-sm text-slate-200">Chronological Event & Protocol Timeline</span>
            </div>
            <span className="text-xs bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800/50">
              T = 0ms to 42ms
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs pl-2 border-l-2 border-slate-800">
            <div className="relative pl-6">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900" />
              <div className="text-slate-400 text-[11px]">0.00ms</div>
              <div className="text-slate-200 font-medium">PHP CLI starts db.php script</div>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
              <div className="text-indigo-400 text-[11px]">1.24ms</div>
              <div className="text-slate-200 font-medium">DNS resolves 'localhost' to 127.0.0.1</div>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900" />
              <div className="text-rose-400 text-[11px]">3.10ms</div>
              <div className="text-rose-300 font-bold">SYN packet dispatched to 127.0.0.1:80</div>
              <div className="text-slate-400 text-[11px]">Port 80 daemon returns TCP RST / Connection Refused</div>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              <div className="text-emerald-400 text-[11px]">Target Fix</div>
              <div className="text-emerald-300 font-medium">Reroute SYN to 127.0.0.1:3306 for MySQL ACK handshake</div>
            </div>
          </div>
        </div>
      )}

      {/* TEXT RESPONSE MODE */}
      {mode === 'Text Response' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-sm text-slate-200">Socratic Technical Dialogue</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
            <p className="font-medium text-violet-300 mb-1">Pedagogical Guide:</p>
            <p>
              Remember that operating systems assign numerical ports so multiple network programs can run on the exact same server IP.
              Web servers listen on 80 and 443; databases each reserve their own well-known port.
            </p>
          </div>
        </div>
      )}

      {/* FOOTER BAR WITH MODE SWITCHER */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time Multi-Modal Visualizer Synced</span>
        </div>
        <div className="font-mono text-slate-400">ISLM Gap: {node.name}</div>
      </div>
    </div>
  );
};
