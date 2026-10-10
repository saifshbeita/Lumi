export type Language = "ar" | "en";
export function safetyResponse(text: string, mode: string, lang: Language): string | null {
  const t = text.normalize("NFKC").replace(/[\u064b-\u065f]/g, "");
  const danger = /hurt|scared|unsafe|abuse|kill myself|self.?harm|hitting me|hits me|خائف|خايف|أخاف|يؤذيني|يؤلم|أتألم|يضربني|بضربني|ضربني|غير آمن|انتحار|أقتل نفسي|أؤذي نفسي/i.test(t);
  const difference = /what.?s wrong with me|why am i different|شو عندي|ليش أنا مختلف|ليش انا مختلف/i.test(t);
  const discouraged = /i.?m stupid|i am stupid|غبي|غبية|ما بفهم/i.test(t);
  const rude = /rude joke|bad joke|swear word|curse word|نكتة سيئة|كلمة مسبة|شتيمة|انسى.*تعليمات|ignore.*instructions/i.test(t);
  let lines: string[] | undefined;
  if (danger) lines = lang === "en"
    ? ["I'm sorry this is happening; it is not your fault.", "Tell a trusted adult who can help keep you safe, such as your teacher, right now."]
    : ["أنا آسف لأن هذا يحدث لك؛ ليس ذنبك.", "تحدث الآن إلى شخص بالغ تثق به ويمكنه حمايتك، مثل معلمك."];
  else if (difference) lines = lang === "en"
    ? ["Everyone learns differently, and you deserve kindness.", "Talk to your teacher or parent about how you feel; they can help you."]
    : ["كل شخص يتعلم بطريقته، وأنت تستحق اللطف.", "تحدث إلى معلمك أو أحد والديك عما تشعر به؛ يمكنهم مساعدتك."];
  else if (discouraged) lines = lang === "en"
    ? ["Finding something hard does not make you stupid; you can learn with practice and help.", "Let's try one small step together: what would you like to learn?"]
    : ["صعوبة الفهم لا تعني أنك غبي؛ يمكنك التعلم بالتدرب والمساعدة.", "لنجرب خطوة صغيرة معاً: ما الذي تريد تعلمه؟"];
  else if (rude) lines = lang === "en"
    ? ["I'm Lumi, and I use kind words rather than rude jokes or insults.", "Let's learn something together: would you like a word or number question?"]
    : ["أنا لومي، أستخدم كلمات لطيفة بدلاً من الشتائم والنكات السيئة.", "لنتعلم معاً: هل تريد سؤالاً عن الكلمات أم الأعداد؟"];
  if (!lines) return null;
  if (mode === "learning") return JSON.stringify({ steps: lines });
  if (mode === "autism") return `${lang === "en" ? "Learn" : "نتعلم"}: ${lines[0]}\n${lang === "en" ? "Practice" : "نتدرب"}: ${lines[1]}`;
  return lines.join(" ");
}
