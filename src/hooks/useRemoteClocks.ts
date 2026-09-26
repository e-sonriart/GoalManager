import { useEffect, useState } from 'react';
import { listClocksRemote } from '../services/matchClocks';
import type { MatchClock } from '../utils/matchClock';

/**
 * Carga (una sola vez) los relojes de partidos desde Supabase para poder
 * mostrar las acciones destacadas y el desglose de estadísticas en cualquier dispositivo.
 */
export function useRemoteClocks(enabled = true): Map<string, MatchClock> {
  const [clocks, setClocks] = useState<Map<string, MatchClock>>(() => new Map());

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void listClocksRemote().then(map => {
      if (alive) setClocks(map);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return clocks;
}
