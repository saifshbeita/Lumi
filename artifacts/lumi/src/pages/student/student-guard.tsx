import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetStudentSession, useGetStudentMode, useLogoutStudent, getGetStudentSessionQueryKey, getGetStudentModeQueryKey } from '@workspace/api-client-react';
import { Button, Card, ErrorBox, Loading } from '@/components/lumi';
import { brand } from '@/lib/util';
import { modeLabelAr, type Mode } from '@/lib/tokens';

const COPY: Record<Mode, string> = {
  dyslexia: 'نصوص واضحة ومريحة للعين، خطوة بخطوة.',
  learning: 'تعلم بهدوء وبالسرعة التي تناسبك.',
  autism: 'مساحة هادئة ومنظمة ويمكن توقعها.',
};

function Inner({ mode, student }: { mode: Mode; student: { name: string } }) {
  const qc = useQueryClient();
  const logout = useLogoutStudent();
  const check = useGetStudentMode(mode, { query: { queryKey: getGetStudentModeQueryKey(mode), retry: false } });
  if (check.isError) return <Redirect to="/student/login" />;
  if (check.isLoading || !check.data) return <div dir="rtl" lang="ar"><Loading label="جار التحميل" /></div>;
  const out = () => logout.mutate(undefined, { onSettled: () => { qc.clear(); qc.setQueryData(getGetStudentSessionQueryKey(), { student: null }); } });
  return (
    <div dir="rtl" lang="ar" className="min-h-[100dvh] px-4 py-6" data-testid={`page-${mode}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xl" data-testid="text-student-greeting">مرحبا {student.name}</p>
          <Button variant="secondary" onClick={out} disabled={logout.isPending} data-testid="button-student-logout">خروج</Button>
        </div>
        <section className="bg-navy rounded-3xl p-6 text-center text-white">
          <div className="bg-mist rounded-3xl p-4 mb-5"><img src={brand('lumi-full.png')} alt="لومي" className="h-56 mx-auto object-contain" /></div>
          <h1 className="text-4xl !text-white mb-2">{modeLabelAr[mode]}</h1>
          <p className="text-xl mb-6">{COPY[mode]}</p>
          <Button onClick={() => {}} aria-describedby="soon" className="w-full text-2xl min-h-16" data-testid="button-ask-lumi">اسأل لومي</Button>
          <p id="soon" className="mt-3" data-testid="text-coming-soon">قريبا: ستتمكن من التحدث مع لومي هنا.</p>
        </section>
        <Card>
          <h2 className="text-2xl mb-3">محادثاتي</h2>
          <p className="bg-mist rounded-2xl p-5" data-testid="empty-chats">لا توجد محادثات بعد.</p>
        </Card>
        {check.isLoading && <span className="sr-only" role="status">جار التحميل</span>}
      </div>
    </div>
  );
}

export function StudentGuard({ mode }: { mode: Mode }): ReactNode {
  const session = useGetStudentSession({ query: { queryKey: getGetStudentSessionQueryKey(), refetchInterval: 10000, staleTime: 0, retry: false } });
  if (session.isLoading) return <div dir="rtl" lang="ar"><Loading label="جار التحميل" /></div>;
  if (session.isError) return <div dir="rtl" lang="ar" className="p-6 max-w-md mx-auto"><ErrorBox>تعذر التحقق من الدخول.</ErrorBox><Button className="mt-4" onClick={() => session.refetch()}>حاول مرة أخرى</Button></div>;
  const s = session.data?.student;
  if (!s) return <Redirect to="/student/login" />;
  const assigned = s.conditions[0];
  if (!assigned) return <Redirect to="/student/login" />;
  if (assigned !== mode) return <Redirect to={`/student/${assigned}`} />;
  return <Inner mode={mode} student={s} />;
}
