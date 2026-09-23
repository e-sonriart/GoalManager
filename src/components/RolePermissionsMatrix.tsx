import React, { useState } from 'react';
import {
  Permission,
  VIEW_PERMISSIONS,
  MANAGE_PERMISSIONS,
  PERMISSION_LABELS,
  canRole
} from '../utils/permissions';
import { ROLE_ORDER, SCOPE_LABELS, getRoleInfo } from '../utils/roles';
import { Check, Minus, ShieldCheck, Eye, ChevronDown } from 'lucide-react';

interface RolePermissionsMatrixProps {
  currentRole?: string;
  canManageUsers: boolean;
}

export const RolePermissionsMatrix: React.FC<RolePermissionsMatrixProps> = ({ currentRole, canManageUsers }) => {
  const [open, setOpen] = useState(false);
  const [onlyGestion, setOnlyGestion] = useState(false);

  const permissions: Permission[] = onlyGestion
    ? MANAGE_PERMISSIONS
    : [...VIEW_PERMISSIONS, ...MANAGE_PERMISSIONS];

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 font-athletic tracking-wide uppercase">
              Matriz de permisos por rol
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulta qué puede ver y gestionar cada perfil del club. Configuración fija del sistema.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyGestion(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  !onlyGestion
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setOnlyGestion(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  onlyGestion
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Solo gestión
              </button>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Permitido
              </span>
              <span className="flex items-center gap-1">
                <Minus className="w-3.5 h-3.5 text-gray-300" /> Denegado
              </span>
            </div>
          </div>

          <div className="overflow-x-auto scroll-x rounded-2xl border border-gray-150">
            <table className="w-full text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="py-3 px-4 text-left font-athletic uppercase tracking-wider text-[11px] sticky left-0 bg-gray-900 z-10 min-w-[210px]">
                    Permiso
                  </th>
                  {ROLE_ORDER.map(rol => {
                    const info = getRoleInfo(rol);
                    const isCurrent = currentRole === rol;
                    return (
                      <th
                        key={rol}
                        className={`py-2.5 px-2 text-center font-bold text-[10px] uppercase tracking-wide ${
                          isCurrent ? 'bg-orange-600 text-white' : ''
                        }`}
                        title={info.description}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${info.dotClass}`} />
                          <span>{info.shortLabel}</span>
                          {isCurrent && <span className="text-[9px] font-normal opacity-90">(tú)</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {permissions.map(perm => {
                  const isView = perm.startsWith('view:');
                  return (
                    <tr key={perm} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          {isView ? (
                            <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          )}
                          <span className="font-semibold text-gray-700">{PERMISSION_LABELS[perm]}</span>
                        </div>
                      </td>
                      {ROLE_ORDER.map(rol => {
                        const allowed = canRole(rol, perm);
                        const isCurrent = currentRole === rol;
                        return (
                          <td
                            key={rol}
                            className={`py-2.5 px-2 text-center ${isCurrent ? 'bg-orange-50/60' : ''}`}
                          >
                            {allowed ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-200 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!canManageUsers && (
            <p className="text-[11px] text-gray-400">
              Solo el administrador puede modificar usuarios y roles.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
