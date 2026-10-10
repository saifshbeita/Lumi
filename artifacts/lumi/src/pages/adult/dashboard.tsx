import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, UserRound } from 'lucide-react';
import { useListStudents, useCreateStudent, getListStudentsQueryKey } from '@workspace/api-client-react';
import { AdultShell } from './adult-shell';
import { InterestsInput } from '@/components/interests-input';
import { Button, Card, ErrorBox, Field, SkeletonBlock, cx } from '@/components/lumi';
import { MODES, type Mode } from '@/lib/tokens';
import { useTranslation } from 'react-i18next';
import { errMsg } from '@/lib/util';

function AddStudent({ parent, onClose }: { parent: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const create = useCreateStudent();
  const [f, setF] = useState({ name: '', username: '', pin: '' });
  const [mode, setMode] = useState<Mode>('dyslexia');
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [assessed, setAssessed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); }, [t]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim()) return setError(t('dashboard.nameRequired'));
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(f.username)) return setError(t('dashboard.usernameInvalid'));
    if (!/^[0-9]{4}$/.test(f.pin)) return setError(t('dashboard.pinInvalid'));
    if (parent && !assessed) return setError(t('dashboard.assessmentRequired'));
    create.mutate({ data: { name: f.name.trim(), username: f.username, pin: f.pin, mode, language, ...(interests.length ? { interests } : {}), ...(parent ? { assessmentConfirmed: true } : {}) } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListStudentsQueryKey() }); onClose(); },
      onError: (er) => setError(errMsg(er, t('dashboard.addFail'))),
    });
  };
  return (
    <Card className="!p-8 mb-8 bg-mist" data-testid="form-add-student">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <h2 className="text-3xl">{t(parent ? 'dashboard.addChild' : 'dashboard.addStudent')}</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Field id="s-name" label={t('dashboard.name')} required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="input-student-name" />
          <Field id="s-user" label={t('dashboard.username')} required autoCapitalize="none" autoComplete="off" hint={t('dashboard.usernameHint')} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} data-testid="input-student-username" />
          <Field id="s-pin" label={t('dashboard.pin')} required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" type="password" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} data-testid="input-student-pin" />
        </div>
        <InterestsInput id="s-interests" value={interests} onChange={setInterests} />
        <fieldset>
          <legend className="mb-2">{t('dashboard.mode')}</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {MODES.map((m) => (
              <label key={m} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', mode === m ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" data-testid={`radio-mode-${m}`} />
                {t(`modes.${m}`)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-base">{t('dashboard.modeHint')}</p>
        </fieldset>
        <fieldset>
          <legend className="mb-2">{t('dashboard.childLanguage')}</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {(['ar', 'en'] as const).map((l) => (
              <label key={l} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', language === l ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} className="sr-only" data-testid={`radio-language-${l}`} />
                {t(l === 'ar' ? 'lang.arabic' : 'lang.english')}
              </label>
            ))}
          </div>
        </fieldset>
        {parent && (
          <label className="flex items-start gap-4 bg-card border border-navy rounded-2xl p-5 cursor-pointer">
            <input type="checkbox" required checked={assessed} onChange={(e) => setAssessed(e.target.checked)} className="size-7 mt-0.5 shrink-0 accent-navy" data-testid="checkbox-assessment" />
            <span>{t('dashboard.assessment')}</span>
          </label>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex gap-3 flex-wrap">
          <Button type="submit" disabled={create.isPending} data-testid="button-save-student">{create.isPending ? t('common.saving') : t('dashboard.createAccount')}</Button>
          <Button variant="secondary" onClick={onClose} data-testid="button-cancel-add">{t('common.cancel')}</Button>
        </div>
      </form>
    </Card>
  );
}

function List({ parent }: { parent: boolean }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const { data, isLoading, isError, refetch } = useListStudents();
  const title = t(parent ? 'dashboard.myChildren' : 'dashboard.myStudents');
  const addLabel = t(parent ? 'dashboard.addChild' : 'dashboard.addStudent');
  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl" data-testid="text-title">{title}</h1>
          <p className="mt-2">{t(parent ? 'dashboard.childrenSub' : 'dashboard.studentsSub')}</p>
        </div>
        {!adding && <Button onClick={() => setAdding(true)} data-testid="button-add-student"><Plus size={22} aria-hidden />{addLabel}</Button>}
      </div>
      {adding && <AddStudent parent={parent} onClose={() => setAdding(false)} />}
      {isLoading && <div className="grid md:grid-cols-2 gap-6" role="status" aria-label={t('common.loading')}><SkeletonBlock className="h-36" /><SkeletonBlock className="h-36" /></div>}
      {isError && <div><ErrorBox>{t('dashboard.listFail')}</ErrorBox><Button className="mt-4" onClick={() => refetch()}>{t('common.tryAgain')}</Button></div>}
      {data && data.length === 0 && !adding && (
        <Card className="!p-10 text-center bg-mist" data-testid="empty-students">
          <UserRound size={48} className="text-steel mx-auto mb-4" aria-hidden />
          <h2 className="text-3xl mb-2">{t(parent ? 'dashboard.noChildren' : 'dashboard.noStudents')}</h2>
          <p className="mb-6">{t(parent ? 'dashboard.startChild' : 'dashboard.startStudent')}</p>
          <Button onClick={() => setAdding(true)}><Plus size={22} aria-hidden />{addLabel}</Button>
        </Card>
      )}
      {data && data.length > 0 && (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((s) => (
            <li key={s.id}>
              <Link href={`/adult/students/${s.id}`} data-testid={`card-student-${s.id}`} className="flex items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 hover:bg-mist h-full">
                <span>
                  <span className="block font-heading font-semibold text-2xl" dir="auto">{s.name}</span>
                  <span className="block" dir="ltr" data-testid={`text-username-${s.id}`}>@{s.username}</span>
                  <span className="inline-block mt-3 bg-mist rounded-full px-4 py-1 text-base" data-testid={`text-mode-${s.id}`}>{s.conditions[0] ? t(`modes.${s.conditions[0]}`) : t('modes.none')}</span>
                </span>
                <ChevronRight className="text-steel shrink-0 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Dashboard() {
  return <AdultShell showDemoLink>{(a) => <List parent={a.role === 'parent'} />}</AdultShell>;
}
