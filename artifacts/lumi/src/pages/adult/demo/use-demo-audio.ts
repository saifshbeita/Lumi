import { useCallback, useEffect, useRef, useState } from 'react';
import { speakDemoReply } from '@workspace/api-client-react';
import type { SpeakerState } from '@/pages/student/mode-parts';
import type { Lang } from '@/i18n';

function silentWav() {
  const data = new Uint8Array(44 + 3200); const v = new DataView(data.buffer);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, data.length - 8, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, 3200, true);
  return URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
}

/** Temporary TTS for the demo dyslexia column. Audio lives only in a client object URL; nothing is persisted or cached. */
export function useDemoAudio() {
  const [state, setState] = useState<SpeakerState>(null);
  const el = useRef<HTMLAudioElement | null>(null);
  const buffered = useRef<{ text: string; url: string; language: Lang } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const op = useRef(0);
  const mounted = useRef(true);

  const release = () => { if (buffered.current) { URL.revokeObjectURL(buffered.current.url); buffered.current = null; } };
  const ensure = () => { if (!el.current) { el.current = new Audio(); el.current.preload = 'auto'; el.current.setAttribute('playsinline', ''); } return el.current; };

  /** Call inside a user gesture (submit, preset, mic) so autoplay is allowed later. */
  const unlock = useCallback(() => {
    const a = ensure();
    if (a.paused) { const u = silentWav(); a.src = u; void a.play().catch(() => {}).finally(() => setTimeout(() => URL.revokeObjectURL(u), 1000)); }
  }, []);

  const stop = useCallback(() => {
    op.current++; controller.current?.abort();
    const a = el.current; if (a) { a.onplaying = null; a.onended = null; a.onerror = null; a.pause(); }
    if (mounted.current) setState(null);
  }, []);

  /** New request: stop and drop any buffered audio. */
  const reset = useCallback(() => { stop(); release(); }, [stop]);

  const playUrl = async (url: string, my: number) => {
    const a = ensure();
    a.src = url; a.currentTime = 0;
    a.onplaying = () => { if (mounted.current && my === op.current) setState('playing'); };
    a.onended = () => { if (mounted.current && my === op.current) setState(null); };
    a.onerror = () => { if (mounted.current && my === op.current) setState('error'); };
    await a.play();
  };

  const speak = useCallback(async (text: string, language: Lang) => {
    stop();
    const my = op.current;
    try {
      if (buffered.current?.text === text && buffered.current.language === language) { setState('loading'); await playUrl(buffered.current.url, my); return; }
      release();
      const abort = new AbortController(); controller.current = abort;
      setState('loading');
      const body = { text: text.slice(0, 800), language };
      const blob = await speakDemoReply(body, { signal: abort.signal, responseType: 'blob', cache: 'no-store' });
      if (!mounted.current || my !== op.current) return;
      const url = URL.createObjectURL(blob);
      buffered.current = { text, url, language };
      await playUrl(url, my);
    } catch {
      if (mounted.current && my === op.current) setState('error');
    }
  }, [stop]);

  /** Speaker button: toggle stop while playing, otherwise replay from buffer or regenerate. */
  const toggle = useCallback((text: string, language: Lang) => {
    if (state === 'playing') { stop(); return; }
    unlock();
    void speak(text, language);
  }, [state, stop, speak, unlock]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; op.current++; controller.current?.abort(); el.current?.pause(); if (el.current) el.current.src = ''; if (buffered.current) URL.revokeObjectURL(buffered.current.url); buffered.current = null; };
  }, []);
  return { state, unlock, speak, toggle, stop, reset };
}
