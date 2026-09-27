import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FileText, Plus, Trash2, Pencil, X, CheckCircle, AlertCircle, ArrowRightLeft } from 'lucide-react';

export const JournalView: React.FC = () => {
  const { journals, addJournal, updateJournal, deleteJournal, accounts, selectedYear } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const yearJournals = journals.filter((j) => j.financialYear === selectedYear);

  const startEdit = (id: string) => {
    const item = journals.find((j) => j.id === id);
    if (!item) return;
    setEditingId(item.id);
    setDate(item.date);
    setDebitAccountId(item.debitAccountId);
    setCreditAccountId(item.creditAccountId);
    setAmount(String(item.amount));
    setNarration(item.narration);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDate(today);
    setDebitAccountId('');
    setCreditAccountId('');
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
      setMessage({ type: 'error', text: 'Journal voucher amount must be greater than zero.' });
      return;
    }

    const debitAcc = accounts.find((a) => a.id === debitAccountId);
    const creditAcc = accounts.find((a) => a.id === creditAccountId);

    try {
      setIsSubmitting(true);
      const payload = {
        financialYear: selectedYear,
        date,
        debitAccountId,
        debitAccountName: debitAcc ? debitAcc.name : 'Debit Account',
        creditAccountId,
        creditAccountName: creditAcc ? creditAcc.name : 'Credit Account',
        amount: Number(amount),
        narration: narration.trim() || 'Journal entry',
      };

      if (editingId) {
        await updateJournal(editingId, payload);
        setMessage({ type: 'success', text: 'Journal voucher updated successfully!' });
        setEditingId(null);
      } else {
        await addJournal(payload);
        setMessage({ type: 'success', text: 'Double-entry journal voucher recorded successfully!' });
      }
      setAmount('');
      setNarration('');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: editingId ? 'Failed to update journal entry.' : 'Failed to save journal entry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Voucher Amount (₹) *</label>
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="w-full sm:w-auto flex-1 max-w-xl">
              <input
                type="text"
                placeholder="Narration / Being transaction particulars..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

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

      {/* Journal Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4">Journal Voucher Registry ({yearJournals.length})</h3>

        {yearJournals.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No journal entries recorded for FY {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Debit (Dr) Account</th>
                  <th className="py-3 px-3">Credit (Cr) Account</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Narration</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {yearJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-400">{formatDate(j.date)}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">{j.debitAccountName}</td>
                    <td className="py-3 px-3 font-semibold text-rose-400">{j.creditAccountName}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(j.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 italic max-w-xs truncate">{j.narration}</td>
                    <td className="py-3 px-3 text-center">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
