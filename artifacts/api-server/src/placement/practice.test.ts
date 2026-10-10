import assert from "node:assert/strict";
import {test} from "node:test";
import {fixture} from "./fixtures";
import {scorePlacement} from "./scoring";
import {makePractice,authoredPractice,evaluatePractice} from "./practice";
test("practice follows assessed literacy/current lesson rather than falling back to numbers",()=>{
 for(const test of ["dyslexia","learning_difficulties","autism"] as const){
  const r=scorePlacement(test,fixture(test,"mixed"));
  const state={pairTurns:3,soundTurns:2};
  const reading=makePractice(r,state,"en","Help me read a word");
  assert.equal(reading.domain,"reading");assert(reading.dynamic);
  const science=makePractice(r,state,"en","Teach me about how plants grow");
  assert.equal(science.domain,"lesson");assert(science.dynamic);
  const numbers=makePractice(r,state,"en","Can we practise addition?");
  assert.equal(numbers.domain,"numbers");assert(!numbers.dynamic);assert(numbers.choices.some(c=>c.id===numbers.correctId));
  const continued=makePractice(r,{...state,practiceDomain:"reading"},"en","Next");
  assert.equal(continued.domain,"reading");
 }
});
test("authored practice is evaluated by a private server key; difficulty changes only after evidence",()=>{
 const r=scorePlacement("learning_difficulties",fixture("learning_difficulties","mixed"));
 const plan=makePractice(r,{},"en","Teach me about plants");
 const p=authoredPractice({question:"What do the roots take in?",choices:["water","rocks","trains"],correctIndex:0},plan);
 assert.equal(p.choices.find(c=>c.id===p.correctId)?.label,"water");
 assert(!p.choices.some(c=>"correctIndex"in c));
 assert.throws(()=>authoredPractice({question:"Choose?",choices:["a","a"],correctIndex:0},plan));
 let s:Record<string,unknown>={};
 for(let i=0;i<3;i++)s=evaluatePractice(s,true);
 assert.equal(s.difficulty,1);
 for(let i=0;i<2;i++)s=evaluatePractice(s,false);
 assert.equal(s.difficulty,0);assert(s.needsExample);
});
test("reading success cannot raise unrelated math difficulty",()=>{
 const r=scorePlacement("learning_difficulties",fixture("learning_difficulties","mixed"));
 let s:Record<string,unknown>={};
 for(let i=0;i<3;i++)s=evaluatePractice(s,true,"reading");
 assert.equal(makePractice(r,s,"en","Help me read a word").adjustment,1);
 assert.equal(makePractice(r,s,"en","Help me add numbers").adjustment,0);
});
