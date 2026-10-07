import { format, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

export function safeParseDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;
  
  const date = new Date(value);
  if (isNaN(date.getTime()) || !isValid(date)) {
    return null;
  }
  return date;
}

export function safeFormat(value: any, formatStr: string, fallback: string = 'Chưa cập nhật', options?: { locale?: any }): string {
  const date = safeParseDate(value);
  if (!date) return fallback;
  
  try {
    return format(date, formatStr, options);
  } catch (e) {
    return fallback;
  }
}

export function safeFormatLocale(value: any, localeFormatter: 'toLocaleDateString' | 'toLocaleString' | 'toLocaleTimeString' = 'toLocaleDateString', fallback: string = 'Chưa cập nhật', locales: string | string[] = 'vi-VN', options?: Intl.DateTimeFormatOptions): string {
  const date = safeParseDate(value);
  if (!date) return fallback;
  
  try {
    if (localeFormatter === 'toLocaleDateString') return date.toLocaleDateString(locales, options);
    if (localeFormatter === 'toLocaleString') return date.toLocaleString(locales, options);
    if (localeFormatter === 'toLocaleTimeString') return date.toLocaleTimeString(locales, options);
    return fallback;
  } catch (e) {
    return fallback;
  }
}
