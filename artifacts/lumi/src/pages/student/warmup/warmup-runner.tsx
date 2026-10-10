import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useGetWarmup, useWarmupEvent, getGetWarmupQueryKey, type Mode, type WarmupEventInput, type WarmupState } from '@workspace/api-client-react';
import { Button, ErrorBox, SkeletonBlock, cx } from '@/components/lumi';
import { brand } from '@/lib/util';
import { langAttrs, type Lang } from '@/lib/student-i18n';
import { chrome, digits, GUIDE } from './config';
import { kindOf, OptionButton, SectionDots, Speaker, WarmupSchedule } from './item-parts';
import { usePromptAudio } from './use-prompt-audio';
import { useActiveTimer } from './use-active-timer';
import { VoiceInput } from './voice-input';

type Payload = Omit<WarmupEventInput, 'attemptId' | 'eventId'>;
const AUTO_NEXT_MS = 1600;

export function WarmupRunner({ mode, lang }: { mode: Mode; lang: Lang }) {
  const c = chrome(lang);
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const key = getGetWarmupQueryKey(mode);
  const q = useGetWarmup(mode, { query: { queryKey: key, retry: 1, refetchOnWindowFocus: false, staleTime: Infinity } });
  const mutation = useWarmupEvent();
  const mutateRef = useRef(mutation.mutateAsync);
  mutateRef.current = mutation.mutateAsync;
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<WarmupEventInput | null>(null);

  const st = q.data;
  const item = st?.item ?? null;
  const aut = mode === 'autism', dys = mode === 'dyslexia', lrn = mode === 'learning';
  const kind = item ? kindOf(item) : 'choice';
  const sec = item?.section ?? '';

  /** Serialised: one request at a time, full returned state written atomically to cache. */
  const run = useCallback((data: WarmupEventInput): Promise<WarmupState | undefined> => {
    const p = chain.current.then(async () => {
      setPending(n => n + 1);
      try {
        const next = await mutateRef.current({ mode, data });
        qc.setQueryData(key, next);
        setFailed(null);
        return next;
      } catch(e) { setFailed(data); if((e as {status?:number})?.status===409)void q.refetch(); return undefined; }
      finally { setPending(n => n - 1); }
    });
    chain.current = p;
    return p;
    // key derived from mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, qc]);
  const send = useCallback((p: Payload) => {
    const s = qc.getQueryData<WarmupState>(key);
    if (!s) return Promise.resolve(undefined);
    return run({ attemptId: s.id, eventId: crypto.randomUUID(), itemId: s.item?.id, ...p });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, qc, mode]);

  const busy = pending > 0;

  // ---------- audio ----------
  const soundAllowed = !aut || !!st?.sound;
  const audioPlayedRef = useRef(false);
  audioPlayedRef.current = !!st?.audioPlayed;
  const [previewPhase, setPreviewPhase] = useState<'audio' | 'show' | 'sent'>('audio');
  const audio = usePromptAudio(mode, st?.id, item, {
    onStart: manual => {
      const already = audioPlayedRef.current;
      // Every actual hearing counts, including an interrupted preview reopened after reload.
      void send({ action: 'audio', replay: already });
      audioPlayedRef.current = true;
    },
    onEnd: () => { if (st?.stage === 'preview') setPreviewPhase(p => (p === 'audio' ? 'show' : p)); },
  });
  const instrItem = kind === 'instructions';
  // Frontend obeys item.audio metadata only (auto | optional | off).
  // item.audio: auto | optional | off. Autism only speaks after opt-in sound, never for optional reading aids.
  const autoplay = !!item && soundAllowed && (aut ? item.audio !== 'optional' : item.audio === 'auto');
  const maxedReplay = instrItem && !!st?.audioPlayed && (st?.replays ?? 0) >= 1;

  const autoKey = useRef('');
  useEffect(() => {
    if (!st || !item) return;
    const k = `${st.id}:${item.id}:${st.stage}`;
    if (st.stage === 'preview') {
      if (autoKey.current === k) return;
      autoKey.current = k;
      if(st.audioPlayed)setPreviewPhase('show');
      else {setPreviewPhase('audio');void audio.play(false);}
      return;
    }
    if (st.stage !== 'question' || autoKey.current === `${st.id}:${item.id}:auto`) return;
    if (kind === 'memory') return;
    autoKey.current = `${st.id}:${item.id}:auto`;
    if (autoplay && !st.audioPlayed && st.taps.length === 0) void audio.play(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.id, item?.id, st?.stage, autoplay]);

  // Memory: sequence shows count×1.5s after the instruction audio, then preview_done.
  useEffect(() => {
    if (st?.stage !== 'preview' || previewPhase !== 'show' || !item) return;
    const n = item.sequence?.length || st.sequenceCount || 1;
    const t = setTimeout(() => { setPreviewPhase('sent'); void send({ action: 'preview_done' }); }, n * 1500);
    return () => clearTimeout(t);
  }, [st?.stage, previewPhase, item, st?.sequenceCount, send]);
  useEffect(() => { if (st?.stage === 'preview' && audio.status === 'error') setPreviewPhase(p => (p === 'audio' ? 'show' : p)); }, [audio.status, st?.stage]);

  // ---------- timing ----------
  const interactive = st?.stage === 'question' && !busy && audio.status !== 'playing' && audio.status !== 'loading';
  const elapsed = useActiveTimer(st && item ? `${st.id}:${item.id}` : undefined, interactive);

  // ---------- local selection ----------
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState('');
  useEffect(() => { setMulti([]); setText(''); }, [item?.id]);

  const answer = (picked: string[], skipped = false) => {
    audio.stop();
    void send({ action: 'answer', picked, skipped, responseMs: elapsed() });
  };
  const tap = async (id: string) => {
    if (!st) return;
    audio.stop();
    const next = await send({ action: 'tap', picked: [id] });
    if (next && next.stage === 'question' && next.item?.id === item?.id && next.sequenceCount > 0 && next.taps.length >= next.sequenceCount) {
      void send({ action: 'answer', picked: next.taps, responseMs: elapsed() });
    }
  };

  // Non-learning modes advance after neutral feedback; answered survives reload.
  const autoNext = useRef('');
  useEffect(() => {
    if (!st || st.stage !== 'answered' || lrn || !item) return;
    const k = `${st.id}:${item.id}`;
    if (autoNext.current === k) return;
    const t = setTimeout(() => { autoNext.current = k; void send({ action: 'next' }); }, AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [st, item, lrn, send]);

  // ---------- render ----------
  const shell = (children: ReactNode) => (
    <div {...langAttrs(lang)} className="min-h-[100dvh] bg-background px-4 py-6" data-testid={`page-warmup-${mode}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">{children}</div>
    </div>
  );

  if (q.isLoading) return shell(<div role="status" aria-label={c.loading} className="flex flex-col gap-4" data-testid="status-warmup-loading">
    <SkeletonBlock className="h-12 w-48" /><SkeletonBlock className="h-40" /><SkeletonBlock className="h-20" /><SkeletonBlock className="h-20" />
  </div>);
  if (q.isError || !st) return shell(<div className="flex flex-col gap-4"><ErrorBox>{c.loadFail}</ErrorBox>
    <Button onClick={() => q.refetch()} data-testid="button-warmup-reload">{c.retry}</Button></div>);

  const section = st.sections[st.sectionIndex];
  const goHome = () => { void qc.invalidateQueries(); nav(`/student/${mode}`); };

  const header = (
    <header className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <img src={brand('lumi-logo.png')} alt="" className="w-12 h-12 object-contain" />
        <h1 className="text-3xl" data-testid="text-warmup-title">{c.title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {aut && st.stage !== 'done' && (
          <button type="button" disabled={busy} onClick={() => { if(st.sound)audio.stop();void send({ action: 'sound', sound: !st.sound }); }} aria-pressed={st.sound}
            className="min-h-14 px-4 rounded-full border-2 border-navy bg-card text-navy inline-flex items-center gap-2 disabled:opacity-50" data-testid="button-warmup-sound">
            {st.sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}<span>{st.sound ? c.soundOn : c.soundOff}</span>
          </button>
        )}
        {aut && st.stage !== 'done' && st.stage !== 'paused' && (
          <button type="button" disabled={busy} onClick={() => { audio.stop(); void send({ action: 'break' }); }}
            className="min-h-14 px-5 rounded-full border-2 border-navy bg-card text-navy text-lg disabled:opacity-50" data-testid="button-warmup-break">
            <span>{c.brk}</span>
          </button>
        )}
      </div>
    </header>
  );

  const failBox = failed && (
    <div className="flex flex-col gap-2"><ErrorBox>{c.saveFail}</ErrorBox>
      <Button variant="secondary" disabled={busy} onClick={() => void run(failed)} data-testid="button-warmup-retry">{c.retry}</Button></div>
  );

  if (st.stage === 'done') {
    return shell(<>
      {header}
      <section className="bg-card border border-border rounded-3xl p-8 flex flex-col gap-6 items-center text-center" data-testid="section-warmup-done">
        <p dir="rtl" lang="ar" className="text-3xl text-navy leading-relaxed" data-testid="text-warmup-final">{aut ? GUIDE.autismDone : GUIDE.done}</p>
        <Button variant={aut ? 'selected' : 'primary'} className="text-2xl min-h-16 w-full" onClick={goHome} data-testid="button-warmup-home">{c.home}</Button>
      </section>
    </>);
  }

  if (st.stage === 'paused') {
    return shell(<>
      {header}
      <section className="bg-mist rounded-3xl p-8 flex flex-col gap-6 items-center text-center" data-testid="section-warmup-paused">
        <Pause size={48} aria-hidden className="text-navy" />
        <p className="text-2xl text-navy" data-testid="text-warmup-paused">{c.paused}</p>
        <Button variant="selected" className="text-2xl min-h-16 w-full" disabled={busy} onClick={() => send({ action: 'resume' })} data-testid="button-warmup-resume"><Play aria-hidden />{c.resume}</Button>
      </section>
      {failBox}
    </>);
  }

  if (st.stage === 'schedule') {
    const prev = st.sectionIndex > 0 ? st.sectionIndex : 0;
    return shell(<>
      {header}
      <section className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-5" data-testid="section-warmup-schedule">
        {prev > 0 && section && <p dir="rtl" lang="ar" className="text-2xl text-navy" data-testid="text-warmup-between">{GUIDE.between(prev, section.title_ar)}</p>}
        <WarmupSchedule sections={st.sections} index={st.sectionIndex} />
        <Button variant="selected" className="text-2xl min-h-16 w-full" disabled={busy} onClick={() => send({ action: 'schedule' })} data-testid="button-warmup-start-part">{c.start}</Button>
      </section>
      {failBox}
    </>);
  }

  if (!item) return shell(<>{header}<ErrorBox>{c.loadFail}</ErrorBox><Button onClick={() => q.refetch()} data-testid="button-warmup-reload">{c.retry}</Button></>);

  const answered = st.stage === 'answered';
  const locked = answered || busy || st.stage !== 'question';
  const pictureOnly = dys && (sec === 'A' || sec === 'E');
  const big = dys && (sec === 'B' || sec === 'C' || sec === 'D');
  // Instruction items: prompt is redacted after first play; show tts_ar only while it is actually playing.
  const showPrompt = !instrItem || audio.status === 'playing';
  const promptText = instrItem ? (audio.status === 'playing' ? item.tts_ar ?? '' : '') : item.prompt_ar;
  const showSpeaker = soundAllowed && kind !== 'memory';
  const speakerLabel = item.audio === 'optional' && lrn ? lang==="ar"?GUIDE.listenIt:"Hear it" : undefined;
  const contentStyle = dys ? { fontSize: '40px', lineHeight: 1.8, letterSpacing: '0.02em' } : { fontSize: '30px', lineHeight: 1.8 };

  return shell(<>
    {header}
    <div className="flex items-center justify-between gap-3" data-testid="progress-warmup">
      {aut ? <span className="text-xl text-navy" data-testid="text-warmup-progress">{c.questionOf(st.partItemIndex + 1, section?.count ?? 1)}</span>
        : <SectionDots sections={st.sections} index={st.sectionIndex} />}
      {section && <span dir="rtl" lang="ar" className="text-lg text-navy" data-testid="text-warmup-section">{section.title_ar}</span>}
    </div>

    <section dir="rtl" lang="ar" className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-4 min-h-48" data-testid={`card-warmup-item-${item.id}`}>
      <div className="flex items-start justify-between gap-4">
        <p className={cx('text-2xl text-navy leading-relaxed flex-1', !showPrompt && 'invisible')} aria-hidden={!showPrompt} data-testid="text-warmup-prompt">{digits(promptText) || '\u00a0'}</p>
        {showSpeaker && (
          <Speaker c={c} status={audio.status} label={speakerLabel}
            disabled={locked || maxedReplay || audio.status === 'playing'}
            onClick={() => void audio.play(true)} />
        )}
      </div>
      {item.example && <div className="bg-mist rounded-2xl px-5 py-4" style={contentStyle} data-testid="text-warmup-example">{digits(item.example)}</div>}
      {item.passage && <div className="bg-mist rounded-2xl px-5 py-4" style={contentStyle} data-testid="text-warmup-passage">{digits(item.passage)}</div>}
      {item.shown && kind !== 'memory' && <div className="text-center text-navy" style={dys || lrn || aut ? { fontSize: '40px', lineHeight: 1.8 } : undefined} data-testid="text-warmup-shown">{digits(item.shown)}</div>}
      {kind === 'memory' && st.stage === 'preview' && (
        <div className="flex flex-col items-center gap-3 min-h-28 justify-center" data-testid="area-warmup-memory">
          {previewPhase === 'show' || previewPhase === 'sent'
            ? <div className="flex gap-4 flex-wrap justify-center" style={{ fontSize: '56px' }} data-testid="row-warmup-sequence">{(item.sequence ?? []).map((s, i) => <span key={i}>{s}</span>)}</div>
            : audio.status === 'blocked'
              ? <Speaker c={c} status="blocked" onClick={() => void audio.play(false)} />
              : <span className="text-xl text-navy">{c.watch}</span>}
        </div>
      )}
    </section>

    {(kind === 'choice' || kind === 'preference' || kind === 'size') && (
      <div className="grid gap-3" data-testid="options-warmup">
        {item.options.map(o => (
          <OptionButton key={o.id} mode={mode} option={o} selected={st.selected.includes(o.id)} disabled={locked} pictureOnly={pictureOnly} big={big}
            onClick={() => answer([o.id])} testId={`button-option-${o.id}`}>
            {kind === 'size' ? <span dir="rtl" lang="ar" style={{ fontSize: `${o.size ?? 24}px`, lineHeight: 1.4 }}>{o.label_ar ?? 'مَرْحَبًا'}</span> : undefined}
          </OptionButton>
        ))}
      </div>
    )}

    {kind === 'multi' && (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="options-warmup-interests">
          {item.options.map(o => {
            const on = answered ? st.selected.includes(o.id) : multi.includes(o.id);
            return <OptionButton key={o.id} mode={mode} option={o} selected={on} disabled={locked || (!on && multi.length >= 3)}
              onClick={() => setMulti(m => (m.includes(o.id) ? m.filter(x => x !== o.id) : m.length < 3 ? [...m, o.id] : m))} testId={`button-interest-${o.id}`} />;
          })}
        </div>
        {!answered && <div className="flex items-center gap-4 flex-wrap">
          <Button variant={aut ? 'selected' : 'primary'} className="text-xl min-h-16" disabled={locked || multi.length === 0} onClick={() => answer(multi)} data-testid="button-warmup-confirm">{c.confirm}</Button>
          <span className="text-lg text-navy" data-testid="text-warmup-chosen">{c.chosen(multi.length, 3)}</span>
        </div>}
      </div>
    )}

    {kind === 'open' && (
      <div className="flex flex-col gap-3">
        <textarea value={answered ? (st.selected[0] ?? '') : text} onChange={e => setText(e.target.value.slice(0, 500))} disabled={locked} rows={3} dir="auto"
          placeholder={c.typeHere} className="w-full rounded-3xl border-2 border-navy bg-card text-navy text-xl p-4" data-testid="input-warmup-favorite" />
        {!answered && <div className="flex items-center gap-3 flex-wrap">
          <VoiceInput c={c} disabled={locked} onText={t => setText(t)} />
          <Button variant="selected" className="text-xl min-h-16" disabled={locked || !text.trim()} onClick={() => answer([text.trim()])} data-testid="button-warmup-confirm">{c.confirm}</Button>
        </div>}
      </div>
    )}

    {(kind === 'memory' || kind === 'instructions') && st.stage !== 'preview' && (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3" data-testid="grid-warmup-taps">
          {item.options.map(o => {
            const order = st.taps.map((x, i) => (x === o.id ? i + 1 : 0)).filter(Boolean);
            return (
              <OptionButton key={o.id} mode={mode} option={o} selected={order.length > 0} disabled={locked || st.taps.length >= st.sequenceCount}
                onClick={() => void tap(o.id)} testId={`button-tap-${o.id}`}>
                <span className="flex flex-col items-center">
                  <span style={{ fontSize: '48px', lineHeight: 1.2 }}>{o.emoji ?? digits(o.label_ar)}</span>
                  {order.length > 0 && <span className="text-lg" data-testid={`text-tap-order-${o.id}`}>{order.map(n => digits(String(n))).join('، ')}</span>}
                </span>
              </OptionButton>
            );
          })}
        </div>
        {!answered && st.sequenceCount > 0 && <span className="text-lg text-navy" data-testid="text-warmup-taps-left">{c.tapsLeft(Math.max(0, st.sequenceCount - st.taps.length))}</span>}
      </div>
    )}

    {answered ? (
      <div className="bg-mist rounded-3xl p-5 flex items-center justify-between gap-4 flex-wrap" aria-live="polite" data-testid="section-warmup-feedback">
        <p dir="rtl" lang="ar" className="text-2xl text-navy" data-testid="text-warmup-feedback">{st.feedback || GUIDE.feedback[mode]}</p>
        {lrn && <Button className="text-2xl min-h-16 px-10" disabled={busy} onClick={() => send({ action: 'next' })} data-testid="button-warmup-next">{c.next}</Button>}
      </div>
    ) : st.stage === 'question' && (
      <div className="flex justify-start">
        <Button variant="secondary" className={dys ? 'min-h-[72px] text-xl' : 'text-xl'} disabled={locked} onClick={() => answer([], true)} data-testid="button-warmup-skip">
          <span>{c.skip[mode]}</span>
        </Button>
      </div>
    )}
    {failBox}
  </>);
}

export default WarmupRunner;
