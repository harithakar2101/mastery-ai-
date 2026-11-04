import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { UserProfile, SupportedLanguage } from '../../types';
import {
  X,
  User,
  GraduationCap,
  Code2,
  Moon,
  Sun,
  Save,
  Download,
  KeyRound,
  LogOut,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../data/languages';
import {
  changePasswordOnServer,
  signOutEverywhereOnServer,
  deleteAccountOnServer,
  exportUserDataFromServer,
} from '../../context/tutorSync';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, setUserProfile, islm, exportOfflinePack, logoutUser } = useTutor();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile form state
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [degree, setDegree] = useState(userProfile.degree || 'B.Tech in Computer Science & Engineering');
  const [targetMajor, setTargetMajor] = useState(userProfile.targetMajor || 'Systems & Artificial Intelligence');
  const [preferredLanguages, setPreferredLanguages] = useState<SupportedLanguage[]>(userProfile.preferredLanguages);
  const [theme, setTheme] = useState<'dark' | 'light'>(userProfile.theme);
  const [retentionDays, setRetentionDays] = useState<number>(userProfile.retentionDays || 180);
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const toggleLanguage = (langId: SupportedLanguage) => {
    setPreferredLanguages(prev =>
      prev.includes(langId) ? prev.filter(l => l !== langId) : [...prev, langId]
    );
  };

  const handleSaveProfile = () => {
    setUserProfile(prev => ({
      ...prev,
      name,
      email,
      degree,
      targetMajor,
      preferredLanguages,
      theme,
    }));
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    onClose();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (newPassword.length < 8) {
      setSecurityMessage({ text: 'New password must be at least 8 characters long.', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePasswordOnServer(currentPassword, newPassword);
      setSecurityMessage({ text: 'Password changed successfully.', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({ text: err?.message || 'Failed to change password.', isError: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    setIsSigningOutAll(true);
    setSecurityMessage(null);
    try {
      await signOutEverywhereOnServer();
      await logoutUser();
      onClose();
    } catch (err: any) {
      setSecurityMessage({ text: err?.message || 'Failed to sign out everywhere.', isError: true });
      setIsSigningOutAll(false);
    }
  };

  const handleUpdateRetention = async () => {
    setIsUpdatingRetention(true);
    setSecurityMessage(null);
    try {
      const res = await fetch('/api/auth/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ retentionDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update retention preferences');
      setUserProfile(prev => ({ ...prev, retentionDays }));
      setSecurityMessage({ text: `Retention preferences saved: personal history retained for ${retentionDays} days.`, isError: false });
    } catch (err: any) {
      setSecurityMessage({ text: err.message, isError: true });
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setSecurityMessage(null);
    try {
      await exportUserDataFromServer();
      setSecurityMessage({ text: 'Data export downloaded successfully.', isError: false });
    } catch (err: any) {
      setSecurityMessage({ text: err?.message || 'Failed to export data.', isError: true });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setSecurityMessage(null);
    try {
      await deleteAccountOnServer();
      await logoutUser();
      onClose();
    } catch (err: any) {
      setSecurityMessage({ text: err?.message || 'Failed to delete account.', isError: true });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#1a273b]">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-lg">
            {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CS'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{name || 'Student Profile'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                userProfile.role === 'teacher'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : userProfile.role === 'admin'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-blue-950 text-blue-300 border border-blue-700'
              }`}>
                {userProfile.role}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{userProfile.email} &bull; ID: {userProfile.id}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 pt-4 pb-2 border-b border-[#1a273b] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setSecurityMessage(null); }}
            className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile & Preferences
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('security'); setSecurityMessage(null); }}
            className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Account & Security Settings
          </button>
        </div>

        {securityMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            securityMessage.isError
              ? 'bg-red-950/60 border border-red-800 text-red-300'
              : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
          }`}>
            {securityMessage.isError ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span>{securityMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Profile & Preferences */}
        {activeTab === 'profile' && (
          <div className="space-y-4 py-4 text-xs">
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Academic Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#070d18]/50 border border-[#1a273b] rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Degree & Major */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Degree / College</label>
                <input
                  type="text"
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                  className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Specialization</label>
                <input
                  type="text"
                  value={targetMajor}
                  onChange={e => setTargetMajor(e.target.value)}
                  className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Preferred Programming Languages */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Preferred Programming Languages (Select in Sandbox)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_LANGUAGES.map(lang => {
                  const isSelected = preferredLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-[#070d18] border-[#1a273b] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="p-3 bg-[#070d18] rounded-xl border border-[#1a273b] grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Daily Streak</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">{userProfile.streakDays || 1} Days 🔥</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Mock Tests</div>
                <div className="text-base font-bold text-blue-400 mt-0.5">{userProfile.testsCompleted || 0} Finished</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">DKM Mastery</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {((islm?.overall_mastery || 0.6) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center justify-between p-2.5 bg-[#070d18] rounded-xl border border-[#1a273b]">
              <span className="text-slate-300 font-medium">Visual Interface Theme</span>
              <div className="flex items-center gap-1 bg-[#0c1421] p-1 rounded-lg border border-[#1a273b]">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${
                    theme === 'light' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-[#1a273b] flex items-center justify-between">
              <button
                type="button"
                onClick={exportOfflinePack}
                className="px-3 py-1.5 bg-[#070d18] hover:bg-[#111b2b] text-slate-300 rounded-xl text-xs font-medium border border-[#1a273b] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Offline Pack</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Account & Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6 py-4 text-xs">
            {/* Section 1: Change Password */}
            <form onSubmit={handleChangePassword} className="p-4 bg-[#070d18] rounded-xl border border-[#1a273b] space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>Change Password</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Update your account password. Must contain at least 8 characters.
              </p>

              <div>
                <label className="block text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#0c1421] border border-[#1a273b] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Update Password</span>
              </button>
            </form>

            {/* Section 2: Data Export & Session Revocation */}
            <div className="p-4 bg-[#070d18] rounded-xl border border-[#1a273b] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1a273b]">
                <div>
                  <div className="text-slate-200 font-bold">Export Personal Data</div>
                  <div className="text-[11px] text-slate-400">Download a full JSON dump of your profile, ISLM, attempts, and sessions.</div>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="px-3 py-2 bg-[#0c1421] hover:bg-[#14233a] border border-[#1a273b] text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-bold">Sign Out Everywhere</div>
                  <div className="text-[11px] text-slate-400">Revoke active session tokens on all browsers and devices immediately.</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOutEverywhere}
                  disabled={isSigningOutAll}
                  className="px-3 py-2 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800 text-amber-300 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isSigningOutAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  <span>Sign Out All</span>
                </button>
              </div>

              {/* Data Retention Period */}
              <div className="pt-3 border-t border-[#1a273b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-slate-200 font-bold">Data Retention Window</div>
                  <div className="text-[11px] text-slate-400">Personal attempts, sessions, and sensor events expire and purge automatically.</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={retentionDays}
                    onChange={e => setRetentionDays(Number(e.target.value))}
                    className="bg-[#0c1421] border border-[#1a273b] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={180}>180 Days (Default)</option>
                    <option value={365}>1 Year (365 Days)</option>
                    <option value={730}>2 Years (730 Days)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateRetention}
                    disabled={isUpdatingRetention}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {isUpdatingRetention ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Danger Zone (Delete Account) */}
            <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/40 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Danger Zone: Delete Account & Data</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Permanently purge your account, ISLM pedagogical records, attempts, interventions, and session history from the server. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete My Account and Data</span>
                </button>
              ) : (
                <div className="p-3 bg-red-950/60 border border-red-700 rounded-xl space-y-2">
                  <div className="text-red-200 font-bold text-[11px]">
                    Are you absolutely sure you want to delete all your records?
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-[#0c1421] text-slate-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Yes, Permanently Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
