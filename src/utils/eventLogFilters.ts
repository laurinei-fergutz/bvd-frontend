import type { EventLogRow } from '../services/api';

export type ExtraFilter =
  | { column: string; kind: 'numeric'; min: number | null; max: number | null }
  | { column: string; kind: 'categorical'; selected: string[] };

export type EventLogFilters = {
  dateFrom: string;
  dateTo: string;
  resourceValues: string[];
  extra: ExtraFilter | null;
};

export const EMPTY_FILTERS: EventLogFilters = {
  dateFrom: '',
  dateTo: '',
  resourceValues: [],
  extra: null,
};

export function isColumnNumeric(rows: EventLogRow[], column: string): boolean {
  const values = rows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

  if (values.length === 0) return false;
  return values.every((value) => typeof value === 'number' || !Number.isNaN(Number(value)));
}

export function distinctValues(rows: EventLogRow[], column: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[column];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      values.add(String(value));
    }
  }
  return Array.from(values).sort();
}

/**
 * Multi-criteria filtering (temporal range, resource, and one generic
 * value/category column) applied client-side before validation + graph
 * generation, since the full event log is already loaded in the browser.
 */
export function applyFilters(
  rows: EventLogRow[],
  timestampCol: string,
  resourceCol: string | null,
  filters: EventLogFilters,
): EventLogRow[] {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  let to: Date | null = null;
  if (filters.dateTo) {
    to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
  }

  return rows.filter((row) => {
    if (from || to) {
      const raw = row[timestampCol];
      const date = raw != null ? new Date(String(raw)) : null;
      if (date && !Number.isNaN(date.getTime())) {
        if (from && date < from) return false;
        if (to && date > to) return false;
      }
    }

    if (resourceCol && filters.resourceValues.length > 0) {
      if (!filters.resourceValues.includes(String(row[resourceCol]))) return false;
    }

    if (filters.extra) {
      const value = row[filters.extra.column];
      if (filters.extra.kind === 'numeric') {
        const num = Number(value);
        if (Number.isNaN(num)) return false;
        if (filters.extra.min != null && num < filters.extra.min) return false;
        if (filters.extra.max != null && num > filters.extra.max) return false;
      } else if (filters.extra.selected.length > 0) {
        if (!filters.extra.selected.includes(String(value))) return false;
      }
    }

    return true;
  });
}
