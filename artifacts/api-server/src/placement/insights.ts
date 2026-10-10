import type { Result } from "./types";
// Exact section-8 wording, English/Arabic. No synthetic quotation or conversation link.
const words:Record<string,[string,string,string,string]>={
  phonology:["Hears and plays with sounds in words","يميّز الأصوات في الكلمات","Needs practice hearing sounds in words","يحتاج تدريب على تمييز الأصوات"],
  letters:["Recognizes letters, including similar ones","يميّز الحروف حتى المتشابهة","Mixes letters that differ by dots ({pairs})","يخلط بين الحروف المتشابهة بالنقاط ({pairs})"],
  diacritics:["Reads harakat and tashkeel","يقرأ الحركات والتشكيل","Needs practice with tashkeel","يحتاج تدريب على التشكيل"],
  word_reading:["Reads short words accurately","يقرأ الكلمات القصيرة بدقة","Reading single words is still hard","قراءة الكلمات ما زالت صعبة"],
  listening:["Understands stories well when read aloud","يفهم القصص جيدًا عند سماعها","Needs support understanding stories","يحتاج دعم في فهم القصص"],
  reading_comp:["Understands what they read","يفهم ما يقرأ","Understanding written text is hard","فهم النص المكتوب صعب"],
  reasoning:["Spots patterns and solves puzzles","يكتشف الأنماط ويحل الألغاز","Needs support with patterns","يحتاج دعم في الأنماط"],
  memory:["Remembers short sequences","يتذكر تسلسلات قصيرة","Holds only a little at once","يتذكر القليل في المرة الواحدة"],
  instructions:["Follows multi-step instructions","ينفّذ تعليمات من عدة خطوات","Needs one instruction at a time","يحتاج تعليمة وحدة كل مرة"],
  learns_from_example:["Learns fast from an example","يتعلم بسرعة من مثال","Needs more than one example","يحتاج أكثر من مثال"],
  figurative:["Understands non-literal sentences","يفهم الجمل غير الحرفية","Takes sentences literally","يفهم الجمل بشكل حرفي"],
  social_understanding:["Understands feelings in stories","يفهم المشاعر في القصص","Benefits from feelings being named clearly","يستفيد من تسمية المشاعر بوضوح"],
};
const needs:Record<string,[string,string]>={
  understands_more_than_reads:["Understands more than they can read. Use audio, keep ideas at their age.","يفهم أكثر مما يقرأ. استخدم الصوت وحافظ على مستوى الأفكار المناسب لعمره."],
  similar_letters:["Practice similar letters: {pairs}","تدريب على الحروف المتشابهة: {pairs}"],
  slow_pace:["Needs extra time per question","يحتاج وقت إضافي لكل سؤال"],
  reasons_beyond_school_level:["Thinks better than their grades show. Challenge them.","تفكيره أقوى من مستواه الدراسي. اعطِه تحدّيات."],
  short_memory:["Short steps, repeat key info","خطوات قصيرة مع تكرار المعلومة"],
  learns_fast_with_model:["Show an example first","ابدأ بمثال"],
  academically_ready:["Capable academically. Adapt the format, not the level.","قادر أكاديميًا. غيّر الطريقة مش المستوى."],
  prefers_choices:["Prefers answering with choices","يفضّل الإجابة من خيارات"],
  deep_interest:["Loves {favorite_thing}. Use it in lessons.","بحب {favorite_thing}. استخدمه بالدروس."],
};
export function hiddenStrength(r:Result) {
  return needs[["understands_more_than_reads","reasons_beyond_school_level","academically_ready"].find(f=>r.flags.includes(f))??""];
}
export function placementInsights(r:Result) {
  const table:Record<string,string[]>={...words,
    numbers:r.test==="autism"?["Strong with numbers","قوي بالأرقام","Needs practice with numbers","يحتاج تدريب على الأرقام"]:["Comfortable with numbers at their level","مرتاح مع الأرقام","Needs practice with basic numbers","يحتاج تدريب على الأرقام الأساسية"],
    reading:r.test==="autism"?["Reads and understands well","يقرأ ويفهم جيدًا","Needs support with reading","يحتاج دعم بالقراءة"]:["Reads and understands short texts","يقرأ ويفهم نصوص قصيرة","Reading is still hard","القراءة ما زالت صعبة"],
  };
  const fill=(s:string)=>s.replaceAll("{pairs}",(r.error_patterns??[]).join("، ")).replaceAll("{favorite_thing}",r.favorite_thing??"");
  const make=(type:"strength"|"weakness"|"need",en:string,ar:string)=>({type,text:fill(ar),textAr:fill(ar),textEn:fill(en),evidence:null,evidenceAr:null,evidenceEn:null,sourceChatId:null});
  return [
    ...Object.entries(r.levels).map(([d,l])=>{const w=table[d];if(!w)throw new Error(`Missing domain wording ${d}`);return l>=3?make("strength",w[0],w[1]):make("weakness",w[2],w[3]);}),
    ...r.flags.filter(f=>needs[f] && (r.test!=="learning_difficulties"||f!=="slow_pace")).map(f=>make("need",...needs[f])),
  ];
}
