import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileSpreadsheet, Mail, Printer, X } from 'lucide-react';
import { Transaction } from '../types';
import { api } from '../api/client';

type ExportPeriod = 'all' | 'month' | 'week' | 'current-week' | 'range';

interface ExportPeriodModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onExportCSV: (transactions: Transaction[], periodLabel: string) => void;
  onExportPDF: (transactions: Transaction[], periodLabel: string, password: string) => Promise<void>;
  onEmailPDF: (input: { email: string; startDate: string; endDate: string; periodLabel: string; enableMonthly: boolean }) => Promise<void>;
}

const toLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const ExportPeriodModal: React.FC<ExportPeriodModalProps> = ({
  transactions,
  onClose,
  onExportCSV,
  onExportPDF,
  onEmailPDF,
}) => {
  const today = new Date();
  const [period, setPeriod] = useState<ExportPeriod>('all');
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [weekDate, setWeekDate] = useState(toLocalDateInput(today));
  const [startDate, setStartDate] = useState(toLocalDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(toLocalDateInput(today));
  const [email, setEmail] = useState('');
  const [enableMonthly, setEnableMonthly] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [pdfPassword, setPdfPassword] = useState('');
  const [openingPdf, setOpeningPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    api.getReportSettings()
      .then((settings) => {
        setEmail(settings.recipientEmail || '');
        setEnableMonthly(settings.monthlyReportsEnabled);
      })
      .catch(() => undefined);
  }, []);

  const selection = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'All transactions';

    if (period === 'month') {
      const [year, monthNumber] = month.split('-').map(Number);
      start = new Date(year, monthNumber - 1, 1);
      end = new Date(year, monthNumber, 0, 23, 59, 59, 999);
      label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (period === 'week' || period === 'current-week') {
      const selectedDate = period === 'current-week' ? today : new Date(`${weekDate}T00:00:00`);
      const mondayOffset = (selectedDate.getDay() + 6) % 7;
      start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - mondayOffset);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      label = `${formatDate(start)} - ${formatDate(end)}`;
    } else if (period === 'range') {
      if (startDate && endDate) {
        start = new Date(`${startDate}T00:00:00`);
        end = new Date(`${endDate}T23:59:59.999`);
        label = `${formatDate(start)} - ${formatDate(end)}`;
      }
    }

    const validRange = period !== 'range' || (
      Boolean(startDate && endDate) && (!start || !end || start <= end)
    );
    const filteredTransactions = validRange
      ? transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.transactionDate);
        return (!start || transactionDate >= start) && (!end || transactionDate <= end);
      })
      : [];

    const dates = filteredTransactions.map((transaction) => new Date(transaction.transactionDate).getTime());
    const effectiveStart = start || (dates.length ? new Date(Math.min(...dates)) : null);
    const effectiveEnd = end || (dates.length ? new Date(Math.max(...dates)) : null);
    return { label, transactions: filteredTransactions, validRange, start: effectiveStart, end: effectiveEnd };
  }, [transactions, period, month, weekDate, startDate, endDate, today]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!selection.transactions.length) return;
    if (format === 'csv') {
      onExportCSV(selection.transactions, selection.label);
      onClose();
      return;
    }

    if (!pdfPassword) return;
    setOpeningPdf(true);
    setPdfError('');
    try {
      await onExportPDF(selection.transactions, selection.label, pdfPassword);
      onClose();
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'Unable to verify your password.');
    } finally {
      setOpeningPdf(false);
    }
  };

  const handleEmail = async () => {
    if (!selection.start || !selection.end || !email.trim()) return;
    setSending(true);
    setEmailError('');
    try {
      await onEmailPDF({
        email: email.trim(),
        startDate: selection.start.toISOString(),
        endDate: selection.end.toISOString(),
        periodLabel: selection.label,
        enableMonthly,
      });
      onClose();
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Unable to send the report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-cyan-300" />
            <h2 className="text-base font-bold text-white">Choose export period</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="export-period" className="mb-1.5 block text-xs font-semibold text-slate-300">Period</label>
            <select
              id="export-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ExportPeriod)}
              className="fintrack-input p-2.5 text-sm"
            >
              <option value="all">All transactions</option>
              <option value="month">Particular month</option>
              <option value="week">Week containing a date</option>
              <option value="current-week">Current week</option>
              <option value="range">Custom date range</option>
            </select>
          </div>

          {period === 'month' && (
            <div>
              <label htmlFor="export-month" className="mb-1.5 block text-xs font-semibold text-slate-300">Month</label>
              <input id="export-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="fintrack-input p-2.5 text-sm" />
            </div>
          )}

          {period === 'week' && (
            <div>
              <label htmlFor="export-week-date" className="mb-1.5 block text-xs font-semibold text-slate-300">Choose any date in the week</label>
              <input id="export-week-date" type="date" value={weekDate} onChange={(event) => setWeekDate(event.target.value)} className="fintrack-input p-2.5 text-sm" />
            </div>
          )}

          {period === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="export-start-date" className="mb-1.5 block text-xs font-semibold text-slate-300">From</label>
                <input id="export-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="fintrack-input p-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="export-end-date" className="mb-1.5 block text-xs font-semibold text-slate-300">To</label>
                <input id="export-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="fintrack-input p-2.5 text-sm" />
              </div>
            </div>
          )}

          <div className={`text-xs ${selection.validRange ? 'text-slate-400' : 'text-rose-400'}`}>
            {!selection.validRange
              ? 'The start date must be on or before the end date.'
              : `${selection.transactions.length} transaction${selection.transactions.length === 1 ? '' : 's'} selected · ${selection.label}`}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <label htmlFor="report-email" className="block text-xs font-semibold text-slate-300">Email PDF report</label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="fintrack-input p-2.5 text-sm"
            />
            <label className="flex items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={enableMonthly} onChange={(event) => setEnableMonthly(event.target.checked)} className="mt-0.5" />
              Automatically email the previous month's PDF at the start of each month
            </label>
            {emailError && <p className="text-xs text-rose-400">{emailError}</p>}
          </div>

          <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3">
            <label htmlFor="pdf-password" className="block text-xs font-semibold text-slate-300">Password required to open PDF</label>
            <input
              id="pdf-password"
              type="password"
              value={pdfPassword}
              onChange={(event) => {
                setPdfPassword(event.target.value);
                setPdfError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && pdfPassword && !openingPdf) void handleExport('pdf');
              }}
              autoComplete="current-password"
              placeholder="Enter your FinTrack password"
              className="fintrack-input p-2.5 text-sm"
            />
            {pdfError && <p className="text-xs text-rose-400">{pdfError}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmail}
              disabled={!selection.validRange || selection.transactions.length === 0 || !email.trim() || sending}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mail className="h-3.5 w-3.5" /> {sending ? 'Sending...' : 'Email PDF'}
            </button>
            <button
              type="button"
              onClick={() => void handleExport('csv')}
              disabled={!selection.validRange || selection.transactions.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => void handleExport('pdf')}
              disabled={!selection.validRange || selection.transactions.length === 0 || !pdfPassword || openingPdf}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-3.5 w-3.5" /> {openingPdf ? 'Verifying...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPeriodModal;
