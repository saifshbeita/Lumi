import type { Mode } from '@/lib/tokens';

export type Lang = 'ar' | 'en';
export const asLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'ar');
export const langAttrs = (l: Lang) => ({ dir: l === 'ar' ? 'rtl' : 'ltr', lang: l } as const);

const ar = {
  loading: 'جار التحميل',
  modeCopy: { dyslexia: 'نصوص واضحة ومريحة للعين، خطوة بخطوة.', learning: 'تعلم بهدوء وبالسرعة التي تناسبك.', autism: 'مساحة هادئة ومنظمة ويمكن توقعها.' } as Record<Mode, string>,
  hello: (n: string) => `أهلا ${n}`,
  logout: 'خروج', space: 'مساحة التعلم', ask: 'اسأل لومي', logo: 'لومي',
  startFail: 'تعذر بدء المحادثة. حاول مرة أخرى.', myChats: 'محادثاتي', chatsFail: 'تعذر تحميل المحادثات.',
  tryAgain: 'حاول مرة أخرى', noChats: 'لا توجد محادثات بعد.', sessionFail: 'تعذر التحقق من الدخول.',
  chatOpenFail: 'تعذر فتح المحادثة. لا بأس، جرب مرة أخرى.', back: 'رجوع',
  typeMsg: 'اكتب رسالتك', nextFirst: 'اضغط التالي أولا', typeHere: 'اكتب هنا', send: 'إرسال',
  typing: 'لومي يكتب...', sendFail: 'لم تصل رسالتك إلى لومي. لا بأس، حاول مرة أخرى.', retry: 'إعادة المحاولة',
  emptyChat: 'اكتب سؤالك الأول وسأساعدك.',
  stepOf: (a: number, b: number) => `الخطوة ${a} من ${b}`, next: 'التالي',
  schedule: ['١. نسأل', '٢. نتعلم', '٣. نتدرب'],
  stopAudio: 'إيقاف الصوت', listenReply: 'استماع للرد', speaker: { playing: 'إيقاف', loading: 'لحظة...', error: 'حاول مجدداً' }, listen: 'استماع',
  stopRec: 'إيقاف التسجيل', startRec: 'ابدأ التسجيل', hearing: 'لومي يسمع...', thinking: 'لومي يفكر...', tapToTalk: 'اضغط لتتحدث',
  micHint: 'اضغط مرة أخرى للتوقف · حتى ٣٠ ثانية · صوت لومي مولّد بالذكاء الاصطناعي',
  // voice hook
  audioFail: 'تعذر تشغيل الصوت. اضغط للاستماع مرة أخرى.', tapListen: 'اضغط الاستماع لتشغيل الرد.',
  recFail: 'تعذر سماع التسجيل. حاول مرة أخرى أو اكتب سؤالك.', notClear: 'لم أسمع سؤالك بوضوح. حاول مرة أخرى.',
  retryOrType: 'حاول مرة أخرى أو اكتب سؤالك.', noMic: 'الميكروفون غير متاح في هذا المتصفح. يمكنك كتابة سؤالك هنا.',
  noRecord: 'هذا المتصفح لا يدعم التسجيل. يمكنك كتابة سؤالك هنا.', recStopped: 'توقف التسجيل. حاول مرة أخرى أو اكتب سؤالك.',
  recInvalid: 'التسجيل غير صالح أو كبير. حاول بسؤال أقصر.', micDenied: 'لم نتمكن من فتح الميكروفون. اسمح باستخدامه أو اكتب سؤالك هنا.',
  // login
  home: 'الرئيسية', welcome: 'أهلا بك في لومي', loginSub: 'اكتب اسمك ورقمك السري', username: 'اسم المستخدم', pin: 'الرقم السري',
  pinCount: (n: number) => `${n} من 4 أرقام`, keypad: 'لوحة الأرقام', clearAll: 'مسح الكل', clear: 'مسح', delDigit: 'حذف رقم',
  wait: 'لحظة...', enter: 'دخول', needUser: 'اكتب اسم المستخدم أولا', needPin: 'اكتب الرقم السري المكون من 4 أرقام',
  badLogin: 'اسم المستخدم أو الرقم السري غير صحيح. حاول مرة أخرى.', tooMany: 'محاولات كثيرة. خذ استراحة قصيرة ثم حاول مرة أخرى.',
  language: 'اللغة',
};
export type Strings = typeof ar;

const en: Strings = {
  loading: 'Loading',
  modeCopy: { dyslexia: 'Clear, easy-to-read text, step by step.', learning: 'Learn calmly, at your own pace.', autism: 'A calm, organised, predictable space.' },
  hello: (n: string) => `Hi ${n}`,
  logout: 'Log out', space: 'Learning space', ask: 'Ask Lumi', logo: 'Lumi',
  startFail: 'Could not start a chat. Please try again.', myChats: 'My chats', chatsFail: 'Could not load chats.',
  tryAgain: 'Try again', noChats: 'No chats yet.', sessionFail: 'Could not check your sign-in.',
  chatOpenFail: 'Could not open the chat. That is okay, try again.', back: 'Back',
  typeMsg: 'Type your message', nextFirst: 'Press Next first', typeHere: 'Type here', send: 'Send',
  typing: 'Lumi is typing...', sendFail: 'Your message did not reach Lumi. That is okay, try again.', retry: 'Retry',
  emptyChat: 'Ask your first question and I will help.',
  stepOf: (a: number, b: number) => `Step ${a} of ${b}`, next: 'Next',
  schedule: ['1. Ask', '2. Learn', '3. Practise'],
  stopAudio: 'Stop audio', listenReply: 'Listen to reply', speaker: { playing: 'Stop', loading: 'One moment...', error: 'Try again' }, listen: 'Listen',
  stopRec: 'Stop recording', startRec: 'Start recording', hearing: 'Lumi is listening...', thinking: 'Lumi is thinking...', tapToTalk: 'Tap to talk',
  micHint: 'Tap again to stop · up to 30 seconds · Lumi’s voice is AI-generated',
  audioFail: 'Could not play the audio. Tap to listen again.', tapListen: 'Tap Listen to play the reply.',
  recFail: 'Could not hear the recording. Try again or type your question.', notClear: 'I did not hear your question clearly. Try again.',
  retryOrType: 'Try again or type your question.', noMic: 'The microphone is not available in this browser. You can type your question here.',
  noRecord: 'This browser cannot record. You can type your question here.', recStopped: 'Recording stopped. Try again or type your question.',
  recInvalid: 'The recording was invalid or too long. Try a shorter question.', micDenied: 'We could not open the microphone. Allow it or type your question here.',
  home: 'Home', welcome: 'Welcome to Lumi', loginSub: 'Type your username and secret PIN', username: 'Username', pin: 'Secret PIN',
  pinCount: (n: number) => `${n} of 4 digits`, keypad: 'Number pad', clearAll: 'Clear all', clear: 'Clear', delDigit: 'Delete digit',
  wait: 'One moment...', enter: 'Enter', needUser: 'Type your username first', needPin: 'Type your 4-digit PIN',
  badLogin: 'Username or PIN is not right. Please try again.', tooMany: 'Too many tries. Take a short break, then try again.',
  language: 'Language',
};

export const STRINGS: Record<Lang, Strings> = { ar, en };
export const t = (l: Lang = 'ar') => STRINGS[l];
