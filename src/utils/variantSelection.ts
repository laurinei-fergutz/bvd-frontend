import type { EventLogRow, ProcessVariant } from '../services/api';

/**
 * Maps each variant to the case_ids that produced it, by replaying the same
 * grouping the backend used (rows already come sorted by case_id, timestamp
 * from `validateEventLog`, so pushing activities in row order reconstructs
 * each case's chronological sequence).
 */
export function computeCaseIdsByVariant(rows: EventLogRow[], variants: ProcessVariant[]): string[][] {
  const sequenceByCase = new Map<string, string[]>();
  for (const row of rows) {
    const caseId = String(row.case_id);
    const activity = String(row.activity);
    const seq = sequenceByCase.get(caseId);
    if (seq) seq.push(activity);
    else sequenceByCase.set(caseId, [activity]);
  }

  return variants.map((variant) => {
    const key = variant.sequence.join('␟');
    const matches: string[] = [];
    for (const [caseId, seq] of sequenceByCase) {
      if (seq.join('␟') === key) matches.push(caseId);
    }
    return matches;
  });
}

export function unionSelectedCaseIds(caseIdsByVariant: string[][], checkedIndices: Set<number>): Set<string> {
  const result = new Set<string>();
  for (const idx of checkedIndices) {
    for (const caseId of caseIdsByVariant[idx] ?? []) result.add(caseId);
  }
  return result;
}
