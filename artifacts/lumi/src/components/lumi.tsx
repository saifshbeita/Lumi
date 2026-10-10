import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'wouter';
import { brand } from '@/lib/util';

export const btn = {
  base: 'inline-flex items-center justify-center gap-2 min-h-14 px-8 rounded-full border border-navy text-navy text-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  primary: 'bg-sun',
  secondary: 'bg-card',
  selected: 'bg-navy text-white',
};
export const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'selected' }) {
  return <button type="button" {...p} className={cx(btn.base, btn[variant], className)} />;
}
export function LinkButton({ href, variant = 'primary', className, children, ...p }: { href: string; variant?: 'primary' | 'secondary'; className?: string; children: ReactNode; 'data-testid'?: string }) {
  return <Link href={href} {...p} className={cx(btn.base, btn[variant], className)}>{children}</Link>;
}
export function Card({ className, children, ...p }: { className?: string; children: ReactNode; 'data-testid'?: string }) {
  return <div {...p} className={cx('bg-card border border-border rounded-3xl p-6', className)}>{children}</div>;
}
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <img src={brand('lumi-logo.png')} alt="" width={size} height={size} style={{ width: size, height: size }} className="object-contain" />
      <span className="font-heading font-semibold text-2xl text-navy">Lumi</span>
    </span>
  );
}
export function Field({ label, id, hint, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-navy">{label}</label>
      <input id={id} {...p} className={cx('min-h-14 px-5 rounded-full border border-navy bg-card text-navy text-lg w-full', className)} />
      {hint && <p className="text-base">{hint}</p>}
    </div>
  );
}
export function ErrorBox({ children }: { children: ReactNode }) {
  return <div role="alert" className="bg-blush text-navy border border-navy rounded-2xl px-5 py-4" data-testid="text-error">{children}</div>;
}
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cx('bg-mist rounded-3xl', className)} />;
}
export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6" role="status" aria-label={label}>
      <div className="w-full max-w-md flex flex-col gap-4"><SkeletonBlock className="h-24" /><SkeletonBlock className="h-40" /></div>
    </div>
  );
}
