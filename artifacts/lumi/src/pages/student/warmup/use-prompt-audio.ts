import { useCallback, useEffect, useRef, useState } from 'react';
import { getWarmupAudio, type Mode, type WarmupItem } from '@workspace/api-client-react';

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'blocked' | 'error';

function arabicVoice(): SpeechSynthesisVoice | undefined {
  const v = window.speechSynthesis?.getVoices() ?? [];
  return v.find(x => x.lang === 'ar-JO') ?? v.find(x => x.lang === 'ar-SA') ?? v.find(x => x.lang.toLowerCase().startsWith('ar'));
}

/**
 * Plays the precomputed Arabic prompt audio for one item (server TTS first, browser ar voice fallback).
 * onStart fires only when sound actually begins, never for fetch/prefetch.
 */
export function usePromptAudio(mode: Mode, attemptId: number | undefined, item: WarmupItem | null | undefined, cb: { onStart: (manual: boolean) => void; onEnd: () => void }) {
  const [status, setStatus] = useState<AudioStatus>('idle');
  const el = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const token = useRef(0);
  /** One onStart per play() call, even if the server audio fails mid-way and the browser voice takes over. */
  const startedFor = useRef(-1);
  const started = (tk: number, manual: boolean) => { if (startedFor.current === tk) return; startedFor.current = tk; cbs.current.onStart(manual); };
  const cbs = useRef(cb);
  cbs.current = cb;
  const itemId = item?.id;
  // Server-approved audio text only; never rebuilt from shown/passage.
  const text = item?.tts_ar || '';

  const release = useCallback(() => {
    token.current++;
    if (el.current) { el.current.onplaying = null; el.current.onended = null; el.current.onerror = null; el.current.pause(); el.current.removeAttribute('src'); }
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    window.speechSynthesis?.cancel();
  }, []);

  const stop = useCallback(() => { release(); setStatus('idle'); }, [release]);

  const speakFallback = useCallback((tk: number, manual: boolean) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) { setStatus('error'); cbs.current.onEnd(); return; }
    const u = new SpeechSynthesisUtterance(text);
    const voice = arabicVoice();
    u.lang = voice?.lang ?? 'ar-SA';
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.onstart = () => { if (tk !== token.current) return; setStatus('playing'); started(tk, manual); };
    u.onend = () => { if (tk !== token.current) return; setStatus('idle'); cbs.current.onEnd(); };
    u.onerror = e => {
      if (tk !== token.current) return;
      if (e.error === 'not-allowed') setStatus('blocked');
      else if (e.error !== 'interrupted' && e.error !== 'canceled') { setStatus('error'); cbs.current.onEnd(); }
    };
    synth.cancel();
    synth.speak(u);
  }, [text]);

  const play = useCallback(async (manual: boolean) => {
    if (!attemptId || !itemId) return;
    release();
    const tk = token.current;
    startedFor.current = -1;
    setStatus('loading');
    let blob: Blob | null = null;
    // Blob is fetched BEFORE any audio event is logged; the server refuses over-limit replays here.
    try { blob = await getWarmupAudio(mode, attemptId, itemId); }
    catch (e) {
      if (tk !== token.current) return;
      // Refusals (limit reached, not allowed) must never be bypassed by the browser voice.
      const code = (e as { status?: unknown } | null)?.status; if (typeof code === 'number' && code >= 400 && code < 500) { setStatus('error'); cbs.current.onEnd(); return; }
      blob = null;
    }
    if (tk !== token.current) return;
    if (!blob || !(blob instanceof Blob) || blob.size === 0) { speakFallback(tk, manual); return; }
    if (!el.current) { el.current = new Audio(); el.current.setAttribute('playsinline', ''); }
    const a = el.current;
    url.current = URL.createObjectURL(blob);
    a.onplaying = () => { if (tk !== token.current) return; setStatus('playing'); started(tk, manual); a.onplaying = null; };
    a.onended = () => { if (tk !== token.current) return; setStatus('idle'); cbs.current.onEnd(); };
    // A mid-playback failure after a real start does not restart speech (no extra unlogged replay).
    a.onerror = () => { if (tk !== token.current) return; if (startedFor.current === tk) { setStatus('idle'); cbs.current.onEnd(); return; } speakFallback(tk, manual); };
    a.src = url.current;
    try { await a.play(); }
    catch (e) {
      if (tk !== token.current) return;
      if (e instanceof DOMException && e.name === 'NotAllowedError') setStatus('blocked');
      else if (!(e instanceof DOMException && e.name === 'AbortError')) speakFallback(tk, manual);
    }
  }, [attemptId, itemId, mode, release, speakFallback]);

  // Interrupted (tab hidden) playback falls back to an explicit button.
  useEffect(() => {
    const onHide = () => { if (document.hidden && (status === 'playing' || status === 'loading')) { release(); setStatus('blocked'); } };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [status, release]);

  useEffect(() => () => { release(); }, [itemId, release]);
  useEffect(() => { setStatus('idle'); }, [itemId]);

  return { status, play, stop };
}
