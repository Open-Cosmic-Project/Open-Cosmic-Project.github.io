import { Injectable, signal } from '@angular/core';

export const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

@Injectable({ providedIn: 'root' })
export class Clock {
  readonly now = signal(Date.now());
  constructor() { setInterval(() => this.now.set(Date.now()), 30_000); }
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'short' });
export function ago(iso: string | null | undefined, now: number): string {
  if (!iso) return '—';
  const s = Math.round((Date.parse(iso) - now) / 1000);
  const a = Math.abs(s);
  if (a < 45) return 'ahora mismo';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return rtf.format(Math.round(s / (86400 * 30)), 'month');
}

export const fmt = new Intl.NumberFormat('es');
