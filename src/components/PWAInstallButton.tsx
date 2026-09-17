import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as PWA or in standalone mode, show subtle indicator or hide
  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>App Instalada</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <button
          onClick={install}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs tracking-wide shadow-md shadow-orange-500/30 transition-all active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4 animate-bounce" />
          <span>Instalar en mi móvil</span>
        </button>
      );
    }

    if (variant === 'full') {
      return (
        <button
          onClick={install}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-500/30 transition-all active:scale-98 ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Instalar App en la Pantalla de Inicio</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 ${className}`}
        title="Instalar aplicación en el dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'banner' ? (
          <button
            onClick={() => setShowIOSModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs tracking-wide shadow-md shadow-orange-500/30 transition-all active:scale-95 ${className}`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Instalar en iPhone / iPad</span>
          </button>
        ) : variant === 'full' ? (
          <button
            onClick={() => setShowIOSModal(true)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 font-bold rounded-xl text-sm transition-all active:scale-98 ${className}`}
          >
            <Smartphone className="w-4 h-4 text-orange-400" />
            <span>Instalar en iPhone / iPad</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs transition-all active:scale-95 ${className}`}
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-400" />
            <span>Instalar en iOS</span>
          </button>
        )}

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 text-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base font-athletic tracking-wide">
                    Instalar en iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-300">
                <div className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-800">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-medium mb-0.5">Paso 1:</strong>
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-800">
                  <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-medium mb-0.5">Paso 2:</strong>
                    Desplaza hacia abajo y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-800">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-medium mb-0.5">Paso 3:</strong>
                    Pulsa <strong>Añadir</strong> arriba a la derecha. ¡Listo! Se abrirá como app nativa a pantalla completa.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
