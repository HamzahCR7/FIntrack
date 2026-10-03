import React from 'react';
import { Wallet, Plus, RefreshCw, HandCoins, Download, Printer, LogOut, User, BarChart3, HelpCircle, Settings } from 'lucide-react';
import { DashboardData, Budget, Goal } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface NavbarProps {
  onAddTransaction: () => void;
  onAddDebt: () => void;
  onRefresh: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onExportPowerBI?: () => void;
  onLogout?: () => void;
  currentUser?: { username: string; name?: string } | null;
  dashboardData: DashboardData | null;
  budgets?: Budget[];
  goals?: Goal[];
  onNavigate: (tab: any) => void;
  isLoading: boolean;
  onStartTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onAddTransaction,
  onAddDebt,
  onRefresh,
  onExportCSV,
  onExportPDF,
  onExportPowerBI,
  onLogout,
  currentUser,
  dashboardData,
  budgets,
  goals,
  onNavigate,
  isLoading,
  onStartTour,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 px-3 py-2 backdrop-blur-md md:px-4 md:py-3.5 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 md:h-10 md:w-10">
            <Wallet className="h-5 w-5 text-white md:h-5.5 md:w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent md:text-xl">
                FinTrack
              </h1>
            
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Personal Finance System</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 md:gap-2.5">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              title="Export ledger as CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
          )}

          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              title="Print or Save PDF Summary Report"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>PDF Report</span>
            </button>
          )}

          {onExportPowerBI && (
            <button
              onClick={onExportPowerBI}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors"
              title="Export Star-Schema Power BI Dataset (JSON + DAX Measures)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Power BI Data</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="block shrink-0 rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white disabled:opacity-50"
            title="Sync financial data"
            aria-label="Sync financial data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <NotificationCenter
            dashboardData={dashboardData}
            budgets={budgets}
            goals={goals}
            onNavigate={onNavigate}
          />

          {onStartTour && <button onClick={onStartTour} className="hidden rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 md:block" title="App tour" aria-label="Start app tour"><HelpCircle className="h-4 w-4" /></button>}

          {currentUser && <button onClick={() => onNavigate('settings')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 md:hidden" title="Manage profile and workspace" aria-label="Manage profile and workspace"><Settings className="h-5 w-5" /></button>}

          <div className="flex items-center gap-1.5 md:gap-2.5">
            <button
              onClick={onAddDebt}
              className="hidden min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600/90 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 md:flex"
              title="Record Money Owed to You or Borrowed from Someone"
            >
              <HandCoins className="w-3.5 h-3.5 shrink-0 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Add Debt / Loan</span>
            </button>

            <button
              onClick={onAddTransaction}
              className="hidden items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:flex md:min-h-10"
            >
              <Plus className="w-3.5 h-3.5 shrink-0 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Add Transaction</span>
            </button>
          </div>

          {onLogout && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-1.5 md:pl-2">
              {currentUser && (
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-white">{currentUser.name || currentUser.username}</span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="block shrink-0 rounded-xl border border-rose-500/40 bg-rose-500/20 p-2.5 text-rose-400 transition-colors hover:bg-rose-500/30"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
