import { Link } from 'wouter';
import { GraduationCap, Heart, ArrowRight } from 'lucide-react';
import { Logo, LinkButton, Card } from '@/components/lumi';
import { brand } from '@/lib/util';

export default function Home() {
  const roles = [
    { role: 'teacher', title: "I'm a teacher", body: 'Set up your students and choose how Lumi talks with each of them.', Icon: GraduationCap },
    { role: 'parent', title: "I'm a parent", body: 'Create your child\u2019s space and guide their learning at home.', Icon: Heart },
  ];
  return (
    <div className="min-h-[100dvh]">
      <header className="max-w-6xl mx-auto px-6 py-6"><Logo /></header>
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <section className="grid md:grid-cols-2 gap-10 items-center bg-navy rounded-3xl p-8 md:p-14">
          <div className="text-white">
            <h1 className="text-5xl md:text-6xl !text-white mb-6">Every mind learns differently</h1>
            <p className="text-xl">Lumi is a caring learning companion for children with learning differences. A teacher or parent sets everything up, and Lumi never diagnoses.</p>
          </div>
          <div className="flex justify-center bg-mist rounded-3xl p-6">
            <img src={brand('lumi-full.png')} alt="Lumi, the friendly learning companion" className="w-full max-w-xs object-contain" />
          </div>
        </section>

        <section aria-labelledby="who" className="mt-12">
          <h2 id="who" className="text-3xl mb-6">Who is setting up Lumi?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {roles.map(({ role, title, body, Icon }) => (
              <Link key={role} href={`/auth?role=${role}`} data-testid={`link-role-${role}`} className="block bg-card border border-border rounded-3xl p-8 hover:bg-mist">
                <Icon className="text-steel mb-4" size={40} aria-hidden />
                <h3 className="text-3xl mb-2">{title}</h3>
                <p className="mb-6">{body}</p>
                <span className="inline-flex items-center gap-2 min-h-14 px-8 rounded-full border border-navy bg-sun">Continue <ArrowRight size={20} aria-hidden /></span>
              </Link>
            ))}
          </div>
        </section>

        <Card className="mt-6 !p-8 bg-mist flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl mb-1">Are you a student?</h2>
            <p>Use your username and 4-digit PIN to step into your space.</p>
          </div>
          <LinkButton href="/student/login" data-testid="link-student-login" className="text-xl min-h-16 px-10">Student login</LinkButton>
        </Card>
      </main>
    </div>
  );
}
