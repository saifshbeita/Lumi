import { useState, type FormEvent } from 'react';
import { Link, Redirect, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdultSession, useLoginAdult, useSignupAdult, getGetAdultSessionQueryKey } from '@workspace/api-client-react';
import { Button, Card, ErrorBox, Field, Loading, Logo, cx } from '@/components/lumi';
import { errMsg, brand } from '@/lib/util';

export default function Auth() {
  const search = new URLSearchParams(useSearch());
  const r = search.get('role');
  const role: 'teacher' | 'parent' | null = r === 'teacher' || r === 'parent' ? r : null;
  const qc = useQueryClient();
  const session = useGetAdultSession();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', school: '' });
  const login = useLoginAdult();
  const signup = useSignupAdult();
  const busy = login.isPending || signup.isPending;

  if (!role) return <Redirect to="/" />;
  if (session.isLoading) return <Loading />;
  if (session.data?.adult) return <Redirect to="/adult" />;

  const done = (adult: unknown) => {
    qc.clear();
    qc.setQueryData(getGetAdultSessionQueryKey(), { adult });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (f.password.length < 8) return setError('Your password needs at least 8 characters.');
    if (tab === 'login') {
      login.mutate({ data: { email: f.email, password: f.password, role } }, { onSuccess: done, onError: (er) => setError(errMsg(er, 'We could not log you in. Check your email, password and role.')) });
    } else {
      const data = { name: f.name.trim(), email: f.email, password: f.password, role: role as 'teacher' | 'parent', ...(role === 'teacher' && f.school.trim() ? { school: f.school.trim() } : {}) };
      signup.mutate({ data }, { onSuccess: done, onError: (er) => setError(errMsg(er, 'We could not create your account. Try a different email.')) });
    }
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const label = role === 'teacher' ? 'Teacher' : 'Parent';

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="bg-navy text-white p-8 lg:p-14 flex flex-col justify-between gap-8">
        <Link href="/" className="inline-flex self-start rounded-full bg-mist px-4 py-2" data-testid="link-home"><Logo size={40} /></Link>
        <div>
          <h1 className="text-4xl lg:text-5xl !text-white mb-4">{label} space</h1>
          <p className="text-xl">{role === 'teacher' ? 'Add your students and choose the mode that fits each of them.' : 'Create your child\u2019s account and guide how Lumi supports them.'}</p>
        </div>
        <img src={brand('lumi-full.png')} alt="" className="w-40 lg:w-56 object-contain bg-mist rounded-3xl p-4" />
      </aside>
      <main className="p-6 lg:p-14 flex items-center">
        <Card className="w-full max-w-lg mx-auto !p-8">
          <div role="tablist" aria-label="Login or sign up" className="grid grid-cols-2 gap-2 bg-mist rounded-full p-1 mb-8">
            {(['login', 'signup'] as const).map((t) => (
              <button key={t} role="tab" type="button" id={`tab-${t}`} aria-selected={tab === t} aria-controls="auth-panel" data-testid={`tab-${t}`}
                onClick={() => { setTab(t); setError(''); }}
                className={cx('min-h-14 rounded-full text-lg cursor-pointer', tab === t ? 'bg-navy text-white' : 'text-navy')}>
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
          <form id="auth-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} onSubmit={submit} className="flex flex-col gap-5" noValidate={false}>
            <h2 className="text-3xl">{tab === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            {tab === 'signup' && <Field id="name" label="Your name" autoComplete="name" required maxLength={100} value={f.name} onChange={set('name')} data-testid="input-name" />}
            <Field id="email" label="Email" type="email" autoComplete="email" required value={f.email} onChange={set('email')} data-testid="input-email" />
            <Field id="password" label="Password" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={72} hint={tab === 'signup' ? 'At least 8 characters.' : undefined} value={f.password} onChange={set('password')} data-testid="input-password" />
            {tab === 'signup' && role === 'teacher' && <Field id="school" label="School" required autoComplete="organization" maxLength={200} value={f.school} onChange={set('school')} data-testid="input-school" />}
            {error && <ErrorBox>{error}</ErrorBox>}
            <Button type="submit" disabled={busy} data-testid="button-submit" className="text-xl">{busy ? 'One moment...' : tab === 'login' ? 'Log in' : 'Create account'}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
