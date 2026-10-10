import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useDyslexiaVoice } from './dyslexia/use-voice';
import { useQueryClient } from '@tanstack/react-query';
import { useListStudentMessages, useSendStudentMessage, getListStudentMessagesQueryKey, getListStudentChatsQueryKey } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, cx } from '@/components/lumi';
import { parseSteps, DYSLEXIA_TEXT_STYLE, ModeReply, SpeakerButton, LearningSteps, AutismSchedule, MicButton } from './mode-parts';
import type { Mode } from '@/lib/tokens';
import { langAttrs, t, type Lang } from '@/lib/student-i18n';

type Msg = { id: number; role: 'student' | 'ai'; content: string };

export function StudentChat({ mode, chatId, lang = 'ar' }: { mode: Mode; chatId: number; lang?: Lang }) {
  const s = t(lang);
  const la = langAttrs(lang);
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
  }, () => input.current?.focus(), lang);
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
  const textStyle = dys ? DYSLEXIA_TEXT_STYLE : undefined;
  const home = `/student/${mode}`;

  if (hist.isLoading) return <div {...la}><Loading label={s.loading} /></div>;
  if (hist.isError) return (
    <div {...la} className="p-6 max-w-md mx-auto"><ErrorBox>{s.chatOpenFail}</ErrorBox>
      <div className="flex gap-3 mt-4"><Button onClick={() => hist.refetch()} data-testid="button-retry-load">{s.tryAgain}</Button><Link href={home} className="inline-flex items-center min-h-14 px-8 rounded-full border border-navy">{s.back}</Link></div></div>
  );

  const showError = failed || (!!pendingRetry && !busy);
  const bubble = (m: Msg) => {
    if (m.role === 'student') return <div key={m.id} className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid={`msg-student-${m.id}`}>{m.content}</div>;
    if (mode === 'learning') {
      const steps = parseSteps(m.content);
      const isLast = lastAi?.id === m.id;
      const p = isLast ? lastAiProg : steps.length - 1;
      return <LearningSteps key={m.id} steps={steps} progress={p} active={isLast} onNext={() => setProgress(o => ({ ...o, [m.id]: p + 1 }))} testId={`msg-ai-${m.id}`} lang={lang} />;
    }
    return (
      <div key={m.id} className="self-end max-w-[90%] flex items-start gap-3" data-testid={`msg-ai-${m.id}`}>
        <ModeReply mode={mode}>{m.content}</ModeReply>
        {dys && <SpeakerButton state={voice.audioState?.id === m.id ? voice.audioState.state : null} disabled={voice.phase !== 'idle' || (voice.audioState?.id === m.id && voice.audioState.state === 'loading')} onClick={() => {
          // The displayed Stop control must never enter the playback/request path.
          if (voice.audioState?.id === m.id && voice.audioState.state === 'playing') voice.stopPlayback();
          else void voice.play(m.id);
        }} testId={`button-speaker-${m.id}`} lang={lang} />}
      </div>
    );
  };

  const composer = (
    <form onSubmit={e => { e.preventDefault(); if (!locked && !voiceBusy) { if (dys) voice.unlock(); submit(draft); } }} className="flex flex-col gap-3">
      {dys && (
        <MicButton listening={voice.phase === 'listening'} thinking={thinking} disabled={thinking && voice.phase !== 'listening' || !!pendingRetry && voice.phase === 'idle'} onTap={() => voice.tap()} error={voice.error} onRetry={voice.retryTranscription} lang={lang} />
      )}
      <div className="flex gap-3">
        <input ref={input} value={draft} onChange={e => setDraft(e.target.value)} disabled={locked || busy || voiceBusy} maxLength={2000} aria-label={s.typeMsg} placeholder={locked ? s.nextFirst : s.typeHere} className={cx('flex-1 min-w-0 min-h-14 px-5 rounded-full border border-navy bg-card text-navy', dys ? 'text-base' : 'text-lg')} data-testid="input-message" />
        <Button type="submit" disabled={locked || busy || voiceBusy || !draft.trim()} data-testid="button-send">{s.send}</Button>
      </div>
    </form>
  );
  const status = (
    <div className={cx('flex flex-col gap-2 justify-center', aut ? 'h-28 overflow-y-auto' : 'min-h-16')} aria-live="polite">
      {busy && <p data-testid="text-typing">{s.typing}</p>}
      {showError && !busy && (
        <div className="flex items-center gap-3 flex-wrap"><div className="flex-1"><ErrorBox>{s.sendFail}</ErrorBox></div>
          <Button variant={aut ? 'primary' : 'secondary'} onClick={retry} data-testid="button-retry">{s.retry}</Button></div>
      )}
    </div>
  );

  return (
    <div {...la} className={cx('flex flex-col mx-auto max-w-xl w-full', aut ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]')} data-testid={`page-chat-${mode}`} data-voice-latency-ms={dys ? voice.latency : undefined}>
      <header className={cx('shrink-0 px-4 py-3 flex items-center justify-between gap-3', aut && 'h-24')} >
        <Link href={home} className="inline-flex items-center min-h-14 px-6 rounded-full border border-navy bg-card" data-testid="link-back-home">{s.back}</Link>
        <h1 className="text-xl line-clamp-2">{hist.data?.chat.icon ?? '💬'} {hist.data?.chat.title}</h1>
      </header>
      {aut && <AutismSchedule lang={lang} />}
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={aut ? { scrollBehavior: 'auto' } : undefined} data-testid="chat-scroll">
        {messages.length === 0 && <p className="bg-mist rounded-2xl p-5" style={textStyle} data-testid="empty-messages">{s.emptyChat}</p>}
        {messages.map(bubble)}
        {dys && voiceQuestion && <div className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid="voice-transcript">{voiceQuestion}</div>}
      </div>
      <div className="shrink-0 px-4 pb-4 pt-2 flex flex-col gap-2">{status}{composer}</div>
    </div>
  );
}
