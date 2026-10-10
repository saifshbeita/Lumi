import type { Mode } from '@/lib/tokens';
import type { Lang } from '@/lib/student-i18n';

/** Western digits (1, 2, 3) by default. Flip to true when a school uses Arabic-Indic (١، ٢، ٣). */
export const USE_ARABIC_INDIC_DIGITS = false;

const INDIC = '٠١٢٣٤٥٦٧٨٩';
export const digits = (s: string | undefined | null): string =>
  !s ? '' : USE_ARABIC_INDIC_DIGITS ? s.replace(/[0-9]/g, d => INDIC[Number(d)]) : s;

/** Guide-defined child phrases. Arabic in every interface language (item content). */
export const GUIDE = {
  title: 'يلا نتعرّف!',
  feedback: { dyslexia: 'شاطر! يلا التالي', learning: 'أحسنت! خلّينا نكمّل', autism: 'تمّ ✓' } as Record<Mode, string>,
  skip: { dyslexia: 'مش متأكد 🤷', learning: 'مش متأكد 🤷', autism: 'بدّي أتخطّى' } as Record<Mode, string>,
  brk: 'استراحة ⏸️',
  autismDone: 'خلصنا ✅. شكرًا! هلّق بنقدر نبلّش نتعلّم سوا.',
  done: 'خلصنا! شكرًا. هلّق بنقدر نبلّش نتعلّم سوا.',
  scheduleEnd: '✅ خلصنا',
  between: (n: number, next: string) => `خلّصنا جزء ${digits(String(n))}. هلّق: ${next}.`,
  questionOf: (a: number, b: number) => `سؤال ${digits(String(a))} من ${digits(String(b))}`,
  listenIt: 'اسمعها',
};

const CHROME = {
  ar: {
    title:GUIDE.title,next:"التالي",brk:GUIDE.brk,skip:GUIDE.skip,questionOf:GUIDE.questionOf,
    loading: 'لحظة…', loadFail: 'ما قدرنا نفتح النشاط.', saveFail: 'ما انحفظ. جرّب مرة ثانية.', retry: 'جرّب مرة ثانية',
    listen: 'اسمع', playing: 'عم يحكي…', tapToHear: 'اضغط لتسمع', resume: 'يلا نكمّل', paused: 'استراحة. كل شي محفوظ.',
    start: 'يلا نبلّش', soundOn: 'الصوت شغّال', soundOff: 'الصوت مطفي', confirm: 'تمام', home: 'للصفحة الرئيسية',
    chosen: (n: number, m: number) => `اخترت ${digits(String(n))} من ${digits(String(m))}`, typeHere: 'اكتب هون',
    record: 'احكي', stop: 'وقّف', transcribing: 'عم نسمع…', micDenied: 'ما في إذن للمايك. بتقدر تكتب.', noMic: 'المايك مش متوفر. بتقدر تكتب.',
    recFail: 'ما فهمنا التسجيل. جرّب أو اكتب.', watch: 'شوف منيح', tapsLeft: (n: number) => `ضايل ${digits(String(n))}`,
    noSpeech: 'الصوت مش متوفر هلّق.',
  },
  en: {
    title:"Let's get to know you",next:"Next",brk:"Break ⏸️",skip:{dyslexia:"Not sure 🤷",learning:"Not sure 🤷",autism:"I'd like to skip"},questionOf:(a:number,b:number)=>`Question ${digits(String(a))} of ${digits(String(b))}`,
    loading: 'One moment…', loadFail: 'We could not open the activity.', saveFail: 'That did not save. Try again.', retry: 'Try again',
    listen: 'Listen', playing: 'Speaking…', tapToHear: 'Tap to hear', resume: "Let's continue", paused: 'Break time. Everything is saved.',
    start: "Let's start", soundOn: 'Sound on', soundOff: 'Sound off', confirm: 'Done', home: 'Go to home',
    chosen: (n: number, m: number) => `${n} of ${m} chosen`, typeHere: 'Type here',
    record: 'Talk', stop: 'Stop', transcribing: 'Listening…', micDenied: 'No microphone permission. You can type.', noMic: 'Microphone not available. You can type.',
    recFail: 'We could not understand. Try again or type.', watch: 'Look closely', tapsLeft: (n: number) => `${n} left`,
    noSpeech: 'Sound is not available right now.',
  },
};
export const chrome = (l: Lang) => CHROME[l === 'en' ? 'en' : 'ar'];
export type Chrome = ReturnType<typeof chrome>;
