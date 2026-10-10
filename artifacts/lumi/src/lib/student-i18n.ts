import type { Mode } from '@/lib/tokens';
import i18n, { asLang, dirOf, type Lang } from '@/i18n';

/** Compatibility facade for student UIs. All copy lives in client/src/locales/{ar,en}.json. */
export type { Lang };
export { asLang };
export const langAttrs = (l: Lang) => ({ dir: dirOf(l), lang: l } as const);

const PLAIN = ['loading', 'logout', 'space', 'ask', 'logo', 'startFail', 'myChats', 'chatsFail', 'tryAgain', 'noChats', 'sessionFail',
  'chatOpenFail', 'back', 'typeMsg', 'nextFirst', 'typeHere', 'send', 'typing', 'sendFail', 'retry', 'emptyChat', 'next',
  'stopAudio', 'listenReply', 'listen', 'stopRec', 'startRec', 'hearing', 'thinking', 'tapToTalk', 'micHint',
  'audioFail', 'tapListen', 'recFail', 'notClear', 'retryOrType', 'noMic', 'noRecord', 'recStopped', 'recInvalid', 'micDenied',
  'home', 'welcome', 'loginSub', 'username', 'pin', 'keypad', 'clearAll', 'clear', 'delDigit', 'wait', 'enter', 'needUser', 'needPin',
  'badLogin', 'tooMany', 'language'] as const;

export type Strings = Record<(typeof PLAIN)[number], string> & {
  modeCopy: Record<Mode, string>;
  hello: (name: string) => string;
  stepOf: (a: number, b: number) => string;
  pinCount: (n: number) => string;
  schedule: string[];
  speaker: { playing: string; loading: string; error: string };
};

export function t(l: Lang = 'ar'): Strings {
  const f = i18n.getFixedT(l, null, 'student');
  const out = {} as Record<string, unknown>;
  for (const k of PLAIN) out[k] = f(k);
  return {
    ...(out as Record<(typeof PLAIN)[number], string>),
    modeCopy: { dyslexia: f('modeCopy.dyslexia'), learning: f('modeCopy.learning'), autism: f('modeCopy.autism') },
    hello: (name) => f('hello', { name }),
    stepOf: (a, b) => f('stepOf', { a, b }),
    pinCount: (n) => f('pinCount', { n }),
    schedule: f('schedule', { returnObjects: true }) as unknown as string[],
    speaker: { playing: f('speaker.playing'), loading: f('speaker.loading'), error: f('speaker.error') },
  };
}
