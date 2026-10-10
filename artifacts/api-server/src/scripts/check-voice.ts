// Development-only checks. Run after creating generated-artifacts/lumi-voice/question.wav.
// Uses real transcription/TTS calls and only seeded demonstration accounts.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

if (process.env.NODE_ENV === "production") throw new Error("Do not run voice checks in production");
const base = "http://localhost:80/api/student";
const folder = resolve("../../generated-artifacts/lumi-voice");
for (const format of ["webm", "mp4"]) {
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${folder}/question.wav`, "-c:a", format === "webm" ? "libopus" : "aac", `${folder}/question.${format}`]);
}
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=31", "-c:a", "libopus", `${folder}/long.webm`]);
async function login(username: string, pin: string) {
  const response = await fetch(`${base}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, pin }) });
  assert.equal(response.status, 200);
  return response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
const adam = await login("adam", "1234");
const layan = await login("layan", "2345");
const omar = await login("omar", "3456");
const results: Record<string, unknown> = {};
async function upload(data: Uint8Array, type: string, cookie = adam) {
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(data)], { type }), type === "audio/mp4" ? "question.mp4" : "question.webm");
  return fetch(`${base}/voice/transcribe`, { method: "POST", headers: { Cookie: cookie }, body: form });
}
for (const format of ["webm", "mp4"]) {
  const response = await upload(await readFile(`${folder}/question.${format}`), `audio/${format}`);
  assert.equal(response.status, 200, `${format}: ${await response.clone().text()}`);
  const data = await response.json() as { text: string };
  assert.match(data.text, /(?:أجمع|اجمع)/);
  results[`${format}Transcript`] = data.text;
}
assert.equal((await upload(await readFile(`${folder}/long.webm`), "audio/webm")).status, 400);
assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1), "audio/webm")).status, 413);
assert.equal((await upload(Buffer.from("invalid"), "audio/webm")).status, 400);
results.validation = "31 seconds rejected; >5MB rejected; malformed audio rejected";
for (const [name, cookie] of [["learning", layan], ["autism", omar], ["anonymous", ""]]) {
  assert.equal((await upload(new Uint8Array([0]), "audio/webm", cookie)).status, 403);
  assert.equal((await fetch(`${base}/messages/2/audio`, { headers: { Cookie: cookie } })).status, 403);
  results[`${name}Authorization`] = "Both endpoints 403";
}
const chats = await (await fetch(`${base}/chats`, { headers: { Cookie: adam } })).json() as Array<{ id: number }>;
let aiId: number | undefined;
for (const chat of chats.slice().reverse()) {
  const history = await (await fetch(`${base}/chats/${chat.id}/messages`, { headers: { Cookie: adam } })).json() as { messages: Array<{ id: number; role: string }> };
  aiId = history.messages.find(m => m.role === "ai")?.id;
  if (aiId) break;
}
assert.ok(aiId, "Seeded Adam must have an AI reply");
const first = await fetch(`${base}/messages/${aiId}/audio`, { headers: { Cookie: adam } });
assert.equal(first.status, 200, await first.clone().text());
const firstBytes = Buffer.from(await first.arrayBuffer());
assert.ok(firstBytes.length > 1000);
const second = await fetch(`${base}/messages/${aiId}/audio`, { headers: { Cookie: adam } });
assert.equal(second.status, 200);
assert.equal(second.headers.get("x-lumi-audio-cache"), "hit");
assert.deepEqual(Buffer.from(await second.arrayBuffer()), firstBytes);
results.cache = { messageId: aiId, first: first.headers.get("x-lumi-audio-cache"), second: "hit", sha256: createHash("sha256").update(firstBytes).digest("hex") };
const foreignChats = await (await fetch(`${base}/chats`, { headers: { Cookie: layan } })).json() as Array<{ id: number }>;
for (const chat of foreignChats) {
  const history = await (await fetch(`${base}/chats/${chat.id}/messages`, { headers: { Cookie: layan } })).json() as { messages: Array<{ id: number; role: string }> };
  const foreign = history.messages.find(m => m.role === "ai");
  if (foreign) { assert.equal((await fetch(`${base}/messages/${foreign.id}/audio`, { headers: { Cookie: adam } })).status, 403); results.foreignAudio = "403"; break; }
}
await writeFile(`${folder}/api-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
