import assert from "node:assert/strict";
import {fixture} from "../placement/fixtures";
import {scorePlacement} from "../placement/scoring";
import {generatePersonalizedReply} from "../lib/student-ai";
const cases=[
 {mode:"dyslexia",test:"dyslexia",text:"Help me read a word about animals",domain:"reading"},
 {mode:"learning",test:"learning_difficulties",text:"Teach me how plants take in water",domain:"lesson"},
 {mode:"autism",test:"autism",text:"Help me read a sentence about trains",domain:"reading"},
] as const;
for(const c of cases){
 const r=scorePlacement(c.test,fixture(c.test,"mixed"));
 const reply=await generatePersonalizedReply(c.mode,[{role:"student",content:c.text}],"en",r,[],{pairTurns:3,soundTurns:2,stepsSinceCheck:c.mode==="learning"?r.step!-1:0});
 assert.equal(reply.learnerStatePatch?.practiceDomain,c.domain);
 const p=reply.presentation!;assert(p.question);assert(p.choices.length>=2&&p.choices.length<=3);
 assert(reply.practiceKey);assert(p.choices.some(x=>x.id===reply.practiceKey!.correctId));
 assert(!JSON.stringify(p).includes("correctIndex"));assert(!JSON.stringify(p).includes("correctId"));
 assert(!/\d+\s+(?:groups|objects)|how many altogether/i.test(p.question!));
 console.log(`${c.mode}: ${c.domain} check-in, assessed constraints and private server evaluation verified.`);
}
