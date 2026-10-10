import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import type { Mode } from '@workspace/api-client-react';
import { AdultShell } from '../adult-shell';
import { Button, ErrorBox, SkeletonBlock, cx } from '@/components/lumi';
import { InterestsInput } from '@/components/interests-input';
import { ModeReply, SpeakerButton, LearningSteps, AutismSchedule, MicButton, parseSteps } from '@/pages/student/mode-parts';
import { useDemoCompare, type ColumnState } from './use-demo-compare';
import { useDemoAudio } from './use-demo-audio';
import { useDemoRecorder } from './use-demo-recorder';

const PRESETS = ['شو الفرق بين ب و ت؟', 'كيف بنجمع ٧ + ٥؟', 'ليش السما لونها أزرق؟'];
const COLUMNS: { mode: Mode; title: string }[] = [
  { mode: 'dyslexia', title: 'Dyslexia: voice-first' },
  { mode: 'learning', title: 'Learning difficulties: small steps' },
  { mode: 'autism', title: 'Autism: calm and literal' },
];

function LearningColumn({ content, resetKey }: { content: string; resetKey: number }) {
  const steps = parseSteps(content);
  const [p, setP] = useState(0);
  useEffect(() => setP(0), [resetKey, content]);
  return <LearningSteps steps={steps} progress={Math.min(p, steps.length - 1)} onNext={() => setP((x) => x + 1)} compact className="w-full" testId="reply-learning" />;
}

function Demo() {
  const [question, setQuestion] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const { columns, requestId, running, run } = useDemoCompare();
  const audio = useDemoAudio();
  const interestsRef = useRef(interests); interestsRef.current = interests;

  const go = (q: string) => {
    if (!q.trim()) return;
    audio.reset();
    void run(q, interestsRef.current);
  };
  const rec = useDemoRecorder((text) => { setQuestion(text); go(text); }, () => input.current?.focus());

  // Autoplay dyslexia reply once per request as soon as it arrives.
  const spokenFor = useRef(0);
  const dys = columns.dyslexia;
  useEffect(() => {
    if (dys.status === 'success' && dys.content && spokenFor.current !== requestId) {
      spokenFor.current = requestId;
      void audio.speak(dys.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dys.status, dys.content, requestId]);

  const submit = (e: FormEvent) => { e.preventDefault(); audio.unlock(); go(question); };
  const preset = (q: string) => { audio.unlock(); setQuestion(q); go(q); };
  const micTap = () => { audio.unlock(); if (rec.phase === 'idle') audio.stop(); void rec.tap(); };
  const listening = rec.phase === 'listening';

  const body = (mode: Mode, c: ColumnState) => {
    if (c.status === 'idle') return <p className="bg-mist rounded-2xl p-5 text-xl" data-testid={`empty-${mode}`}>Pick a question above. The reply appears here.</p>;
    if (c.status === 'loading') return <div role="status" aria-label="Loading" className="flex flex-col gap-3" data-testid={`loading-${mode}`}><SkeletonBlock className="h-20" /><SkeletonBlock className="h-32" /><p className="text-xl" dir="rtl" lang="ar">لومي يكتب...</p></div>;
    if (c.status === 'error') return <div className="flex flex-col gap-3"><ErrorBox><span data-testid={`text-error-${mode}`}>{c.error}</span></ErrorBox><Button variant="secondary" disabled={running} onClick={() => preset(question)} data-testid={`button-retry-${mode}`}>Try again</Button></div>;
    const content = c.content ?? '';
    if (mode === 'learning') return <LearningColumn content={content} resetKey={requestId} />;
    if (mode === 'autism') return <div className="flex flex-col gap-3"><AutismSchedule className="text-xl" /><ModeReply mode="autism" className="text-xl" testId="reply-autism">{content}</ModeReply></div>;
    return <ModeReply mode="dyslexia" className="w-full" testId="reply-dyslexia">{content}</ModeReply>;
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0" data-testid="page-demo">
      <div className="shrink-0 flex items-start gap-5">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Link href="/adult" className="inline-flex items-center gap-2 min-h-14 rounded-full pe-2 shrink-0" data-testid="link-back"><ArrowLeft size={22} className="text-steel" aria-hidden />Back</Link>
            <h1 className="text-3xl shrink-0" data-testid="text-title">Live demo</h1>
            <form onSubmit={submit} className="flex-1 min-w-0 flex gap-3" dir="rtl" lang="ar">
              <input ref={input} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} aria-label="اكتب السؤال" placeholder="اكتب سؤالاً بالعربية" disabled={rec.phase !== 'idle'} className="flex-1 min-w-0 min-h-14 px-5 rounded-full border border-navy bg-card text-navy text-2xl" data-testid="input-demo-question" />
              <Button type="submit" disabled={!question.trim() || rec.phase !== 'idle'} className="text-xl" data-testid="button-demo-compare">{running ? 'جار المقارنة...' : 'قارن'}</Button>
            </form>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap" dir="rtl" lang="ar">
              {PRESETS.map((q, i) => (
                <button key={q} type="button" onClick={() => preset(q)} disabled={rec.phase !== 'idle'} className={cx('min-h-12 px-3 rounded-full border border-navy text-lg disabled:opacity-50', question === q ? 'bg-navy text-white' : 'bg-mist')} data-testid={`button-preset-${i}`}>{q}</button>
              ))}
            </div>
            <div className="flex-1 min-w-72"><InterestsInput id="demo-interests" value={interests} onChange={setInterests} compact /></div>
          </div>
        </div>
        <div dir="rtl" lang="ar" className="shrink-0 w-32">
          <MicButton listening={listening} thinking={rec.phase === 'thinking'} disabled={rec.phase === 'thinking'} onTap={micTap} error={rec.error} onRetry={rec.retry} showHint={false} />
        </div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(({ mode, title }) => {
          const c = columns[mode];
          return (
            <section key={mode} className="min-h-0 flex flex-col bg-card border border-border rounded-3xl" data-testid={`column-${mode}`} aria-labelledby={`h-${mode}`}>
              <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-border min-h-24">
                <div className="min-w-0">
                <h2 id={`h-${mode}`} className="text-xl leading-tight">{title}</h2>
                <span className="inline-block mt-1 text-base bg-mist rounded-full px-3 py-1" data-testid={`status-${mode}`} data-status={c.status}>
                  {c.status === 'loading' ? 'Thinking' : c.status === 'success' ? 'Ready' : c.status === 'error' ? 'Failed' : 'Waiting'}
                  {c.ms != null && <span data-testid={`text-timing-${mode}`} data-ms={c.ms}> · {(c.ms / 1000).toFixed(1)}s</span>}
                </span>
                </div>
                {mode === 'dyslexia' && c.status === 'success' && <SpeakerButton state={audio.state} disabled={audio.state === 'loading'} onClick={() => audio.toggle(c.content ?? '')} testId="button-speaker-demo" />}
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 text-xl" dir="rtl" lang="ar" aria-live="polite">{body(mode, c)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return <AdultShell layout="demo">{() => <Demo />}</AdultShell>;
}
