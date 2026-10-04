const KEY = 'cf_notificar_partido';

/** Preferencia guardada: ¿avisar al equipo cuando se graba un partido? (por defecto sí) */
export const leerPrefNotificarPartido = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};

/** Recuerda la última elección para no repetirla en cada alta del calendario. */
export const guardarPrefNotificarPartido = (valor: boolean): void => {
  try {
    localStorage.setItem(KEY, valor ? '1' : '0');
  } catch {
    // sin localStorage la preferencia solo dura esta sesión
  }
};
