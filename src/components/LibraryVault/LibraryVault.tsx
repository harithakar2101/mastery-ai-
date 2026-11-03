import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { LibraryDocument } from '../../types';
import { BookOpen, Upload, FileText, Sparkles, Video, Terminal, ArrowRight, CheckCircle, Search, Layers, Download } from 'lucide-react';

const PRELOADED_DOCUMENTS: LibraryDocument[] = [
  {
    id: 'doc_1',
    title: 'Web Architecture: TCP Sockets, PDO & Connection Strings',
    category: 'Web Application Development',
    uploadedBy: 'Adam Mujor',
    pages: 26,
    dateAdded: '2026-10-28',
    tags: ['PHP', 'MySQL', 'PDO', 'Port 3306', 'Socket Binding'],
    content: `Chapter 4: Relational Database Connectivity in Web Frameworks.
When an application server communicates with a database, it must establish a reliable TCP transport stream.
By default, the MySQL daemon process (mysqld) binds to TCP port 3306 on the loopback adapter (127.0.0.1).
A critical student mistake is confusing the web server's public listening port (e.g. HTTP 80 or HTTPS 443) with the internal database service port.
Passing port 80 to PDO::__construct results in immediate protocol rejection with SQLSTATE[HY000] [2002] Connection refused.
Always verify port configurations in your Data Source Name (DSN) string.`,
  },
  {
    id: 'doc_2',
    title: 'Recursion Mechanics: Stack Frames, Activation Records & Base Cases',
    category: 'Data Structures & Algorithms',
    uploadedBy: 'Dr. Evelyn Reed',
    pages: 18,
    dateAdded: '2026-10-25',
    tags: ['Recursion', 'Call Stack', 'Memory Limit', 'Stack Overflow'],
    content: `Lecture 9: Recursive Function Execution in Modern Runtimes.
Every time a function invokes itself, the compiler allocates an activation record (stack frame) on the thread call stack.
This frame preserves the return address, parameter copies, and local scope variables.
Without a mathematically reachable termination condition (base case), execution recurses infinitely until memory limits are breached.
In Python, this raises a RecursionError when reaching 1000 frames; in C/C++, it leads to segmentation faults from hardware stack guard page hits.`,
  },
  {
    id: 'doc_3',
    title: 'Operating Systems: Mutual Exclusion, Deadlocks & Banker\'s Algorithm',
    category: 'Operating Systems',
    uploadedBy: 'Prof. David Thorne',
    pages: 32,
    dateAdded: '2026-10-20',
    tags: ['Concurrency', 'Deadlocks', 'Coffman Conditions', 'Mutex'],
    content: `Module 3: Concurrency Control and Deadlock Prevention.
A deadlock state occurs when four simultaneous Coffman conditions hold: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait.
In multi-threaded software, acquiring mutex locks in conflicting orders between Thread 1 and Thread 2 guarantees intermittent race conditions and lockups.
The canonical prevention strategy is Global Resource Ordering: ensuring all threads acquire Lock A before Lock B universally.`,
  },
  {
    id: 'doc_4',
    title: 'Computer Networks: The OSI 7-Layer Model & Socket Multiplexing',
    category: 'Computer Networks',
    uploadedBy: 'keerthika sree.n',
    pages: 14,
    dateAdded: '2026-10-15',
    tags: ['TCP', 'UDP', 'OSI Layers', 'Transport Layer', 'Sockets'],
    content: `Network Systems: Transport Layer Protocols.
Layer 4 (Transport Layer) provides end-to-end communication services.
TCP offers reliable connection-oriented streams using 3-way handshakes (SYN, SYN-ACK, ACK), sequence tracking, and window flow control.
UDP offers low-latency connectionless datagram delivery without acknowledgments.
Port numbers serve as 16-bit address offsets, allowing thousands of distinct network sockets to coexist on a single IP address.`,
  },
  {
    id: 'doc_5',
    title: 'Parametric CAD: 2D Sketch Degrees of Freedom, Geometric Constraints & Solid Extrusions',
    category: 'Mechanical Engineering (CAD)',
    uploadedBy: 'Prof. Marcus Vance',
    pages: 42,
    dateAdded: '2026-11-01',
    tags: ['Mechanical Engineering (CAD)', 'Fusion 360', 'Degrees of Freedom', 'Geometric Constraints', 'Extrude'],
    content: `Module 1: Parametric 2D Planar Constraints.
In planar sketching, points have 2 translational DOF (X, Y). Lines have 4 DOF. Fully constrained sketches exhibit 0 DOF and turn black.
Extruding blue under-constrained sketches is a known engineering trap (frequency 82%) that results in floating geometry during parametric rebuilds.
Geometric constraints: Coincident locks points, Tangent locks G1 slope continuity, Concentric locks coaxial alignment, Symmetric mirrors features.
Extrude operations sweep closed 2D profiles into manifold 3D solids. Profile micro-gaps prevent watertight boundary evaluation.`,
  },
  {
    id: 'doc_6',
    title: 'Machine Design & FEA: Coaxial Concentricity, Stress Concentrations & Factor of Safety',
    category: 'Mechanical Engineering (CAD)',
    uploadedBy: 'Dr. Clara Lindqvist',
    pages: 36,
    dateAdded: '2026-10-30',
    tags: ['Mechanical Engineering (CAD)', 'Factor of Safety', 'FEA', 'GD&T', 'Concentricity', 'Fillets'],
    content: `Module 5: Machine Reliability and GD&T Tolerances.
Hub/Bore Concentricity: Coaxial mating locks rotational axes to prevent centrifugal unbalance forces (F = m * e * omega^2).
Fillets & Chamfers: Sharp 90-degree internal corners produce theoretical infinite stress concentrations (Kt -> inf). Applying internal fillets (R >= 2.5mm) relieves peak Von Mises stresses.
Factor of Safety: FOS = yield_strength / max_stress. Standard ductile machinery mandates target FOS >= 2.0. Assuming FOS ~ 1.1 is acceptable is a severe misconception.
Mass Evaluation: Mass = density * volume. 1 cm³ = 1000 mm³. 1018 Steel ~ 7.85 g/cm³, 6061 Aluminum ~ 2.70 g/cm³.`,
  },
];

