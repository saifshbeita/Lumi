import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, UserRound } from 'lucide-react';
import { useListStudents, useCreateStudent, getListStudentsQueryKey } from '@workspace/api-client-react';
import { AdultShell } from './adult-shell';
import { InterestsInput } from '@/components/interests-input';
import { Button, Card, ErrorBox, Field, SkeletonBlock, cx } from '@/components/lumi';
import { MODES, modeLabel, type Mode } from '@/lib/tokens';
import { errMsg } from '@/lib/util';

function AddStudent({ parent, noun, onClose }: { parent: boolean; noun: string; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useCreateStudent();
  const [f, setF] = useState({ name: '', username: '', pin: '' });
  const [mode, setMode] = useState<Mode>('dyslexia');
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [assessed, setAssessed] = useState(false);
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(f.username)) return setError('Username: 3 to 40 letters, numbers or underscores.');
    if (!/^[0-9]{4}$/.test(f.pin)) return setError('The PIN must be exactly 4 digits.');
    if (parent && !assessed) return setError('Please confirm the assessment checkbox. Without it we cannot create the account.');
    create.mutate({ data: { name: f.name.trim(), username: f.username, pin: f.pin, mode, language, ...(interests.length ? { interests } : {}), ...(parent ? { assessmentConfirmed: true } : {}) } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListStudentsQueryKey() }); onClose(); },
      onError: (er) => setError(errMsg(er, 'We could not add this account. The username may already be taken.')),
    });
  };
  return (
    <Card className="!p-8 mb-8 bg-mist" data-testid="form-add-student">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-3xl">Add {noun}</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Field id="s-name" label="Name" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="input-student-name" />
          <Field id="s-user" label="Username" required autoCapitalize="none" autoComplete="off" hint="Letters, numbers, underscore." value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} data-testid="input-student-username" />
          <Field id="s-pin" label="4-digit PIN" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" type="password" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} data-testid="input-student-pin" />
        </div>
        <InterestsInput id="s-interests" value={interests} onChange={setInterests} />
        <fieldset>
          <legend className="mb-2">Mode</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {MODES.map((m) => (
              <label key={m} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', mode === m ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" data-testid={`radio-mode-${m}`} />
                {modeLabel[m]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-base">This decides how the child's Lumi looks and feels. You can change it later.</p>
        </fieldset>
        <fieldset>
          <legend className="mb-2">Language</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {(['ar', 'en'] as const).map((l) => (
              <label key={l} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', language === l ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} className="sr-only" data-testid={`radio-language-${l}`} />
                {l === 'ar' ? 'Arabic' : 'English'}
              </label>
            ))}
          </div>
        </fieldset>
        {parent && (
          <label className="flex items-start gap-4 bg-card border border-navy rounded-2xl p-5 cursor-pointer">
            <input type="checkbox" required checked={assessed} onChange={(e) => setAssessed(e.target.checked)} className="size-7 mt-0.5 shrink-0 accent-navy" data-testid="checkbox-assessment" />
            <span>My child has an assessment from a specialist.</span>
          </label>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex gap-3 flex-wrap">
          <Button type="submit" disabled={create.isPending} data-testid="button-save-student">{create.isPending ? 'Saving...' : 'Create account'}</Button>
          <Button variant="secondary" onClick={onClose} data-testid="button-cancel-add">Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function List({ parent }: { parent: boolean }) {
  const [adding, setAdding] = useState(false);
  const { data, isLoading, isError, refetch } = useListStudents();
  const title = parent ? 'My children' : 'My students';
  const noun = parent ? 'a child' : 'a student';
  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl" data-testid="text-title">{title}</h1>
          <p className="mt-2">{parent ? 'Each child has their own username and PIN.' : 'Each student has their own username and PIN.'}</p>
        </div>
        {!adding && <Button onClick={() => setAdding(true)} data-testid="button-add-student"><Plus size={22} aria-hidden />Add {noun}</Button>}
      </div>
      {adding && <AddStudent parent={parent} noun={noun} onClose={() => setAdding(false)} />}
      {isLoading && <div className="grid md:grid-cols-2 gap-6" role="status" aria-label="Loading"><SkeletonBlock className="h-36" /><SkeletonBlock className="h-36" /></div>}
      {isError && <div><ErrorBox>We could not load the list.</ErrorBox><Button className="mt-4" onClick={() => refetch()}>Try again</Button></div>}
      {data && data.length === 0 && !adding && (
        <Card className="!p-10 text-center bg-mist" data-testid="empty-students">
          <UserRound size={48} className="text-steel mx-auto mb-4" aria-hidden />
          <h2 className="text-3xl mb-2">{parent ? 'No children yet' : 'No students yet'}</h2>
          <p className="mb-6">Add {noun} to get started.</p>
          <Button onClick={() => setAdding(true)}><Plus size={22} aria-hidden />Add {noun}</Button>
        </Card>
      )}
      {data && data.length > 0 && (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((s) => (
            <li key={s.id}>
              <Link href={`/adult/students/${s.id}`} data-testid={`card-student-${s.id}`} className="flex items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 hover:bg-mist h-full">
                <span>
                  <span className="block font-heading font-semibold text-2xl">{s.name}</span>
                  <span className="block" data-testid={`text-username-${s.id}`}>@{s.username}</span>
                  <span className="inline-block mt-3 bg-mist rounded-full px-4 py-1 text-base" data-testid={`text-mode-${s.id}`}>{s.conditions[0] ? modeLabel[s.conditions[0]] : 'No mode'}</span>
                </span>
                <ChevronRight className="text-steel shrink-0" aria-hidden />
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
