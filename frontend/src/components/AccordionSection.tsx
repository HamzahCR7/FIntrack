import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
  className?: string;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  defaultOpen = true,
  children,
  actionButton,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg transition-all duration-300 ${className}`}>
      {/* Accordion Header Bar */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900/90 hover:bg-slate-800/80 cursor-pointer select-none transition-colors border-b border-slate-800/60"
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight truncate">{title}</h3>
              {badge !== undefined && badge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {actionButton}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isOpen ? 'Collapse Section' : 'Expand Section'}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Accordion Body Content */}
      {isOpen && (
        <div className="p-5 animate-in fade-in duration-300">
          {children}
        </div>
      )}
    </section>
  );
};
