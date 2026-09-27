import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';
import {
  Database,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Laptop,
  Radio,
  Server,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const BackupView: React.FC = () => {
  const {
    exportBackup,
    restoreBackup,
    user,
    syncedDevices,
    currentDeviceId,
    syncStatus,
    lastSyncedAt,
    trades,
    incomes,
    expenses,
    accounts,
    journals,
  } = useApp();

  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investpro_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const success = await restoreBackup(text);
        if (success) {
          setRestoreStatus({
            type: 'success',
            msg: 'Backup data successfully restored and synchronized with Firebase Cloud!',
          });
        } else {
          setRestoreStatus({
            type: 'error',
            msg: 'Failed to parse or restore backup file.',
          });
        }
      } catch (err) {
        setRestoreStatus({
          type: 'error',
          msg: 'Error reading backup file format.',
        });
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Cloud & Real-time Sync Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Server size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Online Database & Cloud Storage</h2>
            <p className="text-xs text-slate-400">
              Real-time cross-device data synchronizer powered by Google Firebase Firestore
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Cloud Database
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">Firestore Enterprise</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">gen-lang-client-0838522902</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Sync State
            </span>
            <div className="flex items-center gap-2 mt-2">
              <Radio size={16} className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="text-sm font-bold text-white capitalize">{syncStatus}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Total Cloud Records
            </span>
            <div className="text-sm font-bold text-cyan-300 mt-2">
              {trades.length + incomes.length + expenses.length + accounts.length + journals.length} items
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Trades, accounts, journals & ledgers</p>
          </div>
        </div>
      </div>

      {/* Connected Devices (Real-time Cross-Device Presence) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Active Synced Devices</h3>
            <p className="text-xs text-slate-400">
              Devices running Android, iOS, or Web actively syncing state with this account
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            {syncedDevices.length > 0 ? syncedDevices.length : 1} Connected
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 mt-3 text-xs">
          {syncedDevices.length === 0 ? (
            <div className="py-4 text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Laptop size={18} />
                </div>
                <div>
                  <div className="font-semibold text-white">Current Active Session (This Device)</div>
                  <div className="text-[11px] text-slate-500">ID: {currentDeviceId}</div>
                </div>
              </div>
              <span className="text-emerald-400 font-mono text-[11px]">Primary Client</span>
            </div>
          ) : (
            syncedDevices.map((dev) => {
              const isCurrent = dev.deviceId === currentDeviceId;
              return (
                <div key={dev.id || dev.deviceId} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                      {dev.platform === 'Android' || dev.platform === 'iOS' ? (
                        <Smartphone size={18} className="text-cyan-400" />
                      ) : (
                        <Laptop size={18} className="text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {dev.deviceName}
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]">
                            This Device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Platform: {dev.platform} • Last active: {formatDateTime(dev.lastActive)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Real-Time Sync</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual JSON Export / Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Download size={20} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Export Full Database Backup</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Download an offline JSON file containing all trades, holdings, accounts, journal vouchers, and financial years.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow cursor-pointer"
          >
            <Download size={15} />
            <span>Export JSON Archive</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Upload size={20} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Restore Database From Backup</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Upload a previously exported JSON backup file to restore records directly into Firestore.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow shadow-indigo-600/20 cursor-pointer"
            >
              <Upload size={15} />
              <span>{isRestoring ? 'Restoring Data...' : 'Select JSON to Restore'}</span>
            </button>
          </div>
        </div>
      </div>

      {restoreStatus && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            restoreStatus.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
        >
          {restoreStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{restoreStatus.msg}</span>
        </div>
      )}
    </div>
  );
};
