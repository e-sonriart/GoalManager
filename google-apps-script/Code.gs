/**
 * ==============================================================================
 * API DE GOOGLE APPS SCRIPT PARA GESTIÓN DE CLUB DE FÚTBOL
 * ==============================================================================
 * Desarrollado para conectar la aplicación web React + TypeScript con Google Sheets.
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ej: "Base de Datos Club de Fútbol").
 * 2. Ve a Extensiones -> Apps Script.
 * 3. Borra el código existente y pega TODO el contenido de este archivo (Code.gs).
 * 4. Guarda el proyecto (icono de disco).
 * 5. Ejecuta la función 'inicializarBaseDeDatos' una vez desde el editor para crear
 *    automáticamente las 10 hojas con sus encabezados y datos de prueba.
 * 6. Haz clic en "Implementar" (Deploy) -> "Nueva implementación" (New deployment).
 * 7. Tipo: "Aplicación web" (Web app).
 * 8. Configuración:
 *    - Descripción: "API Club de Fútbol"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone) -> ¡MUY IMPORTANTE para permitir llamadas CORS!
 * 9. Haz clic en "Implementar", autoriza los permisos y copia la URL proporcionada
 *    (terminada en /exec).
 * 10. Pega esa URL en el Panel de Administración de la aplicación web.
 * ==============================================================================
 */

// Definición de las hojas requeridas y sus columnas exactas y organizadas (sin apuestas ni convocatorias independientes)
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

/**
 * Manejador para solicitudes HTTP GET
 */
function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'getAll';
    var sheetName = params.sheet;
    var id = params.id;

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'API Club de Fútbol funcionando correctamente', timestamp: new Date().toISOString() });
    }

    if (action === 'initDatabase') {
      inicializarBaseDeDatos();
      return jsonResponse({ success: true, message: 'Base de datos inicializada con éxito' });
    }

    if (action === 'exportAll') {
      var allData = {};
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var sName = sheets[i].getName();
        allData[sName] = getSheetRecords(sName);
      }
      return jsonResponse({ success: true, data: allData });
    }

    if (!sheetName) {
      return jsonResponse({ success: false, error: 'Parámetro "sheet" requerido' }, 400);
    }

    if (action === 'getAll') {
      var records = getSheetRecords(sheetName);
      return jsonResponse({ success: true, sheet: sheetName, data: records });
    }

    if (action === 'getById') {
      if (!id) return jsonResponse({ success: false, error: 'Parámetro "id" requerido' }, 400);
      var record = getRecordById(sheetName, id);
      if (!record) return jsonResponse({ success: false, error: 'Registro no encontrado' }, 404);
      return jsonResponse({ success: true, sheet: sheetName, data: record });
    }

    return jsonResponse({ success: false, error: 'Acción GET desconocida: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Manejador para solicitudes HTTP POST (creación, edición y eliminación)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || (e && e.parameter && e.parameter.action) || 'create';
    var sheetName = payload.sheet || (e && e.parameter && e.parameter.sheet);
    var data = payload.data || payload;

    if (!sheetName && action !== 'initDatabase') {
      return jsonResponse({ success: false, error: 'Parámetro "sheet" requerido' }, 400);
    }

    if (action === 'initDatabase') {
      inicializarBaseDeDatos();
      return jsonResponse({ success: true, message: 'Base de datos inicializada con éxito' });
    }

    if (action === 'create' || action === 'insert') {
      var created = createRecord(sheetName, data);
      return jsonResponse({ success: true, sheet: sheetName, data: created, message: 'Registro creado con éxito' });
    }

    if (action === 'update' || action === 'put') {
      var id = data.id || payload.id;
      if (!id) return jsonResponse({ success: false, error: 'El campo "id" es requerido para actualizar' }, 400);
      var updated = updateRecord(sheetName, id, data);
      return jsonResponse({ success: true, sheet: sheetName, data: updated, message: 'Registro actualizado con éxito' });
    }

    if (action === 'delete') {
      var deleteId = payload.id || (data && data.id) || (e && e.parameter && e.parameter.id);
      if (!deleteId) return jsonResponse({ success: false, error: 'El campo "id" es requerido para eliminar' }, 400);
      var deleted = deleteRecord(sheetName, deleteId);
      return jsonResponse({ success: true, sheet: sheetName, id: deleteId, message: 'Registro eliminado con éxito' });
    }

    return jsonResponse({ success: false, error: 'Acción POST no reconocida: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retorna una respuesta JSON compatible con CORS
 */
function jsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Obtiene o crea la hoja solicitada garantizando los encabezados
 */
function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = HOJAS_CONFIG[sheetName] || ['id', 'nombre'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F97316').setFontColor('#FFFFFF');
  }
  return sheet;
}

/**
 * Normaliza nombres de encabezados
 */
function normalizeHeader(h) {
  if (!h) return '';
  return String(h).trim().toLowerCase()
    .replace('posición', 'posicion')
    .replace('categoría', 'categoria')
    .replace('tiempo de juego', 'tiempojuego')
    .replace('tiempo_juego', 'tiempojuego');
}

/**
 * Lee todos los registros de una hoja como un arreglo de objetos
 */
function getSheetRecords(sheetName) {
  var sheet = getOrCreateSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  var rawHeaders = data[0];
  var headers = rawHeaders.map(function(h) { return normalizeHeader(h); });
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Ignora filas vacías
    if (!row[0] && !row[1]) continue;
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      item[key] = val;
    }
    records.push(item);
  }
  return records;
}

/**
 * Obtiene un registro específico por su id
 */
function getRecordById(sheetName, id) {
  var records = getSheetRecords(sheetName);
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].id) === String(id)) {
      return records[i];
    }
  }
  return null;
}

