import {test} from "node:test";
import assert from "node:assert/strict";
import {sentenceCount} from "./presentation";
test("sentence limits count prose, not emoji, list markers or decimal points",()=>{
 assert.equal(sentenceCount("Count three dots. 👍"),1);
 assert.equal(sentenceCount("عُدَّ النِّقَاطَ. ✅"),1);
 assert.equal(sentenceCount("1. Count three dots."),1);
 assert.equal(sentenceCount("Add 1.5 and 2.5."),1);
 assert.equal(sentenceCount("Use counters, e.g. dots."),1);
 assert.equal(sentenceCount("Count three dots. Add four more."),2);
 assert.equal(sentenceCount("3 + 4 = 7. ✅"),0);
});
