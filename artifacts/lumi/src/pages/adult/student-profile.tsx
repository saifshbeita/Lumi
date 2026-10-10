import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { type Insight, useGetStudent, useUpdateStudent, useRefreshStudentInsights, getGetStudentQueryKey, getListStudentsQueryKey } from '@workspace/api-client-react';
import { AdultShell } from './adult-shell';
import { InterestsInput } from '@/components/interests-input';
import { Button, Card, ErrorBox, SkeletonBlock, cx } from '@/components/lumi';
import { StartingPoint } from './starting-point';
import { MODES, type Mode } from '@/lib/tokens';
import { useTranslation } from 'react-i18next';
import { localeOf, useLang } from '@/i18n';
import { errMsg } from '@/lib/util';
import { relativeTime } from '@/lib/relative-time';
import { QuotedText } from '@/components/isolated-text';

const SECTIONS = [
  { type: 'strength', title: 'profile.strength', accent: '#8DBF9B', empty: 'profile.emptyStrength' },
  { type: 'weakness', title: 'profile.weakness', accent: '#E8A598', empty: 'profile.emptyWeakness' },
  { type: 'need', title: 'profile.need', accent: '#E5EEF5', empty: 'profile.emptyNeed' },
] as const;

/** Pick the adult's active language. Missing translation => null (caller shows a localized notice, never the other language). */
function localizedInsight(i: Insight, lang: 'ar' | 'en') {
  const text = lang === 'ar' ? i.textAr : i.textEn;
  const evidence = lang === 'ar' ? i.evidenceAr : i.evidenceEn;
  return { text: text?.trim() ? text : null, evidence: evidence?.trim() ? evidence : null };
}

