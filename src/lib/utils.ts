import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with Thai commas
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format currency (Thai Baht)
 */
export function formatCurrency(num: number | string | null | undefined): string {
  return `฿${formatNumber(num)}`;
}
