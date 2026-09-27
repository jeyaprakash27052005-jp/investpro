import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import type { AccountType } from '../types';
import { BookOpen, Plus, Trash2, Pencil, X, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Asset');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return;
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalance(String(acc.openingBalance ?? 0));
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setType('Asset');
    setOpeningBalance('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Account name cannot be empty.' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateAccount(editingId, {
          name: name.trim(),
          type,
          openingBalance: Number(openingBalance) || 0,
        });
        setMessage({ type: 'success', text: `Account "${name}" updated successfully!` });
        setEditingId(null);
      } else {
        await addAccount({
          name: name.trim(),
          type,
          openingBalance: Number(openingBalance) || 0,
        });
        setMessage({ type: 'success', text: `Account "${name}" created successfully!` });
      }
      setName('');
      setOpeningBalance('0');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: editingId ? 'Failed to update ledger account.' : 'Failed to create ledger account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeColor: Record<AccountType, string> = {
    Asset: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Liability: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Capital: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    Income: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    Expense: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{editingId ? 'Edit Ledger Account' : 'Chart of Accounts'}</h2>
            <p className="text-xs text-slate-400">
              {editingId
                ? 'Update the account name, classification, or balance. Every value here — including Capital — is entered by the owner only.'
                : "General ledger accounts for double-entry financial statements and balance sheet. There are no preset balances - the owner enters every account's amount, including Capital."}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Account Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank, Office Rent, Equity Capital"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Account Classification *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Asset">Asset (Cash, Bank, Demat, Receivables)</option>
                <option value="Liability">Liability (Payables, Loans)</option>
                <option value="Capital">Capital / Owner's Equity</option>
                <option value="Income">Income (Revenue, Profit)</option>
                <option value="Expense">Expense (Operational Costs)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              <span>{isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : editingId ? 'Update Account' : 'Add Account'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Accounts Directory */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4">Configured Ledger Accounts ({accounts.length})</h3>

        {accounts.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">No ledger accounts created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3 text-right">Opening Balance</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-white">{acc.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          typeColor[acc.type] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(acc.openingBalance || 0)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(acc.id)}
                          className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                          title="Edit account"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteAccount(acc.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete account"
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
