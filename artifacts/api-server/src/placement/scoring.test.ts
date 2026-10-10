import assert from "node:assert/strict";
import { test } from "node:test";
import { scorePlacement, domainLevel } from "./scoring";
import { fixture } from "./fixtures";
import { itemsFor } from "./banks";
import { placementInsights } from "./insights";
import type { PlacementTest } from "./types";
const meta={completedAt:"2026-10-10T12:00:00.000Z",breaks:1};
for(const mode of ["dyslexia","learning_difficulties","autism"] as PlacementTest[]){
  for(const kind of ["low","mixed","high"] as const)test(`${mode}: ${kind} exact deterministic result`,()=>{
    const answers=fixture(mode,kind),original=JSON.stringify(answers),r=scorePlacement(mode,answers,meta);
    assert.equal(r.test,mode);assert.equal(r.version,1);assert.equal(r.completed_at,meta.completedAt);
    assert.deepEqual(scorePlacement(mode,answers,meta),r);assert.equal(JSON.stringify(answers),original);
    if(kind==="low"){assert.equal(r.band,"starter");assert(Object.values(r.levels).every(l=>l===1));}
    if(kind==="high"){assert.equal(r.band,"explorer");assert(Object.values(r.levels).every(l=>l===4));}
    if(kind==="mixed"){
      const flag={dyslexia:"understands_more_than_reads",learning_difficulties:"reasons_beyond_school_level",autism:"academically_ready"}[mode];
      assert(r.flags.includes(flag));
      if(mode==="dyslexia"){
        assert.deepEqual(r.levels,{phonology:3,letters:3,diacritics:2,word_reading:2,listening:4,reading_comp:1});
        assert.equal(r.band,"builder");assert(r.error_patterns!.includes("ث↔ت"));
        for(const f of ["similar_letters","letter_order","needs_tashkeel","relies_on_audio"])assert(r.flags.includes(f));
        assert.deepEqual(r.preferences,{reading:"read_to_me",text_size:40,input:"voice"});
      } else if(mode==="learning_difficulties"){
        assert.deepEqual(r.levels,{reasoning:4,numbers:2,reading:2,memory:2,instructions:3,learns_from_example:3});
        assert.equal(r.step,2);assert.equal(r.band,"builder");assert(r.flags.includes("short_memory"));assert(r.flags.includes("needs_audio_support"));
        assert.deepEqual(r.interests,["animals","drawing"]);
      }else{
        assert.deepEqual(r.levels,{numbers:4,reading:3,figurative:1,social_understanding:2});
        for(const f of ["literal_language","prefers_choices","deep_interest"])assert(r.flags.includes(f));
        assert.equal(r.favorite_thing,"القطارات");assert.equal(r.signals.breaks,1);
      }
    }
    assert(placementInsights(r).every(i=>i.textAr&&i.textEn&&!i.evidence&&!i.sourceChatId));
  });
}
test("domain boundaries, small domains and supported points",()=>{
  assert.deepEqual([.299,.30,.549,.55,.849,.85].map(p=>domainLevel(p*1000,1000)),[1,2,2,3,3,4]);
  assert.deepEqual([0,1,2].map(p=>domainLevel(p,2)),[1,2,4]);
  assert.deepEqual([0,1,2,3].map(p=>domainLevel(p,3)),[1,2,3,4]);
  assert.equal(domainLevel(.5,4),1);
});
test("missing items use full denominator and produce no fabricated pairs",()=>{
  const r=scorePlacement("dyslexia",[],meta);
  assert.equal(r.levels.letters,1);assert.deepEqual(r.error_patterns,[]);assert.equal(r.signals.skips,0);
});
test("all guide IDs and counts are exact",()=>{
  assert.equal(itemsFor("dyslexia").length,25);assert.equal(itemsFor("learning_difficulties").length,25);assert.equal(itemsFor("autism").length,19);
  for(const mode of ["dyslexia","learning_difficulties","autism"] as PlacementTest[])assert.equal(new Set(itemsFor(mode).map(i=>i.id)).size,itemsFor(mode).length);
});
test("autism timing never changes any level, band or flag",()=>{
  const a=fixture("autism","mixed"),r=scorePlacement("autism",a,meta),slow=scorePlacement("autism",a.map(a=>({...a,response_ms:600000})),meta);
  assert.deepEqual(r.levels,slow.levels);assert.deepEqual(r.flags,slow.flags);assert.equal(r.band,slow.band);
});