function Profile({ id, parent }: { id: number; parent: boolean }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const lang = useLang();
  const { data, isLoading, isError, refetch } = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id), enabled: Number.isFinite(id), refetchInterval: 3000 } });
  const update = useUpdateStudent();
  const refresh = useRefreshStudentInsights();
  const [refreshErr, setRefreshErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const current = data?.student.conditions[0];
  const [mode, setMode] = useState<Mode | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (current) setMode(current); }, [current]);
  const currentLang = data?.student.language ?? 'ar';
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  useEffect(() => { setLanguage(currentLang); }, [currentLang]);
  // Interests: init once per student; polling never overwrites local edits.
  const [interests, setInterests] = useState<string[]>([]);
  const [savedInterests, setSavedInterests] = useState<string[]>([]);
  const [iMsg, setIMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setMsg(null); setIMsg(null); setRefreshErr(null); }, [lang]);
  const initFor = useRef<number | null>(null);
  const serverInterests = data?.student.interests;
  useEffect(() => {
    if (serverInterests && initFor.current !== id) { initFor.current = id; setInterests(serverInterests); setSavedInterests(serverInterests); }
  }, [serverInterests, id]);
  const interestsDirty = JSON.stringify(interests) !== JSON.stringify(savedInterests);
  const saveInterests = () => {
    setIMsg(null);
    const sent = [...interests];
    update.mutate({ id, data: { interests: sent } }, {
      onSuccess: (s) => {
        setSavedInterests(sent);
        qc.setQueryData(getGetStudentQueryKey(id), (old: typeof data) => (old ? { ...old, student: { ...old.student, interests: s?.interests ?? sent } } : old));
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        qc.invalidateQueries({queryKey:["/api/adult/students/"+id+"/placement"]});
        setIMsg({ ok: true, text: t(sent.length ? 'profile.interestsSaved' : 'profile.interestsCleared') });
      },
      onError: (e) => setIMsg({ ok: false, text: errMsg(e, t('profile.interestsFail')) }),
    });
  };
  const back = <Link href="/adult" data-testid="link-back" className="inline-flex items-center gap-2 min-h-14 mb-4 rounded-full pe-4"><ArrowLeft size={22} className="text-steel rtl:-scale-x-100" aria-hidden />{t(parent ? 'dashboard.myChildren' : 'dashboard.myStudents')}</Link>;

  if (isLoading) return <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-6">{back}<SkeletonBlock className="h-40" /><SkeletonBlock className="h-64" /></div>;
  if (isError || !data) return <div>{back}<ErrorBox>{t('profile.notFound')}</ErrorBox><Button className="mt-4" onClick={() => refetch()}>{t('common.tryAgain')}</Button></div>;
  const { student, insights, chats, stats, insightsUpdatedAt } = data;
  const doRefresh = () => {
    setRefreshErr(null);
    refresh.mutate({ id }, {
      onSuccess: (p) => { qc.setQueryData(getGetStudentQueryKey(id), p); setNow(Date.now()); },
      onError: (e) => setRefreshErr(errMsg(e, t('profile.refreshFail'))),
    });
  };
  const save = () => {
    if (!mode) return;
    setMsg(null);
    update.mutate({ id, data: { mode, language } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setMsg({ ok: true, text: t('profile.saved', { name: student.name, mode: t(`modes.${mode}`), language: t(language === 'ar' ? 'lang.arabic' : 'lang.english') }) });
      },
      onError: (e) => setMsg({ ok: false, text: errMsg(e, t('common.error')) }),
    });
  };
  return (
    <div>
      {back}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-4xl md:text-5xl" dir="auto" data-testid="text-student-name">{student.name}</h1>
        <p dir="ltr" className="text-start" data-testid="text-student-username">@{student.username}</p>
      </div>
      <Card className="mb-8" data-testid="section-stats">
        <h2 className="text-2xl mb-3">{t('profile.activity')}</h2>
        <dl className="grid sm:grid-cols-3 gap-4">
          <div className="bg-mist rounded-2xl p-4"><dt>{t('profile.sessions')}</dt><dd className="font-heading font-semibold text-3xl" data-testid="text-stat-sessions">{stats.sessions}</dd></div>
          <div className="bg-mist rounded-2xl p-4"><dt>{t('profile.messages')}</dt><dd className="font-heading font-semibold text-3xl" data-testid="text-stat-messages">{stats.messages}</dd></div>
          <div className="bg-mist rounded-2xl p-4"><dt>{t('profile.lastActive')}</dt><dd className="font-heading font-semibold text-3xl" data-testid="text-stat-last-active">{stats.lastActive ? relativeTime(stats.lastActive, now, lang) : t('profile.notYet')}</dd></div>
        </dl>
      </Card>
      <Card className="!p-8 mb-8 bg-mist">
        <fieldset>
          <legend className="font-heading font-semibold text-2xl mb-1">{t('profile.mode')}</legend>
          <p className="mb-4">{t('profile.modeHint')}</p>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {MODES.map((m) => (
              <label key={m} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', mode === m ? 'bg-navy text-white' : 'bg-card')}>
                <input type="radio" name="edit-mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} data-testid={`radio-edit-mode-${m}`} />
                {t(`modes.${m}`)}
              </label>
            ))}
          </div>
          <div className="mt-5">
            <fieldset>
              <legend className="mb-2">{t('dashboard.childLanguage')}</legend>
              <div className="flex flex-wrap gap-3" role="radiogroup">
                {(['ar', 'en'] as const).map((l) => (
                  <label key={l} className={cx('inline-flex items-center min-h-14 px-6 rounded-full border border-navy cursor-pointer has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-navy has-[:focus-visible]:outline-offset-2', language === l ? 'bg-navy text-white' : 'bg-card')}>
                    <input type="radio" name="edit-language" value={l} checked={language === l} onChange={() => setLanguage(l)} className="sr-only" data-testid={`radio-edit-language-${l}`} />
                    {t(l === 'ar' ? 'lang.arabic' : 'lang.english')}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-5 flex items-center gap-4 flex-wrap">
            <Button onClick={save} disabled={update.isPending || !mode || (mode === current && language === currentLang)} data-testid="button-save-mode">{update.isPending ? t('common.saving') : t('profile.saveModeLang')}</Button>
            {msg && (msg.ok ? <p role="status" className="bg-sage rounded-2xl px-5 py-3 border border-navy" data-testid="text-saved">{msg.text}</p> : <ErrorBox>{msg.text}</ErrorBox>)}
          </div>
        </fieldset>
      </Card>
      <Card className="!p-8 mb-8 bg-mist" data-testid="section-interests">
        <h2 className="text-2xl mb-1">{t('profile.interests')}</h2>
        <p className="mb-4">{t('profile.interestsHint')}</p>
        <InterestsInput id="edit-interests" label={t('profile.interests')} value={interests} onChange={(v) => { setInterests(v); setIMsg(null); }} disabled={update.isPending} />
        <div className="mt-5 flex items-center gap-4 flex-wrap">
          <Button onClick={saveInterests} disabled={update.isPending || !interestsDirty} data-testid="button-save-interests">{update.isPending ? t('common.saving') : t('profile.saveInterests')}</Button>
          {interestsDirty && <Button variant="secondary" onClick={() => { setInterests(savedInterests); setIMsg(null); }} data-testid="button-reset-interests">{t('profile.undo')}</Button>}
          {iMsg && (iMsg.ok ? <p role="status" className="bg-sage rounded-2xl px-5 py-3 border border-navy" data-testid="text-interests-saved">{iMsg.text}</p> : <ErrorBox>{iMsg.text}</ErrorBox>)}
        </div>
      </Card>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p data-testid="text-insights-updated">{insightsUpdatedAt ? t('profile.updated', { time: relativeTime(insightsUpdatedAt, now, lang) }) : t('profile.notUpdated')}</p>
        <Button variant="secondary" onClick={doRefresh} disabled={refresh.isPending} data-testid="button-refresh-insights"><RefreshCw size={20} aria-hidden />{refresh.isPending ? t('profile.refreshing') : t('profile.refresh')}</Button>
      </div>
      {refreshErr && <div className="mb-4"><ErrorBox>{refreshErr}</ErrorBox></div>}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {SECTIONS.map((s) => {
          const items = insights.filter((i) => i.type === s.type);
          return (
            <Card key={s.type} data-testid={`section-${s.type}`}>
              <div className="h-2 -mt-6 -mx-6 mb-4 rounded-t-3xl" style={{ background: s.accent }} aria-hidden />
              <h2 className="text-2xl mb-3">{t(s.title)}</h2>
              {items.length === 0 ? (
                <div className="bg-mist rounded-2xl p-4" data-testid={`empty-${s.type}`}><p>{t(s.empty)}</p><p className="mt-2">{t('profile.emptyAfter')}</p></div>
              ) : (
                <ul className="flex flex-col gap-2">{items.map((i) => { const loc = localizedInsight(i, lang); return (
                  <li key={i.id} className="bg-mist rounded-2xl p-4 border-s-4" style={{ borderInlineStartColor: s.accent }} data-testid={`insight-${i.id}`}>
                    <span className="text-base text-steel" data-testid={`insight-source-${i.id}`}>{i.source==="placement"?(lang==="ar"?"من نشاط البداية":"From warm-up"):(lang==="ar"?"من المحادثات":"From conversations")}</span>
                    {loc.text ? <p dir="auto" data-testid={`text-insight-${i.id}`}>{loc.text}</p> : <p className="text-base" data-testid={`text-insight-unavailable-${i.id}`}>{t('profile.translationUnavailable')}</p>}
              {loc.text && loc.evidence && <p dir={lang === 'ar' ? 'rtl' : 'ltr'} className="text-base mt-1" data-testid={`text-evidence-${i.id}`}><QuotedText text={loc.evidence} /></p>}
                    {i.sourceChatId != null && <Link href={`/students/${id}/chats/${i.sourceChatId}`} className="inline-flex items-center gap-1 mt-2 underline min-h-11" data-testid={`link-evidence-chat-${i.id}`}>{t('profile.openChat')}<ChevronRight size={18} aria-hidden className="rtl:-scale-x-100" /></Link>}
                  </li>
                ); })}</ul>
              )}
            </Card>
          );
        })}
      </div>
      <div className="mb-8"><StartingPoint id={id}/></div>
      <Card data-testid="section-chats">
        <h2 className="text-2xl mb-3">{t('profile.chats')}</h2>
        {chats.length === 0 ? (
          <div className="bg-mist rounded-2xl p-6 flex items-center gap-4"><MessageCircle className="text-steel shrink-0" size={32} aria-hidden /><p>{t('profile.noChats')}</p></div>
        ) : (
          <ul className="flex flex-col gap-2">{chats.map((c) => (
            <li key={c.id}>
              <Link href={`/students/${id}/chats/${c.id}`} className="bg-mist rounded-2xl p-4 flex items-center gap-4 min-h-14" data-testid={`link-chat-${c.id}`}>
                <span className="text-2xl w-8 text-center shrink-0" aria-hidden>{c.icon ?? <MessageCircle size={24} className="text-steel inline" />}</span>
                <span className="flex-1 min-w-0" dir="auto" data-testid={`text-chat-title-${c.id}`}>{c.title}</span>
                <span className="shrink-0" data-testid={`text-chat-count-${c.id}`}>{t('profile.messageCount', { count: c.messageCount })}</span>
                <span className="shrink-0 hidden sm:inline">{new Date(c.createdAt).toLocaleDateString(localeOf(lang))}</span>
                <ChevronRight size={20} className="text-steel shrink-0 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}</ul>
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
