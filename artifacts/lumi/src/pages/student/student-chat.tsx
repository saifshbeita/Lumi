import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useDyslexiaVoice } from './dyslexia/use-voice';
import { useQueryClient } from '@tanstack/react-query';
import { useListStudentMessages, useSendStudentMessage, useUpdateChatSubject, getListStudentMessagesQueryKey, getListStudentChatsQueryKey, getGetWarmupQueryKey,getGetStudentSessionQueryKey,type ChatMessage, type ChatSubject } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, cx } from '@/components/lumi';
import { parseSteps, DYSLEXIA_TEXT_STYLE, ModeReply, SpeakerButton, LearningSteps, AutismSchedule, MicButton } from './mode-parts';
import type { Mode } from '@/lib/tokens';
import { langAttrs, t, type Lang } from '@/lib/student-i18n';

type Msg = ChatMessage;
const subjects: {value:ChatSubject;label:string}[] = [
  {value:'math',label:'🔢 رياضيات'}, {value:'science',label:'🔬 علوم'},
  {value:'arabic',label:'📖 عربي'}, {value:'english',label:'🔤 English'}, {value:'general',label:'💬 عام'},
];
type Presentation = { choices?: {id:string;label:string}[]; question?:string; showQuestion?:boolean; textSize?:number; audio?:boolean; pair?:string[]; plan?:boolean; announcement?:string;awaitNext?:boolean;placementId?:number };

