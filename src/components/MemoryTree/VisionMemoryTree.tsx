import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Sparkles,
  GitBranch,
  RefreshCw,
  HelpCircle,
  Eye,
  Terminal,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Layers,
  Calculator,
  LayoutGrid,
  Maximize2,
  Activity,
} from 'lucide-react';
import { MemoryTree } from './MemoryTree';
import { NodeStatus } from '../../types';

interface TreeNode {
  id: string;
  name: string;
  status: NodeStatus;
  mastery: number;
  x: number;
  y: number;
  parentId?: string;
  childrenCount?: number;
  dkmId?: string;
  category?: string;
  typicalTrap?: string;
}

export const VisionMemoryTree: React.FC = () => {
  const {
    userProfile,
    setCurrentWorkflow,
    setSelectedNode,
    dkmNodes,
    openWhyScoreDrawer,
    activeTrack,
    setActiveTrack,
  } = useTutor();

  const [aiPrompt, setAiPrompt] = useState('');
  const [hideBranches, setHideBranches] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<TreeNode | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'grid'>('canvas');

  const TRACKS = [
    'All Tracks',
    'Mechanical Engineering (CAD)',
    'Web Application Development',
    'Data Structures & Algorithms',
    'Operating Systems',
    'Computer Networks',
  ];

  // Helper to construct canvas nodes for a given track
  const generateNodesForTrack = (track: string): TreeNode[] => {
    if (track === 'Mechanical Engineering (CAD)') {
      const mechDkm = dkmNodes.filter(
        n => n.track === 'Mechanical Engineering (CAD)' || n.domain === 'mech'
      );

      const centerNode: TreeNode = {
        id: 'center',
        name: 'Mechanical CAD Core',
        status: 'GREEN',
        mastery: 0.85,
        x: 50,
        y: 50,
        childrenCount: mechDkm.length,
      };

      // Fixed ergonomic layout coordinates surrounding the central hub
      const coords = [
        { x: 22, y: 22, parentId: 'center' }, // 1. 2D DOF
        { x: 50, y: 16, parentId: 'cad_dof_2d' }, // 2. Geometric constraints
        { x: 78, y: 22, parentId: 'cad_geometric_constraints' }, // 3. Dimensions & parameters
        { x: 84, y: 50, parentId: 'cad_driving_parameters' }, // 4. Extrude operations
        { x: 78, y: 78, parentId: 'cad_extrude_operations' }, // 5. Fillets and chamfers
        { x: 50, y: 84, parentId: 'cad_extrude_operations' }, // 6. Hub/bore concentricity
        { x: 22, y: 78, parentId: 'cad_extrude_operations' }, // 7. Material & Mass properties
        { x: 16, y: 50, parentId: 'cad_material_mass_properties' }, // 8. Static stress & FOS
      ];

      const result: TreeNode[] = [centerNode];
      mechDkm.forEach((dkm, i) => {
        const coord = coords[i] || {
          x: 25 + (i % 3) * 25,
          y: 25 + Math.floor(i / 3) * 25,
          parentId: 'center',
        };
        result.push({
          id: dkm.id,
          name: dkm.name,
          status: dkm.status,
          mastery: dkm.mastery,
          x: coord.x,
          y: coord.y,
          parentId: coord.parentId,
          dkmId: dkm.id,
          category: dkm.category,
          typicalTrap: dkm.typicalTrap,
        });
      });
      return result;
    }

    if (track !== 'All Tracks') {
      const filtered = dkmNodes.filter(n => n.track === track);
      const centerNode: TreeNode = {
        id: 'center',
        name: `${track.split(' ')[0]} Hub`,
        status: 'GREEN',
        mastery: 0.82,
        x: 50,
        y: 50,
        childrenCount: filtered.length,
      };

      const result: TreeNode[] = [centerNode];
      filtered.forEach((dkm, i) => {
        const angle = (i / Math.max(1, filtered.length)) * 2 * Math.PI;
        result.push({
          id: dkm.id,
          name: dkm.name,
          status: dkm.status,
          mastery: dkm.mastery,
          x: Math.round(50 + 32 * Math.cos(angle)),
          y: Math.round(50 + 30 * Math.sin(angle)),
          parentId: 'center',
          dkmId: dkm.id,
          category: dkm.category,
          typicalTrap: dkm.typicalTrap,
        });
      });
      return result;
    }

    // 'All Tracks' default view: includes CSE branches and CAD branch
    return [
      {
        id: 'center',
        name: userProfile.name,
        status: 'GREEN',
        mastery: 0.85,
        x: 50,
        y: 50,
        childrenCount: 5,
      },
      {
        id: 'mech_cad',
        name: 'Mechanical CAD',
        status: 'YELLOW',
        mastery: 0.20,
        x: 25,
        y: 28,
        parentId: 'center',
      },
      {
        id: 'cs_web',
        name: 'Web Architecture',
        status: 'RED',
        mastery: 0.35,
        x: 75,
        y: 28,
        parentId: 'center',
      },
      {
        id: 'cs_dsa',
        name: 'Data Structures',
        status: 'GREEN',
        mastery: 0.90,
        x: 80,
        y: 65,
        parentId: 'center',
      },
      {
        id: 'cs_os',
        name: 'Operating Systems',
        status: 'YELLOW',
        mastery: 0.58,
        x: 20,
        y: 65,
        parentId: 'center',
      },
      {
        id: 'cs_net',
        name: 'Computer Networks',
        status: 'GREEN',
        mastery: 0.88,
        x: 50,
        y: 82,
        parentId: 'center',
      },
      // Sub-leaf nodes
      {
        id: 'cad_dof_2d',
        name: '2D Sketch DOF',
        status: 'NOT_ASSESSED',
        mastery: 0.0,
        x: 10,
        y: 18,
        parentId: 'mech_cad',
      },
      {
        id: 'cad_stress_fos',
        name: 'Stress & FOS >= 2.0',
        status: 'NOT_ASSESSED',
        mastery: 0.0,
        x: 32,
        y: 12,
        parentId: 'mech_cad',
      },
      {
        id: 'web_pdo',
        name: 'PDO Socket Port 3306',
        status: 'RED',
        mastery: 0.25,
        x: 90,
        y: 18,
        parentId: 'cs_web',
      },
      {
        id: 'dsa_recursion',
        name: 'Recursion Base Case',
        status: 'YELLOW',
        mastery: 0.45,
        x: 92,
        y: 72,
        parentId: 'cs_dsa',
      },
    ];
  };

  const [nodes, setNodes] = useState<TreeNode[]>(() => generateNodesForTrack(activeTrack));

  // Sync canvas nodes whenever activeTrack or dkmNodes change
  useEffect(() => {
    setNodes(generateNodesForTrack(activeTrack));
    setSelectedNodeDetails(null);
  }, [activeTrack, dkmNodes]);

  const handleAskAiModify = () => {
    if (!aiPrompt.trim()) return;
    const newNode: TreeNode = {
      id: `node_${Date.now()}`,
      name: aiPrompt.slice(0, 24),
      status: 'YELLOW',
      mastery: 0.5,
      x: 50 + (Math.random() * 30 - 15),
      y: 20 + Math.random() * 20,
      parentId: 'center',
    };
    setNodes(prev => [...prev, newNode]);
    setAiPrompt('');
  };

  const handleReLayout = () => {
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        x: n.id === 'center' ? 50 : Math.max(10, Math.min(90, n.x + (Math.random() * 6 - 3))),
        y: n.id === 'center' ? 50 : Math.max(15, Math.min(85, n.y + (Math.random() * 6 - 3))),
      }))
    );
  };

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setViewMode('canvas')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Switch to Interactive Canvas</span>
          </button>
        </div>
        <MemoryTree />
      </div>
    );
  }

  const activeNodesCount = nodes.filter(n => n.id !== 'center').length;

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-[#1a273b] shadow-2xl flex flex-col justify-between dot-grid-bg select-none">
      {/* Top Floating Controls with Track Filter */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 pointer-events-auto bg-[#070d18]/80 backdrop-blur-md border-b border-[#1a273b]/60">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 bg-[#0c1421]/90 backdrop-blur border border-[#1a273b] rounded-xl flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white">Visual Memory Tree</span>
          </div>

          {/* Track Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[500px]">
            {TRACKS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTrack(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTrack === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#0c1421] text-slate-400 hover:text-white border border-[#1a273b]'
                }`}
              >
                {t === 'Mechanical Engineering (CAD)' ? '⚙️ Mechanical (CAD)' : t}
              </button>
            ))}
          </div>

          <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-full font-mono">
            {activeNodesCount} Nodes
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#0c1421]/90 backdrop-blur border border-[#1a273b] p-1 rounded-xl shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className="px-2.5 py-1 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#111b2b] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspect all competencies as structured cards"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Deep Cards</span>
          </button>
          <button
            onClick={handleReLayout}
            className="px-2.5 py-1 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#111b2b] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Layout</span>
          </button>
          <button
            onClick={() => setCurrentWorkflow('MOCK_TEST')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Progress Tree</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {nodes.map(node => {
          if (!node.parentId) return null;
          const parent = nodes.find(n => n.id === node.parentId);
          if (!parent) return null;
          if (hideBranches && parent.id === 'center') return null;

          return (
            <line
              key={`${parent.id}-${node.id}`}
              x1={`${parent.x}%`}
              y1={`${parent.y}%`}
              x2={`${node.x}%`}
              y2={`${node.y}%`}
              stroke="rgba(59, 130, 246, 0.4)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* Interactive Node Badges on Canvas */}
      <div className="absolute inset-0 pointer-events-none">
        {nodes.map(node => {
          const isCenter = node.id === 'center';
          if (hideBranches && node.parentId === 'center') return null;

          return (
            <div
              key={node.id}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => setSelectedNodeDetails(node)}
              className={`absolute pointer-events-auto cursor-pointer transition-transform hover:scale-105 ${
                isCenter ? 'z-20' : 'z-10'
              }`}
            >
              {isCenter ? (
                /* Central Student/Track Node */
                <div className="px-5 py-3 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/40 border-2 border-blue-400 flex flex-col items-center gap-1 text-center min-w-[170px]">
                  <div className="font-bold text-xs uppercase tracking-wide">{node.name}</div>
                  <div className="text-[10px] text-blue-200 font-mono">
                    {activeTrack === 'Mechanical Engineering (CAD)' ? 'Mechanical Track' : 'Cognitive Core'}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setHideBranches(!hideBranches);
                    }}
                    className="mt-1 px-2.5 py-0.5 rounded-full bg-blue-800 text-[10px] font-semibold hover:bg-blue-900 transition-colors cursor-pointer"
                  >
                    {hideBranches ? 'Show All' : 'Hide Radial'}
                  </button>
                </div>
              ) : (
                /* Branch Subject / Competency Node */
                <div
                  className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 shadow-lg backdrop-blur text-xs font-semibold whitespace-nowrap transition-all ${
                    node.status === 'GREEN'
                      ? 'bg-[#0c1421] border-emerald-500/60 text-emerald-200'
                      : node.status === 'YELLOW'
                      ? 'bg-[#0c1421] border-amber-500/60 text-amber-200'
                      : node.status === 'NOT_ASSESSED'
                      ? 'bg-[#0c1421] border-slate-600/80 text-slate-300 ring-1 ring-slate-600/30'
                      : 'bg-[#0c1421] border-rose-500/60 text-rose-200 ring-1 ring-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      node.status === 'GREEN'
                        ? 'bg-emerald-400'
                        : node.status === 'YELLOW'
                        ? 'bg-amber-400'
                        : node.status === 'NOT_ASSESSED'
                        ? 'bg-slate-400'
                        : 'bg-rose-400 animate-pulse'
                    }`}
                  />
                  <span>{node.name}</span>
                  {node.status === 'NOT_ASSESSED' && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                      Unassessed
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNodeDetails && selectedNodeDetails.id !== 'center' && (
        <div className="absolute top-20 right-4 w-80 bg-[#0c1421] border border-[#1a273b] rounded-2xl p-4 shadow-2xl z-30 space-y-3 pointer-events-auto animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-[#1a273b]">
            <h4 className="text-xs font-bold text-white truncate max-w-[220px]">
              {selectedNodeDetails.name}
            </h4>
            <button
              onClick={() => setSelectedNodeDetails(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Mastery Status:</span>
            <span
              className={`font-semibold font-mono px-2 py-0.5 rounded text-[11px] ${
                selectedNodeDetails.status === 'GREEN'
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                  : selectedNodeDetails.status === 'YELLOW'
                  ? 'text-amber-400 bg-amber-950/60 border border-amber-800'
                  : selectedNodeDetails.status === 'NOT_ASSESSED'
                  ? 'text-slate-300 bg-slate-800 border border-slate-700'
                  : 'text-rose-400 bg-rose-950/60 border border-rose-800'
              }`}
            >
              {selectedNodeDetails.status === 'NOT_ASSESSED' || selectedNodeDetails.mastery === 0
                ? 'Not Assessed'
                : `${(selectedNodeDetails.mastery * 100).toFixed(0)}% (pL)`}
            </span>
          </div>

          {selectedNodeDetails.category && (
            <div className="text-[11px] text-slate-400">
              Category: <strong className="text-blue-300">{selectedNodeDetails.category}</strong>
            </div>
          )}

          {selectedNodeDetails.typicalTrap && (
            <div className="p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl text-[11px] text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Known Misconception / Trap</span>
              </div>
              <p className="line-clamp-3 text-[10px] leading-relaxed">
                {selectedNodeDetails.typicalTrap}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                const match =
                  dkmNodes.find(
                    n =>
                      n.id === selectedNodeDetails.dkmId ||
                      n.name.toLowerCase().includes(selectedNodeDetails.name.toLowerCase())
                  ) || dkmNodes[0];
                setSelectedNode(match);
                setCurrentWorkflow('CODE_SANDBOX');
              }}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
            >
              Interactive Drill
            </button>
            <button
              onClick={() => {
                const match =
                  dkmNodes.find(
                    n =>
                      n.id === selectedNodeDetails.dkmId ||
                      n.name.toLowerCase().includes(selectedNodeDetails.name.toLowerCase())
                  ) || dkmNodes[0];
                setSelectedNode(match);
                setCurrentWorkflow('AI_VIDEO');
              }}
              className="flex-1 py-1.5 bg-[#111b2b] hover:bg-[#162235] text-slate-300 rounded-lg text-xs font-medium border border-[#1e2f47] cursor-pointer"
            >
              60s Video
            </button>
          </div>

          <button
            onClick={() => {
              const match =
                dkmNodes.find(
                  n =>
                    n.id === selectedNodeDetails.dkmId ||
                    n.name.toLowerCase().includes(selectedNodeDetails.name.toLowerCase())
                ) || dkmNodes[0];
              openWhyScoreDrawer(match);
            }}
            className="w-full py-1.5 bg-[#111b2b] hover:bg-[#162235] text-indigo-300 rounded-lg text-xs font-medium border border-indigo-900/60 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Why this score? (BKT Breakdown)</span>
          </button>
        </div>
      )}

      {/* Bottom Floating Bar: "Ask AI to modify nodes" */}
      <div className="p-4 z-10 flex justify-center pointer-events-auto">
        <div className="w-full max-w-lg bg-[#0c1421]/95 backdrop-blur-md border border-[#1a273b] rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl">
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskAiModify()}
            placeholder="Ask AI to expand cognitive tree..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={handleAskAiModify}
            disabled={!aiPrompt.trim()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <span>Update</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