/**
 * Inserta un nuevo registro en la hoja
 */
function createRecord(sheetName, data) {
  var sheet = getOrCreateSheet(sheetName);
  var rawHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headers = rawHeaders.map(function(h) { return normalizeHeader(h); });

  // Generar ID si no viene proporcionado
  if (!data.id) {
    data.id = 'id_' + Utilities.getUuid().substring(0, 8);
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = data[key] !== undefined ? data[key] : (data[rawHeaders[i]] !== undefined ? data[rawHeaders[i]] : '');
    row.push(val);
  }

  sheet.appendRow(row);
  return data;
}

/**
 * Actualiza un registro existente por id
 */
function updateRecord(sheetName, id, data) {
  var sheet = getOrCreateSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error('No hay registros en la hoja ' + sheetName);

  var rawHeaders = values[0];
  var headers = rawHeaders.map(function(h) { return normalizeHeader(h); });

  var idColIdx = 0;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c] === 'id') {
      idColIdx = c;
      break;
    }
  }

  var targetRowIdx = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idColIdx]) === String(id)) {
      targetRowIdx = r + 1; // 1-indexed en Apps Script
      break;
    }
  }

  if (targetRowIdx === -1) {
    throw new Error('Registro con ID ' + id + ' no encontrado');
  }

  // Prepara los nuevos valores preservando valores anteriores si no se envían
  var currentRow = values[targetRowIdx - 1];
  var updatedRow = [];
  for (var j = 0; j < headers.length; j++) {
    var key = headers[j];
    var rawKey = rawHeaders[j];
    if (data[key] !== undefined) {
      updatedRow.push(data[key]);
    } else if (data[rawKey] !== undefined) {
      updatedRow.push(data[rawKey]);
    } else {
      updatedRow.push(currentRow[j]);
    }
  }

  sheet.getRange(targetRowIdx, 1, 1, updatedRow.length).setValues([updatedRow]);

  var result = {};
  for (var k = 0; k < headers.length; k++) {
    result[headers[k]] = updatedRow[k];
  }
  return result;
}

/**
 * Elimina un registro por id
 */
function deleteRecord(sheetName, id) {
  var sheet = getOrCreateSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return true;

  var idColIdx = 0;
  var headers = values[0].map(function(h) { return normalizeHeader(h); });
  for (var c = 0; c < headers.length; c++) {
    if (headers[c] === 'id') {
      idColIdx = c;
      break;
    }
  }

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idColIdx]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return true;
}

/**
 * Inicializa automáticamente todas las hojas con sus columnas y datos iniciales de prueba
 */
function inicializarBaseDeDatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Crear hojas con encabezados
  for (var key in HOJAS_CONFIG) {
    var sheet = ss.getSheetByName(key);
    if (!sheet) {
      sheet = ss.insertSheet(key);
    } else {
      sheet.clear();
    }
    var headers = HOJAS_CONFIG[key];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#111827')
      .setFontColor('#F97316');
  }

  // 2. Insertar Categorías iniciales
  var catSheet = ss.getSheetByName('categorias');
  catSheet.appendRow(['cat_1', 'Senior Masculino', 'F11', 45]);
  catSheet.appendRow(['cat_2', 'Juvenil A', 'F11', 45]);
  catSheet.appendRow(['cat_3', 'Cadete', 'F11', 40]);
  catSheet.appendRow(['cat_4', 'Fútbol Femenino', 'F11', 45]);
  catSheet.appendRow(['cat_5', 'Alevín A', 'F8', 30]);
  catSheet.appendRow(['cat_6', 'Benjamín', 'F8', 25]);

  // 3. Insertar Entrenadores iniciales
  var entSheet = ss.getSheetByName('entrenadores');
  entSheet.appendRow(['ent_1', 'Carlos Martínez', '+34 600 123 456']);
  entSheet.appendRow(['ent_2', 'Laura Gómez', '+34 600 654 321']);
  entSheet.appendRow(['ent_3', 'Pablo Fernández', '+34 600 999 888']);

  // 4. Insertar Equipos iniciales (nombre con fórmula =categoria+letra y escudo por defecto del club)
  var eqSheet = ss.getSheetByName('equipos');
  eqSheet.appendRow(['eq_1', '=C2&" "&D2', 'Senior', 'A', 'Carlos Martínez', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80', '2025/2026']);
  eqSheet.appendRow(['eq_2', '=C3&" "&D3', 'Juvenil', 'A', 'Laura Gómez', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80', '2025/2026']);
  eqSheet.appendRow(['eq_3', '=C4&" "&D4', 'Cadete', 'A', 'Pablo Fernández', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80', '2025/2026']);

  // 5. Insertar Jugadores iniciales
  var jugSheet = ss.getSheetByName('jugadores');
  jugSheet.appendRow(['jug_1', 'Mateo Silva', '9', 'Delantero', 'Senior', 'Senior A', '2024-01-15']);
  jugSheet.appendRow(['jug_2', 'Javier Ramos', '4', 'Defensa', 'Senior', 'Senior A', '2024-01-20']);
  jugSheet.appendRow(['jug_3', 'Hugo Navarro', '10', 'Centrocampista', 'Senior', 'Senior A', '2024-02-01']);
  jugSheet.appendRow(['jug_4', 'Diego Casillas', '1', 'Portero', 'Senior', 'Senior A', '2024-01-10']);
  jugSheet.appendRow(['jug_5', 'Sofía Romero', '7', 'Delantero', 'Cadete', 'Cadete A', '2024-02-15']);
  jugSheet.appendRow(['jug_6', 'Lucas Medina', '8', 'Centrocampista', 'Juvenil', 'Juvenil A', '2024-03-01']);

  // 6. Insertar Estadísticas iniciales
  var estSheet = ss.getSheetByName('estadisticas');
  estSheet.appendRow(['est_1', 'jug_1', '2025/2026', 14, 6, 2, 16, 15, 2, 0]);
  estSheet.appendRow(['est_2', 'jug_2', '2025/2026', 2, 1, 5, 17, 16, 5, 0]);
  estSheet.appendRow(['est_3', 'jug_3', '2025/2026', 8, 12, 1, 15, 14, 1, 0]);
  estSheet.appendRow(['est_4', 'jug_4', '2025/2026', 0, 0, 0, 17, 17, 0, 0]);
  estSheet.appendRow(['est_5', 'jug_5', '2025/2026', 11, 4, 1, 12, 10, 1, 0]);
  estSheet.appendRow(['est_6', 'jug_6', '2025/2026', 5, 7, 3, 14, 12, 3, 0]);

  // 7. Insertar Partidos iniciales (con convocados)
  var parSheet = ss.getSheetByName('partidos');
  parSheet.appendRow(['par_1', 'Senior A', 'Atlético Central', '2026-09-20', 'Senior', 'Senior A', '17:00', 'Campo Municipal', '1', '', '', false, 'jug_1,jug_2,jug_3,jug_4']);
  parSheet.appendRow(['par_2', 'Deportivo Unión', 'Senior A', '2026-09-27', 'Senior', 'Senior A', '12:00', 'Polideportivo', '2', '', '', false, '']);
  parSheet.appendRow(['par_3', 'Juvenil A', 'Rayo Valle', '2026-09-21', 'Juvenil', 'Juvenil A', '10:30', 'Campo 2', '1', '', '', false, '']);

  // 8. Insertar Usuarios iniciales
  var usuSheet = ss.getSheetByName('usuarios');
  usuSheet.appendRow(['usr_1', 'Administrador Club', 'admin@clubfutbol.com', 'admin', '']);
  usuSheet.appendRow(['usr_2', 'Carlos Martínez (Mister)', 'mister@clubfutbol.com', 'entrenador', 'Senior A']);
  usuSheet.appendRow(['usr_3', 'Dirección Deportiva', 'direccion@clubfutbol.com', 'directiva', '']);
  usuSheet.appendRow(['usr_4', 'Mateo Silva', 'mateo@clubfutbol.com', 'jugador', 'Senior A']);
  usuSheet.appendRow(['usr_5', 'Hugo Navarro', 'hugo@clubfutbol.com', 'jugador', 'Senior A']);

  // 9. Insertar Asistencias iniciales
  var asiSheet = ss.getSheetByName('asistencias');
  asiSheet.appendRow(['asi_1', 'jug_1', '2026-09-12', 'asiste']);
  asiSheet.appendRow(['asi_2', 'jug_2', '2026-09-12', 'asiste']);
  asiSheet.appendRow(['asi_3', 'jug_3', '2026-09-12', 'no asiste']);
  asiSheet.appendRow(['asi_4', 'jug_4', '2026-09-12', 'asiste']);

  // Eliminar Hoja1 predeterminada si existe
  var defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
}
