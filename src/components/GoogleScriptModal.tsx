import React, { useState } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { Copy, Check, ExternalLink, ShieldCheck, Database, FileSpreadsheet, Server, HelpCircle } from 'lucide-react';

interface GoogleScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleScriptModal: React.FC<GoogleScriptModalProps> = ({ isOpen, onClose }) => {
  const { gasUrl, updateGasUrl, testGoogleConnection, initRemoteSheets, addToast } = useClub();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tempUrl, setTempUrl] = useState(gasUrl);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'code' | 'schema'>('instructions');

  const appsScriptCode = `/**
 * API DE GOOGLE APPS SCRIPT PARA GESTIÓN DE CLUB DE FÚTBOL
 * Compatible con CORS mediante doGet y doPost
 */
var HOJAS_CONFIG = {
  jugadores: ['id', 'nombre', 'dorsal', 'posición', 'categoría', 'equipo', 'fechaAlta'],
  equipos: ['id', 'nombre', 'categoria', 'letra', 'entrenadores', 'escudo', 'temporada'],
  categorias: ['id', 'nombre', 'tipo', 'tiempojuego'],
  entrenadores: ['id', 'nombre', 'telefono'],
  partidos: ['id', 'local', 'visitante', 'fecha', 'categoria', 'equipo', 'hora', 'horaConvocatoria', 'campo', 'tipo', 'jornada', 'golesLocal', 'golesVisitante', 'eventos', 'finalizado', 'convocados'],
  asistencias: ['id', 'jugadorId', 'fecha', 'estado'],
  estadisticas: ['id', 'jugadorId', 'temporada', 'goles', 'asistencias', 'tarjetas', 'partidosJugados', 'titular', 'tarjetasAmarillas', 'tarjetasRojas'],
  usuarios: ['id', 'nombre', 'email', 'rol', 'equipo']
};

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'getAll';
    var sheetName = params.sheet;

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'API Conectada' });
    }
    if (action === 'initDatabase') {
      inicializarBaseDeDatos();
      return jsonResponse({ success: true, message: 'Base de datos creada' });
    }
    if (!sheetName) return jsonResponse({ success: false, error: 'Parámetro sheet requerido' });
    
    var records = getSheetRecords(sheetName);
    return jsonResponse({ success: true, sheet: sheetName, data: records });
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch(err) { payload = e.parameter || {}; }
    } else { payload = e.parameter || {}; }

    var action = payload.action || 'create';
    var sheetName = payload.sheet;
    var data = payload.data || payload;

    if (action === 'initDatabase') {
      inicializarBaseDeDatos();
      return jsonResponse({ success: true, message: 'Base de datos inicializada' });
    }

    if (action === 'create') {
      var created = createRecord(sheetName, data);
      return jsonResponse({ success: true, data: created });
    }
    if (action === 'update') {
      var updated = updateRecord(sheetName, data.id || payload.id, data);
      return jsonResponse({ success: true, data: updated });
    }
    if (action === 'delete') {
      deleteRecord(sheetName, payload.id || (data && data.id));
      return jsonResponse({ success: true, message: 'Eliminado' });
    }

    return jsonResponse({ success: false, error: 'Acción no reconocida' });
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = HOJAS_CONFIG[sheetName] || ['id', 'nombre'];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetRecords(sheetName) {
  var sheet = getOrCreateSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace('posición','posicion').replace('categoría','categoria'); });
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      item[headers[j]] = val;
    }
    records.push(item);
  }
  return records;
}

function createRecord(sheetName, data) {
  var sheet = getOrCreateSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h){ return String(h).trim().toLowerCase().replace('posición','posicion').replace('categoría','categoria'); });
  if (!data.id) data.id = 'id_' + Utilities.getUuid().substring(0, 8);
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(data[headers[i]] !== undefined ? data[headers[i]] : '');
  }
  sheet.appendRow(row);
  return data;
}

function updateRecord(sheetName, id, data) {
  var sheet = getOrCreateSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h){ return String(h).trim().toLowerCase().replace('posición','posicion').replace('categoría','categoria'); });
  var idIdx = headers.indexOf('id');
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(id)) {
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        row.push(data[key] !== undefined ? data[key] : values[r][j]);
      }
      sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
      return data;
    }
  }
  throw new Error('ID no encontrado: ' + id);
}

function deleteRecord(sheetName, id) {
  var sheet = getOrCreateSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h){ return String(h).trim().toLowerCase().replace('posición','posicion').replace('categoría','categoria'); });
  var idIdx = headers.indexOf('id');
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    addToast({ type: 'success', title: 'Código copiado', message: 'Script copiado al portapapeles.' });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveAndTest = async () => {
    updateGasUrl(tempUrl);
    if (!tempUrl.trim()) {
      setTestResult({ success: true, message: 'Modo local sin conexión activado.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testGoogleConnection(tempUrl);
    setTestResult(result);
    setTesting(false);
  };

  const handleInitRemote = async () => {
    setInitializing(true);
    const res = await initRemoteSheets();
    setInitializing(false);
    addToast({
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Hojas creadas' : 'Error',
      message: res.message
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conexión con Google Sheets & Apps Script"
      subtitle="Base de datos en la nube sin Firebase mediante Google Apps Script"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Tabs */}
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
            Paso a Paso
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'code'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Server className="w-4 h-4" />
            Código Apps Script (Code.gs)
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Estructura de las 10 Hojas
          </button>
        </div>

        {/* Tab 1: Paso a Paso */}
        {activeTab === 'instructions' && (
          <div className="space-y-4">
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-800 leading-relaxed">
                <strong>¿Cómo funciona?</strong> La aplicación interactúa directamente con tu hoja de Google Sheets usando Google Apps Script como API RESTful.
                Si no configuras la URL, la aplicación funciona perfectamente en <strong>Modo Local (Offline)</strong> con datos precargados.
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
              <li>
                Abre{' '}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline font-medium inline-flex items-center gap-1"
                >
                  sheets.new <ExternalLink className="w-3.5 h-3.5" />
                </a>{' '}
                para crear una hoja de cálculo nueva en tu Google Drive.
              </li>
              <li>
                En el menú superior de Google Sheets, ve a <strong>Extensiones &gt; Apps Script</strong>.
              </li>
              <li>
                Borra el código de <code>Código.gs</code> y pega el código de la pestaña <strong>"Código Apps Script"</strong>.
              </li>
              <li>
                Haz clic en el botón azul <strong>Implementar &gt; Nueva implementación</strong>.
              </li>
              <li>
                Selecciona el tipo <strong>Aplicación web</strong>:
                <ul className="list-disc list-inside ml-6 mt-1 text-xs text-gray-600 space-y-1">
                  <li><strong>Ejecutar como:</strong> Yo (tu cuenta)</li>
                  <li><strong>Quién tiene acceso:</strong> <span className="text-orange-600 font-bold">Cualquier usuario (Anyone)</span> (¡obligatorio para permitir las peticiones del navegador!)</li>
                </ul>
              </li>
              <li>Copia la <strong>URL de la aplicación web</strong> (termina en <code>/exec</code>) y pégala abajo.</li>
            </ol>

            {/* Formulario de URL */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                URL de la Aplicación Web de Google Apps Script:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={tempUrl}
                  onChange={e => setTempUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                />
                <button
                  onClick={handleSaveAndTest}
                  disabled={testing}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {testing ? 'Probando...' : 'Guardar y Probar'}
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

              {gasUrl && (
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs text-gray-600">
                  <span>Acción remota:</span>
                  <button
                    onClick={handleInitRemote}
                    disabled={initializing}
                    className="text-orange-600 hover:text-orange-700 font-semibold underline disabled:opacity-50"
                  >
                    {initializing ? 'Creando hojas...' : 'Crear hojas y datos iniciales en Google Sheets'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Código Apps Script */}
        {activeTab === 'code' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Pega este script en tu proyecto de Google Apps Script:
              </span>
              <button
                onClick={handleCopyCode}
                className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar Código Completo'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed select-all">
              {appsScriptCode}
            </pre>
          </div>
        )}

        {/* Tab 3: Estructura de las Hojas */}
        {activeTab === 'schema' && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { name: '1. jugadores', cols: 'id | nombre | dorsal | posición | categoría | equipo | fechaAlta' },
                { name: '2. equipos', cols: 'id | nombre (=categoria+letra) | categoria | letra | entrenadores | escudo (por defecto del club) | temporada' },
                { name: '3. categorias', cols: 'id | nombre | tipo (F8 o F11) | tiempojuego' },
                { name: '4. entrenadores', cols: 'id | nombre | telefono' },
                { name: '5. partidos', cols: 'id | local | visitante | fecha | categoria | equipo | hora | horaConvocatoria | campo | tipo | jornada | golesLocal | golesVisitante | eventos | finalizado | convocados' },
                { name: '6. asistencias', cols: 'id | jugadorId | fecha | estado (asiste/no asiste)' },
                { name: '7. estadisticas', cols: 'id | jugadorId | temporada | goles | asistencias | tarjetas | partidosJugados | titular | tarjetasAmarillas | tarjetasRojas' },
                { name: '8. usuarios', cols: 'id | nombre | email | rol | equipo' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="font-bold text-gray-900 font-athletic text-sm text-orange-600 mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    {item.name}
                  </div>
                  <p className="font-mono text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-150">
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
