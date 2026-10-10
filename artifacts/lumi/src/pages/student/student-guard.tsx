import { useLayoutEffect, type ReactNode } from 'react';
import { setLanguage } from '@/i18n';
import { Link } from 'wouter';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useListStudentChats, useCreateStudentChat, getListStudentChatsQueryKey, useGetStudentSession, useGetStudentMode, useLogoutStudent, getGetStudentSessionQueryKey, getGetStudentModeQueryKey } from '@workspace/api-client-react';
import { Button, Card, ErrorBox, Loading } from '@/components/lumi';
import { brand } from '@/lib/util';
import { StudentChat } from './student-chat';
import { type Mode } from '@/lib/tokens';
import { asLang, langAttrs, t, type Lang } from '@/lib/student-i18n';

function Home({ mode, student, out, loggingOut, lang }: { mode: Mode; student: { name: string }; out: () => void; loggingOut: boolean; lang: Lang }) {
  const s = t(lang);
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const chats = useListStudentChats({ query: { queryKey: getListStudentChatsQueryKey(), retry: false } });
  const create = useCreateStudentChat();
  const aut = mode === 'autism';
  const dys = mode === 'dyslexia';
  const ts = dys ? { fontSize: '22px', letterSpacing: '0.08em' } : undefined;
  const ask = () => create.mutate(undefined, { onSuccess: c => { qc.invalidateQueries({ queryKey: getListStudentChatsQueryKey() }); nav(`/student/${mode}/chat/${c.id}`); } });
  const list = [...(chats.data ?? [])].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt));
  return (
    <div {...langAttrs(lang)} className="min-h-[100dvh] px-4 py-6" style={ts} data-testid={`page-${mode}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xl" data-testid="text-student-greeting">{s.hello(student.name)}</p>
          <Button variant="secondary" onClick={out} disabled={loggingOut} data-testid="button-student-logout">{s.logout}</Button>
        </div>
        <section className="bg-navy rounded-3xl p-6 text-center text-white">
          {!aut && <div className="bg-mist rounded-3xl p-4 mb-5"><img src={brand('lumi-full.png')} alt={s.logo} className="h-56 mx-auto object-contain" /></div>}
          <h1 className="text-4xl !text-white mb-2">{s.space}</h1>
          <p className="text-xl mb-6">{s.modeCopy[mode]}</p>
          <Button onClick={ask} disabled={create.isPending} className="w-full text-2xl min-h-16" data-testid="button-ask-lumi">{s.ask}</Button>
          {create.isError && <div className="mt-3 text-start"><ErrorBox>{s.startFail}</ErrorBox></div>}
        </section>
        <Card>
          <h2 className="text-2xl mb-3">{s.myChats}</h2>
          {chats.isLoading && <div role="status" aria-label={s.loading} className="bg-mist rounded-2xl h-20" />}
          {chats.isError && <div><ErrorBox>{s.chatsFail}</ErrorBox><Button className="mt-3" onClick={() => chats.refetch()} data-testid="button-retry-chats">{s.tryAgain}</Button></div>}
          {chats.isSuccess && list.length === 0 && <p className="bg-mist rounded-2xl p-5" data-testid="empty-chats">{s.noChats}</p>}
          <ul className="flex flex-col gap-3 list-none p-0">
            {list.map(c => (
              <li key={c.id}><Link href={`/student/${mode}/chat/${c.id}`} className={`flex items-center gap-3 border border-border bg-mist rounded-2xl px-5 ${dys ? 'min-h-20' : 'min-h-14'}`} data-testid={`link-chat-${c.id}`}><span aria-hidden>{c.icon ?? '💬'}</span><span dir="auto">{c.title}</span></Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Inner({ mode, student, chatId }: { mode: Mode; student: { name: string; language?: string }; chatId?: number }) {
  const qc = useQueryClient();
  const logout = useLogoutStudent();
  const check = useGetStudentMode(mode, { query: { queryKey: getGetStudentModeQueryKey(mode), retry: false } });
  if (check.isError) return <Redirect to="/student/login" />;
  const lang = asLang(check.data?.student.language ?? student.language);
  if (check.isLoading || !check.data) return <div {...langAttrs(lang)}><Loading label={t(lang).loading} /></div>;
  const out = () => logout.mutate(undefined, { onSettled: () => { qc.clear(); qc.setQueryData(getGetStudentSessionQueryKey(), { student: null }); } });
   if (chatId !== undefined) return <StudentChat key={chatId} mode={mode} chatId={chatId} lang={lang} />;
  return <Home mode={mode} student={student} out={out} loggingOut={logout.isPending} lang={lang} />;
}

export function StudentGuard({ mode, chatId }: { mode: Mode; chatId?: number }): ReactNode {
  const session = useGetStudentSession({ query: { queryKey: getGetStudentSessionQueryKey(), refetchInterval: 10000, staleTime: 0, retry: false } });
  const s = session.data?.student;
  const L = asLang(s?.language);
  // Student pages follow the child's assigned language; no toggle here.
  useLayoutEffect(() => { if (s) setLanguage(L); }, [s, L]);
  if (session.isLoading) return <div {...langAttrs(L)}><Loading label={t(L).loading} /></div>;
  if (session.isError) return <div {...langAttrs(L)} className="p-6 max-w-md mx-auto"><ErrorBox>{t(L).sessionFail}</ErrorBox><Button className="mt-4" onClick={() => session.refetch()}>{t(L).tryAgain}</Button></div>;
  if (!s) return <Redirect to="/student/login" />;
  const assigned = s.conditions[0];
  if (!assigned) return <Redirect to="/student/login" />;
  if (assigned !== mode) return <Redirect to={`/student/${assigned}`} />;
  return <Inner mode={mode} student={s} chatId={chatId} />;
}
