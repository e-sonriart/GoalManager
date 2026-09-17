import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { Sparkles, X, Shield } from 'lucide-react';

export const PWABanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  if (isInstalled || dismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <div className="relative z-40 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-orange-500/30 text-white px-3 sm:px-4 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-orange-500/40">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>App Oficial del Club</span>
              <span className="hidden xs:inline-flex px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 text-[10px] font-semibold">
                PWA
              </span>
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              Instala en tu móvil para acceso directo y modo pantalla completa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="banner" />
          <button
            onClick={handleDismiss}
            aria-label="Cerrar aviso de instalación"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
