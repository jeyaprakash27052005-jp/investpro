import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import type { OrderType, ProductType } from '../types';
import {
  TrendingDown,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const SellStockView: React.FC = () => {
  const { trades, addTrade, deleteTrade, portfolioHoldings, selectedYear } = useApp();

  const sellTrades = trades.filter((t) => t.tradeType === 'SELL' && t.financialYear === selectedYear);

  // Form State
  const now = new Date();
  const defaultDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [selectedStockKey, setSelectedStockKey] = useState('');
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

  // Find matching holding
  const activeHolding = portfolioHoldings.find(
    (h) => `${h.stockName}_${h.exchange}` === selectedStockKey
  );

  const handleStockSelect = (key: string) => {
    setSelectedStockKey(key);
    const holding = portfolioHoldings.find((h) => `${h.stockName}_${h.exchange}` === key);
    if (holding) {
      setExchange(holding.exchange);
      setExecQty(String(holding.quantity));
      setOrderQty(String(holding.quantity));
      if (holding.lastTradedPrice) {
        setOrderPrice(String(holding.lastTradedPrice));
      }
    }
  };

  // Calculations
  const qtyNum = Number(execQty) || 0;
  const priceNum = Number(orderPrice) || 0;
  const brokerageNum = Number(brokerage) || 0;
  const sellAmount = qtyNum * priceNum;
  const avgCost = activeHolding ? activeHolding.avgBuyCost : 0;
  const calculatedSellCost = qtyNum * avgCost;
  const calculatedRealizedPL = sellAmount - calculatedSellCost - brokerageNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockKey || !activeHolding) {
      setMessage({ type: 'error', text: 'Please select a stock from your active portfolio holdings.' });
      return;
    }
    if (qtyNum <= 0) {
      setMessage({ type: 'error', text: 'Execution quantity must be greater than 0.' });
      return;
    }
    if (qtyNum > activeHolding.quantity) {
      setMessage({
        type: 'error',
        text: `Cannot sell ${qtyNum} shares. You only hold ${activeHolding.quantity} shares of ${activeHolding.stockName}.`,
      });
      return;
    }
    if (priceNum <= 0) {
      setMessage({ type: 'error', text: 'Order price must be greater than 0.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await addTrade({
        financialYear: selectedYear,
        tradeType: 'SELL',
        dateTime,
        stockName: activeHolding.stockName,
        exchange: exchange.trim().toUpperCase() || activeHolding.exchange,
        orderQty: Number(orderQty) || qtyNum,
        execQty: qtyNum,
        disclQty: Number(disclQty) || 0,
        orderPrice: priceNum,
        triggerPrice: Number(triggerPrice) || 0,
        orderType,
        product,
        brokerage: brokerageNum,
        status: status || 'Confirmed Trade',
        reason: reason || '---',
        sellCost: Number(calculatedSellCost.toFixed(2)),
        realizedPL: Number(calculatedRealizedPL.toFixed(2)),
      });

      setMessage({
        type: 'success',
        text: `Successfully executed SELL for ${activeHolding.stockName} with Realized P/L of ${formatCurrency(
          calculatedRealizedPL
        )}!`,
      });

      setSelectedStockKey('');
      setExecQty('');
      setOrderQty('');
      setOrderPrice('');
      setBrokerage('0');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to record sell trade.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTrades = sellTrades.filter((t) =>
    t.stockName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.exchange.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Entry Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sell Stock Entry</h2>
              <p className="text-xs text-slate-400">Select an existing stock holding to sell and compute realized profit/loss</p>
            </div>
          </div>

          {activeHolding && (
            <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Holding Available</span>
                <span className="font-mono font-bold text-white">{activeHolding.quantity} shares</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-[10px] text-slate-400 block">Avg Cost</span>
                <span className="font-mono font-medium text-slate-300">{formatCurrency(activeHolding.avgBuyCost)}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-[10px] text-slate-400 block">Projected P/L</span>
                <span
                  className={`font-mono font-bold ${
                    calculatedRealizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {calculatedRealizedPL >= 0 ? '+' : ''}
                  {formatCurrency(calculatedRealizedPL)}
                </span>
              </div>
            </div>
          )}
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Select Stock *</label>
              <select
                required
                value={selectedStockKey}
                onChange={(e) => handleStockSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose Stock Holding --</option>
                {portfolioHoldings.map((h) => (
                  <option key={`${h.stockName}_${h.exchange}`} value={`${h.stockName}_${h.exchange}`}>
                    {h.stockName} ({h.exchange}) — {h.quantity} shares available
                  </option>
                ))}
              </select>
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
                max={activeHolding ? activeHolding.quantity : undefined}
                required
                placeholder="Shares to sell"
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Sell Price (₹) *</label>
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
              disabled={isSubmitting || portfolioHoldings.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>{isSubmitting ? 'Executing Sell...' : 'Save SELL Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sell Trade History List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Sell Trades Registry ({sellTrades.length})</h3>
            <p className="text-xs text-slate-400">All sell order records and realized P/L for FY {selectedYear}</p>
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
              onClick={() => window.print()}
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
            No sell trade executions in this financial year.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Stock Name</th>
                  <th className="py-3 px-3">Exch</th>
                  <th className="py-3 px-3 text-right">Exec Qty</th>
                  <th className="py-3 px-3 text-right">Sell Price</th>
                  <th className="py-3 px-3 text-right">Sell Gross</th>
                  <th className="py-3 px-3 text-right">Cost</th>
                  <th className="py-3 px-3 text-right">Realized P/L</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTrades.map((trade) => {
                  const gross = Number(trade.execQty) * Number(trade.orderPrice);
                  const isProfit = (trade.realizedPL ?? 0) >= 0;
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
                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-400">
                        {trade.execQty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(trade.orderPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(gross)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatCurrency(trade.sellCost || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded ${
                            isProfit
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isProfit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {formatCurrency(trade.realizedPL || 0)}
                        </span>
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
