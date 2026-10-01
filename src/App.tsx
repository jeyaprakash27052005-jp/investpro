/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import type { ActivePage } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';

// Views
import { DashboardView } from './views/DashboardView';
import { BuyStockView } from './views/BuyStockView';
import { SellStockView } from './views/SellStockView';
import { ExcelImportView } from './views/ExcelImportView';
import { PortfolioView } from './views/PortfolioView';
import { IncomeView } from './views/IncomeView';
import { ExpenseView } from './views/ExpenseView';
import { AccountsView } from './views/AccountsView';
import { JournalView } from './views/JournalView';
import { ReportsView } from './views/ReportsView';
import { BackupView } from './views/BackupView';

function AppContent() {
  const { user, isAuthLoading } = useApp();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Initializing InvestPro Cloud...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView onNavigate={(p) => setActivePage(p)} />;
      case 'buy':
        return <BuyStockView />;
      case 'sell':
        return <SellStockView />;
      case 'import':
        return <ExcelImportView />;
      case 'portfolio':
        return <PortfolioView onNavigate={(p) => setActivePage(p)} />;
      case 'income':
        return <IncomeView />;
      case 'expense':
        return <ExpenseView />;
      case 'accounts':
        return <AccountsView />;
      case 'journal':
        return <JournalView />;
      case 'reports':
        return <ReportsView onNavigate={(p) => setActivePage(p)} />;
      case 'backup':
        return <BackupView />;
      default:
        return <DashboardView onNavigate={(p) => setActivePage(p)} />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-cyan-500 selection:text-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
        />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full bg-slate-900 shadow-2xl relative z-10">
            <Sidebar
              activePage={activePage}
              setActivePage={setActivePage}
              closeMobileMenu={() => setIsMobileMenuOpen(false)}
            />
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header
          activePage={activePage}
          toggleMobileMenu={() => setIsMobileMenuOpen(true)}
          onPrint={handlePrint}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
