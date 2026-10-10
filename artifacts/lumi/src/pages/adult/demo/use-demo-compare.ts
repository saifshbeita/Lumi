import { useCallback, useEffect, useRef, useState } from 'react';
import { getCompareDemoModesUrl, type Mode } from '@workspace/api-client-react';
import i18n, { type Lang } from '@/i18n';

export type ColumnState = { status: 'idle' | 'loading' | 'success' | 'error'; content?: string; error?: string; ms?: number };
export type Columns = Record<Mode, ColumnState>;
const MODES_ORDER: Mode[] = ['dyslexia', 'learning', 'autism'];
const idle = (): Columns => ({ dyslexia: { status: 'idle' }, learning: { status: 'idle' }, autism: { status: 'idle' } });
const url = () => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${getCompareDemoModesUrl()}`;

export function useDemoCompare() {
  const [columns, setColumns] = useState<Columns>(idle);
  const [requestId, setRequestId] = useState(0);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const token = useRef(0);

  const run = useCallback(async (question: string, interests: string[], language: Lang) => {
    const tr = i18n.getFixedT(language);
    const q = question.trim();
    if (!q) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const my = ++token.current;
    setRequestId(my);
    setRunning(true);
    const start = performance.now();
    setColumns({ dyslexia: { status: 'loading' }, learning: { status: 'loading' }, autism: { status: 'loading' } });
    const live = () => token.current === my && !abort.signal.aborted;
    const settle = (m: Mode, s: ColumnState) => { if (live()) setColumns((c) => (c[m].status === 'loading' ? { ...c, [m]: s } : c)); };
    const failRest = (msg: string) => { if (live()) setColumns((c) => { const n = { ...c }; for (const m of MODES_ORDER) if (n[m].status === 'loading') n[m] = { status: 'error', error: msg, ms: Math.round(performance.now() - start) }; return n; }); };
    const handle = (line: string) => {
      const t = line.trim(); if (!t) return;
      try {
        const j = JSON.parse(t) as { mode?: unknown; status?: unknown; content?: unknown; error?: unknown };
        if (typeof j.mode !== 'string' || !MODES_ORDER.includes(j.mode as Mode)) return;
        const m = j.mode as Mode; const ms = Math.round(performance.now() - start);
        if (j.status === 'success' && typeof j.content === 'string' && j.content.trim()) settle(m, { status: 'success', content: j.content, ms });
        else settle(m, { status: 'error', error: tr('demo.modeFailed'), ms });
      } catch { /* ignore malformed line */ }
    };
    try {
      const res = await fetch(url(), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }, body: JSON.stringify(interests.length ? { question: q, interests, language } : { question: q, language }), signal: abort.signal });
      if (!res.ok || !res.body) {
        failRest(tr('demo.startFail')); return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (!live()) { void reader.cancel().catch(() => {}); return; }
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 1); }
      }
      buf += dec.decode(); handle(buf);
      failRest(tr('demo.noReply'));
    } catch {
      failRest(tr('demo.dropped'));
    } finally {
      if (token.current === my) setRunning(false);
    }
  }, []);

  const cancel = useCallback(() => { token.current++; controller.current?.abort(); setRunning(false); }, []);
  /** Abort any in-flight compare and clear all columns so late or old-language results cannot appear. */
  const reset = useCallback(() => { token.current++; controller.current?.abort(); setRunning(false); setColumns(idle()); setRequestId(0); }, []);
  useEffect(() => () => { token.current++; controller.current?.abort(); }, []);
  return { columns, requestId, running, run, cancel, reset };
}
