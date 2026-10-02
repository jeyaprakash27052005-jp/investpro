import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Image as ImageIcon,
  Save,
  CheckCircle,
  AlertTriangle,
  Fingerprint,
  Building2,
  MapPin,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, userProfile, updateUserProfile } = useApp();

  const baselineName = userProfile?.displayName || user?.displayName || '';
  const baselinePhoto = userProfile?.photoURL || user?.photoURL || '';
  const baselineCompanyName = userProfile?.companyName || '';
  const baselineCompanyAddress = userProfile?.companyAddress || '';

  const [displayName, setDisplayName] = useState(baselineName);
  const [photoURL, setPhotoURL] = useState(baselinePhoto);
  const [companyName, setCompanyName] = useState(baselineCompanyName);
  const [companyAddress, setCompanyAddress] = useState(baselineCompanyAddress);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Keep the form in sync if the profile loads/changes after the initial
  // render (e.g. right after sign-in, before the Firestore listener resolves).
  useEffect(() => {
    setDisplayName(baselineName);
    setPhotoURL(baselinePhoto);
    setCompanyName(baselineCompanyName);
    setCompanyAddress(baselineCompanyAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineName, baselinePhoto, baselineCompanyName, baselineCompanyAddress]);

  const isDirty =
    displayName.trim() !== baselineName ||
    photoURL.trim() !== baselinePhoto ||
    companyName.trim() !== baselineCompanyName ||
    companyAddress.trim() !== baselineCompanyAddress;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatus({ type: 'error', msg: 'Display name cannot be empty.' });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    const ok = await updateUserProfile({
      displayName: displayName.trim(),
      photoURL: photoURL.trim(),
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
    });
    setIsSaving(false);
    setStatus(
      ok
        ? { type: 'success', msg: 'Profile updated and synced to the cloud.' }
        : { type: 'error', msg: 'Could not save your profile. Please try again.' }
    );
  };

  const previewSrc = photoURL.trim();
  const initial = (displayName || user?.email || 'U').trim()[0]?.toUpperCase() || 'U';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Edit form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <UserIcon size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">My Profile</h2>
            <p className="text-xs text-slate-400">Update how your name and photo appear across InvestPro</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="flex items-center gap-4">
            {previewSrc ? (
              <img
                key={previewSrc}
                src={previewSrc}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-slate-700 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                <ImageIcon size={12} /> Photo URL (optional)
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Leave blank to use your Google account photo.</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
              <UserIcon size={12} /> Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-white mb-1">Company Details</h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Shown as the letterhead on printed and exported Financial Reports. Leave blank to print without a company header.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                  <Building2 size={12} /> Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Sharma Trading & Investments Pvt. Ltd."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                  <MapPin size={12} /> Company Address
                </label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder={'123 MG Road, Bengaluru, Karnataka 560001\nGSTIN: 29ABCDE1234F1Z5'}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow shadow-cyan-600/20 cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            {isDirty && !isSaving && (
              <button
                type="button"
                onClick={() => {
                  setDisplayName(baselineName);
                  setPhotoURL(baselinePhoto);
                  setCompanyName(baselineCompanyName);
                  setCompanyAddress(baselineCompanyAddress);
                  setStatus(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Discard changes
              </button>
            )}
          </div>

          {status && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{status.msg}</span>
            </div>
          )}
        </form>
      </div>

      {/* Account details (read-only, from Google sign-in) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4">Account Details</h3>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <span className="flex items-center gap-2 text-slate-400">
              <Mail size={14} /> Email
            </span>
            <span className="text-slate-200 font-mono truncate max-w-[220px]">{user?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <span className="flex items-center gap-2 text-slate-400">
              <Calendar size={14} /> Member Since
            </span>
            <span className="text-slate-200">{userProfile?.createdAt ? formatDate(userProfile.createdAt) : '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-slate-400">
              <Fingerprint size={14} /> Account ID
            </span>
            <span className="text-slate-500 font-mono text-[11px] truncate max-w-[220px]">{user?.uid || '—'}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-4">
          Email and Account ID come from your Google sign-in and can't be changed here.
        </p>
      </div>
    </div>
  );
};
