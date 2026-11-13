export type PlacedFilter = 'all' | 'placed' | 'unplaced';

export interface StudentFilters {
  query: string;
  /** 'all' or an exact branch name. */
  branch: string;
  /** Raw text from the CGPA box; blank or non-numeric means "no minimum". */
  minCgpa: string;
  placed: PlacedFilter;
}

/** Returns the minimum CGPA, or null when the box is empty / not a number. */
export function parseMinCgpa(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const hasActiveStudentFilters = (f: StudentFilters) =>
  f.query.trim() !== '' || f.branch !== 'all' || parseMinCgpa(f.minCgpa) !== null || f.placed !== 'all';

/**
 * Makes free text safe inside a PostgREST `or(...)` filter: commas, parentheses, quotes, backslashes and
 * LIKE wildcards would change the filter's meaning, so they are replaced by spaces.
 */
export const sanitizeSearchTerm = (raw: string) => raw.replace(/[,()"\\%*_]/g, ' ').replace(/\s+/g, ' ').trim();
