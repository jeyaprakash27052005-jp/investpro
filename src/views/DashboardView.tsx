import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCompactCurrency, formatDateTime } from '../utils/formatters';
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
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
} from 'lucide-react';

const CHART_COLORS = ['#22d3ee', '#6366f1', '#34d399', '#fb7185', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 12,
    fontSize: 11,
    padding: '8px 12px',
  },
  labelStyle: { color: '#94a3b8', marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
};

const EmptyChartState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-14 text-center text-slate-500">
    <BarChart3 size={28} className="mb-2 opacity-30" />
    <p className="text-xs">{message}</p>
  </div>
);

export const DashboardView: React.FC<{ onNavigate: (page: ActivePage) => void }> = ({ onNavigate }) => {
  const { summary, portfolioHoldings, trades, incomes, expenses, syncedDevices, selectedYear } = useApp();

  const isNetPositive = summary.netProfit >= 0;

  // Portfolio allocation by current holdings' investment value (top 7 + "Others")
  const allocationData = useMemo(() => {
    const sorted = [...portfolioHoldings]
      .filter((h) => h.totalInvestment > 0)
      .sort((a, b) => b.totalInvestment - a.totalInvestment);
    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const restTotal = rest.reduce((sum, h) => sum + h.totalInvestment, 0);
    const data = top.map((h) => ({ name: h.stockName, value: Number(h.totalInvestment.toFixed(2)) }));
    if (restTotal > 0) data.push({ name: 'Others', value: Number(restTotal.toFixed(2)) });
    return data;
  }, [portfolioHoldings]);

  // Monthly BUY vs SELL trade value for the selected financial year
  const monthlyTradeData = useMemo(() => {
    const map = new Map<string, { month: string; Buy: number; Sell: number }>();
    trades
      .filter((t) => t.financialYear === selectedYear)
      .forEach((t) => {
        const d = new Date(t.dateTime);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!map.has(key)) map.set(key, { month: label, Buy: 0, Sell: 0 });
        const entry = map.get(key)!;
        const value = Number(t.execQty) * Number(t.orderPrice);
        if (t.tradeType === 'BUY') entry.Buy += value;
        else entry.Sell += value;
      });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, Buy: Number(v.Buy.toFixed(2)), Sell: Number(v.Sell.toFixed(2)) }));
  }, [trades, selectedYear]);

  // Cumulative realized P/L across SELL trades, chronologically, for the selected year
  const cumulativePLData = useMemo(() => {
    const sellTrades = trades
      .filter((t) => t.financialYear === selectedYear && t.tradeType === 'SELL')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    let running = 0;
    return sellTrades.map((t) => {
      running += Number(t.realizedPL) || 0;
      return {
        date: new Date(t.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: Number(running.toFixed(2)),
      };
    });
  }, [trades, selectedYear]);

  // Monthly income vs expense for the selected financial year
  const monthlyIncomeExpenseData = useMemo(() => {
    const map = new Map<string, { month: string; Income: number; Expense: number }>();
    const upsert = (dateStr: string, field: 'Income' | 'Expense', amount: number) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!map.has(key)) map.set(key, { month: label, Income: 0, Expense: 0 });
      map.get(key)![field] += amount;
    };
    incomes
      .filter((i) => i.financialYear === selectedYear)
      .forEach((i) => upsert(i.date, 'Income', Number(i.amount) || 0));
    expenses
      .filter((e) => e.financialYear === selectedYear)
      .forEach((e) => upsert(e.date, 'Expense', Number(e.amount) || 0));
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, Income: Number(v.Income.toFixed(2)), Expense: Number(v.Expense.toFixed(2)) }));
  }, [incomes, expenses, selectedYear]);

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

      {/* Analytics: Portfolio Allocation + Monthly Trading Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Allocation Donut */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon size={15} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Portfolio Allocation</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">Investment value by holding, FY {selectedYear}</p>

          {allocationData.length === 0 ? (
            <EmptyChartState message="No active holdings to chart yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  {...CHART_TOOLTIP_STYLE}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 10, color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Trading Activity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={15} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Monthly Trading Activity</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">Buy vs sell value by month, FY {selectedYear}</p>

          {monthlyTradeData.length === 0 ? (
            <EmptyChartState message="No trades recorded in this financial year" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTradeData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={56}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: any) => formatCurrency(Number(value))} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                <Bar dataKey="Buy" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sell" fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cumulative Realized P/L Trend */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={15} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Cumulative Realized P/L</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">Running profit/loss across sell trades, FY {selectedYear}</p>

        {cumulativePLData.length === 0 ? (
          <EmptyChartState message="No sell trades recorded in this financial year" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumulativePLData} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
                width={56}
              />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: any) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="cumulative" stroke="#22d3ee" strokeWidth={2} fill="url(#plGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Income vs Expense */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <PiggyBank size={15} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">Income vs Expenses</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">Monthly comparison, FY {selectedYear}</p>

        {monthlyIncomeExpenseData.length === 0 ? (
          <EmptyChartState message="No income or expense entries in this financial year" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyIncomeExpenseData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
                width={56}
              />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: any) => formatCurrency(Number(value))} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
              <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
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
