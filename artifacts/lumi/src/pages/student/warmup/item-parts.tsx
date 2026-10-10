import type { CSSProperties, ReactNode } from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import type { Mode, WarmupItem, WarmupOption, WarmupSection } from '@workspace/api-client-react';
import { cx } from '@/components/lumi';
import { digits, GUIDE, type Chrome } from './config';
import type { AudioStatus } from './use-prompt-audio';

export type Kind = 'choice' | 'preference' | 'multi' | 'open' | 'size' | 'memory' | 'instructions';

/** Exact server item.type values. */
const KINDS: Record<string, Kind> = {
  choice: 'choice', preference: 'preference', multi_pick: 'multi', free_text_optional: 'open',
  size_pick: 'size', sequence_memory: 'memory', ordered_taps: 'instructions',
};
export const kindOf = (item: WarmupItem): Kind => KINDS[item.type] ?? 'choice';

/** Big tap target, no animation, never correctness colour. */
export function OptionButton({ mode, option, selected, disabled, onClick, testId, pictureOnly, big, children }: {
  mode: Mode; option: WarmupOption; selected?: boolean; disabled?: boolean; onClick: () => void; testId: string; pictureOnly?: boolean; big?: boolean; children?: ReactNode;
}) {
  const dys = mode === 'dyslexia';
  const label = option.label_ar ? digits(option.label_ar) : '';
  const textStyle: CSSProperties | undefined = dys || big ? { fontSize: '40px', lineHeight: 1.5 } : { fontSize: '26px', lineHeight: 1.5 };
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected}
      className={cx('w-full rounded-3xl border-2 border-navy px-5 py-3 flex items-center justify-center gap-3 text-navy disabled:cursor-not-allowed',
        dys ? 'min-h-[72px]' : 'min-h-16', selected ? 'bg-navy !text-white' : 'bg-card', disabled && !selected ? 'opacity-60' : '')}
      data-testid={testId}>
      {children ?? <>
        {option.emoji && <span aria-hidden={!!label && !pictureOnly} style={{ fontSize: '44px', lineHeight: 1.2 }}>{option.emoji}</span>}
        {label && !pictureOnly && <span dir="rtl" lang="ar" style={textStyle}>{label}</span>}
        {pictureOnly && label && <span className="sr-only">{label}</span>}
      </>}
    </button>
  );
}

export function Speaker({ status, onClick, disabled, label, c }: { status: AudioStatus; onClick: () => void; disabled?: boolean; label?: string; c: Chrome }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || status === 'loading' || status === 'playing'}
      className={cx('min-h-16 min-w-16 px-5 rounded-full border-2 border-navy text-navy inline-flex items-center justify-center gap-2 text-lg disabled:opacity-50',
        status === 'blocked' ? 'bg-sun' : status === 'error' ? 'bg-blush' : 'bg-card')}
      aria-label={label ?? c.listen} data-status={status} data-testid="button-warmup-audio">
      {status === 'error' ? <RotateCcw aria-hidden /> : <Volume2 aria-hidden size={28} />}
      <span>{status === 'playing' ? c.playing : status === 'blocked' ? c.tapToHear : status === 'error' ? c.noSpeech : label ?? c.listen}</span>
    </button>
  );
}

export function SectionDots({ sections, index }: { sections: WarmupSection[]; index: number }) {
  return (
    <ol className="flex gap-3 list-none p-0" aria-label={`${index + 1} / ${sections.length}`} data-testid="progress-warmup-sections">
      {sections.map((s, i) => (
        <li key={s.id} title={s.title_ar} className={cx('w-4 h-4 rounded-full border-2 border-navy', i === index ? 'bg-navy' : i < index ? 'bg-mist' : 'bg-card')} data-testid={`dot-section-${s.id}`} />
      ))}
    </ol>
  );
}

/** Autism visual schedule: every part plus the fixed final step; current part highlighted. */
export function WarmupSchedule({ sections, index }: { sections: WarmupSection[]; index: number }) {
  return (
    <ol dir="rtl" lang="ar" className="flex flex-col gap-2 list-none p-0" data-testid="schedule-warmup">
      {sections.map((s, i) => (
        <li key={s.id} aria-current={i === index ? 'step' : undefined}
          className={cx('rounded-2xl border-2 px-5 py-3 text-xl flex gap-3', i === index ? 'border-navy bg-navy text-white' : 'border-border bg-card text-navy', i < index && 'opacity-60')}
          data-testid={`schedule-part-${s.id}`}>
          <span>{digits(String(i + 1))}</span><span>{s.title_ar}</span>
        </li>
      ))}
      <li className="rounded-2xl border-2 border-border bg-card px-5 py-3 text-xl text-navy" data-testid="schedule-part-done">{GUIDE.scheduleEnd}</li>
    </ol>
  );
}
