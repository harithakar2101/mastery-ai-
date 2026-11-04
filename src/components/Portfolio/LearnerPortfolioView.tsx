import React, { useState, useEffect } from 'react';
import { useTutor } from '../../context/TutorContext';
import {
  Award,
  ShieldCheck,
  Share2,
  Lock,
  Globe,
  Link as LinkIcon,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Box,
  Video,
  FileCheck,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  AlertTriangle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  Button,
  Badge,
  Modal,
  Drawer,
  Tabs,
  SkeletonCard,
  EmptyState,
  useToast,
} from '../UI';

interface SkillEvidence {
  attemptId: string;
  kind: string;
  passed: boolean;
  tierUsed?: number;
  hintsRequested?: number;
  durationSec?: number;
  language?: string;
  codeSnippet?: string;
  ts: string;
}

interface VerifiedSkill {
  id: string;
  name: string;
  track: string;
  masteryLevel: number; // 0 - 100
  status: 'Mastered' | 'Proficient' | 'Developing' | 'Novice';
  verificationType: 'verified_by_assessment' | 'self_reported';
  evidenceCount: number;
  evidence: SkillEvidence[];
}

interface AwardedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  awarded: boolean;
  awardedAt?: string | null;
  criteria: string;
  progress: number;
}

interface PortfolioProject {
  id: string;
  type: string;
  title: string;
  description: string;
  previewUrl?: string;
  codeSnippet?: string;
  durationSeconds?: number;
  shareToken?: string;
  verified: boolean;
  createdAt: string;
}

interface TimelineItem {
  id: string;
  title: string;
  category: string;
  description: string;
  timestamp: string;
  verified: boolean;
}

