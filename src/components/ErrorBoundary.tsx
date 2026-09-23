import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

const ReactComponent = React.Component as any;

/**
 * Captura errores de renderizado para evitar que un fallo puntual
 * deje toda la aplicación en blanco.
 */
export class ErrorBoundary extends ReactComponent {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    console.error('[ErrorBoundary] Error de renderizado:', error, info?.componentStack);
  }

  handleReset = (): void => {
    (this as any).setState({ hasError: false, message: undefined });
  };

  render(): ReactNode {
    const props = (this as any).props as ErrorBoundaryProps;
    const state = (this as any).state as ErrorBoundaryState;

    if (!state.hasError) return props.children;

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 font-athletic uppercase tracking-wide">
          Algo ha ido mal
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md">
          {props.label
            ? `No se pudo mostrar el módulo "${props.label}".`
            : 'No se pudo mostrar esta sección.'}
        </p>
        {state.message && (
          <p className="text-[11px] text-gray-400 font-mono mt-2 max-w-md break-words">
            {state.message}
          </p>
        )}
        <button
          onClick={this.handleReset}
          className="mt-5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }
}
