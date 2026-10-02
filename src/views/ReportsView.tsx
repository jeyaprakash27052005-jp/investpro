import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { ActivePage } from '../types';
import {
  BarChart3,
  Printer,
  Download,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  FileSpreadsheet,
  Scale,
  Building,
  Pencil,
} from 'lucide-react';

type ReportType = 'trading' | 'portfolio' | 'pl' | 'trial' | 'balance';

interface ReportsViewProps {
  onNavigate?: (page: ActivePage) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNavigate }) => {
  const {
    trades,
    portfolioHoldings,
    incomes,
    expenses,
    accounts,
    journals,
    summary,
    selectedYear,
    userProfile,
  } = useApp();

  const [activeReport, setActiveReport] = useState<ReportType>('trading');

  const reportTitles: Record<ReportType, string> = {
    trading: 'Stock Trading Statement',
    portfolio: 'Portfolio Holdings Statement',
    pl: 'Profit & Loss Statement',
    trial: 'Trial Balance',
    balance: 'Balance Sheet',
  };

  // Where the "Edit" affordance for the current report should take the owner
  const editTarget: Record<ReportType, { page: ActivePage; label: string }> = {
    trading: { page: 'buy', label: 'Edit Trades' },
    portfolio: { page: 'buy', label: 'Edit Trades' },
    pl: { page: 'income', label: 'Edit Income & Expenses' },
    trial: { page: 'accounts', label: 'Edit Accounts' },
    balance: { page: 'accounts', label: 'Edit Accounts' },
  };

  const yearTrades = trades.filter((t) => t.financialYear === selectedYear);
  const yearIncomes = incomes.filter((i) => i.financialYear === selectedYear);
  const yearExpenses = expenses.filter((e) => e.financialYear === selectedYear);
  const yearJournals = journals.filter((j) => j.financialYear === selectedYear);

  // Compute Trial Balance
  const trialBalanceRows = accounts.map((acc) => {
    let debitTotal = 0;
    let creditTotal = 0;

    // Opening balance based on type
    if (acc.type === 'Asset' || acc.type === 'Expense') {
      debitTotal += acc.openingBalance || 0;
    } else {
      creditTotal += acc.openingBalance || 0;
    }

    // Process journals
    for (const j of yearJournals) {
      if (j.debitAccountId === acc.id) debitTotal += Number(j.amount || 0);
      if (j.creditAccountId === acc.id) creditTotal += Number(j.amount || 0);
    }

    // If Asset/Expense: net debit
    // If Liability/Capital/Income: net credit
    let netDebit = 0;
    let netCredit = 0;
    if (acc.type === 'Asset' || acc.type === 'Expense') {
      const net = debitTotal - creditTotal;
      if (net >= 0) netDebit = net;
      else netCredit = Math.abs(net);
    } else {
      const net = creditTotal - debitTotal;
      if (net >= 0) netCredit = net;
      else netDebit = Math.abs(net);
    }

    return {
      account: acc.name,
      type: acc.type,
      debit: netDebit,
      credit: netCredit,
    };
  });

  const totalTrialDebit = trialBalanceRows.reduce((sum, r) => sum + r.debit, 0);
  const totalTrialCredit = trialBalanceRows.reduce((sum, r) => sum + r.credit, 0);
  const isTrialBalanced = Math.abs(totalTrialDebit - totalTrialCredit) < 0.01;

  // Compute Balance Sheet
  const assetAccounts = trialBalanceRows.filter((r) => r.type === 'Asset');
  const liabilityAccounts = trialBalanceRows.filter((r) => r.type === 'Liability');
  const capitalAccounts = trialBalanceRows.filter((r) => r.type === 'Capital');

  // Stock inventory asset from current holdings
  const totalHoldingsCost = summary.currentHoldingsCost;
  const totalAssets = assetAccounts.reduce((sum, r) => sum + r.debit, 0) + totalHoldingsCost;
  const totalLiabilities = liabilityAccounts.reduce((sum, r) => sum + r.credit, 0);
  const baseCapital = capitalAccounts.reduce((sum, r) => sum + r.credit, 0);
  const retainedProfit = summary.netProfit;
  const totalCapitalAndLiabilities = totalLiabilities + baseCapital + retainedProfit;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const letterhead = [
      userProfile?.companyName,
      userProfile?.companyAddress?.replace(/\n/g, ', '),
    ].filter(Boolean);
    let csvContent =
      (letterhead.length > 0 ? letterhead.join('\n') + '\n' : '') +
      `Report: ${activeReport.toUpperCase()}\nFinancial Year: ${selectedYear}\nGenerated At: ${new Date().toISOString()}\n\n`;

    if (activeReport === 'trading') {
      csvContent += 'Date,Type,Stock,Exchange,Qty,Price,Brokerage,Realized PL\n';
      yearTrades.forEach((t) => {
        csvContent += `"${t.dateTime}","${t.tradeType}","${t.stockName}","${t.exchange}",${t.execQty},${t.orderPrice},${t.brokerage || 0},${t.realizedPL || 0}\n`;
      });
    } else if (activeReport === 'portfolio') {
      csvContent += 'Stock,Exchange,Quantity,Avg Buy Cost,Total Investment,Market Value\n';
      portfolioHoldings.forEach((h) => {
        csvContent += `"${h.stockName}","${h.exchange}",${h.quantity},${h.avgBuyCost},${h.totalInvestment},${h.currentValue || h.totalInvestment}\n`;
      });
    } else if (activeReport === 'trial') {
      csvContent += 'Account,Type,Debit,Credit\n';
      trialBalanceRows.forEach((r) => {
        csvContent += `"${r.account}","${r.type}",${r.debit},${r.credit}\n`;
      });
      csvContent += `Total,,${totalTrialDebit},${totalTrialCredit}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeReport}_report_FY_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'trading', label: 'Trading Report', icon: <TrendingUp size={14} /> },
            { id: 'portfolio', label: 'Portfolio Report', icon: <Briefcase size={14} /> },
            { id: 'pl', label: 'Profit & Loss', icon: <BarChart3 size={14} /> },
            { id: 'trial', label: 'Trial Balance', icon: <Scale size={14} /> },
            { id: 'balance', label: 'Balance Sheet', icon: <Building size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeReport === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {onNavigate && (
            <button
              onClick={() => onNavigate(editTarget[activeReport].page)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              title="Edit the entries behind this report"
            >
              <Pencil size={14} />
              <span>{editTarget[activeReport].label}</span>
            </button>
          )}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Canvas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl print:p-0 print:border-none">
        {/* Letterhead - company identity from Profile, shown above every report (on screen and when printed) */}
        <div className="mb-5 pb-4 border-b-2 border-slate-700 print:border-black">
          {userProfile?.companyName && (
            <h2 className="text-xl font-bold text-white tracking-tight">{userProfile.companyName}</h2>
          )}
          {userProfile?.companyAddress && (
            <p className="text-xs text-slate-400 mt-0.5 whitespace-pre-line">{userProfile.companyAddress}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
            <span className="font-semibold">
              {reportTitles[activeReport]} &bull; Financial Year {selectedYear}
            </span>
            <span>Generated on {formatDate(new Date().toISOString())}</span>
          </div>
          {!userProfile?.companyName && (
            <p className="text-[11px] text-slate-600 mt-2 no-print italic">
              Tip: add your company name and address in Profile to show a letterhead here and on printed reports.
            </p>
          )}
        </div>

        {/* Trading Report */}
        {activeReport === 'trading' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Stock Trading Statement</h3>
                <p className="text-xs text-slate-400">All Buy and Sell executions for FY {selectedYear}</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">{yearTrades.length} Trades Executed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Stock Scrip</th>
                    <th className="py-2.5 px-3">Exch</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Traded Price</th>
                    <th className="py-2.5 px-3 text-right">Gross Amount</th>
                    <th className="py-2.5 px-3 text-right">Brokerage</th>
                    <th className="py-2.5 px-3 text-right">Realized P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {yearTrades.map((t) => {
                    const gross = t.execQty * t.orderPrice;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {formatDate(t.dateTime)}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={t.tradeType === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                            {t.tradeType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{t.stockName}</td>
                        <td className="py-2.5 px-3 font-mono">{t.exchange}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{t.execQty}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(t.orderPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(gross)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {formatCurrency(t.brokerage || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {t.tradeType === 'SELL' && t.realizedPL !== undefined ? (
                            <span className={t.realizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {t.realizedPL >= 0 ? '+' : ''}
                              {formatCurrency(t.realizedPL)}
                            </span>
                          ) : (
                            '---'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Portfolio Report */}
        {activeReport === 'portfolio' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Portfolio Valuation & Inventory</h3>
                <p className="text-xs text-slate-400">Current open equity holdings as of FY {selectedYear}</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">{portfolioHoldings.length} Positions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="py-2.5 px-3">Stock Scrip</th>
                    <th className="py-2.5 px-3">Exch</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost</th>
                    <th className="py-2.5 px-3 text-right">Invested Value</th>
                    <th className="py-2.5 px-3 text-right">Current LTP</th>
                    <th className="py-2.5 px-3 text-right">Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {portfolioHoldings.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-white">{h.stockName}</td>
                      <td className="py-2.5 px-3 font-mono">{h.exchange}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{h.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(h.avgBuyCost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">
                        {formatCurrency(h.totalInvestment)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-300">
                        {h.lastTradedPrice ? formatCurrency(h.lastTradedPrice) : '---'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-200">
                        {formatCurrency(h.currentValue || h.totalInvestment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Profit & Loss Statement */}
        {activeReport === 'pl' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Statement of Profit & Loss</h3>
              <p className="text-xs text-slate-400">For the Financial Year ended {selectedYear}</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Income Section */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider mb-2">Revenue & Gains</h4>
                <div className="space-y-2 divide-y divide-slate-800/60">
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-300">Realized Profit / Loss from Stock Sales</span>
                    <span className={`font-mono font-bold ${summary.realizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(summary.realizedPL)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-300">Dividend, Interest & Other Miscellaneous Income</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(summary.otherIncome)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-white">
                    <span>Total Income (A)</span>
                    <span className="font-mono text-sm text-emerald-400">
                      {formatCurrency(summary.realizedPL + summary.otherIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Section */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-sm text-rose-400 uppercase tracking-wider mb-2">Expenses & Charges</h4>
                <div className="space-y-2 divide-y divide-slate-800/60">
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-300">Brokerage, Exchange & Depository Fees</span>
                    <span className="font-mono font-bold text-rose-400">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-white">
                    <span>Total Expenses (B)</span>
                    <span className="font-mono text-sm text-rose-400">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net Result */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between font-bold ${
                  summary.netProfit >= 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <div className="text-base uppercase tracking-wider">
                  Net Profit / (Loss) for the Year (A - B)
                </div>
                <div className="text-xl font-mono">
                  {summary.netProfit >= 0 ? '+' : ''}
                  {formatCurrency(summary.netProfit)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trial Balance */}
        {activeReport === 'trial' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Trial Balance</h3>
                <p className="text-xs text-slate-400">Summary of all ledger debit and credit balances for FY {selectedYear}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {isTrialBalanced ? (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={14} /> Trial Balanced
                  </span>
                ) : (
                  <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    Discrepancy: {formatCurrency(Math.abs(totalTrialDebit - totalTrialCredit))}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr) (₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr) (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {trialBalanceRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-white">{r.account}</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.type}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                        {r.debit > 0 ? formatCurrency(r.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-400">
                        {r.credit > 0 ? formatCurrency(r.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-700 bg-slate-950/60 font-bold text-white">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase text-[11px] tracking-wider text-slate-400">
                      Total
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">
                      {formatCurrency(totalTrialDebit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                      {formatCurrency(totalTrialCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Balance Sheet */}
        {activeReport === 'balance' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Balance Sheet</h3>
              <p className="text-xs text-slate-400">As at the end of Financial Year {selectedYear}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Assets Column */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Assets (Application of Funds)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold text-white">
                    <span>Stock Inventory (Portfolio at Cost)</span>
                    <span className="font-mono text-cyan-300">{formatCurrency(totalHoldingsCost)}</span>
                  </div>
                  {assetAccounts.map((a, i) => (
                    <div key={i} className="flex justify-between text-slate-300">
                      <span>{a.account}</span>
                      <span className="font-mono">{formatCurrency(a.debit)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-700 flex justify-between font-bold text-white text-sm">
                  <span>Total Assets</span>
                  <span className="font-mono text-cyan-400">{formatCurrency(totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Liabilities & Equity (Sources)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold text-white">
                    <span>Capital Account (Owner's Funds)</span>
                    <span className="font-mono text-indigo-300">{formatCurrency(baseCapital)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Retained Earnings / Current Year Net Profit</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(retainedProfit)}</span>
                  </div>
                  {liabilityAccounts.map((l, i) => (
                    <div key={i} className="flex justify-between text-slate-300">
                      <span>{l.account}</span>
                      <span className="font-mono">{formatCurrency(l.credit)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-700 flex justify-between font-bold text-white text-sm">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono text-indigo-400">{formatCurrency(totalCapitalAndLiabilities)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
