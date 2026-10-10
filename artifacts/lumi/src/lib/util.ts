export function errMsg(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const x = e as { data?: { error?: string; message?: string }; message?: string } | null;
  return x?.data?.error ?? x?.data?.message ?? fallback;
}
export const brand = (f: string) => `${import.meta.env.BASE_URL}brand/${f}`;
