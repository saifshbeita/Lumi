import { useState, type FormEvent } from 'react';
import { Link, Redirect, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdultSession, useLoginAdult, useSignupAdult, getGetAdultSessionQueryKey } from '@workspace/api-client-react';
import { Button, Card, ErrorBox, Field, Loading, Logo, cx } from '@/components/lumi';
import { errMsg, brand } from '@/lib/util';
import { useTranslation } from 'react-i18next';
import { usePublicLanguage } from '@/i18n';
import { LangToggle } from '@/components/lang-toggle';

export default function Auth() {
  const search = new URLSearchParams(useSearch());
  const r = search.get('role');
  const role: 'teacher' | 'parent' | null = r === 'teacher' || r === 'parent' ? r : null;
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [lang, setLang] = usePublicLanguage();
  const session = useGetAdultSession();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', school: '' });
  const login = useLoginAdult();
  const signup = useSignupAdult();
  const busy = login.isPending || signup.isPending;

  if (!role) return <Redirect to="/" />;
  if (session.isLoading) return <Loading label={t('common.loading')} />;
  if (session.data?.adult) return <Redirect to="/adult" />;

  const done = (adult: unknown) => {
    qc.clear();
    qc.setQueryData(getGetAdultSessionQueryKey(), { adult });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (tab === 'signup' && !f.name.trim()) return setError(t('auth.nameRequired'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError(t('auth.emailInvalid'));
    if (f.password.length < 8) return setError(t('auth.passwordShort'));
    if (tab === 'signup' && role === 'teacher' && !f.school.trim()) return setError(t('auth.schoolRequired'));
    if (tab === 'login') {
      login.mutate({ data: { email: f.email.trim(), password: f.password, role } }, { onSuccess: done, onError: (er) => setError(errMsg(er, t((er as { status?: number }).status === 429 ? 'auth.tooMany' : 'auth.loginFail'))) });
    } else {
      signup.mutate({ data: { name: f.name.trim(), email: f.email.trim(), password: f.password, role, ...(role === 'teacher' && f.school.trim() ? { school: f.school.trim() } : {}), language: lang } }, { onSuccess: done, onError: (er) => setError(errMsg(er, t((er as { status?: number }).status === 429 ? 'auth.tooMany' : 'auth.signupFail'))) });
    }
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="bg-navy text-white p-8 lg:p-14 flex flex-col justify-between gap-8">
        <div className="flex items-center justify-between gap-4 flex-wrap"><Link href="/" className="inline-flex self-start rounded-full bg-mist px-4 py-2" data-testid="link-home"><Logo size={40} /></Link><LangToggle value={lang} onChange={(l) => { setError(''); setLang(l); }} /></div>
        <div>
          <h1 className="text-4xl lg:text-5xl !text-white mb-4">{t(role === 'teacher' ? 'auth.teacherSpace' : 'auth.parentSpace')}</h1>
          <p className="text-xl">{t(role === 'teacher' ? 'auth.teacherBlurb' : 'auth.parentBlurb')}</p>
        </div>
        <img src={brand('lumi-full.png')} alt="" className="w-40 lg:w-56 object-contain bg-mist rounded-3xl p-4" />
      </aside>
      <main className="p-6 lg:p-14 flex items-center">
        <Card className="w-full max-w-lg mx-auto !p-8">
          <div role="tablist" aria-label={t('auth.tabs')} className="grid grid-cols-2 gap-2 bg-mist rounded-full p-1 mb-8">
            {(['login', 'signup'] as const).map((k) => (
              <button key={k} role="tab" type="button" id={`tab-${k}`} aria-selected={tab === k} aria-controls="auth-panel" data-testid={`tab-${k}`}
                onClick={() => { setTab(k); setError(''); }}
                className={cx('min-h-14 rounded-full text-lg cursor-pointer', tab === k ? 'bg-navy text-white' : 'text-navy')}>
                {k === 'login' ? t('auth.login') : t('auth.signup')}
              </button>
            ))}
          </div>
          <form id="auth-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <h2 className="text-3xl">{tab === 'login' ? t('auth.welcomeBack') : t('auth.createTitle')}</h2>
            {tab === 'signup' && <Field id="name" label={t('auth.name')} autoComplete="name" required maxLength={100} value={f.name} onChange={set('name')} data-testid="input-name" />}
            <Field id="email" label={t('auth.email')} type="email" autoComplete="email" required value={f.email} onChange={set('email')} data-testid="input-email" />
            <Field id="password" label={t('auth.password')} type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={72} hint={tab === 'signup' ? t('auth.passwordHint') : undefined} value={f.password} onChange={set('password')} data-testid="input-password" />
            {tab === 'signup' && role === 'teacher' && <Field id="school" label={t('auth.school')} required autoComplete="organization" maxLength={200} value={f.school} onChange={set('school')} data-testid="input-school" />}
            {error && <ErrorBox>{error}</ErrorBox>}
            <Button type="submit" disabled={busy} data-testid="button-submit" className="text-xl">{busy ? t('common.wait') : tab === 'login' ? t('auth.login') : t('auth.createAccount')}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
