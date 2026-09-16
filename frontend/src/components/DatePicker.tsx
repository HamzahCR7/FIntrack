import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  accent?: 'blue' | 'emerald' | 'indigo';
}

const accentStyles = {
  blue: {
    border: 'border-blue-400/60',
    ring: 'ring-blue-400/20',
    selected: 'bg-blue-500 text-white shadow-lg shadow-blue-950/40',
    icon: 'text-blue-300',
  },
  emerald: {
    border: 'border-emerald-400/60',
    ring: 'ring-emerald-400/20',
    selected: 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/40',
    icon: 'text-emerald-300',
  },
  indigo: {
    border: 'border-indigo-400/60',
    ring: 'ring-indigo-400/20',
    selected: 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40',
    icon: 'text-indigo-300',
  },
};

const pad = (value: number) => value.toString().padStart(2, '0');

const parseDate = (value: string): Date => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  required = false,
  placeholder = 'Choose a date',
  accent = 'blue',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDate(value));
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const styles = accentStyles[accent];
  const selectedDate = value ? parseDate(value) : null;
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedField = pickerRef.current?.contains(target);
      const clickedCalendar = popoverRef.current?.contains(target);
      if (!clickedField && !clickedCalendar) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
      return;
    }

    const updatePopoverPosition = () => {
      const bounds = pickerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const popupHeight = 330;
      const gap = 8;
      const fitsBelow = bounds.bottom + gap + popupHeight <= window.innerHeight;
      const top = fitsBelow ? bounds.bottom + gap : Math.max(8, bounds.top - popupHeight - gap);
      const left = Math.min(Math.max(8, bounds.left), window.innerWidth - 312);
      setPopoverPosition({ top, left });
    };

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value) setViewDate(parseDate(value));
  }, [value]);

  const selectDate = (date: Date) => {
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const shiftMonth = (amount: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(viewDate);
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(selectedDate)
    : placeholder;

  return (
    <div ref={pickerRef} className="relative">
      <input type="hidden" value={value} required={required} />
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`date-field flex w-full items-center justify-between rounded-xl border bg-slate-800/90 p-2.5 text-left text-xs text-white transition-all hover:border-slate-500 focus:outline-none focus:ring-4 ${isOpen ? `${styles.border} ${styles.ring} ring-4` : 'border-slate-700'}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={selectedDate ? 'text-white' : 'text-slate-500'}>{selectedLabel}</span>
        <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
      </button>

      {isOpen && popoverPosition && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-slate-950/60 animate-[calendarPop_160ms_ease-out]"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
          role="dialog"
          aria-label="Choose date"
        >
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-white">{monthLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day.slice(0, 1)}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const dateValue = formatDate(date);
              const isSelected = dateValue === value;
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isToday = dateValue === formatDate(new Date());
              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`relative flex aspect-square items-center justify-center rounded-lg text-xs transition-all hover:bg-slate-700 hover:text-white ${isSelected ? styles.selected : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'} ${isToday && !isSelected ? 'ring-1 ring-slate-500' : ''}`}
                  aria-label={date.toDateString()}
                  aria-pressed={isSelected}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => selectDate(new Date())} className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800/70 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white">
            Jump to today
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
