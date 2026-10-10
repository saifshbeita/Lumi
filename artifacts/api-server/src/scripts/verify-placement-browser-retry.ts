import assert from "node:assert/strict";
import fs from "node:fs";
import {replyMatchesLanguage} from "../lib/student-ai";
import {sentenceCount} from "../placement/presentation";
if(process.env.NODE_ENV==="production")throw new Error("Development QA only.");
const m=JSON.parse(fs.readFileSync("/tmp/lumi-placement-browser-fixtures.json","utf8"));
const student=m.students.find((s:any)=>s.kind==="fresh"&&s.mode==="learning");
const base="http://localhost:80/api";
async function login(path:string,data:unknown){
 const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 assert.equal(r.status,200,"Temporary QA login failed");
 return r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
}
async function api(path:string,cookie:string,method="GET",data?:unknown){
 const r=await fetch(base+path,{method,headers:{"Content-Type":"application/json",Cookie:cookie},...(data?{body:JSON.stringify(data)}:{})});
 assert.equal(r.status,200,`QA request status at ${path}`);
 return await r.json() as Record<string,any>;
}
const cookie=await login("/student/login",{username:student.username,pin:student.pin});
const chats=await api("/student/chats",cookie);
const chat=chats[0];assert(chat);
const before=await api(`/student/chats/${chat.id}/messages`,cookie);
const original=[...before.messages].reverse().find((v:any)=>v.role==="student");assert(original);
const exchange=await api(`/student/chats/${chat.id}/messages`,cookie,"POST",{content:original.content,retryMessageId:original.id});
assert.equal(exchange.studentMessage.id,original.id);
const steps=JSON.parse(exchange.reply.content).steps;
assert.equal(steps.length,1);assert(sentenceCount(steps[0])<=1);
assert(replyMatchesLanguage(exchange.reply.spokenContent,"en"));
assert(exchange.reply.spokenContent.includes(steps[0]));
assert.equal(exchange.reply.presentation.choices.length,3);
assert.equal(exchange.reply.presentation.showQuestion,true);
assert(!("practiceKey"in exchange.reply));
const after=await api(`/student/chats/${chat.id}/messages`,cookie);
assert.equal(after.messages.filter((v:any)=>v.role==="student").length,before.messages.filter((v:any)=>v.role==="student").length);
const parent=m.adults.find((a:any)=>a.role==="parent");
const adultCookie=await login("/adult/login",{role:parent.role,email:parent.email,password:parent.password});
for(const kind of ["fresh","mixed"]){
 const s=m.students.find((s:any)=>s.mode==="learning"&&s.kind===kind);
 const point=await api(`/adult/students/${s.id}/placement`,adultCookie);
 assert(point.result?.completed_at);assert.equal(point.result.test,"learning_difficulties");assert.equal(point.demo,false);
 if(kind==="mixed")assert(point.result.flags.includes("reasons_beyond_school_level"));
}
console.log("Original browser question retry: HTTP200, same saved message, one English learning step, three choices and chunk-scoped reading aid. Parent-owned completed starting points verified.");
