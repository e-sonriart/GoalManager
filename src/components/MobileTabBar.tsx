import React from 'react';
import { ActiveTab } from './Navbar';
import {
  BarChart3,
  Calendar,
  ClipboardList,
  CheckSquare,
  Shield,
  Menu
} from 'lucide-react';

interface MobileTabBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMore: () => void;
  isFramed?: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenMore,
  isFramed = false
}) => {
  const primaryTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Inicio', icon: BarChart3 },
    { id: 'partidos', label: 'Partidos', icon: Calendar },
    { id: 'equipos', label: 'Equipos', icon: Shield },
    { id: 'convocatorias', label: 'Convocatoria', icon: ClipboardList }
  ];

  const isMoreActive = !primaryTabs.some(t => t.id === activeTab);

  return (
    <nav
      id="mobile-bottom-bar"
      aria-label="Navegación móvil inferior"
      className={`lg:hidden ${
        isFramed
          ? 'sticky bottom-0 left-0 right-0 z-30 bg-gray-950/98 border-t border-gray-800'
          : 'fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-md border-t border-gray-800/90'
      } text-gray-400 px-2 py-1.5 shadow-2xl safe-area-bottom w-full shrink-0 select-none`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] min-h-[50px] transition-all relative ${
                isActive
                  ? 'text-orange-500 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-200 active:scale-95'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" />
              )}
              <div className="w-6 h-6 flex items-center justify-center mb-0.5">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[11px] leading-tight tracking-tight font-medium">{tab.label}</span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] min-h-[50px] transition-all relative ${
            isMoreActive
              ? 'text-orange-500 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200 active:scale-95'
          }`}
        >
          {isMoreActive && (
            <span className="absolute -top-1.5 w-6 h-1 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" />
          )}
          <div className="w-6 h-6 flex items-center justify-center mb-0.5">
            <Menu className={`w-5 h-5 ${isMoreActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] leading-tight tracking-tight font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
};

