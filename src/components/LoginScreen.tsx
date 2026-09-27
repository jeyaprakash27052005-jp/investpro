import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LoginScreen: React.FC = () => {
  const { continueAsGuest } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    continueAsGuest();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Header matching original project */}
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

        {/* Clean Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              id="loginUser"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              id="loginPass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            id="loginBtn"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