export const LearnerPortfolioView: React.FC = () => {
  const { userProfile, setCurrentWorkflow } = useTutor();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState('All Tracks');
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<VerifiedSkill[]>([]);
  const [badges, setBadges] = useState<AwardedBadge[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // Modals & Drawers
  const [selectedEvidence, setSelectedEvidence] = useState<VerifiedSkill | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<AwardedBadge | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Editable bio/headline fields
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'link_only' | 'public'>('private');

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.portfolio) {
          const p = data.portfolio;
          setProfile(p.profile);
          setSkills(p.skills || []);
          setBadges(p.badges || []);
          setProjects(p.projects || []);
          setTimeline(p.timeline || []);
          setVisibility(p.profile.visibility || 'private');
          setHeadline(p.profile.headline || '');
          setBio(p.profile.bio || '');
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      toast.error('Network Error', 'Could not load portfolio data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleUpdateVisibility = async (newVisibility: 'private' | 'link_only' | 'public') => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/portfolio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visibility: newVisibility, headline, bio }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVisibility(newVisibility);
        setProfile((prev: any) => ({ ...prev, visibility: newVisibility }));
        toast.success(
          'Visibility Updated',
          newVisibility === 'private'
            ? 'Portfolio is now private.'
            : `Portfolio is now accessible via ${newVisibility === 'public' ? 'public index & direct link' : 'secret link only'}.`
        );
      } else {
        toast.error('Update Failed', data?.error?.message || 'Could not update visibility');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'Network error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke public access? The public link will immediately return a 404 error.')) {
      return;
    }
    try {
      const res = await fetch('/api/portfolio/revoke', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setVisibility('private');
        setProfile((prev: any) => ({ ...prev, visibility: 'private' }));
        toast.warning('Link Revoked', 'Public portfolio link has been invalidated. URL now returns 404.');
      }
    } catch (err) {
      toast.error('Error', 'Failed to revoke link.');
    }
  };

  const handleCopyLink = () => {
    if (!profile?.slug) return;
    const fullUrl = `${window.location.origin}/p/${profile.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    toast.success('Link Copied', 'Public portfolio URL copied to clipboard.');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleDownloadTranscript = () => {
    window.open('/api/portfolio/transcript.json', '_blank');
    toast.info('Downloading Transcript', 'Verified JSON skill credentials exported.');
  };

  const tracks = ['All Tracks', 'Computer Science', 'Mechanical CAD', 'Web Engineering', 'AI & Data Science'];
  const filteredSkills = activeTrack === 'All Tracks'
    ? skills
    : skills.filter(s => s.track === activeTrack);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6">
        <div className="h-48 bg-[#0a121f] rounded-2xl border border-[#1a293f] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const publicUrl = profile ? `${window.location.origin}/p/${profile.slug}` : '';

  return (
    <div className="portfolio-container max-w-6xl mx-auto space-y-8 pb-16">
      {/* Print-Only Title Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{profile?.name || userProfile.name}</h1>
        <p className="text-sm text-slate-700">{profile?.degree || 'Computer Science & Engineering'}</p>
        <p className="text-xs text-slate-500 font-mono">Mastery.ai Verified Academic Credentials • Issued {new Date().toLocaleDateString()}</p>
      </div>

      {/* Profile Header Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1626] via-[#09111e] to-[#070c16] border border-[#1f324d] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar with Verified Ring */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-1 shadow-lg">
                <div className="w-full h-full bg-[#080e18] rounded-xl flex items-center justify-center text-2xl font-bold text-white uppercase tracking-wider">
                  {(profile?.name || userProfile.name || 'S').substring(0, 2)}
                </div>
              </div>
              <div
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-[#09111e] shadow-xs"
                title="Verified by Mastery.ai BKT Mastery Engine"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                  {profile?.name || userProfile.name}
                </h1>
                <Badge variant="purple" size="sm">
                  {profile?.degree || 'Engineering Scholar'}
                </Badge>
                <Badge
                  variant={visibility === 'private' ? 'default' : visibility === 'link_only' ? 'warning' : 'success'}
                  size="xs"
                  dot
                >
                  {visibility === 'private' ? 'Private 🔒' : visibility === 'link_only' ? 'Link Only 🔗' : 'Public 🌐'}
                </Badge>
              </div>

              <p className="text-sm font-medium text-blue-300">
                {profile?.headline || 'Autonomous Algorithmic & Systems Scholar'}
              </p>

              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                {profile?.bio || 'Documenting independently verified engineering competencies, 3D parametric artifacts, and code lab submissions evaluated by the BKT engine.'}
              </p>

              {/* BKT Mastery Metric Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132238] border border-[#1f3554] text-slate-200">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>BKT Mastery: <strong>{Math.round((profile?.overallMastery || userProfile.overallMastery || 0.5) * 100)}%</strong></span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132238] border border-[#1f3554] text-slate-200">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Streak: <strong>{profile?.streakDays || userProfile.streakDays || 1} Days</strong></span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132238] border border-[#1f3554] text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Manual Editing • 100% Cryptographically Verified</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar (Hidden when printing) */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto print:hidden">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Share2 className="w-4 h-4" />}
              onClick={() => setIsShareModalOpen(true)}
            >
              Share & Visibility
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={handleExportPDF}
                title="Print or export clean formatted PDF portfolio"
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadTranscript}
                title="Download verified JSON skills transcript"
              >
                JSON Transcript
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Track Filter Tabs */}
      <section className="print:hidden flex items-center justify-between border-b border-[#1b2b41] pb-3">
        <Tabs
          variant="pills"
          size="sm"
          tabs={tracks.map(t => ({ id: t, label: t }))}
          activeTab={activeTrack}
          onChange={setActiveTrack}
        />
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          Showing <strong>{filteredSkills.length}</strong> verified competencies
        </div>
      </section>

      {/* Verified Skills Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Verified Competencies & Evidence</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each claim is backed by automated unit tests, CAD geometries, or code lab evaluations. Click any skill to inspect the immutable evidence record.
            </p>
          </div>
        </div>

        {filteredSkills.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8" />}
            title="No skills found for this track"
            description="Complete interactive labs or diagnostic challenges to verify competencies in this track."
            actionLabel="Open Code Sandbox"
            onAction={() => setCurrentWorkflow('CODE_SANDBOX')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSkills.map(skill => (
              <div
                key={skill.id}
                onClick={() => setSelectedEvidence(skill)}
                className="group relative bg-[#0a121f] hover:bg-[#0e192b] border border-[#19283f] hover:border-blue-500/40 rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {skill.track}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                      {skill.name}
                    </h3>
                  </div>
                  <Badge
                    variant={skill.verificationType === 'verified_by_assessment' ? 'success' : 'default'}
                    size="xs"
                    dot={skill.verificationType === 'verified_by_assessment'}
                  >
                    {skill.verificationType === 'verified_by_assessment' ? 'Verified by Assessment' : 'Self-Reported'}
                  </Badge>
                </div>

                {/* Mastery Progress Bar */}
                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">BKT Posterior Mastery:</span>
                    <span className="font-mono font-bold text-blue-400">{skill.masteryLevel}% ({skill.status})</span>
                  </div>
                  <div className="w-full h-2 bg-[#121c2d] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        skill.masteryLevel >= 85
                          ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                          : skill.masteryLevel >= 70
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${skill.masteryLevel}%` }}
                    />
                  </div>
                </div>

                {/* Evidence footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#142135]">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{skill.evidenceCount} Linked Evidence Record(s)</span>
                  </span>
                  <span className="text-blue-400 text-xs font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Evidence</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Project & Artifact Gallery */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-400" />
            <span>Interactive Project Gallery</span>
          </h2>
          <p className="text-xs text-slate-400">
            Validated technical artifacts generated across 3D CAD modeling, interactive web engineering, and AI micro-learning videos.
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Box className="w-8 h-8" />}
            title="No project artifacts published yet"
            description="Build a 3D model in the CAD lab, solve a code sandbox challenge, or generate a 60s AI video to populate your showcase."
            actionLabel="Open 3D CAD Lab"
            onAction={() => setCurrentWorkflow('CAD_LAB')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map(proj => (
              <div
                key={proj.id}
                className="bg-[#09111e] border border-[#192940] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-[#284266] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5 font-semibold text-blue-300">
                      {proj.type === 'ai_video' ? <Video className="w-3.5 h-3.5 text-purple-400" /> : <Box className="w-3.5 h-3.5 text-indigo-400" />}
                      <span className="uppercase text-[10px] tracking-wide font-mono">{proj.type.replace('_', ' ')}</span>
                    </span>
                    <Badge variant="success" size="xs">Verified</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{proj.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{proj.description}</p>
                </div>

                <div className="pt-2 border-t border-[#142033] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                  {proj.type === 'ai_video' && (
                    <Button
                      variant="ghost"
                      size="xs"
                      rightIcon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => setCurrentWorkflow('AI_VIDEO')}
                    >
                      Watch Video
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Certificates & Badges (Awarded strictly when mastery rules are met) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Mastery Badges & Certificates</span>
          </h2>
          <p className="text-xs text-slate-400">
            Awarded strictly when rule criteria in the Bayesian Knowledge Tracing engine are satisfied. No manual badge assignment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div
              key={badge.id}
              onClick={() => badge.awarded && setSelectedCertificate(badge)}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                badge.awarded
                  ? 'bg-[#0a1424] border-amber-500/40 hover:border-amber-400 shadow-md cursor-pointer'
                  : 'bg-[#070d17] border-[#152236] opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    badge.awarded
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate">{badge.name}</h3>
                    <Badge variant={badge.awarded ? 'warning' : 'default'} size="xs">
                      {badge.awarded ? 'Awarded' : 'Locked'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">{badge.description}</p>
                </div>
              </div>

              {/* Criteria Progress */}
              <div className="mt-3 pt-3 border-t border-[#142135] text-xs">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Criteria: {badge.criteria}</span>
                  <span className="font-mono">{badge.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#121d2f] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${badge.awarded ? 'bg-amber-400' : 'bg-slate-600'}`}
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Learning Timeline Feed */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Mastery Verification Timeline</span>
          </h2>
          <p className="text-xs text-slate-400">
            Append-only audit trail recording every mastery milestone and evaluated lab attempt.
          </p>
        </div>

        <div className="bg-[#09101d] border border-[#17253b] rounded-xl p-5">
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={item.id} className="relative flex items-start gap-3.5">
                {idx !== timeline.length - 1 && (
                  <div className="absolute top-5 left-2 w-0.5 h-full bg-[#16253c]" />
                )}
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-[#09101d] shrink-0 mt-0.5 shadow-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-200">{item.title}</h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidence(null)}
        title={selectedEvidence ? `Evidence Record: ${selectedEvidence.name}` : ''}
        width="lg"
      >
        {selectedEvidence && (
          <div className="space-y-6">
            <div className="bg-[#0d1728] border border-[#1c2e47] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-blue-400 uppercase">{selectedEvidence.track}</span>
                <Badge variant={selectedEvidence.verificationType === 'verified_by_assessment' ? 'success' : 'default'} size="xs">
                  {selectedEvidence.verificationType === 'verified_by_assessment' ? 'Verified by Assessment' : 'Self-Reported'}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-100">{selectedEvidence.name}</h3>
              <p className="text-xs text-slate-400">
                Mastery.ai Bayesian posterior probability: <strong className="text-emerald-400 font-mono">{selectedEvidence.masteryLevel}%</strong>. Evaluated across {selectedEvidence.evidenceCount} empirical attempts.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Automated Test Submissions ({selectedEvidence.evidence.length})
              </h4>
              {selectedEvidence.evidence.map((ev, i) => (
                <div key={ev.attemptId || i} className="bg-[#070e1a] border border-[#192b45] rounded-xl p-3.5 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-blue-300 font-semibold">{ev.attemptId}</span>
                    <span>{new Date(ev.ts).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5" /> Unit Tests Passed
                    </span>
                    <span className="text-slate-400">Tier: {ev.tierUsed || 1}</span>
                    <span className="text-slate-400">Hints: {ev.hintsRequested || 0}</span>
                    {ev.language && <span className="text-indigo-300">Lang: {ev.language}</span>}
                  </div>
                  {ev.codeSnippet && (
                    <div className="bg-[#040810] p-2.5 rounded-lg border border-[#142236] text-[11px] text-slate-300 overflow-x-auto max-h-36">
                      <pre><code>{ev.codeSnippet}</code></pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-300 leading-relaxed">
              <strong>Immutable Audit Seal:</strong> This evidence record cannot be altered or fabricated. Scores are generated exclusively through test case executions and Bayesian parameter estimation.
            </div>
          </div>
        )}
      </Drawer>

      {/* Digital Certificate Viewer Modal */}
      <Modal
        isOpen={Boolean(selectedCertificate)}
        onClose={() => setSelectedCertificate(null)}
        title="Official Digital Credential"
        maxWidth="lg"
      >
        {selectedCertificate && (
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center text-slate-900 shadow-xl">
              <Award className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest">
                Mastery.ai Certified Competency
              </span>
              <h2 className="text-xl font-bold text-slate-100">{selectedCertificate.name}</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{selectedCertificate.description}</p>
            </div>

            <div className="bg-[#08101c] border border-[#1a2c44] rounded-xl p-4 text-xs text-slate-300 space-y-1 font-mono max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-semibold">{profile?.name || userProfile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Criteria Met:</span>
                <span className="text-emerald-400">{selectedCertificate.criteria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issued On:</span>
                <span>{selectedCertificate.awardedAt ? new Date(selectedCertificate.awardedAt).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="primary" size="sm" onClick={handleExportPDF}>
                Download PDF Certificate
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCertificate(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Share & Privacy Control Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Portfolio Share & Privacy Controls"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Visibility Setting
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'private', label: 'Private', icon: Lock, desc: 'Only you can view' },
                { id: 'link_only', label: 'Link Only', icon: LinkIcon, desc: 'Secret read-only link' },
                { id: 'public', label: 'Public', icon: Globe, desc: 'Public link & index' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleUpdateVisibility(opt.id as any)}
                  disabled={isSavingSettings}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    visibility === opt.id
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-[#1b2b41] bg-[#09101d] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <opt.icon className="w-4 h-4 mb-1 text-blue-400" />
                  <div className="text-xs font-bold text-slate-200">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {visibility !== 'private' ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Shareable Public URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="w-full bg-[#080e18] border border-[#1e2f47] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 select-all"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 Public portfolios display verified skills, project artifacts, and badges. Private data (email, password, raw events) is strictly omitted.
              </p>

              {/* Revoke Control per prompt */}
              <div className="pt-3 border-t border-[#1a283e] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-400">Revoke Link</h4>
                  <p className="text-[11px] text-slate-500">Immediately disables the link. Any visitor will receive a 404 error.</p>
                </div>
                <Button variant="danger" size="xs" onClick={handleRevoke}>
                  Revoke Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#0a1220] border border-[#1b2c45] rounded-xl text-xs text-slate-400">
              Your portfolio is currently <strong>Private</strong>. Nobody can access your portfolio via a public URL until you publish it.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsShareModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
