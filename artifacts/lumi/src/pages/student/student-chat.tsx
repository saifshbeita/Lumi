import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Mic, Volume2, Square, RotateCcw } from 'lucide-react';
import { useDyslexiaVoice } from './dyslexia/use-voice';
import { useQueryClient } from '@tanstack/react-query';
import { useListStudentMessages, useSendStudentMessage, getListStudentMessagesQueryKey, getListStudentChatsQueryKey } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, cx } from '@/components/lumi';
import type { Mode } from '@/lib/tokens';

type Msg = { id: number; role: 'student' | 'ai'; content: string };

function parseSteps(c: string): string[] {
  try {
    const j = JSON.parse(c) as { steps?: unknown };
    if (Array.isArray(j.steps)) {
      const s = j.steps.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (s.length) return s;
    }
  } catch { /* single-step fallback */ }
  return [c];
}

export function StudentChat({ mode, chatId }: { mode: Mode; chatId: number }) {
  const qc = useQueryClient();
  const key = getListStudentMessagesQueryKey(chatId);
  const hist = useListStudentMessages(chatId, { query: { queryKey: key, retry: false } });
  const send = useSendStudentMessage();
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const voice = useDyslexiaVoice(mode === 'dyslexia', text => {
    setDraft(text); setVoiceQuestion(text); submit(text);
  }, () => input.current?.focus());
  const scroller = useRef<HTMLDivElement>(null);
  const messages = useMemo<Msg[]>(() => (hist.data?.messages ?? []) as Msg[], [hist.data]);
  const last = messages[messages.length - 1];
  const pendingRetry = last && last.role === 'student' ? last : null;
  const lastAi = last && last.role === 'ai' ? last : null;
  const lastAiSteps = lastAi && mode === 'learning' ? parseSteps(lastAi.content) : null;
  const lastAiProg = lastAi ? Math.min(progress[lastAi.id] ?? 0, (lastAiSteps?.length ?? 1) - 1) : 0;
  const locked = !!lastAiSteps && lastAiProg < lastAiSteps.length - 1;
  const busy = send.isPending;
  const count = messages.length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, busy, lastAiProg]);

  const submit = (content: string, retryMessageId?: number) => {
    const text = content.trim();
    if (!text || busy) return;
    setFailed(false);
    send.mutate({ id: chatId, data: retryMessageId ? { content: text, retryMessageId } : { content: text } }, {
      onSuccess: exchange => {
        setDraft('');
        setVoiceQuestion('');
        qc.setQueryData(key, (previous: typeof hist.data) => ({
          chat: exchange.chat,
          messages: [
            ...(previous?.messages ?? []).filter(m => m.id !== exchange.studentMessage.id && m.id !== exchange.reply.id),
            exchange.studentMessage,
            exchange.reply,
          ],
        }));
        qc.invalidateQueries({ queryKey: key });
        qc.invalidateQueries({ queryKey: getListStudentChatsQueryKey() });
        if (mode === 'dyslexia') void voice.play(exchange.reply.id, true);
      },
      onError: () => { setVoiceQuestion(''); setFailed(true); qc.invalidateQueries({ queryKey: key }); },
    });
  };
  const retry = () => { if (pendingRetry) submit(pendingRetry.content, pendingRetry.id); else submit(draft); };

  const dys = mode === 'dyslexia';
  const aut = mode === 'autism';
  const voiceBusy = dys && voice.phase !== 'idle';
  const thinking = busy || voice.phase === 'thinking' || voice.audioState?.state === 'loading';
  const textStyle = dys ? { fontSize: '22px', letterSpacing: '0.08em', lineHeight: 1.9 } : undefined;
  const home = `/student/${mode}`;

  if (hist.isLoading) return <div dir="rtl" lang="ar"><Loading label="جار التحميل" /></div>;
  if (hist.isError) return (
    <div dir="rtl" lang="ar" className="p-6 max-w-md mx-auto"><ErrorBox>تعذر فتح المحادثة. لا بأس، جرب مرة أخرى.</ErrorBox>
      <div className="flex gap-3 mt-4"><Button onClick={() => hist.refetch()} data-testid="button-retry-load">حاول مرة أخرى</Button><Link href={home} className="inline-flex items-center min-h-14 px-8 rounded-full border border-navy">رجوع</Link></div></div>
  );

  const showError = failed || (!!pendingRetry && !busy);
  const bubble = (m: Msg) => {
    if (m.role === 'student') return <div key={m.id} className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid={`msg-student-${m.id}`}>{m.content}</div>;
    if (mode === 'learning') {
      const steps = parseSteps(m.content);
      const isLast = lastAi?.id === m.id;
      const p = isLast ? lastAiProg : steps.length - 1;
      const shown = isLast ? steps.slice(0, p + 1) : steps;
      return (
        <div key={m.id} className="self-end max-w-[90%] flex flex-col gap-2" data-testid={`msg-ai-${m.id}`}>
          {shown.map((s, i) => <div key={i} className={cx('bg-card border border-border rounded-3xl px-5 py-3', isLast && i < p || !isLast ? 'opacity-50' : '')}>{s}</div>)}
          {isLast && steps.length > 1 && (
            <div className="flex items-center gap-4">
              <div className="flex gap-2" aria-label={`الخطوة ${p + 1} من ${steps.length}`}>{steps.map((_, i) => <span key={i} className={cx('w-3 h-3 rounded-full border border-navy', i <= p ? 'bg-navy' : 'bg-card')} />)}</div>
              {p < steps.length - 1 && <Button onClick={() => setProgress(o => ({ ...o, [m.id]: p + 1 }))} className="text-xl" data-testid="button-next-step">التالي</Button>}
            </div>
          )}
        </div>
      );
    }
    return (
      <div key={m.id} className="self-end max-w-[90%] flex items-start gap-3" data-testid={`msg-ai-${m.id}`}>
        <div className="bg-card border border-border rounded-3xl px-5 py-3 whitespace-pre-line" style={textStyle}>{m.content}</div>
        {dys && <button type="button" disabled={voice.phase !== 'idle' || (voice.audioState?.id === m.id && voice.audioState.state === 'loading')} onClick={() => voice.play(m.id)} aria-label={voice.audioState?.id === m.id && voice.audioState.state === 'playing' ? 'إيقاف الصوت' : 'استماع للرد'} className={cx('shrink-0 min-h-14 min-w-14 rounded-full border border-navy text-2xl p-3 disabled:opacity-50', voice.audioState?.id === m.id && voice.audioState.state === 'error' ? 'bg-blush' : 'bg-card')} data-testid={`button-speaker-${m.id}`}>
          {voice.audioState?.id === m.id && voice.audioState.state === 'playing' ? <Square className="mx-auto" aria-hidden /> : voice.audioState?.id === m.id && voice.audioState.state === 'error' ? <RotateCcw className="mx-auto" aria-hidden /> : <Volume2 className="mx-auto" aria-hidden />}
          <span className="block text-base">{voice.audioState?.id === m.id ? ({ playing: 'إيقاف', loading: 'لحظة...', error: 'حاول مجدداً' }[voice.audioState.state]) : 'استماع'}</span>
        </button>}
      </div>
    );
  };

  const composer = (
    <form onSubmit={e => { e.preventDefault(); if (!locked && !voiceBusy) { if (dys) voice.unlock(); submit(draft); } }} className="flex flex-col gap-3">
      {dys && (
        <div className="flex flex-col items-center gap-1">
          <button type="button" disabled={thinking && voice.phase !== 'listening' || !!pendingRetry && voice.phase === 'idle'} onClick={() => voice.tap()} aria-label={voice.phase === 'listening' ? 'إيقاف التسجيل' : 'ابدأ التسجيل'} aria-pressed={voice.phase === 'listening'} className={cx('w-24 h-24 rounded-full border border-navy text-4xl disabled:opacity-50', voice.phase === 'listening' ? 'bg-sage' : thinking ? 'bg-mist' : 'bg-sun')} data-testid="button-mic"><Mic size={40} className="mx-auto" aria-hidden /></button>
          <span aria-live="polite" data-testid="voice-status">{voice.phase === 'listening' ? 'لومي يسمع...' : thinking ? 'لومي يفكر...' : 'اضغط لتتحدث'}</span>
          <span className="text-base">اضغط مرة أخرى للتوقف · حتى ٣٠ ثانية · صوت لومي مولّد بالذكاء الاصطناعي</span>
          {voice.error && <ErrorBox>{voice.error}<Button variant="secondary" className="mt-2" onClick={voice.retryTranscription}>حاول مرة أخرى</Button></ErrorBox>}
        </div>
      )}
      <div className="flex gap-3">
        <input ref={input} value={draft} onChange={e => setDraft(e.target.value)} disabled={locked || busy || voiceBusy} maxLength={2000} aria-label="اكتب رسالتك" placeholder={locked ? 'اضغط التالي أولا' : 'اكتب هنا'} className={cx('flex-1 min-w-0 min-h-14 px-5 rounded-full border border-navy bg-card text-navy', dys ? 'text-base' : 'text-lg')} data-testid="input-message" />
        <Button type="submit" disabled={locked || busy || voiceBusy || !draft.trim()} data-testid="button-send">إرسال</Button>
      </div>
    </form>
  );
  const status = (
    <div className={cx('flex flex-col gap-2 justify-center', aut ? 'h-28 overflow-y-auto' : 'min-h-16')} aria-live="polite">
      {busy && <p data-testid="text-typing">لومي يكتب...</p>}
      {showError && !busy && (
        <div className="flex items-center gap-3 flex-wrap"><div className="flex-1"><ErrorBox>لم تصل رسالتك إلى لومي. لا بأس، حاول مرة أخرى.</ErrorBox></div>
          <Button variant={aut ? 'primary' : 'secondary'} onClick={retry} data-testid="button-retry">إعادة المحاولة</Button></div>
      )}
    </div>
  );

  return (
    <div dir="rtl" lang="ar" className={cx('flex flex-col mx-auto max-w-xl w-full', aut ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]')} data-testid={`page-chat-${mode}`} data-voice-latency-ms={dys ? voice.latency : undefined}>
      <header className={cx('shrink-0 px-4 py-3 flex items-center justify-between gap-3', aut && 'h-24')} >
        <Link href={home} className="inline-flex items-center min-h-14 px-6 rounded-full border border-navy bg-card" data-testid="link-back-home">رجوع</Link>
        <h1 className="text-xl line-clamp-2">{hist.data?.chat.icon ?? '💬'} {hist.data?.chat.title}</h1>
      </header>
      {aut && <ol className="shrink-0 mx-4 mb-2 flex justify-between border border-border rounded-2xl bg-mist px-4 py-2 list-none" data-testid="schedule"><li>١. نسأل</li><li>٢. نتعلم</li><li>٣. نتدرب</li></ol>}
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={aut ? { scrollBehavior: 'auto' } : undefined} data-testid="chat-scroll">
        {messages.length === 0 && <p className="bg-mist rounded-2xl p-5" style={textStyle} data-testid="empty-messages">اكتب سؤالك الأول وسأساعدك.</p>}
        {messages.map(bubble)}
        {dys && voiceQuestion && <div className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid="voice-transcript">{voiceQuestion}</div>}
      </div>
      <div className="shrink-0 px-4 pb-4 pt-2 flex flex-col gap-2">{status}{composer}</div>
    </div>
  );
}
