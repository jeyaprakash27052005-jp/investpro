import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import type { OrderType, ProductType, StockTrade } from '../types';
import {
  TrendingUp,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const BuyStockView: React.FC = () => {
  const { trades, addTrade, deleteTrade, selectedYear } = useApp();

  const buyTrades = trades.filter((t) => t.tradeType === 'BUY' && t.financialYear === selectedYear);

  // Form State
  const now = new Date();
  const defaultDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [stockName, setStockName] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [orderQty, setOrderQty] = useState('');
  const [execQty, setExecQty] = useState('');
  const [disclQty, setDisclQty] = useState('0');
  const [orderPrice, setOrderPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('0');
  const [orderType, setOrderType] = useState<OrderType>('LMT');
  const [product, setProduct] = useState<ProductType>('Delivery');
  const [brokerage, setBrokerage] = useState('0');
  const [status, setStatus] = useState('Confirmed Trade');
  const [reason, setReason] = useState('---');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estimated total calculation
  const computedTotal = (Number(execQty) || 0) * (Number(orderPrice) || 0) + (Number(brokerage) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid stock symbol or name.' });
      return;
    }
    if (!execQty || Number(execQty) <= 0) {
      setMessage({ type: 'error', text: 'Execution quantity must be greater than 0.' });
      return;
    }
    if (!orderPrice || Number(orderPrice) <= 0) {
      setMessage({ type: 'error', text: 'Order price must be greater than 0.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await addTrade({
        financialYear: selectedYear,
        tradeType: 'BUY',
        dateTime,
        stockName: stockName.trim().toUpperCase(),
        exchange: exchange.trim().toUpperCase(),
        orderQty: Number(orderQty) || Number(execQty),
        execQty: Number(execQty),
        disclQty: Number(disclQty) || 0,
        orderPrice: Number(orderPrice),
        triggerPrice: Number(triggerPrice) || 0,
        orderType,
        product,
        brokerage: Number(brokerage) || 0,
        status: status || 'Confirmed Trade',
        reason: reason || '---',
      });

      setMessage({ type: 'success', text: `Saved BUY entry for ${stockName.toUpperCase()} successfully!` });
      // Reset some inputs
      setStockName('');
      setOrderQty('');
      setExecQty('');
      setOrderPrice('');
      setBrokerage('0');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to record buy trade.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTrades = buyTrades.filter((t) =>
    t.stockName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.exchange.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Entry Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Buy Stock Entry</h2>
              <p className="text-xs text-slate-400">Record executed buy order to update holdings and ledger</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400">Estimated Total Cost:</span>
            <div className="font-mono text-base font-bold text-emerald-400">
              {formatCurrency(computedTotal)}
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Stock Name / Symbol *</label>
              <input
                type="text"
                required
                placeholder="e.g. RELIANCE, TCS, INFY"
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Exchange</label>
              <input
                type="text"
                placeholder="NSE / BSE"
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Order Qty</label>
              <input
                type="number"
                min="0"
                placeholder="Order Qty"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Execution Qty *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="Shares executed"
                value={execQty}
                onChange={(e) => setExecQty(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Disclosed Qty</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={disclQty}
                onChange={(e) => setDisclQty(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Order Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Price per share"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Trigger Price</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="MKT">MKT (Market)</option>
                <option value="LMT">LMT (Limit)</option>
                <option value="SL">SL (Stop Loss)</option>
                <option value="SL-M">SL-M (Stop Loss Market)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Product</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as ProductType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Delivery">Delivery (CNC)</option>
                <option value="Cash">Cash</option>
                <option value="Intraday">Intraday (MIS)</option>
                <option value="Margin">Margin (MTF)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Brokerage & Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Trade Status</label>
              <input
                type="text"
                placeholder="Confirmed Trade"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="w-full sm:w-auto flex-1 max-w-md">
              <input
                type="text"
                placeholder="Reason or trade note (optional)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save BUY Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Buy Trade History List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Buy Trades Registry ({buyTrades.length})</h3>
            <p className="text-xs text-slate-400">All buy order records for FY {selectedYear}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by stock name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Clock size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
            No buy trade entries found in this financial year.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Stock Name</th>
                  <th className="py-3 px-3">Exch</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Order Qty</th>
                  <th className="py-3 px-3 text-right">Exec Qty</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-right">Brokerage</th>
                  <th className="py-3 px-3 text-right">Total Cost</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTrades.map((trade) => {
                  const totalCost = Number(trade.execQty) * Number(trade.orderPrice) + (Number(trade.brokerage) || 0);
                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {formatDateTime(trade.dateTime)}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {trade.stockName}
                        {trade.hslRefNo && (
                          <span className="block text-[9px] text-slate-500 font-mono">Ref: {trade.hslRefNo}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          {trade.exchange}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">{trade.product}</td>
                      <td className="py-3 px-3 text-right font-mono">{trade.orderQty}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                        {trade.execQty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(trade.orderPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatCurrency(trade.brokerage || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(totalCost)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => deleteTrade(trade.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete trade"
                        >
                          <Trash2 size={14} />
                        </button>
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
