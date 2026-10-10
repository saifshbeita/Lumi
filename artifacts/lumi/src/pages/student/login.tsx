import { useState } from 'react';
import { Link, Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Delete, ArrowRight, ArrowLeft } from 'lucide-react';
import { useGetStudentSession, useLoginStudent, getGetStudentSessionQueryKey } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, cx } from '@/components/lumi';
import { brand, errMsg } from '@/lib/util';
import { asLang, langAttrs, t, type Lang } from '@/lib/student-i18n';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const keyCls = 'min-h-20 rounded-3xl border border-navy bg-card text-3xl cursor-pointer active:bg-mist';

export default function StudentLogin() {
  const qc = useQueryClient();
  const session = useGetStudentSession();
  const login = useLoginStudent();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>(() => asLang(typeof localStorage !== 'undefined' ? localStorage.getItem('lumi-student-lang') : null));
  const s = t(lang);
  const la = langAttrs(lang);
  const pick = (l: Lang) => { setLang(l); setError(''); try { localStorage.setItem('lumi-student-lang', l); } catch { /* ignore */ } };

  const st = session.data?.student;
  if (session.isLoading) return <div {...la}><Loading label={s.loading} /></div>;
  if (st?.conditions[0]) return <Redirect to={`/student/${st.conditions[0]}`} />;

  const press = (d: string) => { setError(''); setPin((p) => (p.length < 4 ? p + d : p)); };
  const submit = () => {
    if (!username.trim()) return setError(s.needUser);
    if (pin.length !== 4) return setError(s.needPin);
    login.mutate({ data: { username: username.trim(), pin, language: lang } }, {
      onSuccess: (student) => { qc.clear(); qc.setQueryData(getGetStudentSessionQueryKey(), { student }); },
      onError: (e) => { setPin(''); setError((e as { status?: number } | null)?.status === 429 ? errMsg(e, s.tooMany) : s.badLogin); },
    });
  };

  return (
    <div {...la} className="min-h-[100dvh] px-4 py-6">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" data-testid="link-home" className="inline-flex items-center gap-2 min-h-14 px-4 rounded-full">{lang === 'ar' ? <ArrowRight size={22} className="text-steel" aria-hidden /> : <ArrowLeft size={22} className="text-steel" aria-hidden />}{s.home}</Link>
          <div role="radiogroup" aria-label={s.language} className="flex gap-2" data-testid="select-language">
            {(['ar', 'en'] as const).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} lang={l} onClick={() => pick(l)} className={cx('min-h-14 px-4 rounded-full border border-navy', lang === l ? 'bg-navy text-white' : 'bg-card')} data-testid={`button-lang-${l}`}>{l === 'ar' ? 'العربية' : 'English'}</button>
            ))}
          </div>
          <img src={brand('lumi-logo.png')} alt={s.logo} className="size-16 object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl mb-2">{s.welcome}</h1>
          <p>{s.loginSub}</p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="username">{s.username}</label>
            <input id="username" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} data-testid="input-username" className="min-h-16 px-6 rounded-full border border-navy bg-card text-2xl text-start" />
          </div>
          <div>
            <p id="pin-label" className="mb-2">{s.pin}</p>
            <div dir="ltr" role="img" aria-labelledby="pin-label" aria-describedby="pin-count" className="flex justify-center gap-4 mb-1" data-testid="pin-dots">
              {[0, 1, 2, 3].map((i) => <span key={i} className={cx('size-6 rounded-full border border-navy', i < pin.length ? 'bg-navy' : 'bg-card')} />)}
            </div>
            <p id="pin-count" className="sr-only" aria-live="polite">{s.pinCount(pin.length)}</p>
          </div>
          <div dir="ltr" className="grid grid-cols-3 gap-3" role="group" aria-label={s.keypad}>
            {KEYS.map((k) => <button key={k} type="button" className={keyCls} onClick={() => press(k)} data-testid={`key-${k}`}>{k}</button>)}
            <button type="button" className={cx(keyCls, 'bg-mist')} onClick={() => { setPin(''); setError(''); }} aria-label={s.clearAll} data-testid="key-clear">{s.clear}</button>
            <button type="button" className={keyCls} onClick={() => press('0')} data-testid="key-0">0</button>
            <button type="button" className={cx(keyCls, 'bg-mist flex items-center justify-center')} onClick={() => setPin((p) => p.slice(0, -1))} aria-label={s.delDigit} data-testid="key-back"><Delete size={32} className="text-navy" aria-hidden /></button>
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button onClick={submit} disabled={login.isPending} className="min-h-16 text-2xl" data-testid="button-enter">{login.isPending ? s.wait : s.enter}</Button>
        </div>
      </div>
    </div>
  );
}
