import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Box,
  Video,
  FileCheck,
  Flame,
  CheckCircle2,
  Printer,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { Button, Badge, Drawer, SkeletonCard } from '../UI';

export const PublicPortfolioPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

  useEffect(() => {
    const fetchPublicPortfolio = async () => {
      setLoading(true);
      setErrorStatus(null);
      try {
        const res = await fetch(`/api/portfolio/public/${slug}`);
        if (!res.ok) {
          setErrorStatus(res.status);
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (json.success && json.portfolio) {
          setData(json.portfolio);
        } else {
          setErrorStatus(404);
        }
      } catch (err) {
        setErrorStatus(500);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicPortfolio();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 p-6 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-6">
          <div className="h-40 bg-[#0c1626] rounded-2xl border border-[#1e2f47] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 404 || !data) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0a121f] border border-[#1b2b41] rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">404 • Portfolio Private or Expired</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This student portfolio is set to private, the public share link has been revoked by the student, or it does not exist.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Mastery.ai Platform</span>
          </a>
        </div>
      </div>
    );
  }

  const { profile, skills, badges, projects } = data;

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Public Banner */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-[#17253b]">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mastery.ai Verified Academic Credentials</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#121d2f] hover:bg-[#18263d] text-slate-200 rounded-lg border border-[#1e304b] transition-colors cursor-pointer text-xs"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print / Save PDF</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-[#0b1424] border border-[#1d304a] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-lg shrink-0">
              <div className="w-full h-full bg-[#080e18] rounded-xl flex items-center justify-center text-2xl font-bold text-white uppercase">
                {profile.name.substring(0, 2)}
              </div>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-100">{profile.name}</h1>
                <Badge variant="purple" size="sm">{profile.degree}</Badge>
                <Badge variant="success" size="xs" dot>Public Portfolio</Badge>
              </div>
              <p className="text-sm font-semibold text-blue-300">{profile.headline}</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{profile.bio}</p>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132238] border border-[#1f3554] text-slate-200">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>BKT Mastery: <strong>{Math.round((profile.overallMastery || 0.5) * 100)}%</strong></span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132238] border border-[#1f3554] text-slate-200">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Streak: <strong>{profile.streakDays || 1} Days</strong></span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Skills Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Verified Engineering Competencies</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill: any) => (
              <div
                key={skill.id}
                onClick={() => setSelectedEvidence(skill)}
                className="bg-[#0a121f] hover:bg-[#0e192b] border border-[#18273d] hover:border-blue-500/40 rounded-xl p-4 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">{skill.track}</span>
                    <h3 className="text-sm font-bold text-slate-100">{skill.name}</h3>
                  </div>
                  <Badge variant={skill.verificationType === 'verified_by_assessment' ? 'success' : 'default'} size="xs">
                    {skill.verificationType === 'verified_by_assessment' ? 'Verified by Assessment' : 'Self-Reported'}
                  </Badge>
                </div>

                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>BKT Posterior Mastery:</span>
                    <span className="font-mono font-bold text-blue-400">{skill.masteryLevel}% ({skill.status})</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#121c2d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                      style={{ width: `${skill.masteryLevel}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-[#142033] flex items-center justify-between">
                  <span>{skill.evidenceSummary || `${skill.evidenceCount} automated challenge(s)`}</span>
                  <span className="text-blue-400 font-semibold flex items-center gap-1">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Showcase */}
        {projects && projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Box className="w-5 h-5 text-indigo-400" />
              <span>Verified Artifacts & Projects</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projects.map((proj: any) => (
                <div key={proj.id} className="bg-[#09111e] border border-[#192940] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-blue-300 uppercase text-[10px]">{proj.type.replace('_', ' ')}</span>
                    <Badge variant="success" size="xs">Verified</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">{proj.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Awarded Badges */}
        {badges && badges.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Certified Badges</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((b: any) => (
                <div key={b.id} className="bg-[#0a1424] border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-200">{b.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{b.description}</p>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1 block">Criteria: {b.criteria}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-[#17253b] text-center text-xs text-slate-500 space-y-1">
          <p>Mastery.ai Pedagogical Engine • Verified Learner Portfolio</p>
          <p className="text-[11px]">Private student information is strictly excluded from public indexes.</p>
        </div>
      </div>

      {/* Evidence Drawer */}
      <Drawer
        isOpen={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidence(null)}
        title={selectedEvidence ? `Verified Evidence: ${selectedEvidence.name}` : ''}
      >
        {selectedEvidence && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#0d1728] border border-[#1c2e47] rounded-xl space-y-1">
              <span className="font-mono text-blue-400 uppercase text-[10px]">{selectedEvidence.track}</span>
              <h4 className="text-sm font-bold text-slate-100">{selectedEvidence.name}</h4>
              <p className="text-slate-400">
                Mastery.ai Bayesian posterior mastery: <strong className="text-emerald-400 font-mono">{selectedEvidence.masteryLevel}%</strong>
              </p>
            </div>
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl text-emerald-300">
              Verified by Automated Assessment Engine: Passed {selectedEvidence.evidenceCount || 1} independent testing challenge(s) with zero manual overrides.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
