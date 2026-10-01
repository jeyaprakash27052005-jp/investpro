import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24 C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useApp();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged in AppContext picks up the signed-in user from here.
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setError(
          "This site's domain isn't authorized for Google Sign-In yet. In Firebase Console → " +
          'Authentication → Settings → Authorized domains, add this domain.'
        );
      } else if (code === 'auth/popup-blocked') {
        setError('Your browser blocked the sign-in popup. Allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Sign-in window was closed before finishing. Please try again.');
      } else {
        setError('Google Sign-In failed. Please try again.');
      }
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
            Company Investment & Financial Accounting System
          </p>
        </div>

        {/* Real Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-60 transition-colors shadow-lg cursor-pointer"
        >
          {isSigningIn ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
          <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <p className="flex items-center gap-1.5 justify-center text-center text-[11px] text-slate-500 mt-3">
          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
          <span>Your trades, accounts and reports are saved to your private Firestore database and sync in real time across devices.</span>
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
