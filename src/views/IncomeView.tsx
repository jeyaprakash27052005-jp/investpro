import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PiggyBank, Plus, Trash2, Pencil, X, CheckCircle, AlertCircle } from 'lucide-react';

export const IncomeView: React.FC = () => {
  const { incomes, addIncome, updateIncome, deleteIncome, selectedYear } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState('Dividend');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const yearIncomes = incomes.filter((i) => i.financialYear === selectedYear);
  const totalIncome = yearIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const startEdit = (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;
    setEditingId(item.id);
    setDate(item.date);
    setCategory(item.category);
    setDescription(item.description);
    setAmount(String(item.amount));
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDate(today);
    setCategory('Dividend');
    setDescription('');
    setAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'Income amount must be greater than zero.' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateIncome(editingId, {
          financialYear: selectedYear,
          date,
          category: category.trim(),
          description: description.trim() || '---',
          amount: Number(amount),
        });
        setMessage({ type: 'success', text: 'Income record updated successfully!' });
        setEditingId(null);
      } else {
        await addIncome({
          financialYear: selectedYear,
          date,
          category: category.trim(),
          description: description.trim() || '---',
          amount: Number(amount),
        });
        setMessage({ type: 'success', text: 'Income record saved successfully!' });
      }
      setDescription('');
      setAmount('');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: editingId ? 'Failed to update income.' : 'Failed to record income.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PiggyBank size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Profit / Income Entry</h2>
              <p className="text-xs text-slate-400">Record dividends, interest, and non-trading income for FY {selectedYear}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400">Total Income (FY {selectedYear}):</span>
            <div className="font-mono text-base font-bold text-emerald-400">{formatCurrency(totalIncome)}</div>
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="Dividend / Interest / Other"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="Particulars / Scrip name"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Amount (₹) *</label>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              <span>{isSubmitting ? (editingId ? 'Updating...' : 'Saving...') : editingId ? 'Update Income' : 'Save Income'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Income Records Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4">Income Records Registry ({yearIncomes.length})</h3>

        {yearIncomes.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No income entries recorded for FY {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {yearIncomes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-400">{formatDate(item.date)}</td>
                    <td className="py-3 px-3 font-semibold text-white">{item.category}</td>
                    <td className="py-3 px-3 text-slate-300">{item.description}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(item.id)}
                          className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                          title="Edit record"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteIncome(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete record"
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
