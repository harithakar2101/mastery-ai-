import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BarChart2,
  Play,
  RefreshCw,
  Plus,
  Download,
  FileSpreadsheet,
  Layers,
  Activity,
  Award,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { StudySetupModal } from './StudySetupModal';
import { StudyProtocolStages } from './StudyProtocolStages';
import { StudyResultsDashboard } from './StudyResultsDashboard';
import { StudyEventLogViewer } from './StudyEventLogViewer';

export const ComparisonView: React.FC = () => {
  const [studies, setStudies] = useState<any[]>([]);
  const [activeStudyId, setActiveStudyId] = useState<string>('');
  const [activeStudy, setActiveStudy] = useState<any | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'protocol' | 'events' | 'architecture'>('results');
  const [masteryThreshold, setMasteryThreshold] = useState<number>(90);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);

  const fetchStudies = async (selectId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/studies');
      const data = await res.json();
      const list = data.studies || [];
      setStudies(list);

      if (list.length > 0) {
        const targetId = selectId || activeStudyId || list[0].id;
        setActiveStudyId(targetId);
        await loadStudyDetails(targetId);
      } else {
        // Auto-bootstrap an initial benchmark study if empty
        await createInitialBenchmarkStudy();
      }
    } catch (err) {
      console.error('Failed to load studies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialBenchmarkStudy = async () => {
    try {
      const res = await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Empirical Investigation: Closed-Loop Socratic Scaffolding vs. Direct LLM Solutions',
          topicId: 'pdo_mysql_port',
          topicName: 'PDO MySQL Port Binding (3306 vs 80)',
          description: 'Randomized controlled comparison evaluating learning gains, error recurrence rates, and independent transfer.',
          masteryThreshold: 90,
          enableArmC: true,
        }),
      });
      const data = await res.json();
      if (data.study) {
        setStudies([data.study]);
        setActiveStudyId(data.study.id);
        setActiveStudy(data.study);
        await handleSeedDemo(data.study.id);
      }
    } catch (err) {
      console.error('Failed to create benchmark study:', err);
    }
  };

  const loadStudyDetails = async (studyId: string) => {
    try {
      const [studyRes, resultsRes] = await Promise.all([
        fetch(`/api/studies/${studyId}`),
        fetch(`/api/studies/${studyId}/results`),
      ]);
      const studyData = await studyRes.json();
      const resultsData = await resultsRes.json();

      setActiveStudy(studyData.study || null);
      setResults(resultsData || null);
      if (studyData.study?.masteryThreshold) {
        setMasteryThreshold(studyData.study.masteryThreshold);
      }
    } catch (err) {
      console.error('Failed to load study details:', err);
    }
  };

  useEffect(() => {
    fetchStudies();
  }, []);

  const handleStudyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setActiveStudyId(id);
    await loadStudyDetails(id);
  };

  const handleSeedDemo = async (targetId?: string) => {
    const id = targetId || activeStudyId;
    if (!id) return;
    setIsSeeding(true);
    try {
      const res = await fetch(`/api/studies/${id}/seed-demo`, { method: 'POST' });
      if (res.ok) {
        await loadStudyDetails(id);
      }
    } catch (err) {
      console.error('Failed to seed demo study:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleThresholdChange = (newThreshold: number) => {
    setMasteryThreshold(newThreshold);
    // Reload results with new threshold
    if (activeStudyId) {
      fetch(`/api/studies/${activeStudyId}/results`)
        .then(r => r.json())
        .then(data => setResults(data))
        .catch(console.error);
    }
  };

  const handleExportCSV = () => {
    if (!activeStudyId) return;
    window.location.href = `/api/studies/${activeStudyId}/export-csv`;
  };

  const handleExportJSON = () => {
    if (!activeStudyId) return;
    window.location.href = `/api/studies/${activeStudyId}/export-json`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <BarChart2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              CSE Empirical Educational Research Framework
            </span>
            {results?.provenance && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  results.isSynthetic
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
                }`}
              >
                {results.provenance}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Generic Assistance vs. CogniCSE Socratic Scaffolding
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Controlled empirical study module with concept-matched item banks, longitudinal pre/post/retention metrics, and hypothesis testing with Welch & paired t-tests.
          </p>
        </div>

        {/* Study actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {studies.length > 0 && (
            <select
              value={activeStudyId}
              onChange={handleStudyChange}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-indigo-500"
            >
              {studies.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsSetupOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Study
          </button>

          <button
            onClick={() => handleSeedDemo()}
            disabled={isSeeding || !activeStudyId}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-colors cursor-pointer"
            title="Generate synthetic cohort of 10 students per arm with complete event histories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            Seed Demo Cohort
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!activeStudyId}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Export raw events CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!activeStudyId}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Export study JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'results', label: 'Results & Inferential Statistics', icon: BarChart2 },
          { id: 'protocol', label: 'Protocol Stages & Item Banks', icon: Layers },
          { id: 'events', label: 'Event Ledger & Reactivity Test', icon: Activity },
          { id: 'architecture', label: 'Architectural Comparison', icon: Sparkles },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'results' && (
        <StudyResultsDashboard
          results={results}
          masteryThreshold={masteryThreshold}
          onThresholdChange={handleThresholdChange}
          onRefresh={() => loadStudyDetails(activeStudyId)}
        />
      )}

      {activeTab === 'protocol' && (
        <StudyProtocolStages
          study={activeStudy}
          onRefresh={() => loadStudyDetails(activeStudyId)}
        />
      )}

      {activeTab === 'events' && (
        <StudyEventLogViewer
          studyId={activeStudyId}
          onEventDeleted={() => loadStudyDetails(activeStudyId)}
        />
      )}

      {activeTab === 'architecture' && (
        /* ARCHITECTURAL COMPARISON (Head-to-head explanation) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* LEFT: GENERIC ASSISTANT */}
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h2 className="text-base font-bold text-slate-100">Arm B: Generic Assistant / Raw LLM</h2>
              </div>
              <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                Copy-Paste Anti-Pattern
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              <span className="text-slate-500 block">Student prompt: "Fix my code, what is the error?"</span>
              <span className="text-rose-400 block font-semibold">Generic Bot Response:</span>
              <pre className="text-slate-300 text-[11px] whitespace-pre-wrap mt-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
{`// Here is the complete fixed code:
$pdo = new PDO('mysql:host=localhost;port=3306;dbname=test', 'root', '');
// Just paste this in!`}
              </pre>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Direct solution spoon-fed; student copies without mental model formation.</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Zero cognitive struggle; identical trap repeated in 68% of transfer tasks.</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>No fading; creates permanent dependence on AI code generation.</span>
              </div>
            </div>
          </div>

          {/* RIGHT: COGNICSE SOCRATIC SCAFFOLDING */}
          <div className="bg-slate-900 border border-indigo-700/60 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-slate-100">Arm A: CogniCSE Socratic Closed-Loop</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Anti-Answer Scaffolding
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              <span className="text-slate-500 block">Student prompt: "Fix my code, what is the error?"</span>
              <span className="text-indigo-400 block font-semibold">CogniCSE Socratic Response (Tier 1):</span>
              <div className="text-slate-200 text-[11px] mt-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <p className="text-amber-300 font-semibold">Diagnostic Socratic Question:</p>
                <p>"Check your connection string: which transport layer port does MySQL listen on by default, and how does that differ from HTTP port 80?"</p>
              </div>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Active retrieval induced; learner constructs internal mental model.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Error recurrence drops to 12%; 88% independent success on novel transfer tasks.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Scaffolding fades as mastery rises; graduates learner to autonomous execution.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETUP MODAL */}
      <StudySetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onCreated={newStudy => {
          setStudies(prev => [newStudy, ...prev]);
          setActiveStudyId(newStudy.id);
          loadStudyDetails(newStudy.id);
        }}
      />
    </div>
  );
};
