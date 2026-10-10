import { itemsFor } from "./banks";
import type { Answer, PlacementTest } from "./types";
export function fixture(test:PlacementTest,kind:"low"|"mixed"|"high"):Answer[] {
  const mixed:Record<PlacementTest,string[]>={
    dyslexia:["A1","A2","A3","B1","B3","B5","C1","C3","D1","D2","E1","E2"],
    learning_difficulties:["A1","A2","A3","A4","B1","B3","C1","C2","C3","D1","E1","E2","F1","F2"],
    autism:["N1","N2","N3","N4","R1","R2","R3","S1"],
  };
  const correct=new Set(mixed[test]),answers:Answer[]=[];
  let section="",wrong=0;
  for(const item of itemsFor(test)){
    if(item.section!==section){section=item.section;wrong=0;}
    if(item.stop_rule&&wrong>=2)continue;
    let picked:string[]=[],ok=false,supported=false;
    if(item.domain){
      ok=kind==="high"||kind==="mixed"&&correct.has(item.id);
      picked=item.sequence?(ok?item.sequence:[...item.sequence].reverse().map((x,i)=>item.sequence!.length===1?item.options.find(o=>o.id!==x)!.id:x)): [item.options.find(o=>ok?o.correct===true:o.correct===false)!.id];
      supported=test==="learning_difficulties"&&kind==="mixed"&&["C2","C3"].includes(item.id);
      wrong=ok?0:wrong+1;
    }else if(item.save==="interests"){
      picked=test==="dyslexia"?["football","space"]:test==="learning_difficulties"?["animals","drawing"]:["trains","maps"];
    }else if(item.save==="favorite_thing"){picked=kind==="low"?[]:["القطارات"];}
    else{
      const values:Record<string,string>={reading:"read_to_me",text_size:"40",input:"voice",style:"pictures",reply_length:"short",answer_mode:"tap",sound:"off",show_plan:"true"};
      picked=[values[item.save!]??item.options[0].id];
    }
    answers.push({item_id:item.id,picked,correct:ok,points:ok?(supported?.5:1):0,supported,skipped:!item.domain&&item.type==="free_text_optional"&&!picked.length,response_ms:kind==="low"?25000:9000,replays:test==="dyslexia"&&kind==="mixed"&&item.id==="B2"?9:0,audio_used:supported?1:0});
  }
  return answers;
}
