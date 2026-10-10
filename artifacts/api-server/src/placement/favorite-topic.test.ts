import assert from "node:assert/strict";
import {test} from "node:test";
import {fixture} from "./fixtures";
import {scorePlacement} from "./scoring";
import {favoriteTopic,TOPIC_MARKER} from "./favorite-topic";
import {makePractice} from "./practice";
test("English favorite examples match the child, not a hardcoded train topic",()=>{
 const r=scorePlacement("autism",fixture("autism","mixed"));
 r.favorite_thing="الديناصورات";
 assert.equal(favoriteTopic(r,{},"en").word,"dinosaurs");
 assert(makePractice(r,{},"en","practise addition").question.includes("dinosaurs"));
 r.favorite_thing="الفيلة";
 assert(favoriteTopic(r,{},"en").translate);
 assert.equal(favoriteTopic(r,{},"en").word,TOPIC_MARKER);
 assert(makePractice(r,{favoriteTopicEn:"elephants"},"en","practise addition").question.includes("elephants"));
 assert.equal(r.favorite_thing,"الفيلة");
});
