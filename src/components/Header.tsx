import React from 'react';
import { useApp } from '../context/AppContext';
import type { ActivePage } from '../types';
import {
  Printer,
  Menu,
  LogIn,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  toggleMobileMenu: () => void;
  onPrint: () => void;
}

const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Company Investment Dashboard', subtitle: 'Overview of portfolio, realized profits, and accounting metrics' },
  buy: { title: 'Buy Stock Entry', subtitle: 'Record new share purchases with detailed order execution parameters' },
  sell: { title: 'Sell Stock Entry', subtitle: 'Execute share sales and automatically compute realized profit & loss' },
  import: { title: 'Excel / Spreadsheet Import', subtitle: 'Import broker statements with automatic duplicate detection via HSL Ref' },
  portfolio: { title: 'Portfolio Holdings', subtitle: 'Real-time open positions, weighted cost basis, and valuations' },
  income: { title: 'Profit / Other Income', subtitle: 'Record dividends, interest, and non-trading company revenue' },
  expense: { title: 'Operational Expenses', subtitle: 'Track brokerage, depository fees, office, and administration expenses' },
  accounts: { title: 'Chart of Accounts', subtitle: 'Manage double-entry asset, liability, capital, income, and expense accounts' },
  journal: { title: 'Journal Entry', subtitle: 'Book verified double-entry debit & credit transactions' },
  reports: { title: 'Financial Accounting Statements', subtitle: 'Generate Trading Report, P&L, Trial Balance, and Balance Sheet' },
  backup: { title: 'Backup / Restore & Cloud Sync', subtitle: 'Full JSON backup, restore, and multi-device Firebase cloud state' },
  profile: { title: 'My Profile', subtitle: 'Manage your account display name and photo' },
};

export const Header: React.FC<HeaderProps> = ({ activePage, toggleMobileMenu, onPrint }) => {
  const { user, selectedYear, syncStatus, signInWithGoogle } = useApp();
  const pageInfo = pageTitles[activePage] || { title: 'Dashboard', subtitle: '' };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight">{pageInfo.title}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              FY {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block mt-0.5">{pageInfo.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
          <Radio size={14} className={syncStatus === 'synced' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} />
          <span className="font-mono text-[11px]">
            {syncStatus === 'synced' ? 'Cloud Connected' : 'Syncing...'}
          </span>
        </div>

        {/* Print Button */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
          title="Print or export current page view"
        >
          <Printer size={15} />
          <span className="hidden sm:inline">Print Page</span>
        </button>
      </div>
    </header>
  );
};
