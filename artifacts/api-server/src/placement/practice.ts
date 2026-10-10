import { randomInt, randomUUID } from "node:crypto";
import {favoriteTopic} from "./favorite-topic";
import type { Result } from "./types";
export type PracticeDomain="reading"|"numbers"|"lesson";
export type Practice = {question:string;choices:{id:string;label:string}[];correctId:string;kind:string;domain:PracticeDomain;dynamic?:boolean;level?:number;adjustment?:number;operation?:string};
export function practiceDomain(r:Result,state:Record<string,unknown>,lesson:string):PracticeDomain{
  const text=lesson.toLowerCase().replace(/[\u064B-\u065F]/g,"");
  if(/\b(read|reading|spell|spelling|letter|letters|word|words|sentence|story|phonics)\b|قراءة|اقرأ|نقرأ|كلمة|كلمات|حروف|حرف|قصة|تشكيل/.test(text))return "reading";
  if(/\b(add|addition|sum|subtract|subtraction|minus|multiply|multiplication|divide|division|number|numbers|count|counting|math|maths|fraction)\b|جمع|طرح|ضرب|قسمة|حساب|عدد|أرقام|ارقام|(?:\d|[٠-٩])\s*[+×÷=]/.test(text))return "numbers";
  if(text.split(/\s+/).length>=3&&(/\?|؟/.test(text)||/\b(teach|learn|explain|tell)\b|اشرح|نتعلم|كيف|ماذا/.test(text)))return "lesson";
  if(state.practiceDomain==="reading"||state.practiceDomain==="numbers"||state.practiceDomain==="lesson")return state.practiceDomain;
  return r.test==="dyslexia"?"reading":"lesson";
}
export function authoredPractice(item:{question:string;choices:string[];correctIndex:number},plan:Practice):Practice{
  if(new Set(item.choices.map(c=>c.trim().toLowerCase())).size!==item.choices.length||item.correctIndex>=item.choices.length)throw new Error("Invalid authored practice");
  const choices=item.choices.map(label=>({id:randomUUID(),label})),correctId=choices[item.correctIndex].id;
  for(let i=choices.length-1;i>0;i--){const j=randomInt(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
  return {...plan,question:item.question,choices,correctId,dynamic:false};
}
export function makePractice(r:Result,state:Record<string,unknown>,language:"ar"|"en",lesson=""):Practice {
  const ar=language==="ar",turns=Number(state.pairTurns??0),soundTurns=Number(state.soundTurns??0);
  const domain=practiceDomain(r,state,lesson);
  const progress=(state.practiceProgress??{}) as Record<string,Record<string,unknown>>;
  const difficulty=Number(progress[domain]?.difficulty??(state.practiceProgress?0:state.difficulty??0));
  const text=lesson.toLowerCase();
  const operation=/subtract|minus|طرح|ناقص/.test(text)?"subtract":/divide|division|قسمة|نقسم/.test(text)?"divide":/multiply|multiplication|times|ضرب/.test(text)?"multiply":/fraction|half|quarter|كسر|كسور|نصف|ربع/.test(text)?"fraction":/add|addition|sum|جمع|إضافة|نجمع|\+/.test(text)?"add":String(state.practiceOperation??"add");
  let values:string[],question:string,kind="numbers";
  if(r.test==="dyslexia"&&r.flags.includes("sound_first")&&soundTurns<2){
    values=ar?["🐟","🚪","🌙"]:["☀️","🚪","🌙"];
    question=ar?"أَيُّ صُورَةٍ تَبْدَأُ بِصَوْتِ سَ؟":"Which picture starts with the s sound?";kind="sound";
  }else if(r.test==="dyslexia"&&r.flags.includes("similar_letters")&&turns<3){
    const pair=(r.error_patterns??[]).find(p=>p.split("↔").every(s=>s.trim().length<=3))??"ث↔ت";
    values=ar?pair.split("↔"):["b","d"];
    if(turns%2)values.reverse();
    question=ar?`اِضْغَطْ عَلَى «${values[0]}».`:`Tap “${values[0]}”.`;kind="letters";
  }else if(domain!=="numbers"){
    const baseline=domain==="reading"?(r.levels.word_reading??r.levels.reading??r.levels.reading_comp):(r.levels.reasoning??r.levels.reading_comp);
    const level=Math.max(1,Math.min(4,(baseline??(r.band==="starter"?1:r.band==="builder"?2:3))+difficulty));
    const kind=domain==="reading"&&r.flags.includes("letter_order")?"word_order":domain==="reading"&&r.flags.includes("needs_tashkeel")?"diacritics":domain;
    return {question:"",choices:[],correctId:"",kind,domain,dynamic:true,level,adjustment:difficulty};
  }else{
    const level=Math.max(1,Math.min(4,(r.levels.numbers??(r.band==="starter"?1:r.band==="builder"?2:3))+difficulty));
    const interest=r.test==="autism"?favoriteTopic(r,state,language).word:ar?(r.interests.includes("football")?"كرات":r.interests.includes("animals")?"حيوانات":r.interests.includes("drawing")?"أقلام":"أشياء"):(r.interests.includes("football")?"balls":r.interests.includes("animals")?"animals":r.interests.includes("drawing")?"pencils":r.interests.includes("space")?"planets":"objects");
    let total:number;
    if(level===1){total=randomInt(2,8);question=ar?`كم عدد هذه الأشياء؟ ${"● ".repeat(total).trim()}`:`How many objects? ${"● ".repeat(total).trim()}`;}
    else if(operation==="fraction"){
      const divisor=/quarter|ربع/.test(text)?4:2;total=randomInt(2,6);
      question=ar?`ما ${divisor===4?"ربع":"نصف"} ${total*divisor} من ${interest}؟`:`What is ${divisor===4?"a quarter":"half"} of ${total*divisor} ${interest}?`;
    }else if(operation==="subtract"){
      const a=randomInt(level===2?10:40,level===2?20:90),b=randomInt(2,level===2?9:20),c=level===4?randomInt(2,10):0;
      total=a-b-c;question=ar?`معك ${a} من ${interest}، أخذت ${b}${c?` ثم ${c}`:""}، كم بقي؟`:`You have ${a} ${interest}, take away ${b}${c?` then ${c}`:""}: how many remain?`;
    }else if(operation==="divide"){
      total=randomInt(2,level===2?5:9);const groups=randomInt(2,level===2?5:9);
      question=ar?`وزّع ${total*groups} من ${interest} بالتساوي على ${groups} مجموعات، كم في كل مجموعة؟`:`Share ${total*groups} ${interest} equally into ${groups} groups: how many in each?`;
    }else if(level<4&&operation==="multiply"){
      const a=randomInt(2,level===2?5:9),b=randomInt(2,level===2?5:9);total=a*b;
      question=ar?`${a} مجموعات من ${interest}، في كل مجموعة ${b}، كم المجموع؟`:`${a} groups of ${interest} with ${b} in each: how many altogether?`;
    }else if(level===2||level===3){
      const a=level===2?randomInt(2,10):randomInt(20,60),b=level===2?randomInt(2,10):randomInt(10,30);total=a+b;
      question=ar?`عندك ${a} من ${interest}، أضفت ${b}، كم صار معك؟`:`You have ${a} ${interest} and add ${b}: how many now?`;
    }else if(operation==="add"){
      const a=randomInt(20,40),b=randomInt(10,30),c=randomInt(5,15);total=a+b+c;
      question=ar?`عندك ${a} من ${interest}، أضفت ${b} ثم ${c}، كم المجموع؟`:`You have ${a} ${interest}, add ${b} then ${c}: how many altogether?`;
    }else{
      const harder=difficulty>0,a=randomInt(harder?5:2,harder?10:6),b=randomInt(harder?5:3,harder?10:7),c=randomInt(1,harder?10:6);total=a*b+c;
      question=ar?`${a} مجموعات من ${interest}، في كل مجموعة ${b}، أضفت ${c}، كم المجموع؟`:`${a} groups of ${interest} with ${b} in each, plus ${c}: how many altogether?`;
    }
    values=[String(total),String(total-1),String(total+1)];
  }
  const choices=values.map(label=>({id:randomUUID(),label})),correctId=choices[0].id;
  for(let i=choices.length-1;i>0;i--){const j=randomInt(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
  return {question,choices,correctId,kind,domain,adjustment:difficulty,operation};
}
export function evaluatePractice(state:Record<string,unknown>,correct:boolean,domain?:PracticeDomain):Record<string,unknown>{
  if(domain){
    const progress=(state.practiceProgress??{}) as Record<string,Record<string,unknown>>;
    const next=evaluatePractice({...progress[domain],needsExample:false,activityChanged:false},correct);
    return {...state,...next,practiceProgress:{...progress,[domain]:next}};
  }
  const next:Record<string,unknown>={...state,correctStreak:correct?Number(state.correctStreak??0)+1:0,wrongStreak:correct?0:Number(state.wrongStreak??0)+1};
  if(Number(next.correctStreak)>=3){next.difficulty=Math.min(2,Number(state.difficulty??0)+1);next.correctStreak=0;next.activityChanged=true;}
  if(Number(next.wrongStreak)>=2){next.difficulty=Math.max(-1,Number(state.difficulty??0)-1);next.wrongStreak=0;next.needsExample=true;next.activityChanged=true;}
  return next;
}
