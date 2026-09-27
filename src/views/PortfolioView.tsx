import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import type { ActivePage } from '../types';
import {
  Briefcase,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const PortfolioView: React.FC<{ onNavigate: (page: ActivePage) => void }> = ({ onNavigate }) => {
  const { portfolioHoldings, selectedYear } = useApp();
  const [search, setSearch] = useState('');

  const filteredHoldings = portfolioHoldings.filter(
    (h) =>
      h.stockName.toLowerCase().includes(search.toLowerCase()) ||
      h.exchange.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = portfolioHoldings.reduce((sum, h) => sum + h.totalInvestment, 0);
  const totalValuation = portfolioHoldings.reduce((sum, h) => sum + (h.currentValue || h.totalInvestment), 0);
  const totalUnrealized = totalValuation - totalCost;

  return (
    <div className="space-y-6">
      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Portfolio Cost</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(totalCost)}</h2>
            <p className="text-[11px] text-slate-500 mt-1">Weighted acquisition cost basis</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Market Value</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-indigo-300 tracking-tight">{formatCurrency(totalValuation)}</h2>
            <p className="text-[11px] text-slate-500 mt-1">Valued at last traded prices</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Holdings Count</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">{portfolioHoldings.length} Companies</h2>
            <p className="text-[11px] text-slate-500 mt-1">Active scrips with positive balance</p>
          </div>
        </div>
      </div>

      {/* Holdings Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Portfolio Holdings</h2>
            <p className="text-xs text-slate-400">Open inventory computed across all trades in FY {selectedYear}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {filteredHoldings.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs">
            <Briefcase size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
            No open stock positions found in FY {selectedYear}.
            <div className="mt-3">
              <button
                onClick={() => onNavigate('buy')}
                className="text-cyan-400 hover:underline font-semibold"
              >
                + Add a Buy Stock Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Stock Scrip</th>
                  <th className="py-3 px-3">Exchange</th>
                  <th className="py-3 px-3 text-right">Holding Qty</th>
                  <th className="py-3 px-3 text-right">Avg Buy Cost</th>
                  <th className="py-3 px-3 text-right">Total Investment</th>
                  <th className="py-3 px-3 text-right">LTP / Current Price</th>
                  <th className="py-3 px-3 text-right">Market Value</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredHoldings.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white text-sm">{h.stockName}</td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                        {h.exchange}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {h.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(h.avgBuyCost)}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                      {formatCurrency(h.totalInvestment)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">
                      {h.lastTradedPrice ? formatCurrency(h.lastTradedPrice) : '---'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-200">
                      {formatCurrency(h.currentValue || h.totalInvestment)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onNavigate('sell')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 transition-colors cursor-pointer"
                        title="Sell shares of this holding"
                      >
                        <TrendingDown size={13} />
                        <span>Sell</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/60 font-bold text-white">
                <tr>
                  <td colSpan={2} className="py-3 px-3 uppercase text-[11px] tracking-wider text-slate-400">
                    Grand Total
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {filteredHoldings.reduce((sum, h) => sum + h.quantity, 0)}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-400">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-300">
                    {formatCurrency(totalValuation)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
