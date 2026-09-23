/**
 * Utilidades de validación reutilizables en formularios.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const clean = phone.trim();
  if (!clean) return true; // el teléfono es opcional
  return /^\+?[\d\s()./-]{6,20}$/.test(clean);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isNonEmpty(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** Comprueba si un email ya existe en una lista, ignorando un id concreto (para edición). */
export function isEmailTaken<T extends { id?: string; email?: string }>(
  email: string,
  items: T[],
  ignoreId?: string
): boolean {
  const target = normalizeEmail(email);
  return items.some(item => {
    if (!item.email) return false;
    if (ignoreId && item.id === ignoreId) return false;
    return normalizeEmail(item.email) === target;
  });
}

/** Comprueba si un nombre ya existe en una lista (case-insensitive), ignorando un id concreto. */
export function isNameTaken<T extends { id?: string; nombre?: string }>(
  nombre: string,
  items: T[],
  ignoreId?: string
): boolean {
  const target = nombre.trim().toLowerCase();
  if (!target) return false;
  return items.some(item => {
    if (!item.nombre) return false;
    if (ignoreId && item.id === ignoreId) return false;
    return item.nombre.trim().toLowerCase() === target;
  });
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateUserForm(params: {
  nombre: string;
  email: string;
  password?: string;
  users: { id?: string; email?: string }[];
  editingId?: string;
}): ValidationResult {
  if (!isNonEmpty(params.nombre)) {
    return { valid: false, message: 'El nombre es obligatorio.' };
  }
  if (!isNonEmpty(params.email)) {
    return { valid: false, message: 'El correo electrónico es obligatorio.' };
  }
  if (!isValidEmail(params.email)) {
    return { valid: false, message: 'El correo electrónico no tiene un formato válido.' };
  }
  if (isEmailTaken(params.email, params.users, params.editingId)) {
    return { valid: false, message: 'Ya existe un usuario con este correo electrónico.' };
  }
  if (params.password && !isValidPassword(params.password)) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  return { valid: true };
}
