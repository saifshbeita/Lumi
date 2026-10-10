import type { CSSProperties, ReactNode } from 'react';
import { Mic, Volume2, Square, RotateCcw } from 'lucide-react';
import { Button, ErrorBox, cx } from '@/components/lumi';
import type { Mode } from '@/lib/tokens';

/** Shared presentational pieces for student modes. Used by student chat and the adult /demo page. */

export const DYSLEXIA_TEXT_STYLE: CSSProperties = { fontSize: '22px', letterSpacing: '0.08em', lineHeight: 1.9 };
export const modeTextStyle = (mode: Mode): CSSProperties | undefined => (mode === 'dyslexia' ? DYSLEXIA_TEXT_STYLE : undefined);

export function parseSteps(c: string): string[] {
  try {
    const j = JSON.parse(c) as { steps?: unknown };
    if (Array.isArray(j.steps)) {
      const s = j.steps.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (s.length) return s;
    }
  } catch { /* single-step fallback */ }
  return [c];
}

/** Plain AI reply bubble (dyslexia and autism modes). */
export function ModeReply({ mode, children, className, testId }: { mode: Mode; children: ReactNode; className?: string; testId?: string }) {
  return <div className={cx('bg-card border border-border rounded-3xl px-5 py-3 whitespace-pre-line', className)} style={modeTextStyle(mode)} data-testid={testId}>{children}</div>;
}

export type SpeakerState = 'loading' | 'playing' | 'error' | null;
export function SpeakerButton({ state, disabled, onClick, testId }: { state: SpeakerState; disabled?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={state === 'playing' ? 'إيقاف الصوت' : 'استماع للرد'} className={cx('shrink-0 min-h-14 min-w-14 rounded-full border border-navy text-2xl p-3 disabled:opacity-50', state === 'error' ? 'bg-blush' : 'bg-card')} data-testid={testId}>
      {state === 'playing' ? <Square className="mx-auto" aria-hidden /> : state === 'error' ? <RotateCcw className="mx-auto" aria-hidden /> : <Volume2 className="mx-auto" aria-hidden />}
      <span className="block text-base">{state ? ({ playing: 'إيقاف', loading: 'لحظة...', error: 'حاول مجدداً' }[state]) : 'استماع'}</span>
    </button>
  );
}

/**
 * Learning-mode steps with progress dots and the "التالي" button.
 * Default: accumulates previous steps faded (student chat). `compact`: shows only the current step (projector demo).
 */
export function LearningSteps({ steps, progress, active = true, onNext, compact = false, className = 'self-end max-w-[90%]', testId, stepStyle }: {
  steps: string[]; progress: number; active?: boolean; onNext: () => void; compact?: boolean; className?: string; testId?: string; stepStyle?: CSSProperties;
}) {
  const p = active ? progress : steps.length - 1;
  const shown = compact ? [steps[p]] : active ? steps.slice(0, p + 1) : steps;
  const offset = compact ? p : 0;
  return (
    <div className={cx('flex flex-col gap-2', className)} data-testid={testId}>
      {shown.map((s, k) => {
        const i = k + offset;
        return <div key={i} className={cx('bg-card border border-border rounded-3xl px-5 py-3', active && i < p || !active ? 'opacity-50' : '')} style={stepStyle} data-testid={compact ? 'text-current-step' : undefined}>{s}</div>;
      })}
      {active && steps.length > 1 && (
        <div className="flex items-center gap-4">
          <div className="flex gap-2" aria-label={`الخطوة ${p + 1} من ${steps.length}`} data-testid="progress-steps">{steps.map((_, i) => <span key={i} className={cx('w-3 h-3 rounded-full border border-navy', i <= p ? 'bg-navy' : 'bg-card')} />)}</div>
          {p < steps.length - 1 && <Button onClick={onNext} className="text-xl" data-testid="button-next-step">التالي</Button>}
        </div>
      )}
    </div>
  );
}

/** Autism-mode static schedule. */
export function AutismSchedule({ className = 'shrink-0 mx-4 mb-2' }: { className?: string }) {
  return <ol className={cx('flex justify-between border border-border rounded-2xl bg-mist px-4 py-2 list-none', className)} data-testid="schedule"><li>١. نسأل</li><li>٢. نتعلم</li><li>٣. نتدرب</li></ol>;
}

/** Dyslexia-mode microphone button with status and error. */
export function MicButton({ listening, thinking, disabled, onTap, error, onRetry, showHint = true }: {
  listening: boolean; thinking: boolean; disabled?: boolean; onTap: () => void; error?: string; onRetry?: () => void; showHint?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" disabled={disabled} onClick={onTap} aria-label={listening ? 'إيقاف التسجيل' : 'ابدأ التسجيل'} aria-pressed={listening} className={cx('w-24 h-24 rounded-full border border-navy text-4xl disabled:opacity-50', listening ? 'bg-sage' : thinking ? 'bg-mist' : 'bg-sun')} data-testid="button-mic"><Mic size={40} className="mx-auto" aria-hidden /></button>
      <span aria-live="polite" data-testid="voice-status">{listening ? 'لومي يسمع...' : thinking ? 'لومي يفكر...' : 'اضغط لتتحدث'}</span>
      {showHint && <span className="text-base">اضغط مرة أخرى للتوقف · حتى ٣٠ ثانية · صوت لومي مولّد بالذكاء الاصطناعي</span>}
      {error && <ErrorBox>{error}{onRetry && <Button variant="secondary" className="mt-2" onClick={onRetry}>حاول مرة أخرى</Button>}</ErrorBox>}
    </div>
  );
}