export function StudentChat({ mode, chatId, lang = 'ar', preferences = {} }: { mode: Mode; chatId: number; lang?: Lang; preferences?:Record<string,unknown> }) {
  const s = t(lang);
  const la = langAttrs(lang);
  const qc = useQueryClient();
  const key = getListStudentMessagesQueryKey(chatId);
  const hist = useListStudentMessages(chatId, { query: { queryKey: key, retry: false } });
  const send = useSendStudentMessage();
  const changeSubject = useUpdateChatSubject();
  const subject = hist.data?.chat.subject ?? 'general';
  const selectSubject = (value:ChatSubject) => {
    if (value===subject || changeSubject.isPending) return;
    changeSubject.mutate({id:chatId,data:{subject:value}}, {onSuccess:chat=>{
      qc.setQueryData(key,(previous:typeof hist.data)=>previous?{...previous,chat}:previous);
      qc.invalidateQueries({queryKey:getListStudentChatsQueryKey()});
    }});
  };
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const voice = useDyslexiaVoice(mode === 'dyslexia' || mode === 'learning', text => {
    setDraft(text); setVoiceQuestion(text); submit(text);
  }, () => input.current?.focus(), lang);
  const scroller = useRef<HTMLDivElement>(null);
  const messages = useMemo<Msg[]>(() => (hist.data?.messages ?? []) as Msg[], [hist.data]);
  const last = messages[messages.length - 1];
  const pendingRetry = last && last.role === 'student' ? last : null;
  const lastAi = last && last.role === 'ai' ? last : null;
  const lastAiSteps = lastAi && mode === 'learning' ? parseSteps(lastAi.content) : null;
  const lastAiProg = lastAi ? Math.min(progress[lastAi.id] ?? 0, (lastAiSteps?.length ?? 1) - 1) : 0;
  const currentPresentation=lastAi?.presentation as Presentation|null;
  const placementCurrent=currentPresentation?.placementId===preferences.placementId;
  const locked = !!lastAiSteps && (lastAiProg < lastAiSteps.length - 1 || placementCurrent&&currentPresentation?.awaitNext===true);
  const busy = send.isPending || changeSubject.isPending;
  const count = messages.length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, busy, lastAiProg]);

  const submit = (content: string, retryMessageId?: number, practice?:{practiceMessageId:number;practiceChoiceId:string}) => {
    const text = content.trim();
    if (!text || busy) return;
    setFailed(false);
    send.mutate({ id: chatId, data: retryMessageId ? { content: text, retryMessageId } : { content: text, ...practice } }, {
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
      onError: () => { setVoiceQuestion(''); setFailed(true); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({queryKey:getGetWarmupQueryKey(mode)}); qc.invalidateQueries({queryKey:getGetStudentSessionQueryKey()}); },
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
    if (m.role === 'student') return <div key={m.id} dir="auto" className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid={`msg-student-${m.id}`}>{m.content}</div>;
    if (mode === 'learning') {
      const steps = parseSteps(m.content);
      const isLast = lastAi?.id === m.id;
      const p = isLast ? lastAiProg : steps.length - 1;
      const presentation=m.presentation as Presentation|null;
      return <div key={m.id} className="self-end max-w-[90%] flex flex-col gap-3">
        <LearningSteps steps={steps} progress={p} active={isLast} onNext={() => setProgress(o => ({ ...o, [m.id]: p + 1 }))} testId={`msg-ai-${m.id}`} lang={lang} />
        {presentation?.audio && <SpeakerButton state={voice.audioState?.id===m.id?voice.audioState.state:null} onClick={()=>{voice.unlock();void voice.play(m.id);}} testId={`button-speaker-${m.id}`} lang={lang}/>}
        {isLast&&p===steps.length-1&&presentation?.awaitNext&&presentation.placementId===preferences.placementId && <Button onClick={()=>submit(lang==="ar"?"التالي":"Next")} disabled={busy} data-testid="button-next-learner-step">{s.next}</Button>}
        {practiceControls(m,isLast && p===steps.length-1)}
      </div>;
    }
    return (
      <div key={m.id} className="self-end max-w-[90%] flex items-start gap-3" data-testid={`msg-ai-${m.id}`}>
        <div className="flex flex-col gap-3">
          <ModeReply mode={mode}><span style={dys ? {fontSize:Number((m.presentation as Presentation|null)?.textSize??preferences.text_size??22)}:undefined}>{m.content}</span></ModeReply>
          {practiceControls(m,lastAi?.id===m.id)}
        </div>
        {dys && <SpeakerButton state={voice.audioState?.id === m.id ? voice.audioState.state : null} disabled={voice.phase !== 'idle' || (voice.audioState?.id === m.id && voice.audioState.state === 'loading')} onClick={() => {
          // The displayed Stop control must never enter the playback/request path.
          if (voice.audioState?.id === m.id && voice.audioState.state === 'playing') voice.stopPlayback();
          else void voice.play(m.id);
        }} testId={`button-speaker-${m.id}`} lang={lang} />}
      </div>
    );
  };
  function practiceControls(m:Msg,active:boolean) {
    const p=m.presentation as Presentation|null;
    if(!p?.choices?.length) return null;
    return <div className="flex flex-col gap-3" data-testid={`practice-${m.id}`}>
      {p.announcement && <p dir="auto" data-testid={`practice-announcement-${m.id}`}>{p.announcement}</p>}
      {p.showQuestion && <p dir="auto" data-testid={`practice-question-${m.id}`}>{p.question}</p>}
      <div className="flex flex-wrap gap-3">
        {p.choices.map(c=><Button key={c.id} variant={aut?'secondary':'primary'} disabled={!active||p.placementId!==preferences.placementId||busy||!!pendingRetry||voiceBusy} style={p.pair?{fontSize:40,minHeight:72}:undefined}
          onClick={()=>{if(dys)voice.unlock();submit(c.label,undefined,{practiceMessageId:m.id,practiceChoiceId:c.id});}} data-testid={`practice-choice-${m.id}-${c.id}`}>{c.label}</Button>)}
      </div>
    </div>;
  }

  const composer = (
    <form onSubmit={e => { e.preventDefault(); if (!locked && !voiceBusy) { if (dys) voice.unlock(); submit(draft); } }} className="flex flex-col gap-3">
      {dys && (
        <MicButton listening={voice.phase === 'listening'} thinking={thinking} disabled={thinking && voice.phase !== 'listening' || !!pendingRetry && voice.phase === 'idle'} onTap={() => voice.tap()} error={voice.error} onRetry={voice.retryTranscription} lang={lang} />
      )}
      <div className={cx("flex gap-3",dys&&preferences.input==="keyboard"?"order-first":"")}>
        <input ref={input} autoFocus={dys&&preferences.input==="keyboard"} value={draft} onChange={e => setDraft(e.target.value)} disabled={locked || busy || voiceBusy} maxLength={2000} aria-label={s.typeMsg} placeholder={locked ? s.nextFirst : s.typeHere} className={cx('flex-1 min-w-0 min-h-14 px-5 rounded-full border border-navy bg-card text-navy', dys ? 'text-base' : 'text-lg')} data-testid="input-message" />
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
        <h1 className="text-xl line-clamp-2" dir="auto">{hist.data?.chat.icon ?? '💬'} {hist.data?.chat.title}</h1>
      </header>
      {aut && <AutismSchedule lang={lang} />}
      {aut && !!preferences.reply_length && <p className="px-4 py-2 bg-mist" data-testid="personalized-session-plan">{lang==="ar"?"اليوم رح نعمل: 1) نتعلّم 2) نتدرّب 3) خلصنا ✅":"Today we will: 1) Learn 2) Practise 3) Finish ✅"}</p>}
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={aut ? { scrollBehavior: 'auto' } : undefined} data-testid="chat-scroll">
        {messages.length === 0 && <p className="bg-mist rounded-2xl p-5" style={textStyle} data-testid="empty-messages">{s.emptyChat}</p>}
        {messages.map(bubble)}
        {dys && voiceQuestion && <div dir="auto" className="self-start max-w-[85%] bg-mist rounded-3xl px-5 py-3" style={textStyle} data-testid="voice-transcript">{voiceQuestion}</div>}
      </div>
      <div className="shrink-0 px-4 pb-4 pt-2 flex flex-col gap-2">
        {status}
        <div dir="rtl" role="group" aria-label="المادة" className="flex gap-2 overflow-x-auto py-1" data-testid="subject-picker">
          {subjects.map(item=><button key={item.value} type="button" aria-pressed={subject===item.value}
            disabled={busy||voice.phase!=='idle'} onClick={()=>selectSubject(item.value)} data-testid={`subject-${item.value}`}
            className="shrink-0 rounded-full px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-wait"
            style={{minHeight:56,background:subject===item.value?'#2D4059':'#FFFFFF',color:subject===item.value?'#FFFFFF':'#2D4059',border:`1px solid ${subject===item.value?'#2D4059':'#E5EEF5'}`,animation:'none',transition:'none'}}>
            {item.label}
          </button>)}
        </div>
        {changeSubject.isError&&<p role="alert">{lang==='ar'?'تعذّر حفظ المادة. اخترها مرة أخرى.':'Could not save the subject. Please select it again.'}</p>}
        {composer}
      </div>
    </div>
  );
}
