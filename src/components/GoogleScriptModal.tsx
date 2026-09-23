import React, { useState } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { Check, ShieldCheck, Database, HelpCircle, ExternalLink } from 'lucide-react';

interface GoogleScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleScriptModal: React.FC<GoogleScriptModalProps> = ({ isOpen, onClose }) => {
  const { testGoogleConnection, initRemoteSheets, addToast } = useClub();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'schema'>('instructions');

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testGoogleConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleInitRemote = async () => {
    setInitializing(true);
    const res = await initRemoteSheets();
    setInitializing(false);
    addToast({
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Tablas verificadas' : 'Error',
      message: res.message
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conexión con Supabase"
      subtitle="Base de datos en la nube (PostgreSQL) con caché local offline"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'instructions'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Estado
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Database className="w-4 h-4" />
            Tablas
          </button>
        </div>

        {activeTab === 'instructions' && (
          <div className="space-y-4">
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-800 leading-relaxed">
                <strong>¿Cómo funciona?</strong> La app lee y escribe en Supabase (URL y anon key en <code>.env</code>).
                Si Supabase no responde, sigue en <strong>modo local</strong> con la caché del navegador.
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
              <li>
                Abre{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline font-medium inline-flex items-center gap-1"
                >
                  Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
                </a>{' '}
                → tu proyecto → <strong>SQL Editor</strong>.
              </li>
              <li>
                Ejecuta el script <code>supabase-schema.sql</code> del repositorio (crea las 9 tablas + RLS).
              </li>
              <li>
                Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env</code>.
              </li>
              <li>Pulsa <strong>Probar conexión</strong> y <strong>Verificar tablas</strong>.</li>
            </ol>

            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testing ? 'Probando...' : 'Probar conexión'}
                </button>
                <button
                  onClick={handleInitRemote}
                  disabled={initializing}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {initializing ? 'Verificando...' : 'Verificar tablas'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {testResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldCheck className="w-4 h-4 text-red-600" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { name: '1. jugadores', cols: 'id | nombre | dorsal | posicion | categoria | equipo | fechaAlta' },
                { name: '2. equipos', cols: 'id | nombre | categoria | letra | entrenadores | escudo | temporada' },
                { name: '3. categorias', cols: 'id | nombre | tipo | tiempojuego' },
                { name: '4. entrenadores', cols: 'id | nombre | telefono' },
                { name: '5. partidos', cols: 'id | local | visitante | fecha | goles | eventos | finalizado | convocados | titulares | formacion' },
                { name: '6. asistencias', cols: 'id | jugadorId | fecha | estado' },
                { name: '7. sesiones', cols: 'id | equipo | fecha | hora | objetivo | ...' },
                { name: '8. estadisticas', cols: 'id | jugadorId | goles | asistencias | partidosJugados | titular' },
                { name: '9. usuarios', cols: 'id | nombre | email | rol | equipo | password' },
                { name: '10. match_clocks', cols: 'id (partidoId) | clock (jsonb) | updated_at' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="font-bold text-gray-900 text-sm text-orange-600 mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    {item.name}
                  </div>
                  <p className="font-mono text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-100">
                    {item.cols}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </Modal>
  );
};
