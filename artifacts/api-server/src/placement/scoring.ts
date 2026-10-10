import { itemsFor } from "./banks";
import type { Answer, PlacementTest, Result } from "./types";
export function domainLevel(points:number,count:number) {
  const pct=points/count;
  return pct<.30?1:pct<.55?2:pct<.85?3:4;
}
export function median(values:number[]) {
  const a=[...values].sort((a,b)=>a-b);
  return !a.length?0:a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
}
export function scorePlacement(test:PlacementTest,answers:Answer[],meta:{completedAt?:string;durationSec?:number;breaks?:number}={}):Result {
  const items=itemsFor(test),byId=new Map(answers.map(a=>[a.item_id,a]));
  const actual=items.flatMap(i=>byId.has(i.id)?[byId.get(i.id)!]:[]);
  const domains=[...new Set(items.map(i=>i.domain).filter((d):d is string=>!!d))];
  const levels=Object.fromEntries(domains.map(d=>{
    const group=items.filter(i=>i.domain===d);
    return [d,domainLevel(group.reduce((sum,i)=>sum+(byId.get(i.id)?.points??0),0),group.length)];
  }));
  const avg=test==="dyslexia"?(levels.letters+levels.diacritics+levels.word_reading+levels.reading_comp)/4:(levels.numbers+levels.reading)/2;
  const flags:string[]=[];
  const prefs:Result["preferences"]=test==="dyslexia"?{reading:"read_to_me",text_size:40,input:"keyboard"}:test==="learning_difficulties"?{style:"pictures",input:"keyboard"}:{reply_length:"short",answer_mode:"tap",sound:"off",show_plan:true};
  let interests:string[]=[],favorite="";
  for(const item of items) {
    const a=byId.get(item.id);
    if(!item.save||!a||a.skipped)continue;
    if(item.save==="interests")interests=a.picked.slice(0,3);
    else if(item.save==="favorite_thing")favorite=(a.picked[0]??"").trim();
    else if(a.picked[0]!==undefined) prefs[item.save]=item.save==="text_size"?Number(a.picked[0]):item.save==="show_plan"?a.picked[0]==="true":a.picked[0];
  }
  const replays=actual.reduce((n,a)=>n+a.replays,0);
  const med=median(actual.map(a=>a.response_ms/1000));
  const signals:Record<string,number>={median_response_sec:med,skips:actual.filter(a=>a.skipped).length,duration_sec:meta.durationSec??actual.reduce((n,a)=>n+a.response_ms,0)/1000};
  const result:Result={test,version:1,completed_at:meta.completedAt??"1970-01-01T00:00:00.000Z",levels,band:avg<1.75?"starter":avg<2.75?"builder":"explorer",flags,interests,preferences:prefs,signals};
  if(test==="dyslexia"){
    const errors=new Map<string,number>();
    let dots=false,order=false;
    for(const item of items){
      const a=byId.get(item.id);
      if(!a||a.correct||a.skipped||!["B","C","D"].includes(item.section))continue;
      const picked=item.options.find(o=>o.id===a.picked[0]);
      const target=item.options.find(o=>o.correct);
      if(!picked||!target)continue;
      if(picked.tag==="dots")dots=true;
      if(picked.tag==="order")order=true;
      const pair=`${target.label_ar}↔${picked.label_ar}`;
      errors.set(pair,(errors.get(pair)??0)+1);
    }
    if(levels.listening>=3&&(levels.listening-levels.reading_comp>=2||levels.listening-levels.word_reading>=2))flags.push("understands_more_than_reads");
    if(dots)flags.push("similar_letters");
    if(order)flags.push("letter_order");
    if(levels.diacritics<=2)flags.push("needs_tashkeel");
    if(levels.phonology<=2)flags.push("sound_first");
    if(replays>=8)flags.push("relies_on_audio");
    if(med>15)flags.push("slow_pace");
    result.error_patterns=[...errors].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([pair])=>pair);
    signals.audio_replays=replays;
  }else if(test==="learning_difficulties"){
    result.step=Math.min(levels.memory,levels.instructions);
    if(levels.reasoning>=3&&levels.reasoning-(levels.numbers+levels.reading)/2>=1.5)flags.push("reasons_beyond_school_level");
    if(levels.learns_from_example>=3)flags.push("learns_fast_with_model");
    if(levels.memory<=2)flags.push("short_memory");
    if(actual.filter(a=>a.item_id.startsWith("C")&&a.supported).length>=2)flags.push("needs_audio_support");
    if(med>20)flags.push("slow_pace");
    signals.audio_used=actual.reduce((n,a)=>n+(a.audio_used??0),0);signals.replays=replays;
  }else{
    if(avg>=3)flags.push("academically_ready");
    if(levels.figurative<=2)flags.push("literal_language");
    if(levels.social_understanding<=2)flags.push("explain_feelings");
    if(prefs.answer_mode==="tap"||!favorite)flags.push("prefers_choices");
    if(favorite)flags.push("deep_interest");
    result.favorite_thing=favorite;signals.breaks=meta.breaks??0;
  }
  return result;
}
