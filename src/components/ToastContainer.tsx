import React from 'react';
import { useClub } from '../context/ClubContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useClub();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map(toast => {
        let borderClass = 'border-orange-500';
        let bgIconClass = 'bg-orange-100 text-orange-600';
        let IconComponent = Info;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500';
          bgIconClass = 'bg-emerald-100 text-emerald-600';
          IconComponent = CheckCircle2;
        } else if (toast.type === 'error') {
          borderClass = 'border-red-500';
          bgIconClass = 'bg-red-100 text-red-600';
          IconComponent = AlertCircle;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 bg-white p-4 rounded-xl shadow-xl border-l-4 ${borderClass} transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${bgIconClass}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm">{toast.title}</h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              id={`close-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
