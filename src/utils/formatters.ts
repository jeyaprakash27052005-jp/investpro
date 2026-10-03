export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * "Today" as a YYYY-MM-DD string in the browser's LOCAL calendar date.
 *
 * `new Date().toISOString().slice(0, 10)` reads out the UTC date instead,
 * which runs a day behind the local date for the first few hours after
 * midnight in any timezone east of UTC (e.g. IST, UTC+5:30 — midnight to
 * ~5:30 AM). A form that pre-fills "today" with that pattern silently
 * defaults to yesterday's date during that window. Use this instead
 * everywhere a form needs today's date as its default value.
 */
export function getTodayLocalISO(): string {
  return getNowLocalISODateTime().slice(0, 10);
}

/** Like getTodayLocalISO, but keeps the time (YYYY-MM-DDTHH:mm) for datetime-local inputs. */
export function getNowLocalISODateTime(): string {
  const now = new Date();
  const localMs = now.getTime() - now.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}
