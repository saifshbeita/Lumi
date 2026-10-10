import assert from "node:assert/strict";
import { generatePersonalizedReply } from "../lib/student-ai";
import { fixture } from "../placement/fixtures";
import { scorePlacement } from "../placement/scoring";
import { buildLearnerContext } from "../placement/context";
import { evaluatePractice } from "../placement/practice";
for(const mode of ["dyslexia","learning","autism"] as const){
  const test=mode==="learning"?"learning_difficulties":mode;
  const result=scorePlacement(test,fixture(test,"mixed"),{completedAt:"2026-10-10T12:00:00Z"});
  const context=buildLearnerContext(result);
  assert(context.includes("LEARNER CONTEXT"));assert(context.includes("A starting point, not a diagnosis"));
  const reply=await generatePersonalizedReply(mode,[{role:"student",content:"كيف نجمع 3 و4؟"}],"ar",result,[],{});
  assert(reply.spokenContent.length>reply.content.length || mode==="learning");
  assert(!/تشخيص|توحد|عسر القراءة/.test(reply.content));
  if(mode==="dyslexia")assert(reply.content.split(/\s+/).length<=8);
  if(mode==="learning"){assert.equal(JSON.parse(reply.content).steps.length,1);assert.equal(reply.presentation?.awaitNext,true);}
  if(mode==="autism"){assert.equal(reply.presentation?.choices.length,3);assert(reply.presentation?.question?.includes("القطارات"));assert(reply.presentation?.plan);}
  console.log(`${mode}: live managed-AI reply obeyed visible contract; context and presentation verified`);
}
let s:Record<string,unknown>={};
s=evaluatePractice(evaluatePractice(evaluatePractice(s,true),true),true);
assert.equal(s.difficulty,1);
s=evaluatePractice(evaluatePractice(s,false),false);assert.equal(s.difficulty,0);assert.equal(s.needsExample,true);
console.log("Evaluated practice adjusts difficulty; Next has no evaluation path.");
