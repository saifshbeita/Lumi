import i18n, { asLang, localeOf, type Lang } from '@/i18n';

export function relativeTime(iso: string | null | undefined, now = Date.now(), lang: Lang = asLang(i18n.language)): string {
  const tr = i18n.getFixedT(lang);
  if (!iso) return tr('time.never');
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return tr('time.never');
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return tr('time.justNow');
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'always' });
  const m = Math.round(s / 60);
  if (m < 60) return rtf.format(-m, 'minute');
  const h = Math.round(m / 60);
  if (h < 24) return rtf.format(-h, 'hour');
  const d = Math.round(h / 24);
  if (d < 30) return rtf.format(-d, 'day');
  return new Date(iso).toLocaleDateString(localeOf(lang));
}
