import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { LibraryDocument } from '../../types';
import {
  BookOpen,
  Search,
  Upload,
  Download,
  Filter,
  FileText,
  Video,
  Terminal,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';

const RICH_LIBRARY_DOCUMENTS: LibraryDocument[] = [
  {
    id: 'cce102_java',
    title: 'CCE102/L - Java Basics Reviewer: Answers with Code',
    category: 'Question bank',
    uploadedBy: 'Adam Mujor',
    dateAdded: 'Oct 28, 2026',
    pages: 26,
    tags: ['Computer Science', 'Java', 'JVM', 'Variables', 'Control Flow'],
    content: `1.) The component that runs compiled Java bytecode on a specific operating system is the Java Virtual Machine (JVM).
2.) Compiling Greeting.java with javac produces Greeting.class.
3.) A documentation (Javadoc) comment begins with /**.
4.) Java runs on different operating systems because source code is compiled into bytecode that a JVM on any system can run.
5.) An example statement that computes without a cast is: double a = 50;

6.) int m = 4;
int n = ++m * 2;
System.out.println(n);
Output: 10
Solution: ++m makes m 5 first, so n = 5 * 2 = 10.

7.) int a = 23, b = 4;
int c = a / b;
System.out.println(c);
Output: 5 (Integer division truncates decimals).

8.) String s = "Java";
s.length() returns 4.`,
  },
  {
    id: 'hci_principles',
    title: 'Fundamental Principles of Interaction (UX/HCI Design)',
    category: 'Notes',
    uploadedBy: 'keerthika sree.n',
    dateAdded: 'Aug 18, 2026',
    pages: 12,
    tags: ['HCI', 'User Experience', 'Interaction Design', 'Affordances'],
    content: `Fundamental Principles of Interaction:
1. Affordance: An affordance is a relationship between the properties of an object and the capabilities of the agent that determines just how the object could possibly be used. (e.g. A flat plate on a door affords pushing).
2. Signifiers: Signals in the world that communicate where action should take place.
3. Mapping: The relationship between the layout of controls and the devices being controlled.
4. Feedback: Communicating the results of an action immediately and clearly.
5. Conceptual Models: A high-level explanation of how something works.`,
  },
  {
    id: 'boolean_algebra_doc',
    title: 'Boolean Algebra Axioms, Equivalences & Proofs',
    category: 'Guide',
    uploadedBy: 'Faculty Dept',
    dateAdded: 'Oct 24, 2026',
    pages: 18,
    tags: ['Discrete Math', 'Logic', 'De Morgan', 'Absorption'],
    content: `Boolean Algebra Foundations:
- Identity Laws: a + 0 = a, a · 1 = a
- Complement Laws: a + a' = 1, a · a' = 0
- Idempotent Laws: a + a = a, a · a = a
- Absorption Laws: a + (a · b) = a, a · (a + b) = a
- De Morgan's Laws: (a + b)' = a' · b', (a · b)' = a' + b'
- Annihilation: a + 1 = 1, a · 0 = 0`,
  },
  {
    id: 'db_sockets_pdo',
    title: 'Database Architecture: TCP Socket Ports & PDO DSN Protocols',
    category: 'Notes',
    uploadedBy: 'Systems Lab',
    dateAdded: 'Oct 15, 2026',
    pages: 34,
    tags: ['PHP', 'MySQL', 'Port 3306', 'Port 80', 'Sockets'],
    content: `Client-Server Sockets:
- Web Servers (Apache/Nginx) bind to TCP 80 (HTTP) or 443 (HTTPS).
- MySQL daemons listen on TCP 3306.
- In PDO connection strings: mysql:host=localhost;port=3306;dbname=test
- Supplying port 80 causes Connection Refused (SQLSTATE[HY000] [2002]).`,
  },
  {
    id: 'cad_parametric_design',
    title: 'Parametric CAD Foundations: Degrees of Freedom, Constraints & Extrusion Manifolds',
    category: 'Mechanical Engineering (CAD)',
    uploadedBy: 'Prof. Marcus Vance',
    dateAdded: 'Nov 01, 2026',
    pages: 42,
    tags: ['Mechanical Engineering (CAD)', 'Fusion 360', 'Degrees of Freedom', 'Geometric Constraints', 'Extrude'],
    content: `Parametric CAD Principles:
1. Degrees of Freedom (DOF): An unconstrained 2D point has 2 translational DOF (X, Y). Fully constrained geometry has 0 DOF and renders black. Extruding under-constrained blue sketches is an engineering anti-pattern (82% failure rate).
2. Geometric Constraints: Coincident locks vertices; Tangent guarantees G1 slope continuity without cusps; Concentric aligns circular centers; Symmetric mirrors across a datum axis.
3. Driving Dimensions & Units: ISO/ASME standardizes on millimeters (mm). Mixing mm and cm causes 10x scale errors.
4. Extrude Operations: Requires closed, 2-manifold planar boundaries. Open profiles or self-intersecting loops fail to form watertight solid bodies.`,
  },
  {
    id: 'cad_fea_gdnt',
    title: 'Machine Component Design: GD&T Concentricity, Stress Concentrations & Factor of Safety',
    category: 'Mechanical Engineering (CAD)',
    uploadedBy: 'Dr. Clara Lindqvist',
    dateAdded: 'Oct 30, 2026',
    pages: 38,
    tags: ['Mechanical Engineering (CAD)', 'FOS', 'FEA', 'GD&T', 'Fillets', 'Concentricity', 'Mass Properties'],
    content: `Structural Design & GD&T Standards:
1. Hub/Bore Concentricity: Rotating machinery demands coaxial datum alignment. Radial runout generates centrifugal unbalance forces proportional to omega^2.
2. Fillets & Stress Relieving: Sharp 90-degree internal corners produce theoretical infinite stress concentrations (Kt -> inf). Applying transition fillets (R >= 2.5mm) creates G1 boundaries and prevents fatigue cracks.
3. Factor of Safety (FOS): FOS = yield_strength / max_stress. Standard ductile machinery mandates target FOS >= 2.0 to provide margin against dynamic shock.
4. Physical Mass Properties: Mass = density * volume (m = rho * V). 1 cm³ = 1000 mm³. 1018 Steel ~ 7.85 g/cm³, 6061-T6 Aluminum ~ 2.70 g/cm³.`,
  },
];

export const VisionLibraryVault: React.FC = () => {
  const { setCurrentWorkflow, setActiveVideoStoryboard, setSelectedNode, dkmNodes, activeTrack } = useTutor();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'school'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    activeTrack === 'Mechanical Engineering (CAD)' ? 'Mechanical Engineering (CAD)' : 'All'
  );
  const [sortOption, setSortOption] = useState<'Recent' | 'Popular' | 'Liked'>('Recent');
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);

  const filteredDocs = RICH_LIBRARY_DOCUMENTS.filter(d => {
    const matchesCategory =
      selectedCategory === 'All' || d.category === selectedCategory || d.tags.includes(selectedCategory);
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLaunchVideo = (doc: LibraryDocument) => {
    setActiveVideoStoryboard({
      title: `60s Micro-Mastery: ${doc.title}`,
      duration_secs: 60,
      concept: doc.title,
      key_takeaway: doc.content.slice(0, 140) + '...',
      scenes: [
        {
          time: '0-15s',
          visual: `Animation visualizing key principles of ${doc.title}.`,
          narration: `Welcome to this 60-second micro-breakdown on ${doc.title}.`,
        },
        {
          time: '15-40s',
          visual: 'Detailed architectural walkthrough and common exam pitfalls.',
          narration: 'Pay careful attention to the standard notations and evaluation orders.',
        },
        {
          time: '40-60s',
          visual: 'Synthesized summary and verified execution assertions.',
          narration: 'Mastering these fundamental rules lets you solve exam questions with confidence.',
        },
      ],
    });
    setCurrentWorkflow('AI_VIDEO');
  };

  const handleDownloadDoc = (doc: LibraryDocument) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4 animate-fade-in">
      {/* Top Header matching video */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#1a273b]">
        <div>
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <p className="text-xs text-slate-400 mt-0.5">Study materials, guides, books, and question banks</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => alert("Connecting to CogniCSE Peer Study Community & Discord...")}
            className="px-3.5 py-2 rounded-xl bg-[#111b2b] hover:bg-[#162235] text-slate-200 text-xs font-medium border border-[#1e2f47] flex items-center gap-2 cursor-pointer transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Request notes on Discord</span>
          </button>
          <button
            onClick={() => setPreviewDoc(RICH_LIBRARY_DOCUMENTS[0])}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Category Tabs including Mechanical Engineering (CAD) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['All', 'Mechanical Engineering (CAD)', 'Question bank', 'Notes', 'Guide'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0c1421] text-slate-400 border border-[#1a273b] hover:text-white'
            }`}
          >
            {cat === 'Mechanical Engineering (CAD)' ? '⚙️ Mechanical Engineering (CAD)' : cat}
          </button>
        ))}
      </div>

      {/* Filter bar & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0c1421] text-slate-400 border border-[#1a273b] hover:text-white'
            }`}
          >
            All Materials (73)
          </button>
          <button
            onClick={() => setActiveFilter('my')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeFilter === 'my'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0c1421] text-slate-400 border border-[#1a273b] hover:text-white'
            }`}
          >
            My Vault (0)
          </button>
          <button
            onClick={() => setActiveFilter('school')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeFilter === 'school'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0c1421] text-slate-400 border border-[#1a273b] hover:text-white'
            }`}
          >
            School Vault (0)
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Study materials, guides, books, and question banks"
              className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="px-3 py-1.5 bg-[#0c1421] border border-[#1a273b] rounded-xl text-xs text-slate-300 flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Sort:</span>
            <span className="font-semibold text-white">Most Recent</span>
          </div>
        </div>
      </div>

      {/* Materials Grid (Exact Card layout from the video!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => (
          <div
            key={doc.id}
            className="bg-[#0c1421] border border-[#1a273b] rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-blue-500/50 transition-all space-y-4 group"
          >
            <div>
              {/* Top tag badge */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>{doc.category}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{doc.pages} pages</span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                {doc.title}
              </h3>

              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                <div>Uploaded by: <span className="text-slate-300 font-medium">{doc.uploadedBy}</span></div>
                <div>Added on: <span className="text-slate-400">{doc.dateAdded}</span></div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {doc.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-[#070d18] border border-[#1a273b] text-slate-400 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Card Actions Footer */}
            <div className="pt-3 border-t border-[#1a273b] flex items-center justify-between gap-2">
              <button
                onClick={() => setPreviewDoc(doc)}
                className="flex-1 py-1.5 px-3 bg-[#111b2b] hover:bg-[#162235] text-slate-200 border border-[#1e2f47] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Read Notes</span>
              </button>

              <button
                onClick={() => handleDownloadDoc(doc)}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Reader / Reviewer Modal (Matching PDF view from video!) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded uppercase font-semibold">
                  {previewDoc.category}
                </span>
                <span className="text-xs text-slate-400">{previewDoc.uploadedBy} • {previewDoc.dateAdded}</span>
              </div>
              <h2 className="text-lg font-bold text-white">{previewDoc.title}</h2>
            </div>

            {/* Document Content View */}
            <div className="my-4 p-4 bg-[#070d18] border border-[#1a273b] rounded-xl overflow-y-auto max-h-[50vh] text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
              {previewDoc.content}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#1a273b] flex items-center justify-between gap-3">
              <button
                onClick={() => handleLaunchVideo(previewDoc)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Video className="w-4 h-4" />
                <span>Generate 60s AI Video</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="px-4 py-2 bg-[#111b2b] hover:bg-[#162235] text-slate-200 border border-[#1e2f47] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
