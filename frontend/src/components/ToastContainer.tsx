import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../utils/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const bgColor = {
          success: 'bg-emerald-900/90 border-emerald-700/60',
          error: 'bg-rose-900/90 border-rose-700/60',
          info: 'bg-blue-900/90 border-blue-700/60',
          warning: 'bg-amber-900/90 border-amber-700/60',
        }[toast.type];

        const textColor = {
          success: 'text-emerald-100',
          error: 'text-rose-100',
          info: 'text-blue-100',
          warning: 'text-amber-100',
        }[toast.type];

        const Icon = {
          success: CheckCircle,
          error: AlertCircle,
          info: Info,
          warning: AlertCircle,
        }[toast.type];

        const iconColor = {
          success: 'text-emerald-400',
          error: 'text-rose-400',
          info: 'text-blue-400',
          warning: 'text-amber-400',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border ${bgColor} ${textColor} p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 duration-300`}
            role="alert"
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current/60 hover:text-current transition-colors ml-2 mt-0.5"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
