/** Localized fallback only: server error text may be in a different language than the active UI. */
export function errMsg(_e: unknown, fallback: string): string {
  return fallback;
}
export const brand = (f: string) => `${import.meta.env.BASE_URL}brand/${f}`;
