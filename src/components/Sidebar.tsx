import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ActivePage } from '../types';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Briefcase,
  PiggyBank,
  Receipt,
  BookOpen,
  FileText,
  BarChart3,
  Database,
  LogOut,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  closeMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  closeMobileMenu,
}) => {
  const {
    user,
    userProfile,
    signOut,
    financialYears,
    selectedYear,
    setSelectedYear,
    addFinancialYear,
    syncStatus,
    syncedDevices,
  } = useApp();

  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const navItems: { id: ActivePage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'buy', label: 'Buy Stock Entry', icon: <TrendingUp size={18} className="text-emerald-400" /> },
    { id: 'sell', label: 'Sell Stock Entry', icon: <TrendingDown size={18} className="text-rose-400" /> },
    { id: 'import', label: 'Excel Import', icon: <FileSpreadsheet size={18} className="text-cyan-400" /> },
    { id: 'portfolio', label: 'Portfolio Holdings', icon: <Briefcase size={18} /> },
    { id: 'income', label: 'Profit / Income', icon: <PiggyBank size={18} /> },
    { id: 'expense', label: 'Expenses', icon: <Receipt size={18} /> },
    { id: 'accounts', label: 'Chart of Accounts', icon: <BookOpen size={18} /> },
    { id: 'journal', label: 'Journal Entry', icon: <FileText size={18} /> },
    { id: 'reports', label: 'Financial Reports', icon: <BarChart3 size={18} /> },
    { id: 'backup', label: 'Backup / Restore', icon: <Database size={18} /> },
  ];

  const handleSelectNav = (page: ActivePage) => {
    setActivePage(page);
    if (closeMobileMenu) closeMobileMenu();
  };

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearInput.trim()) return;
    addFinancialYear(newYearInput.trim());
    setNewYearInput('');
    setShowAddYearModal(false);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            IP
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">INVEST PRO</h1>
            <p className="text-[11px] text-cyan-400 font-medium">Investment • Trading • Accounting</p>
          </div>
        </div>

        {/* Real-time Sync Status Pill */}
        <div className="mt-3 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-400 animate-pulse'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300">
              {syncStatus === 'synced' ? 'Real-Time Sync Active' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Offline'}
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
            {syncedDevices.length > 0 ? `${syncedDevices.length} dev` : '1 dev'}
          </span>
        </div>
      </div>

      {/* Financial Year Selector */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Financial Year
          </label>
          <button
            onClick={() => setShowAddYearModal(true)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Add new financial year"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {financialYears.length === 0 ? (
            <option value="2025-2026">2025-2026 (Default)</option>
          ) : (
            financialYears.map((fy) => (
              <option key={fy.id || fy.year} value={fy.year}>
                FY {fy.year}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">

        {user && (() => {
          const displayName = userProfile?.displayName || user.displayName || user.email;
          const photoURL = userProfile?.photoURL || user.photoURL;
          return (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleSelectNav('profile')}
                title="Edit profile"
                className="flex items-center gap-2 truncate rounded-lg hover:bg-slate-800/60 -ml-1 pl-1 pr-2 py-1 transition-colors cursor-pointer"
              >
                {photoURL ? (
                  <img src={photoURL} alt="" className="w-6 h-6 rounded-full shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                  {displayName}
                </span>
              </button>
              <button
                onClick={() => signOut()}
                title="Logout"
                className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut size={14} />
              </button>
            </div>
          );
        })()}
      </div>

      {/* Add Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Add New Financial Year</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter financial period label (e.g. 2026-2027)
            </p>
            <form onSubmit={handleCreateYear} className="space-y-3">
              <input
                type="text"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                placeholder="2026-2027"
                required
                pattern="^[0-9]{4}-[0-9]{4}$"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow"
                >
                  Create Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
