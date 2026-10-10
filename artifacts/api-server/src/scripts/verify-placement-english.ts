import assert from "node:assert/strict";
import {generatePersonalizedReply,replyMatchesLanguage} from "../lib/student-ai";
import {fixture} from "../placement/fixtures";
import {scorePlacement} from "../placement/scoring";
const result=scorePlacement("learning_difficulties",fixture("learning_difficulties","low"));
try {
 const reply=await generatePersonalizedReply("learning",[{role:"student",content:"How do I add 3 and 4?"}],"en",result,[],{});
 assert(replyMatchesLanguage(reply.spokenContent,"en"));
 assert.equal(JSON.parse(reply.content).steps.length,1);
 assert.equal(reply.presentation?.choices?.length,3);
 console.log("Low-starting-point English learning reply: passed; one visible check and a complete English explanation.");
}catch(err){
 const message=err instanceof Error?err.message:"";
 console.error(message.startsWith("Invalid placement-scoped reply after regeneration")?message:"English learning request failed (details withheld).");
 process.exitCode=1;
}
