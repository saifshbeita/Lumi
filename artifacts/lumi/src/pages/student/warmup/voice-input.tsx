import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { ErrorBox, cx } from '@/components/lumi';
import type { Chrome } from './config';

const url = () => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/student/voice/transcribe`;

/** Optional autism favorite-thing voice answer. Scoped to the warm-up via X-Lumi-Warmup header. Not speech-scored. */
export function VoiceInput({ c, disabled, onText }: { c: Chrome; disabled?: boolean; onText: (t: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'rec' | 'busy'>('idle');
  const [err, setErr] = useState('');
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const cb = useRef(onText); cb.current = onText;

  const release = () => {
    if (timer.current) clearTimeout(timer.current); timer.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
  };
  useEffect(() => { alive.current = true; return () => {
    alive.current = false; abort.current?.abort();
    if (rec.current?.state === 'recording') rec.current.stop();
    release(); chunks.current = [];
  }; }, []);

  const send = async (blob: Blob) => {
    setPhase('busy');
    const ac = new AbortController(); abort.current = ac;
    try {
      const form = new FormData();
      form.append('audio', blob, blob.type.startsWith('audio/mp4') ? 'favorite.mp4' : 'favorite.webm');
      const r = await fetch(url(), { method: 'POST', credentials: 'include', headers: { 'X-Lumi-Warmup': '1' }, body: form, signal: ac.signal });
      if (!r.ok) throw new Error();
      const body = await r.json() as { text?: unknown };
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error();
      if (alive.current) { setPhase('idle'); cb.current(body.text.trim().slice(0, 500)); }
    } catch {
      if (alive.current && !ac.signal.aborted) { setPhase('idle'); setErr(c.recFail); }
    } finally { chunks.current = []; }
  };

  const toggle = async () => {
    if (phase === 'busy') return;
    if (phase === 'rec') { if (rec.current?.state === 'recording') rec.current.stop(); release(); return; }
    setErr('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setErr(c.noMic); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) { setErr(c.noMic); return; }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!alive.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const r = new MediaRecorder(media, { mimeType: mime });
      rec.current = r; chunks.current = [];
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      r.onerror = () => { release(); chunks.current = []; if (alive.current) { setPhase('idle'); setErr(c.recFail); } };
      r.onstop = () => {
        release(); rec.current = null;
        if (!alive.current) return;
        const blob = new Blob(chunks.current, { type: mime.split(';')[0] }); chunks.current = [];
        if (!blob.size) { setPhase('idle'); setErr(c.recFail); return; }
        void send(blob);
      };
      r.start(250); setPhase('rec');
      timer.current = setTimeout(() => { if (r.state === 'recording') r.stop(); }, 29500);
    } catch { release(); if (alive.current) { setPhase('idle'); setErr(c.micDenied); } }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={toggle} disabled={disabled || phase === 'busy'} aria-pressed={phase === 'rec'}
        className={cx('min-h-16 px-6 rounded-full border border-navy text-navy text-xl inline-flex items-center gap-3 disabled:opacity-50', phase === 'rec' ? 'bg-sage' : 'bg-card')}
        data-testid="button-warmup-voice">
        {phase === 'rec' ? <Square aria-hidden /> : <Mic aria-hidden />}
        <span>{phase === 'rec' ? c.stop : phase === 'busy' ? c.transcribing : c.record}</span>
      </button>
      <span aria-live="polite" className="sr-only" data-testid="status-warmup-voice">{phase}</span>
      {err && <ErrorBox>{err}</ErrorBox>}
    </div>
  );
}
