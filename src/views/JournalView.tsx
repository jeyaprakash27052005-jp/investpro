import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FileText, Plus, Trash2, Pencil, X, CheckCircle, AlertCircle, ArrowRightLeft } from 'lucide-react';

const EXCHANGE_OPTIONS = ['', 'NSE', 'BSE', 'MCX', 'NSE-MCX'];
const SEGMENT_OPTIONS = ['', 'CASH', 'F&O', 'CDS', 'COMM'];
const VOUCHER_TYPE_OPTIONS = [
  'Journal',
  'Contract Note',
  'Payment',
  'Receipt',
  'Brokerage',
  'DP Charges',
  'AMC',
  'Adjustment',
  'Other',
];

export const JournalView: React.FC = () => {
  const { journals, addJournal, updateJournal, deleteJournal, accounts, selectedYear } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today); // Trd Date
  const [dueDate, setDueDate] = useState('');
  const [exchange, setExchange] = useState('');
  const [segment, setSegment] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [voucherType, setVoucherType] = useState('Journal');
  const [voucherNo, setVoucherNo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState<string>('');

  const yearJournals = journals.filter((j) => j.financialYear === selectedYear);

  const startEdit = (id: string) => {
    const item = journals.find((j) => j.id === id);
    if (!item) return;
    setEditingId(item.id);
    setDate(item.date);
    setDueDate(item.dueDate || '');
    setExchange(item.exchange || '');
    setSegment(item.segment || '');
    setDebitAccountId(item.debitAccountId);
    setCreditAccountId(item.creditAccountId);
    setVoucherType(item.voucherType || 'Journal');
    setVoucherNo(item.voucherNo || '');
    setBillNo(item.billNo || '');
    setAmount(String(item.amount));
    setNarration(item.narration);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDate(today);
    setDueDate('');
    setExchange('');
    setSegment('');
    setDebitAccountId('');
    setCreditAccountId('');
    setVoucherType('Journal');
    setVoucherNo('');
    setBillNo('');
    setAmount('');
    setNarration('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccountId || !creditAccountId) {
      setMessage({ type: 'error', text: 'Both debit and credit accounts must be selected.' });
      return;
    }
    if (debitAccountId === creditAccountId) {
      setMessage({ type: 'error', text: 'Debit and Credit cannot be the same ledger account.' });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'Voucher Dr/Cr amount must be greater than zero.' });
      return;
    }

    const debitAcc = accounts.find((a) => a.id === debitAccountId);
    const creditAcc = accounts.find((a) => a.id === creditAccountId);

    try {
      setIsSubmitting(true);
      const payload = {
        financialYear: selectedYear,
        date,
        dueDate: dueDate || undefined,
        exchange: exchange || undefined,
        segment: segment || undefined,
        debitAccountId,
        debitAccountName: debitAcc ? debitAcc.name : 'Debit Account',
        creditAccountId,
        creditAccountName: creditAcc ? creditAcc.name : 'Credit Account',
        amount: Number(amount),
        narration: narration.trim() || 'Journal entry',
        voucherType: voucherType || 'Journal',
        voucherNo: voucherNo.trim() || undefined,
        billNo: billNo.trim() || undefined,
      };

      if (editingId) {
        await updateJournal(editingId, payload);
        setMessage({ type: 'success', text: 'Journal voucher updated successfully!' });
        setEditingId(null);
      } else {
        await addJournal(payload);
        setMessage({ type: 'success', text: 'Double-entry journal voucher recorded successfully!' });
      }
      setDueDate('');
      setExchange('');
      setSegment('');
      setVoucherNo('');
      setBillNo('');
      setAmount('');
      setNarration('');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: editingId ? 'Failed to update journal entry.' : 'Failed to save journal entry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ledger register rows: either the flat journal register (both legs of
  // every voucher, sorted oldest-first) or, when a Ledger Account filter is
  // selected, that single account's statement with a running Dr/Cr balance —
  // mirroring a broker "Financial Ledger" export (Sr No, Trd Date, Due Date,
  // Exchange, Seg, Narration, Voucher Type, Voucher No, Bill No, Dr Amount,
  // Cr Amount, Running Balance).
  const sortedJournals = useMemo(
    () =>
      [...yearJournals].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      }),
    [yearJournals]
  );

  const ledgerRows = useMemo(() => {
    if (!ledgerAccountFilter) {
      return sortedJournals.map((j) => ({
        journal: j,
        drAmount: j.amount,
        crAmount: j.amount,
        runningBalance: null as number | null,
      }));
    }

    const acc = accounts.find((a) => a.id === ledgerAccountFilter);
    const normalIsDebit = !acc || acc.type === 'Asset' || acc.type === 'Expense';
    let balance = normalIsDebit ? acc?.openingBalance || 0 : -(acc?.openingBalance || 0);

    return sortedJournals
      .filter((j) => j.debitAccountId === ledgerAccountFilter || j.creditAccountId === ledgerAccountFilter)
      .map((j) => {
        const drAmount = j.debitAccountId === ledgerAccountFilter ? j.amount : 0;
        const crAmount = j.creditAccountId === ledgerAccountFilter ? j.amount : 0;
        balance += drAmount - crAmount;
        return { journal: j, drAmount, crAmount, runningBalance: balance };
      });
  }, [sortedJournals, ledgerAccountFilter, accounts]);

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Double-Entry Journal Voucher</h2>
            <p className="text-xs text-slate-400">
              Record verified double-entry transactions (Debit = Credit) for FY {selectedYear}
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: Trd Date / Due Date / Exchange / Seg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Trd Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Exchange</label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {EXCHANGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || '—'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Seg</label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || '—'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Debit / Credit account / Voucher Type / Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-emerald-400 mb-1">Debit Account (Dr) *</label>
              <select
                required
                value={debitAccountId}
                onChange={(e) => setDebitAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Debit Account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-rose-400 mb-1">Credit Account (Cr) *</label>
              <select
                required
                value={creditAccountId}
                onChange={(e) => setCreditAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Select Credit Account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Voucher Type</label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {VOUCHER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Dr / Cr Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 3: Voucher No / Bill No / Narration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Voucher No</label>
              <input
                type="text"
                placeholder="e.g. JV-0001"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Bill No</label>
              <input
                type="text"
                placeholder="e.g. BL-0001"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Narration</label>
              <input
                type="text"
                placeholder="Narration / Being transaction particulars..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || accounts.length < 2}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              <span>{isSubmitting ? (editingId ? 'Updating Voucher...' : 'Posting Voucher...') : editingId ? 'Update Journal Entry' : 'Save Journal Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Journal / Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-indigo-400" />
            Financial Ledger ({ledgerRows.length})
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-slate-400 whitespace-nowrap">Ledger View:</label>
            <select
              value={ledgerAccountFilter}
              onChange={(e) => setLedgerAccountFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Entries (Journal Register)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {ledgerRows.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No journal entries recorded for FY {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-2.5">Sr No</th>
                  <th className="py-3 px-2.5">Trd Date</th>
                  <th className="py-3 px-2.5">Due Date</th>
                  <th className="py-3 px-2.5">Exchange</th>
                  <th className="py-3 px-2.5">Seg</th>
                  <th className="py-3 px-2.5">Narration</th>
                  <th className="py-3 px-2.5">Voucher Type</th>
                  <th className="py-3 px-2.5">Voucher No</th>
                  <th className="py-3 px-2.5">Bill No</th>
                  {!ledgerAccountFilter && <th className="py-3 px-2.5">Dr Account</th>}
                  {!ledgerAccountFilter && <th className="py-3 px-2.5">Cr Account</th>}
                  <th className="py-3 px-2.5 text-right">Dr Amount</th>
                  <th className="py-3 px-2.5 text-right">Cr Amount</th>
                  {ledgerAccountFilter && <th className="py-3 px-2.5 text-right">Running Balance</th>}
                  <th className="py-3 px-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {ledgerRows.map((row, idx) => {
                  const j = row.journal;
                  return (
                    <tr key={j.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-2.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-400">{formatDate(j.date)}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-500">{j.dueDate ? formatDate(j.dueDate) : '—'}</td>
                      <td className="py-2.5 px-2.5 text-slate-400">{j.exchange || '—'}</td>
                      <td className="py-2.5 px-2.5 text-slate-400">{j.segment || '—'}</td>
                      <td className="py-2.5 px-2.5 text-slate-400 italic max-w-[180px] truncate">{j.narration}</td>
                      <td className="py-2.5 px-2.5 text-slate-400">{j.voucherType || 'Journal'}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-500">{j.voucherNo || '—'}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-500">{j.billNo || '—'}</td>
                      {!ledgerAccountFilter && (
                        <td className="py-2.5 px-2.5 font-semibold text-emerald-400">{j.debitAccountName}</td>
                      )}
                      {!ledgerAccountFilter && (
                        <td className="py-2.5 px-2.5 font-semibold text-rose-400">{j.creditAccountName}</td>
                      )}
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-400">
                        {row.drAmount > 0 ? formatCurrency(row.drAmount) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-400">
                        {row.crAmount > 0 ? formatCurrency(row.crAmount) : '—'}
                      </td>
                      {ledgerAccountFilter && (
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-white">
                          {row.runningBalance !== null ? (
                            <>
                              {formatCurrency(Math.abs(row.runningBalance))}{' '}
                              <span className="text-[10px] text-slate-500">
                                {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(j.id)}
                            className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                            title="Edit journal record"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteJournal(j.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete journal record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
