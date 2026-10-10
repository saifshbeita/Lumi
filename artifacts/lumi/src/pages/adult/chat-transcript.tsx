import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Volume2, Square, RotateCcw } from 'lucide-react';
import { useGetStudent, useGetAdultChat, getGetStudentQueryKey, getGetAdultChatQueryKey, getGetAdultMessageAudioUrl } from '@workspace/api-client-react';
import { AdultShell } from './adult-shell';
import { NamedText } from '@/components/isolated-text';
import { Button, Card, ErrorBox, SkeletonBlock, cx } from '@/components/lumi';
import { useTranslation } from 'react-i18next';
import { localeOf, useLang } from '@/i18n';

function parseSteps(c: string): string[] | null {
  try {
    const j = JSON.parse(c) as { steps?: unknown; text?: unknown };
    if (Array.isArray(j.steps)) {
      const s = j.steps.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (s.length) return s;
    }
  } catch { /* plain text */ }
  return null;
}

function AudioControl({ studentId, messageId }: { studentId: number; messageId: number }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  const play = async () => {
    setState('loading');
    audio.current?.pause();
    request.current?.abort();
    request.current = new AbortController();
    try {
      if (!url.current) {
        const base = import.meta.env.BASE_URL.replace(/\/$/, '');
        const r = await fetch(`${base}${getGetAdultMessageAudioUrl(studentId, messageId)}`, { credentials: 'include', signal: request.current.signal });
        if (!r.ok) throw new Error(String(r.status));
        const blob = await r.blob();
        if (!mounted.current) return;
        url.current = URL.createObjectURL(blob);
      }
      const a = new Audio(url.current);
      audio.current = a;
      a.onended = () => setState('idle');
      a.onerror = () => setState('error');
      await a.play();
      if (mounted.current) setState('playing');
    } catch { if (mounted.current) setState('error'); }
  };
  const stop = () => { audio.current?.pause(); if (audio.current) audio.current.currentTime = 0; setState('idle'); };
  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap">
      {state === 'playing' ? (
        <Button variant="secondary" onClick={stop} data-testid={`button-stop-audio-${messageId}`}><Square size={18} aria-hidden />{t('transcript.stop')}</Button>
      ) : state === 'error' ? (
        <>
          <span role="alert" data-testid={`text-audio-error-${messageId}`}>{t('transcript.audioFail')}</span>
          <Button variant="secondary" onClick={play} data-testid={`button-retry-audio-${messageId}`}><RotateCcw size={18} aria-hidden />{t('transcript.retry')}</Button>
        </>
      ) : (
        <Button variant="secondary" onClick={play} disabled={state === 'loading'} data-testid={`button-play-audio-${messageId}`}><Volume2 size={18} aria-hidden />{state === 'loading' ? t('transcript.loadingAudio') : t('transcript.play')}</Button>
      )}
    </div>
  );
}

function Transcript({ id, chatId }: { id: number; chatId: number }) {
  const { t } = useTranslation();
  const lang = useLang();
  const ok = Number.isFinite(id) && Number.isFinite(chatId);
  const profile = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id), enabled: ok } });
  const chat = useGetAdultChat(id, chatId, { query: { queryKey: getGetAdultChatQueryKey(id, chatId), enabled: ok } });
  const name = profile.data?.student.name;
  const mode = profile.data?.student.conditions[0];
  const back = <Link href={`/adult/students/${id}`} data-testid="link-back-profile" className="inline-flex items-center gap-2 min-h-14 mb-4 rounded-full pe-4"><ArrowLeft size={22} className="text-steel rtl:-scale-x-100" aria-hidden /><span>{name ? <NamedText template={t('transcript.backTo', { name: '__NAME__' })} name={name} /> : t('transcript.backProfile')}</span></Link>;

  if (chat.isLoading || profile.isLoading) return <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-6">{back}<SkeletonBlock className="h-24" /><SkeletonBlock className="h-64" /></div>;
  if (chat.isError || !chat.data) return <div>{back}<ErrorBox>{t('transcript.openFail')}</ErrorBox><Button className="mt-4" onClick={() => chat.refetch()} data-testid="button-retry-chat">{t('common.tryAgain')}</Button></div>;
  const { chat: c, messages } = chat.data;
  return (
    <div>
      {back}
      <div className="flex items-center gap-4 mb-2">
        {c.icon && <span className="text-4xl" aria-hidden>{c.icon}</span>}
        <h1 className="text-4xl" dir="auto" data-testid="text-chat-title">{c.title}</h1>
      </div>
      <p className="mb-8" data-testid="text-chat-meta">{new Date(c.createdAt).toLocaleString(localeOf(lang))} · {t('profile.messageCount', { count: messages.length })} · {t('transcript.readOnly')}</p>
      <Card data-testid="section-transcript">
        {messages.length === 0 ? <p className="bg-mist rounded-2xl p-4">{t('transcript.noMessages')}</p> : (
          <ol className="flex flex-col gap-4">
            {messages.map((m) => {
              const ai = m.role === 'ai';
              const steps = ai ? parseSteps(m.content) : null;
              const text = steps ? steps.join(' ') : m.content;
              return (
                <li key={m.id} className={cx('flex flex-col max-w-[85%]', ai ? 'self-start' : 'self-end items-end')} data-testid={`message-${m.id}`}>
                  <span className="text-base mb-1"><bdi>{ai ? t('common.lumi') : name ?? t('transcript.student')}</bdi> · {new Date(m.createdAt).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })}</span>
                  <div dir="auto" className={cx('rounded-2xl px-5 py-4 border border-navy text-start', ai ? 'bg-mist' : 'bg-card')} data-testid={`text-message-${m.id}`}>
                    {steps ? (
                      <ol className="list-decimal ps-6 flex flex-col gap-1">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    ) : <p className="whitespace-pre-wrap">{text}</p>}
                    {ai && mode === 'dyslexia' && <AudioControl studentId={id} messageId={m.id} />}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

export default function ChatTranscriptPage() {
  const p = useParams<{ id: string; chatId: string }>();
  return <AdultShell>{() => <Transcript id={Number(p.id)} chatId={Number(p.chatId)} />}</AdultShell>;
}
