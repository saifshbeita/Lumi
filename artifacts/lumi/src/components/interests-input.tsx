import { useState, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n, { type Lang } from '@/i18n';
import { cx } from '@/components/lumi';

export const MAX_INTERESTS = 5;
const MAX_LEN = 40;

/** Optional chips input for a child's interests (max 5, each 1-40 chars). */
export function InterestsInput({ id, value, onChange, label, hint, disabled, dir, compact = false, lang }: {
  id: string; value: string[]; onChange: (v: string[]) => void; label?: string; hint?: string; disabled?: boolean; dir?: 'rtl' | 'ltr' | 'auto'; compact?: boolean; lang?: Lang;
}) {
  const { t: active } = useTranslation();
  const tr = lang ? i18n.getFixedT(lang) : active;
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const full = value.length >= MAX_INTERESTS;
  const add = () => {
    const parts = draft.split(/[,،]/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= MAX_INTERESTS) { setNote(tr('interests.max', { max: MAX_INTERESTS })); break; }
      const t = p.slice(0, MAX_LEN);
      if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
    setDraft('');
    if (next.length < MAX_INTERESTS) setNote('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="flex flex-col gap-2" data-testid={`field-${id}`}>
      <label htmlFor={id} className={cx('text-navy', compact && 'sr-only')}>{label ?? tr('interests.label')}</label>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 min-h-11 ps-4 pe-1 rounded-full border border-navy bg-mist" dir="auto" data-testid={`chip-interest-${i}`}>
            {v}
            <button type="button" disabled={disabled} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={tr('interests.remove', { item: v })} className="inline-flex items-center justify-center size-9 rounded-full disabled:opacity-50" data-testid={`button-remove-interest-${i}`}><X size={18} aria-hidden /></button>
          </span>
        ))}
        {!full && (
          <span className="inline-flex flex-1 min-w-48 gap-2">
            <input id={id} value={draft} dir={dir} disabled={disabled} maxLength={MAX_LEN * 2} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={compact ? tr('interests.compactPlaceholder') : tr('interests.placeholder')} className="flex-1 min-w-0 min-h-14 px-5 rounded-full border border-navy bg-card text-navy text-lg" data-testid="input-interests" />
            <button type="button" disabled={disabled || !draft.trim()} onClick={add} className="inline-flex items-center gap-1 min-h-14 px-5 rounded-full border border-navy bg-card disabled:opacity-50" data-testid="button-add-interest"><Plus size={18} aria-hidden />{tr('interests.add')}</button>
          </span>
        )}
      </div>
      {!compact && <p className="text-base" data-testid="text-interests-hint">{full ? tr('interests.full', { max: MAX_INTERESTS }) : note || (hint ?? tr('interests.hint'))}</p>}
    </div>
  );
}
