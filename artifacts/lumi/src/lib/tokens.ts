/** All visual tokens live in the shared index.css Tailwind theme. */
export type Mode = 'dyslexia' | 'learning' | 'autism';
export const MODES: Mode[] = ['dyslexia', 'learning', 'autism'];
export const modeLabel: Record<Mode, string> = { dyslexia: 'Dyslexia', learning: 'Learning difficulties', autism: 'Autism' };
export const modeLabelAr: Record<Mode, string> = { dyslexia: 'عسر القراءة', learning: 'صعوبات التعلم', autism: 'التوحد' };