export const LibraryVault: React.FC = () => {
  const { setCurrentWorkflow, setSelectedNode, dkmNodes, setActiveVideoStoryboard } = useTutor();

  const [documents, setDocuments] = useState<LibraryDocument[]>(PRELOADED_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<LibraryDocument>(PRELOADED_DOCUMENTS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProcessDocument = async (doc: LibraryDocument) => {
    setSelectedDoc(doc);
    setIsProcessing(true);
    try {
      const res = await fetch('/api/library-vault/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_title: doc.title,
          text_content: doc.content,
          subject_track: doc.category,
        }),
      });
      const data = await res.json();
      setExtractedData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadCustomNote = () => {
    if (!customText.trim()) return;
    const newDoc: LibraryDocument = {
      id: `doc_${Date.now()}`,
      title: customText.slice(0, 35) + '...',
      category: 'Web Application Development',
      uploadedBy: 'Student Upload',
      pages: 1,
      dateAdded: new Date().toISOString().split('T')[0],
      tags: ['Uploaded Notes', 'Custom'],
      content: customText,
    };
    setDocuments([newDoc, ...documents]);
    setSelectedDoc(newDoc);
    setIsUploadingCustom(false);
    setCustomText('');
    handleProcessDocument(newDoc);
  };

  const handleLaunchVideoFromExtracted = () => {
    if (extractedData?.suggested_video_topics?.[0]) {
      setActiveVideoStoryboard({
        title: `60s Micro-Mastery: ${extractedData.suggested_video_topics[0]}`,
        duration_secs: 60,
        concept: selectedDoc.title,
        key_takeaway: extractedData.summary,
        scenes: [
          {
            time: '0-15s',
            visual: 'Foundational concept visualization from uploaded material.',
            narration: `In this micro-breakdown, we dissect the core mechanism of ${selectedDoc.title}.`,
          },
          {
            time: '15-40s',
            visual: 'Common cognitive trap and execution error.',
            narration: extractedData.extracted_concepts?.[0]?.frequent_misconception || 'Watch out for misaligned configurations!',
          },
          {
            time: '40-60s',
            visual: 'Canonical solution and system validation.',
            narration: 'Applying the proper architecture guarantees stable and secure performance.',
          },
        ],
      });
      setCurrentWorkflow('AI_VIDEO');
    }
  };

  const handleExportOfflineNotes = () => {
    const offlinePack = `# ${selectedDoc.title}
Category: ${selectedDoc.category}
Date Added: ${selectedDoc.dateAdded}

---
## Original Study Content
${selectedDoc.content}

---
## ISLM Pedagogical Summary
${extractedData?.summary || 'Comprehensive reference for CSE students.'}

---
## Key Extracted Concepts & Traps
${(extractedData?.extracted_concepts || []).map((c: any) => `- **${c.name}** (${c.difficulty}): ${c.frequent_misconception}`).join('\n')}

---
Exported from CogniCSE Library Vault for offline revision.`;

    const blob = new Blob([offlinePack], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc.title.replace(/[^a-z0-9]/gi, '_')}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              CSE Library Vault & Document Ingestion
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Intelligent Lecture Notes & PDF Extractor</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload course materials, PDFs, or lab notes to extract cognitive ontologies, detect misconceptions, and generate targeted 60s micro-videos and Socratic drills.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsUploadingCustom(prev => !prev)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Custom Notes
          </button>
          <button
            onClick={handleExportOfflineNotes}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Offline Notes
          </button>
        </div>
      </div>

      {/* UPLOAD CUSTOM MODAL / ACCORDION */}
      {isUploadingCustom && (
        <div className="bg-slate-900 border border-indigo-800/80 rounded-2xl p-5 shadow-xl space-y-3 animate-fade-in">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Paste Raw Lecture Notes, Lab Text or PDF Excerpts
          </div>
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={5}
            placeholder="Paste your raw study notes, textbook paragraph, or coding assignment requirements here..."
            className="w-full bg-slate-950 text-slate-200 text-xs font-mono p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsUploadingCustom(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadCustomNote}
              disabled={!customText.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Process & Ingest
            </button>
          </div>
        </div>
      )}

      {/* TWO-COLUMN VAULT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DOCUMENT LIST (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search vault documents..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              {filteredDocs.map(doc => {
                const isSelected = selectedDoc.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleProcessDocument(doc)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200 mb-1">{doc.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{doc.category}</span>
                      <span>{doc.dateAdded}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DOCUMENT VIEWER & AI EXTRACTION (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
            {/* Document Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
                  {selectedDoc.category}
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-2">{selectedDoc.title}</h2>
              </div>
              <button
                onClick={() => handleProcessDocument(selectedDoc)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isProcessing ? 'Extracting Insights...' : 'Analyze Document'}
              </button>
            </div>

            {/* Document Raw Content Preview */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">{selectedDoc.content}</pre>
            </div>

            {/* AI EXTRACTED INSIGHTS */}
            <div className="space-y-4 pt-2">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                ISLM Extracted Pedagogical Structure
              </div>

              {/* Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-indigo-400 block mb-0.5">Summary:</span>
                {extractedData?.summary ||
                  `Comprehensive reference covering ${selectedDoc.title}, identifying fundamental protocol boundaries, memory allocations, and student error vectors.`}
              </div>

              {/* Extracted Concepts & Misconceptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(extractedData?.extracted_concepts || [
                  {
                    name: 'Socket Protocol Binding',
                    difficulty: 'INTERMEDIATE',
                    frequent_misconception: 'Assuming database services listen on HTTP port 80.',
                  },
                  {
                    name: 'Handshake State Machine',
                    difficulty: 'BEGINNER',
                    frequent_misconception: 'Expecting TCP connection without SYN-ACK confirmation.',
                  },
                ]).map((c: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{c.name}</span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded">
                        {c.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-300">
                      <span className="font-semibold text-rose-400">Trap: </span>
                      {c.frequent_misconception}
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS: LAUNCH SANDBOX OR GENERATE VIDEO */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={handleLaunchVideoFromExtracted}
                  className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/40 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Generate 60s Video from Notes
                </button>
                <button
                  onClick={() => setCurrentWorkflow('CODE_SANDBOX')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Terminal className="w-4 h-4" />
                  Practice in Sandbox
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
