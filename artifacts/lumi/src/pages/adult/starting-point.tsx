import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetStartingPoint,useRedoWarmup,getGetStartingPointQueryKey,getGetStudentQueryKey } from "@workspace/api-client-react";
import { Button,Card,ErrorBox,SkeletonBlock } from "@/components/lumi";
import { useLang } from "@/i18n";
const names:Record<string,[string,string]>={phonology:["Sounds","الأصوات"],letters:["Letters","الحروف"],diacritics:["Vowel marks","التشكيل"],word_reading:["Word reading","قراءة الكلمات"],listening:["Listening","الاستماع"],reading_comp:["Reading comprehension","فهم المقروء"],reasoning:["Patterns","الأنماط"],numbers:["Numbers","الأرقام"],reading:["Reading","القراءة"],memory:["Memory","الذاكرة"],instructions:["Following instructions","اتباع التعليمات"],learns_from_example:["Learning from examples","التعلّم من الأمثلة"],figurative:["Non-literal sentences","الجمل غير الحرفية"],social_understanding:["Feelings in stories","المشاعر في القصص"]};
const strengths:Record<string,[string,string]>={
 understands_more_than_reads:["Understands more than they can read. Use audio, keep ideas at their age.","يفهم أكثر مما يقرأ. استخدم الصوت وحافظ على مستوى الأفكار المناسب لعمره."],
 reasons_beyond_school_level:["Thinks better than their grades show. Challenge them.","تفكيره أقوى من مستواه الدراسي. اعطِه تحدّيات."],
 academically_ready:["Capable academically. Adapt the format, not the level.","قادر أكاديميًا. غيّر الطريقة مش المستوى."],
};
const interests:Record<string,[string,string]>={animals:["Animals","الحيوانات"],dinosaurs:["Dinosaurs","الديناصورات"],cars:["Cars","السيارات"],trains:["Trains","القطارات"],space:["Space","الفضاء"],football:["Football","كرة القدم"],drawing:["Drawing","الرسم"],games:["Games","الألعاب"],building:["Building","البناء"],maps:["Maps","الخرائط"],numbers:["Numbers","الأرقام"],music:["Music","الموسيقى"]};
export function StartingPoint({id}:{id:number}){
 const lang=useLang(),ar=lang==="ar",qc=useQueryClient();
 const q=useGetStartingPoint(id,{query:{queryKey:getGetStartingPointQueryKey(id),staleTime:0,refetchInterval:20000,retry:false}});
 const redo=useRedoWarmup(),[confirm,setConfirm]=useState<"redo"|"demo"|null>(null);
 const choose=(en:string,arabic:string)=>ar?arabic:en;
 const reset=()=>redo.mutate({id,data:{demoReset:confirm==="demo"}},{onSuccess:()=>{setConfirm(null);void qc.invalidateQueries({queryKey:getGetStartingPointQueryKey(id)});void qc.invalidateQueries({queryKey:getGetStudentQueryKey(id)});}});
 const r=q.data?.result,hidden=r?.flags.find(f=>strengths[f]);
 return <Card data-testid="section-starting-point">
  <h2 className="text-2xl mb-4">{choose("Starting point","نقطة البداية")}</h2>
  {q.isLoading?<SkeletonBlock className="h-36"/>:q.isError?<><ErrorBox>{choose("Could not load the starting point.","تعذّر تحميل نقطة البداية.")}</ErrorBox><Button onClick={()=>q.refetch()}>{choose("Retry","حاول مجددًا")}</Button></>:<>
   {q.data?.pending&&<p className="mb-4 bg-mist rounded-2xl p-4" data-testid="text-warmup-pending">{choose("A new warm-up is ready for the child's next login. The previous starting point stays here until they finish.","نشاط بداية جديد جاهز لدخول الطفل القادم. تظل نقطة البداية السابقة هون لحد ما يكمّله.")}</p>}
   {!r?<p>{choose("The starting point will appear after the warm-up.","بتظهر نقطة البداية بعد نشاط البداية.")}</p>:<>
    {hidden&&<section className="bg-sun/40 rounded-2xl p-4 mb-5" data-testid="section-hidden-strength"><h3 className="text-xl mb-2">{choose("A strength to build on","قوّة نبني عليها")}</h3><p>{strengths[hidden][ar?1:0]}</p></section>}
    <ul className="grid sm:grid-cols-2 gap-4 list-none p-0">
     {Object.entries(r.levels).map(([domain,level])=><li key={domain} className="flex items-center justify-between gap-3" data-testid={`domain-${domain}`}><span>{names[domain]?.[ar?1:0]??domain}</span>
       <span className="flex gap-1.5 shrink-0" role="img" aria-label={`${names[domain]?.[ar?1:0]??domain}: ${[choose("Starting","بداية"),choose("Building","يتقدّم"),choose("Ready","جاهز"),choose("Strong","متمكّن")][level-1]}`}>
        {[0,1,2,3].map(n=><span key={n} aria-hidden className={`w-3 h-3 rounded-full border border-navy ${n<level?"bg-navy":"bg-transparent"}`}/>)}
       </span></li>)}
    </ul>
    {!!r.interests.length&&<p className="mt-5">{choose("Interests: ","الاهتمامات: ")}{r.interests.map(i=>interests[i]?.[ar?1:0]??i).join(ar?"، ":", ")}</p>}
    {r.favorite_thing&&<p className="mt-2">{choose("Favorite thing: ","الشيء المفضّل: ")}<bdi>{r.favorite_thing}</bdi></p>}
    <p className="mt-3 text-base">{choose("Completed: ","تاريخ الإكمال: ")}{new Date(r.completed_at).toLocaleDateString(ar?"ar-JO":"en-GB")}</p>
   </>}
   {confirm?<div className="mt-5 rounded-2xl bg-mist p-4"><p className="mb-3">{choose("Start a fresh warm-up? Previous results and conversations will be kept.","نبدأ نشاط بداية جديد؟ النتائج السابقة والمحادثات بتظل محفوظة.")}</p><div className="flex flex-wrap gap-3"><Button onClick={reset} disabled={redo.isPending} data-testid="button-confirm-redo">{choose("Start new warm-up","ابدأ نشاط جديد")}</Button><Button variant="secondary" onClick={()=>setConfirm(null)} disabled={redo.isPending}>{choose("Cancel","إلغاء")}</Button></div></div>:
    <div className="flex flex-wrap gap-3 mt-5"><Button variant="secondary" onClick={()=>setConfirm("redo")} data-testid="button-redo-warmup">{choose("Redo warm-up","إعادة نشاط البداية")}</Button>
     {q.data?.demo&&<Button variant="secondary" onClick={()=>setConfirm("demo")} data-testid="button-reset-demo-warmup">{choose("Reset warm-up (demo)","إعادة ضبط نشاط البداية (تجريبي)")}</Button>}</div>}
   {redo.isError&&<ErrorBox>{choose("Could not start a new warm-up.","تعذّر بدء نشاط جديد.")}</ErrorBox>}
  </>}
  <p className="mt-5 text-base text-steel" data-testid="text-placement-disclaimer">{choose("A starting point for personalizing learning, not a diagnosis.","نقطة بداية لتخصيص التعلّم، مش تشخيص.")}</p>
 </Card>;
}
