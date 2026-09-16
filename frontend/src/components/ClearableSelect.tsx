import React from 'react';
import { X } from 'lucide-react';

interface ClearableSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string;
  defaultValue: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
}

export const ClearableSelect: React.FC<ClearableSelectProps> = ({
  value,
  defaultValue,
  onValueChange,
  className = '',
  wrapperClassName = '',
  disabled,
  children,
  ...props
}) => {
  const canClear = !disabled && value !== defaultValue;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        {...props}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className={`${className} ${canClear ? 'pr-8' : ''}`.trim()}
      >
        {children}
      </select>

      {canClear && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onValueChange(defaultValue);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-700/70 hover:text-white"
          aria-label="Clear selection"
          title="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
