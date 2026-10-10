import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'listening' | 'thinking';
const transcribeUrl = () => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/student/voice/transcribe`;
const MAX_BYTES = 5 * 1024 * 1024;

/** Demo-only recording adapter. Records a question, transcribes it with the adult cookie + X-Lumi-Demo header. Nothing is stored. */
export function useDemoRecorder(onTranscript: (text: string) => void, focusFallback: () => void) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const op = useRef(0);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const lastBlob = useRef<Blob | null>(null);
  const cb = useRef({ onTranscript, focusFallback });
  cb.current = { onTranscript, focusFallback };

  const releaseMic = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const fail = (msg: string) => { if (!mounted.current) return; setPhase('idle'); setError(msg); setTimeout(() => cb.current.focusFallback(), 0); };

  const transcribe = async (blob: Blob) => {
    setPhase('thinking'); setError(''); lastBlob.current = blob;
    abortRef.current?.abort();
    const abort = new AbortController(); abortRef.current = abort;
    try {
      const form = new FormData();
      form.append('audio', blob, blob.type.startsWith('audio/mp4') ? 'question.mp4' : 'question.webm');
      const res = await fetch(transcribeUrl(), { method: 'POST', credentials: 'include', headers: { 'X-Lumi-Demo': '1' }, body: form, signal: abort.signal });
      if (!res.ok) {
        let msg = 'تعذر سماع التسجيل. حاول مرة أخرى أو اكتب سؤالك.';
        try { const b = await res.json(); if (typeof b?.error === 'string') msg = b.error; } catch { /* default */ }
        throw new Error(msg);
      }
      const body = await res.json() as { text?: unknown };
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('لم أسمع سؤالك بوضوح. حاول مرة أخرى.');
      if (!mounted.current) return;
      lastBlob.current = null; setPhase('idle');
      cb.current.onTranscript(body.text.trim());
    } catch (e) {
      if (!mounted.current || abort.signal.aborted) return;
      fail(e instanceof Error ? e.message : 'حاول مرة أخرى أو اكتب سؤالك.');
    }
  };

  const tap = useCallback(async () => {
    if (phase === 'thinking') return;
    if (phase === 'listening') {
      if (recorder.current?.state === 'recording') { recorder.current.stop(); releaseMic(); }
      else { op.current++; releaseMic(); setPhase('idle'); }
      return;
    }
    setError(''); lastBlob.current = null;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return fail('الميكروفون غير متاح في هذا المتصفح. يمكنك كتابة سؤالك هنا.');
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) return fail('هذا المتصفح لا يدعم التسجيل. يمكنك كتابة سؤالك هنا.');
    const my = ++op.current;
    setPhase('listening');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!mounted.current || my !== op.current) { media.getTracks().forEach((t) => t.stop()); return; }
      stream.current = media;
      const rec = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 64000 });
      recorder.current = rec;
      const chunks: Blob[] = []; let bytes = 0; let invalid = false;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) { chunks.push(ev.data); bytes += ev.data.size; }
        if (bytes > MAX_BYTES) { invalid = true; if (rec.state === 'recording') rec.stop(); }
      };
      rec.onerror = () => { invalid = true; releaseMic(); fail('توقف التسجيل. حاول مرة أخرى أو اكتب سؤالك.'); };
      rec.onstop = () => {
        releaseMic(); recorder.current = null;
        if (!mounted.current || my !== op.current) return;
        if (invalid || !bytes) return fail('التسجيل غير صالح أو كبير. حاول بسؤال أقصر.');
        void transcribe(new Blob(chunks, { type: mime.split(';')[0] }));
      };
      rec.start(250);
      timer.current = setTimeout(() => { if (rec.state === 'recording') { rec.stop(); releaseMic(); } }, 29500);
    } catch {
      releaseMic();
      if (my === op.current) fail('لم نتمكن من فتح الميكروفون. اسمح باستخدامه أو اكتب سؤالك هنا.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const retry = useCallback(() => { if (lastBlob.current) void transcribe(lastBlob.current); else void tap(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tap]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; op.current++;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      releaseMic(); abortRef.current?.abort();
    };
  }, []);
  return { phase, error, tap, retry };
}
