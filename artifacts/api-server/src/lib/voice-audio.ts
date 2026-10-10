import OpenAI from "openai";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const voiceOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 1 });
export class InvalidAudio extends Error {}
const exec = promisify(execFile);
export async function validatedWav(input: Buffer, mime: string): Promise<Buffer> {
  const webm = input.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const mp4 = input.subarray(4, 8).toString() === "ftyp";
  if ((mime === "audio/webm" && !webm) || (mime === "audio/mp4" && !mp4)) throw new InvalidAudio("صيغة التسجيل غير صالحة. حاول التسجيل مرة أخرى.");
  const dir = await mkdtemp(join(tmpdir(), "lumi-voice-"));
  try {
    const path = join(dir, webm ? "input.webm" : "input.mp4");
    await writeFile(path, input, { mode: 0o600 });
    let pcm: Buffer;
    try {
      const result = await exec("ffmpeg", ["-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe", "-i", path, "-map", "0:a:0", "-t", "31", "-ac", "1", "-ar", "16000", "-f", "s16le", "pipe:1"], { encoding: "buffer", maxBuffer: 1100000, timeout: 15000 });
      pcm = result.stdout;
    } catch { throw new InvalidAudio("لم نستطع قراءة التسجيل. حاول مرة أخرى."); }
    if (pcm.length > 30 * 32000) throw new InvalidAudio("التسجيل طويل. تحدث لمدة أقل من ٣٠ ثانية.");
    if (pcm.length < 3200) throw new InvalidAudio("التسجيل قصير جداً. اضغط الميكروفون وتحدث ثم اضغطه مرة أخرى.");
    const header = Buffer.alloc(44);
    header.write("RIFF"); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24); header.writeUInt32LE(32000, 28); header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
