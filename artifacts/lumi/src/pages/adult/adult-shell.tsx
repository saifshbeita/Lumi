import { type ReactNode } from 'react';
import { Link, Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useGetAdultSession, useLogoutAdult, getGetAdultSessionQueryKey } from '@workspace/api-client-react';
import { Button, ErrorBox, Loading, Logo } from '@/components/lumi';

export type AdultCtx = { name: string; role: 'teacher' | 'parent' };

export function AdultShell({ children }: { children: (a: AdultCtx) => ReactNode }) {
  const qc = useQueryClient();
  const session = useGetAdultSession();
  const logout = useLogoutAdult();
  if (session.isLoading) return <Loading />;
  if (session.isError) return <div className="p-6 max-w-lg mx-auto"><ErrorBox>We could not check your session.</ErrorBox><Button className="mt-4" onClick={() => session.refetch()}>Try again</Button></div>;
  const adult = session.data?.adult;
  if (!adult) return <Redirect to="/" />;
  const out = () => logout.mutate(undefined, { onSettled: () => { qc.clear(); qc.setQueryData(getGetAdultSessionQueryKey(), { adult: null }); } });
  return (
    <div className="min-h-[100dvh]">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/adult" data-testid="link-dashboard" className="rounded-full"><Logo /></Link>
          <div className="flex items-center gap-4">
            <p data-testid="text-adult-name" className="hidden sm:block">{adult.name} <span className="bg-mist rounded-full px-3 py-1 text-base">{adult.role === 'teacher' ? 'Teacher' : 'Parent'}</span></p>
            <Button variant="secondary" onClick={out} disabled={logout.isPending} data-testid="button-logout"><LogOut size={20} aria-hidden className="text-steel" />Log out</Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children({ name: adult.name, role: adult.role })}</main>
    </div>
  );
}
