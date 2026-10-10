import { useLayoutEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import ar from '../client/src/locales/ar.json';
import en from '../client/src/locales/en.json';

export type Lang = 'ar' | 'en';
export const asLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'ar');
export const dirOf = (l: Lang) => (l === 'ar' ? 'rtl' : 'ltr');
/** Locale for dates and numbers. Latin digits keep numbers and PINs readable in both languages. */
export const localeOf = (l: Lang) => (l === 'ar' ? 'ar-u-nu-latn' : 'en-GB');

const PUBLIC_KEY = 'lumi-lang';
export function readPublicLang(): Lang {
  try { return asLang(localStorage.getItem(PUBLIC_KEY)); } catch { return 'ar'; }
}
export function storePublicLang(l: Lang) {
  try { localStorage.setItem(PUBLIC_KEY, l); } catch { /* storage unavailable */ }
}

function applyDocument(lng: string) {
  const l = asLang(lng);
  if (typeof document === 'undefined') return;
  document.documentElement.lang = l;
  document.documentElement.dir = dirOf(l);
  document.title = i18n.getFixedT(l)('meta.title');
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: readPublicLang(),
  fallbackLng: 'ar',
  supportedLngs: ['ar', 'en'],
  interpolation: { escapeValue: false },
  initAsync: false,
});
i18n.on('languageChanged', applyDocument);
applyDocument(i18n.language);

export function setLanguage(l: Lang) {
  if (asLang(i18n.language) !== l || i18n.language !== l) void i18n.changeLanguage(l);
}

/** Active UI language; re-renders on change. */
export function useLang(): Lang {
  const { i18n: inst } = useTranslation();
  return asLang(inst.language);
}

/** Public pages: apply the stored AR | EN choice and expose a setter that persists it. */
export function usePublicLanguage(): [Lang, (l: Lang) => void] {
  const lang = useLang();
  useLayoutEffect(() => { setLanguage(readPublicLang()); }, []);
  return [lang, (l: Lang) => { storePublicLang(l); setLanguage(l); }];
}

export default i18n;
