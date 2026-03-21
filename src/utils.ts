import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h > 0 ? `${h}h` : '',
    m > 0 ? `${m}m` : '',
    s > 0 || (h === 0 && m === 0) ? `${s}s` : ''
  ].filter(Boolean).join(' ');
}

export function getSecondsFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60;
}

export function getTimeFromSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
