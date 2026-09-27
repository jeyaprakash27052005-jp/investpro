import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import type { ActivePage } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Receipt,
  Scale,
  Briefcase,
  FileSpreadsheet,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';

export const DashboardView: React.FC<{ onNavigate: (page: ActivePage) => void }> = ({ onNavigate }) => {
  const { summary, portfolioHoldings, trades, syncedDevices, selectedYear } = useApp();

  const isNetPositive = summary.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Real-time Cross Device Sync Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 lg:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Real-Time Cloud Synchronization Active</h3>
              <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Live Firebase Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Any buy/sell trade or spreadsheet imported here updates instantly across Android, iOS, and Web devices in sub-second latency.
            </p>
          </div>
        </div>

        {/* Connected devices count pill */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 self-stretch md:self-auto justify-between md:justify-start">
          <span className="text-slate-400">Connected Devices:</span>
          <div className="flex items-center gap-1.5 font-medium text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{syncedDevices.length > 0 ? syncedDevices.length : 1} Active</span>
          </div>
        </div>
      </div>

      {/* KPI Financial Cards (Matches user's HTML exact cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Investment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Investment</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.totalInvestment)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Total buy orders executed in FY {selectedYear}</p>
          </div>
        </div>

        {/* Current Holdings Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Holdings Cost</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-cyan-300 tracking-tight">
              {formatCurrency(summary.currentHoldingsCost)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Weighted acquisition cost of open positions</p>
          </div>
        </div>

        {/* Realized P/L */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Realized P/L</span>
            <div
              className={`p-2 rounded-xl ${
                summary.realizedPL >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {summary.realizedPL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="mt-3">
            <h2
              className={`text-2xl font-bold tracking-tight ${
                summary.realizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.realizedPL >= 0 ? '+' : ''}
              {formatCurrency(summary.realizedPL)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Net profit/loss generated from executed sells</p>
          </div>
        </div>

        {/* Other Income */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Other Income</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.otherIncome)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Dividends, bank interest, bonus revenue</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-rose-300 tracking-tight">
              {formatCurrency(summary.totalExpenses)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Depository, transaction, software & office costs</p>
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div
          className={`bg-slate-900/90 border rounded-2xl p-5 transition-all shadow-md ${
            isNetPositive
              ? 'border-emerald-500/30 bg-emerald-950/10'
              : 'border-rose-500/30 bg-rose-950/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Profit / Loss</span>
            <div
              className={`p-2 rounded-xl ${
                isNetPositive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <Scale size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2
              className={`text-2xl font-bold tracking-tight ${
                isNetPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isNetPositive ? '+' : ''}
              {formatCurrency(summary.netProfit)}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Realized P/L + Other Income - Total Expenses</p>
          </div>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('buy')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-400 transition-all text-xs font-semibold group cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span>New BUY Entry</span>
          </div>
          <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => onNavigate('sell')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-200 hover:text-rose-400 transition-all text-xs font-semibold group cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-rose-400" />
            <span>New SELL Entry</span>
          </div>
          <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => onNavigate('import')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-400 transition-all text-xs font-semibold group cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-cyan-400" />
            <span>Excel Statement Import</span>
          </div>
          <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-200 hover:text-indigo-400 transition-all text-xs font-semibold group cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-indigo-400" />
            <span>Financial Statements</span>
          </div>
          <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Grid: Active Portfolio Holdings + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Holdings preview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Active Portfolio Holdings</h3>
              <p className="text-xs text-slate-400">Current open stock inventory</p>
            </div>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              View All ({portfolioHoldings.length}) <ArrowRight size={13} />
            </button>
          </div>

          {portfolioHoldings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500">
              <Briefcase size={32} className="mb-2 opacity-40 text-slate-400" />
              <p className="text-xs">No active stock holdings in FY {selectedYear}</p>
              <button
                onClick={() => onNavigate('buy')}
                className="mt-3 text-xs text-cyan-400 hover:underline font-medium"
              >
                + Add your first buy trade
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-2.5">Stock</th>
                    <th className="pb-2.5">Qty</th>
                    <th className="pb-2.5">Avg Buy Cost</th>
                    <th className="pb-2.5 text-right">Investment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {portfolioHoldings.slice(0, 5).map((h, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-white">
                        {h.stockName}
                        <span className="ml-1 text-[10px] text-slate-500 font-mono">({h.exchange})</span>
                      </td>
                      <td className="py-2.5 font-mono">{h.quantity}</td>
                      <td className="py-2.5 font-mono">{formatCurrency(h.avgBuyCost)}</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-cyan-300">
                        {formatCurrency(h.totalInvestment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Trades Activity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Trade Executions</h3>
              <p className="text-xs text-slate-400">Latest buy & sell activity</p>
            </div>
            <button
              onClick={() => onNavigate('buy')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              All Trades ({trades.length}) <ArrowRight size={13} />
            </button>
          </div>

          {trades.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500">
              <Clock size={32} className="mb-2 opacity-40 text-slate-400" />
              <p className="text-xs">No trades recorded yet</p>
              <p className="text-[11px] text-slate-600 mt-1">Record a trade or upload an Excel trade file</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trades.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        t.tradeType === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {t.tradeType}
                    </span>
                    <div>
                      <div className="font-semibold text-white">
                        {t.stockName} <span className="text-[10px] text-slate-400">({t.exchange})</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDateTime(t.dateTime)}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-medium text-slate-200">
                      {t.execQty} shares @ {formatCurrency(t.orderPrice)}
                    </div>
                    {t.tradeType === 'SELL' && t.realizedPL !== undefined && (
                      <div
                        className={`text-[10px] font-mono font-semibold ${
                          t.realizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        P/L: {t.realizedPL >= 0 ? '+' : ''}
                        {formatCurrency(t.realizedPL)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
