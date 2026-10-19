import React, { useState } from 'react';
import { Wallet, Plus, RefreshCw, HandCoins, Download, Printer, LogOut, User, BarChart3, Moon, Sun, MoreVertical } from 'lucide-react';
import type { Theme } from '../utils/theme';
import { DashboardData, Budget, Goal } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { PushNotificationSettings } from './PushNotificationSettings';

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
  theme: Theme;
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
}) => {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const refresh = () => { onRefresh(); setIsActionsMenuOpen(false); };
  const menuButtonClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800';
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
              <h1 className="fintrack-wordmark text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent md:text-xl">
                FinTrack
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Personal Finance System</p>
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex shrink-0 items-center justify-end gap-1.5 md:gap-2.5">
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

          <div className="hidden items-center gap-1.5 md:flex">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="block shrink-0 rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white disabled:opacity-50"
            title="Sync financial data"
            aria-label="Sync financial data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <PushNotificationSettings />
          </div>

          <div className="flex items-center">
            <NotificationCenter dashboardData={dashboardData} budgets={budgets} goals={goals} onNavigate={onNavigate} />
          </div>

          <button type="button" onClick={() => setIsActionsMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white md:hidden" aria-label="Open utilities menu" aria-expanded={isActionsMenuOpen}>
            <MoreVertical className="h-4 w-4" />
          </button>
          {isActionsMenuOpen && <>
            <button className="fixed inset-0 z-40 cursor-default md:hidden" aria-label="Close utilities menu" onClick={() => setIsActionsMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-5rem)] w-64 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-slate-950/60 md:hidden">
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
                <span className="text-sm font-medium text-slate-200">Appearance</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme === 'light' ? 'font-semibold text-amber-200' : 'text-slate-500'}`}>Light</span>
                  <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" onClick={onToggleTheme} className={`relative h-6 w-11 rounded-full transition-colors ${theme === 'dark' ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-xs ${theme === 'dark' ? 'font-semibold text-indigo-200' : 'text-slate-500'}`}>Dark</span>
                </div>
              </div>
              <button type="button" onClick={refresh} disabled={isLoading} className={`${menuButtonClass} disabled:opacity-50`}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} /><span>Refresh data</span>
              </button>
              <div className="border-t border-slate-800 py-1 [&>button]:!w-full">
                <PushNotificationSettings showLabel />
              </div>
              {onExportCSV && <button type="button" onClick={() => { onExportCSV(); setIsActionsMenuOpen(false); }} className={menuButtonClass}><Download className="h-4 w-4 text-blue-400" /><span>Export CSV</span></button>}
              {onExportPDF && <button type="button" onClick={() => { onExportPDF(); setIsActionsMenuOpen(false); }} className={menuButtonClass}><Printer className="h-4 w-4 text-indigo-400" /><span>PDF report</span></button>}
              {onExportPowerBI && <button type="button" onClick={() => { onExportPowerBI(); setIsActionsMenuOpen(false); }} className={menuButtonClass}><BarChart3 className="h-4 w-4 text-amber-400" /><span>Power BI data</span></button>}
              {onLogout && <button type="button" onClick={() => { onLogout(); setIsActionsMenuOpen(false); }} className={`${menuButtonClass} text-rose-300`}><LogOut className="h-4 w-4" /><span>Sign out</span></button>}
            </div>
          </>}

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
            <div className="hidden items-center gap-2 border-l border-slate-800 pl-1.5 md:flex md:pl-2">
              {currentUser && (
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-white">{currentUser.name || currentUser.username}</span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:text-rose-400 transition-colors"
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
