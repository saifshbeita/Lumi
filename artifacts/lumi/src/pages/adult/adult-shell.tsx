import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { asLang, setLanguage, useLang, type Lang } from '@/i18n';
import { LangToggle } from '@/components/lang-toggle';
import { Link, Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Presentation } from 'lucide-react';
import { useGetAdultSession, useLogoutAdult, useUpdateAdultLanguage, getGetAdultSessionQueryKey } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, Logo } from '@/components/lumi';

export type AdultCtx = { name: string; role: 'teacher' | 'parent' };

export function AdultShell({ children, layout = 'default', showDemoLink = false }: { children: (a: AdultCtx) => ReactNode; layout?: 'default' | 'demo'; showDemoLink?: boolean }) {
  const demo = layout === 'demo';
  const qc = useQueryClient();
  const session = useGetAdultSession();
  const logout = useLogoutAdult();
  const updateLang = useUpdateAdultLanguage();
  const { t } = useTranslation();
  const lang = useLang();
  const [langErr, setLangErr] = useState(false);
  const [savingLang, setSavingLang] = useState(false);
  const adult = session.data?.adult;
  const adultLang = adult ? asLang(adult.language) : null;
  // Adult pages follow the adult's saved language; /demo manages its own language and is skipped.
  // Returning from /demo re-runs this (demo flips false) and restores the saved language.
  useEffect(() => { if (adultLang && !demo) setLanguage(adultLang); }, [adultLang, demo]);
  if (session.isLoading) return <Loading />;
  if (session.isError) return <div className="p-6 max-w-lg mx-auto"><ErrorBox>{t('adult.sessionFail')}</ErrorBox><Button className="mt-4" onClick={() => session.refetch()}>{t('common.tryAgain')}</Button></div>;
  if (!adult) return <Redirect to="/" />;
  const changeLang = (l: Lang) => {
    if (l === lang || savingLang) return;
    const prev = lang;
    setLangErr(false); setSavingLang(true); setLanguage(l);
    updateLang.mutate({ data: { language: l } }, {
      onSuccess: (a) => qc.setQueryData(getGetAdultSessionQueryKey(), { adult: a }),
      onError: () => { setLanguage(prev); setLangErr(true); },
      onSettled: () => setSavingLang(false),
    });
  };
  const out = () => logout.mutate(undefined, { onSettled: () => { qc.clear(); qc.setQueryData(getGetAdultSessionQueryKey(), { adult: null }); } });
  return (
    <div className={demo ? 'min-h-[100dvh] md:h-[100dvh] flex flex-col md:overflow-hidden' : 'min-h-[100dvh]'}>
      <header className={demo ? 'shrink-0 bg-card border-b border-border' : 'bg-card border-b border-border'}>
        <div className={demo ? 'px-6 py-2 flex items-center justify-between gap-4 flex-wrap' : 'max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap'}>
          <Link href="/adult" data-testid="link-dashboard" className="rounded-full"><Logo /></Link>
          <div className="flex items-center gap-4">
            {showDemoLink && !demo && <Link href="/demo" className="inline-flex items-center gap-2 min-h-14 px-6 rounded-full border border-navy bg-card" data-testid="link-live-demo"><Presentation size={20} aria-hidden className="text-steel" />{t('adult.liveDemo')}</Link>}
            <p data-testid="text-adult-name" className="hidden sm:block">{adult.name} <span className="bg-mist rounded-full px-3 py-1 text-base">{t(adult.role === 'teacher' ? 'adult.teacher' : 'adult.parent')}</span></p>
            {!demo && <LangToggle value={lang} onChange={changeLang} disabled={savingLang} testId="toggle-adult-language" />}
            <Button variant="secondary" onClick={out} disabled={logout.isPending} data-testid="button-logout"><LogOut size={20} aria-hidden className="text-steel" />{t('common.logout')}</Button>
          </div>
        </div>
        {langErr && <div className="max-w-6xl mx-auto px-6 pb-3"><ErrorBox>{t('lang.saveFail')}</ErrorBox></div>}
      </header>
      <main className={demo ? 'flex-1 min-h-0 min-w-0 w-full px-6 py-4' : 'max-w-6xl mx-auto px-6 py-10'}>{children({ name: adult.name, role: adult.role })}</main>
    </div>
  );
}
