import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/components/lumi';
import type { Lang } from '@/i18n';

/** AR | EN toggle. Labels are language names so each option reads correctly in either UI language. */
export function LangToggle({ value, onChange, label, disabled, testId = 'toggle-language' }: { value: Lang; onChange: (l: Lang) => void; label?: string; disabled?: boolean; testId?: string }) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label ?? t('lang.toggle')} dir="ltr" className="inline-flex items-center gap-1 rounded-full border border-navy bg-card p-1" data-testid={testId}>
      {(['ar', 'en'] as const).map((l, i) => (
        <Fragment key={l}>
          {i === 1 && <span aria-hidden className="text-steel">|</span>}
          <button type="button" disabled={disabled} aria-pressed={value === l} aria-label={t(l === 'ar' ? 'lang.nameAr' : 'lang.nameEn')} onClick={() => onChange(l)}
            className={cx('min-h-11 min-w-11 px-3 rounded-full cursor-pointer disabled:opacity-50', value === l ? 'bg-navy text-white' : 'text-navy')} data-testid={`${testId}-${l}`}>
            {t(l === 'ar' ? 'lang.ar' : 'lang.en')}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
