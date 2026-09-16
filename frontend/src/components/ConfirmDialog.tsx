import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl animate-in scale-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-800 bg-slate-900/50">
          <div className={`p-2 rounded-xl ${isDangerous ? 'bg-rose-500/10' : 'bg-blue-500/10'}`}>
            <AlertCircle className={`h-5 w-5 ${isDangerous ? 'text-rose-400' : 'text-blue-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-slate-300">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
