import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full min-w-0 ${maxWidth} sm:my-auto flex flex-col max-h-[93vh] sm:max-h-[88vh] overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera fija */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="pr-2 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 font-athletic tracking-wide truncate">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-1 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 rounded-xl transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cuerpo con scroll interno. min-h-0 + overflow-x = no recorta laterales ni bloques altos */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
};
