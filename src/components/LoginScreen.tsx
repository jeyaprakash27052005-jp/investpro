import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

// Maps Firebase Auth error codes to a message an end-user can actually act on.
function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This website\'s domain is not authorized for sign-in yet. The app owner needs to add it under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was closed before it finished. Please try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Google. Check your connection and try again.';
    default:
      return code
        ? `Sign-in failed (${code}). Please try again.`
        : 'Sign-in failed. Please try again.';
  }
}

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useApp();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 mx-auto flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-cyan-500/20 mb-3">
            IP
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            STOCK MARKET INVESTMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Company Investment &amp; Financial Accounting System
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-60 transition-colors shadow-lg cursor-pointer"
        >
          {isSigningIn ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.3 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.6 5.4C41.7 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
            </svg>
          )}
          <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 justify-center mt-4">
          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
          Your data is saved to your account in Firebase and stays in sync across devices.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Guest fallback */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => continueAsGuest()}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer"
          >
            Continue as Guest instead
          </button>
          <p className="text-[10px] text-slate-600 mt-1.5">
            Guest data stays only in this browser tab and is not saved to the cloud.
          </p>
        </div>
      </div>
    </div>
  );
};
