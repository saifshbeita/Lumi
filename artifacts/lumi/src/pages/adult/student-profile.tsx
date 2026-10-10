import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useGetStudent, useUpdateStudent, getGetStudentQueryKey, getListStudentsQueryKey } from '@workspace/api-client-react';
import { AdultShell } from './adult-shell';
import { Button, Card, ErrorBox, SkeletonBlock, cx } from '@/components/lumi';
import { MODES, modeLabel, type Mode } from '@/lib/tokens';
import { errMsg } from '@/lib/util';

const SECTIONS = [
  { type: 'strength', title: 'Strengths', empty: 'Lumi will note what this child does well as they learn.' },
  { type: 'weakness', title: 'Weaknesses', empty: 'Areas that need more practice will appear here.' },
  { type: 'need', title: 'Needs', empty: 'Ways to best support this child will appear here.' },
] as const;

function Profile({ id, parent }: { id: number; parent: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id), enabled: Number.isFinite(id) } });
  const update = useUpdateStudent();
  const current = data?.student.conditions[0];
  const [mode, setMode] = useState<Mode | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (current) setMode(current); }, [current]);
  const back = <Link href="/adult" data-testid="link-back" className="inline-flex items-center gap-2 min-h-14 mb-4 rounded-full pe-4"><ArrowLeft size={22} className="text-steel" aria-hidden />{parent ? 'My children' : 'My students'}</Link>;

  if (isLoading) return <div role="status" aria-label="Loading" className="flex flex-col gap-6">{back}<SkeletonBlock className="h-40" /><SkeletonBlock className="h-64" /></div>;
  if (isError || !data) return <div>{back}<ErrorBox>We could not find this profile.</ErrorBox><Button className="mt-4" onClick={() => refetch()}>Try again</Button></div>;
  const { student, insights, chats } = data;
  const save = () => {
    if (!mode) return;
    setMsg(null);
    update.mutate({ id, data: { mode } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setMsg({ ok: true, text: `Saved. ${student.name}'s Lumi now uses ${modeLabel[mode]} mode.` });
      },
      onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
    });
  };
  return (
    <div>
      {back}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-4xl md:text-5xl" data-testid="text-student-name">{student.name}</h1>
        <p data-testid="text-student-username">@{student.username}</p>
      </div>
      <Card className="!p-8 mb-8 bg-mist">
        <fieldset>
          <legend className="font-heading font-semibold text-2xl mb-1">Mode</legend>
          <p className="mb-4">Changing the mode changes the child's interface the next time they open Lumi.</p>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {MODES.map((m) => (
              <label key={m} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', mode === m ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="edit-mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} data-testid={`radio-edit-mode-${m}`} />
                {modeLabel[m]}
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4 flex-wrap">
            <Button onClick={save} disabled={update.isPending || !mode || mode === current} data-testid="button-save-mode">{update.isPending ? 'Saving...' : 'Save mode'}</Button>
            {msg && (msg.ok ? <p role="status" className="bg-sage rounded-2xl px-5 py-3 border border-navy" data-testid="text-saved">{msg.text}</p> : <ErrorBox>{msg.text}</ErrorBox>)}
          </div>
        </fieldset>
      </Card>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {SECTIONS.map((s) => {
          const items = insights.filter((i) => i.type === s.type);
          return (
            <Card key={s.type} data-testid={`section-${s.type}`}>
              <h2 className="text-2xl mb-3">{s.title}</h2>
              {items.length === 0 ? <p className="bg-mist rounded-2xl p-4">{s.empty}</p> : <ul className="flex flex-col gap-2">{items.map((i) => <li key={i.id} className="bg-mist rounded-2xl p-4">{i.text}</li>)}</ul>}
            </Card>
          );
        })}
      </div>
      <Card data-testid="section-chats">
        <h2 className="text-2xl mb-3">Chats</h2>
        {chats.length === 0 ? (
          <div className="bg-mist rounded-2xl p-6 flex items-center gap-4"><MessageCircle className="text-steel shrink-0" size={32} aria-hidden /><p>No chats yet. Conversations with Lumi will be listed here.</p></div>
        ) : (
          <ul className="flex flex-col gap-2">{chats.map((c) => <li key={c.id} className="bg-mist rounded-2xl p-4 flex justify-between gap-4"><span>{c.title}</span><span>{new Date(c.createdAt).toLocaleDateString()}</span></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return <AdultShell>{(a) => <Profile id={id} parent={a.role === 'parent'} />}</AdultShell>;
}
