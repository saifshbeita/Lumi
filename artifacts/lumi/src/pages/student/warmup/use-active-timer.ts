import { useCallback, useEffect, useRef } from 'react';

/**
 * Accumulates only visible, focused, enabled interaction time for one item.
 * Excludes audio, network, memory preview, breaks and idle stretches (>45s without input).
 */
const IDLE_MS = 45000;
export function useActiveTimer(key: string | undefined, enabled: boolean) {
  const total = useRef(0);
  const since = useRef<number | null>(null);
  const lastInput = useRef(performance.now());
  const on = useRef(enabled);
  on.current = enabled;

  const flush = useCallback(() => {
    if (since.current !== null) {
      const now = performance.now();
      const end = Math.min(now, lastInput.current + IDLE_MS);
      total.current += Math.max(0, end - since.current);
      since.current = null;
    }
  }, []);
  const sync = useCallback(() => {
    const active = on.current && !document.hidden && document.hasFocus();
    if (active && since.current === null) { since.current = performance.now(); lastInput.current = since.current; }
    if (!active) flush();
  }, [flush]);

  useEffect(() => { flush(); total.current = 0; since.current = null; }, [key, flush]);
  useEffect(() => { sync(); }, [enabled, key, sync]);
  useEffect(() => {
    const input = () => {
      const now = performance.now();
      if (since.current !== null && now - lastInput.current > IDLE_MS) { flush(); since.current = now; }
      lastInput.current = now;
    };
    const ev = ['pointerdown', 'keydown', 'pointermove'] as const;
    ev.forEach(e => window.addEventListener(e, input, { passive: true }));
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync); window.addEventListener('blur', sync);
    return () => {
      ev.forEach(e => window.removeEventListener(e, input));
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync); window.removeEventListener('blur', sync);
    };
  }, [sync, flush]);

  return useCallback(() => { flush(); sync(); return Math.min(600000, Math.round(total.current)); }, [flush, sync]);
}
