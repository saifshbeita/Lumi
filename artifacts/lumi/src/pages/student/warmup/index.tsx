import { useGetStudentSession, getGetStudentSessionQueryKey, type Mode } from '@workspace/api-client-react';
import { Loading } from '@/components/lumi';
import { asLang } from '@/lib/student-i18n';
import { WarmupRunner } from './warmup-runner';

export { WarmupRunner } from './warmup-runner';
export { USE_ARABIC_INDIC_DIGITS } from './config';

/** Standalone page; the main agent normally renders WarmupRunner inside StudentGuard. */
export default function WarmupPage({ mode }: { mode: Mode }) {
  const s = useGetStudentSession({ query: { queryKey: getGetStudentSessionQueryKey(), retry: false } });
  if (s.isLoading) return <Loading />;
  return <WarmupRunner mode={mode} lang={asLang(s.data?.student?.language)} />;
}
