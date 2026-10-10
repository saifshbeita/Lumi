import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'listening' | 'thinking';
const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/student${path}`;
async function friendlyError(response: Response, fallback: string) {
  try { const body = await response.json(); return typeof body.error === 'string' ? body.error : fallback; } catch { return fallback; }
}
function silence() {
  const data = new Uint8Array(44 + 3200);
  const view = new DataView(data.buffer);
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, data.length - 8, true); text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, 3200, true);
  return URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
}

export function useDyslexiaVoice(enabled: boolean, onTranscript: (text: string) => void, focusFallback: () => void) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [audioState, setAudioState] = useState<{ id: number; state: 'loading' | 'playing' | 'error' } | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const element = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const urls = useRef<string[]>([]);
  const mounted = useRef(true);
  const operation = useRef(0);
  const recordingOperation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const transcriptionController = useRef<AbortController | null>(null);
  const lastBlob = useRef<Blob | null>(null);
  const stoppedAt = useRef<number | null>(null);
  const autoPlayed = useRef(new Set<number>());
  const callbacks = useRef({ onTranscript, focusFallback });
  callbacks.current = { onTranscript, focusFallback };

  const releaseMic = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
  };
  const stopPlayback = () => {
    operation.current++;
    controller.current?.abort();
    element.current?.pause();
    if (element.current) { element.current.onplaying = null; element.current.onended = null; }
    source.current?.stop(); source.current = null;
    if (mounted.current) setAudioState(null);
  };
  const unlock = () => {
    if (!enabled) return;
    if (!element.current) {
      element.current = new Audio();
      element.current.preload = 'auto';
      element.current.setAttribute('playsinline', '');
    }
    if (!context.current) {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Constructor) context.current = new Constructor();
    }
    void context.current?.resume().catch(() => {});
    // Use the very same element for the later reply. Both calls originate in the tap gesture.
    if (element.current.paused) {
      const url = silence(); urls.current.push(url);
      element.current.src = url;
      void element.current.play().catch(() => {});
    }
  };
  const notePlaying = () => {
    if (stoppedAt.current !== null) {
      const ms = Math.round(performance.now() - stoppedAt.current);
      setLatency(ms);
      console.info('Lumi voice stop-to-playback', { milliseconds: ms });
      stoppedAt.current = null;
    }
  };
  const play = async (id: number, automatic = false) => {
    if (!enabled) return;
    if (automatic && autoPlayed.current.has(id)) return;
    if (automatic) autoPlayed.current.add(id);
    if (!automatic && audioState?.id === id && audioState.state === 'playing') { stopPlayback(); return; }
    stopPlayback();
    if (!automatic) unlock();
    const token = operation.current;
    const abort = new AbortController(); controller.current = abort;
    setAudioState({ id, state: 'loading' });
    try {
      const response = await fetch(api(`/messages/${id}/audio`), { credentials: 'include', signal: abort.signal });
      if (!response.ok) throw new Error(await friendlyError(response, 'تعذر تشغيل الصوت. اضغط للاستماع مرة أخرى.'));
      const blob = await response.blob();
      if (!mounted.current || token !== operation.current) return;
      if (!element.current) element.current = new Audio();
      const audio = element.current;
      const url = URL.createObjectURL(blob); urls.current.push(url);
      audio.src = url;
      const started = () => { if (mounted.current && token === operation.current) { setAudioState({ id, state: 'playing' }); notePlaying(); } };
      const ended = () => { if (mounted.current && token === operation.current) setAudioState(null); };
      audio.onplaying = started; audio.onended = ended;
      audio.onerror = () => { if (mounted.current && token === operation.current) setAudioState({ id, state: 'error' }); };
      try { await audio.play(); }
      catch {
        // Safari can reapply element autoplay restrictions after getUserMedia.
        // The context resumed by the original tap provides a user-unlocked fallback.
        const ctx = context.current;
        if (!ctx || ctx.state !== 'running') throw new Error('اضغط الاستماع لتشغيل الرد.');
        const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
        if (!mounted.current || token !== operation.current) return;
        const node = ctx.createBufferSource(); source.current = node;
        node.buffer = decoded; node.connect(ctx.destination); node.onended = ended; node.start(); started();
      }
    } catch {
      if (mounted.current && token === operation.current) setAudioState({ id, state: 'error' });
    }
  };
  const transcribe = async (blob: Blob) => {
    setPhase('thinking'); setError(''); lastBlob.current = blob;
    const abort = new AbortController(); transcriptionController.current = abort;
    try {
      const form = new FormData();
      form.append('audio', blob, blob.type.startsWith('audio/mp4') ? 'question.mp4' : 'question.webm');
      const response = await fetch(api('/voice/transcribe'), { method: 'POST', credentials: 'include', body: form, signal: abort.signal });
      if (!response.ok) throw new Error(await friendlyError(response, 'تعذر سماع التسجيل. حاول مرة أخرى أو اكتب سؤالك.'));
      const body = await response.json();
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('لم أسمع سؤالك بوضوح. حاول مرة أخرى.');
      if (!mounted.current) return;
      lastBlob.current = null;
      setPhase('idle');
      callbacks.current.onTranscript(body.text);
    } catch (e) {
      if (!mounted.current || abort.signal.aborted) return;
      setPhase('idle'); setError(e instanceof Error ? e.message : 'حاول مرة أخرى أو اكتب سؤالك.');
      setTimeout(() => callbacks.current.focusFallback(), 0);
    }
  };
  const tap = async () => {
    if (!enabled || phase === 'thinking') return;
    if (phase === 'listening') {
      if (recorder.current?.state === 'recording') { stoppedAt.current = performance.now(); recorder.current.stop(); releaseMic(); }
      else { recordingOperation.current++; releaseMic(); setPhase('idle'); }
      return;
    }
    stopPlayback(); unlock(); setError(''); lastBlob.current = null;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('الميكروفون غير متاح في هذا المتصفح. يمكنك كتابة سؤالك هنا.');
      setTimeout(() => callbacks.current.focusFallback(), 0); return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) { setError('هذا المتصفح لا يدعم التسجيل. يمكنك كتابة سؤالك هنا.'); setTimeout(() => callbacks.current.focusFallback(), 0); return; }
    const token = ++recordingOperation.current;
    setPhase('listening');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!mounted.current || token !== recordingOperation.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const rec = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 64000 });
      recorder.current = rec;
      const chunks: Blob[] = []; let bytes = 0; let invalid = false;
      rec.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes > 5 * 1024 * 1024) { invalid = true; if (rec.state === 'recording') rec.stop(); }
      };
      rec.onerror = () => { invalid = true; releaseMic(); if (mounted.current) { setPhase('idle'); setError('توقف التسجيل. حاول مرة أخرى أو اكتب سؤالك.'); callbacks.current.focusFallback(); } };
      rec.onstop = () => {
        releaseMic(); recorder.current = null;
        if (!mounted.current || token !== recordingOperation.current) return;
        if (invalid || !bytes) { setPhase('idle'); setError('التسجيل غير صالح أو كبير. حاول بسؤال أقصر.'); return; }
        stoppedAt.current ??= performance.now();
        void transcribe(new Blob(chunks, { type: mime.split(';')[0] }));
      };
      rec.start(250);
      // Leave a small encoder margin while guaranteeing a recording below 30 seconds.
      timer.current = setTimeout(() => { if (rec.state === 'recording') { stoppedAt.current = performance.now(); rec.stop(); releaseMic(); } }, 29500);
    } catch {
      releaseMic();
      if (mounted.current && token === recordingOperation.current) {
        setPhase('idle'); setError('لم نتمكن من فتح الميكروفون. اسمح باستخدامه أو اكتب سؤالك هنا.');
        setTimeout(() => callbacks.current.focusFallback(), 0);
      }
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; recordingOperation.current++; operation.current++;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      releaseMic(); transcriptionController.current?.abort(); controller.current?.abort();
      element.current?.pause(); source.current?.stop();
      void context.current?.close().catch(() => {});
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  return { phase, error, audioState, latency, tap, play, unlock, stopPlayback,
    retryTranscription: () => lastBlob.current ? void transcribe(lastBlob.current) : void tap(),
    clearError: () => setError('') };
}
