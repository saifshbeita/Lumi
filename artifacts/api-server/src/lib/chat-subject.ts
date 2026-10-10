export type ChatSubject = "math" | "science" | "arabic" | "english" | "general";

export function subjectPrompt(subject: ChatSubject): string {
  return `The child picked the subject: ${subject}. Focus your answer on this subject. If the subject is general, answer anything.`;
}
