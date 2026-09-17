import React from 'react';
import { Wallet, Plus, RefreshCw, HandCoins, Download, Printer, LogOut, User, BarChart3 } from 'lucide-react';
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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wallet className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FinTrack
              </h1>
            
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Personal Finance System</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
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
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Financial Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <NotificationCenter
            dashboardData={dashboardData}
            budgets={budgets}
            goals={goals}
            onNavigate={onNavigate}
          />

          <button
            onClick={onAddDebt}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95"
            title="Record Money Owed to You or Borrowed from Someone"
          >
            <HandCoins className="w-4 h-4" />
            <span>Add Debt / Loan</span>
          </button>

          <button
            onClick={onAddTransaction}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>

          {onLogout && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {currentUser && (
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-white">{currentUser.name || currentUser.username}</span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors"
                title="Sign Out"
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
