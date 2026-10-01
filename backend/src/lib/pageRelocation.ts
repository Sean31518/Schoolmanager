/**
 * Maps pages of an old PDF version to the new one by page fingerprints.
 * Pages (0-based here) that are byte-identical in both versions are matched
 * via a longest common subsequence, which keeps page order and copes with
 * the many identical blank template pages a Goodnotes Heft has. A page
 * that changed (was written on) has no match; it's placed relative to its
 * nearest matched neighbours - if the pages around it didn't shift apart
 * or together, that's an in-place edit and counts as certain.
 */
export interface RelocatedPage {
  index: number;
  uncertain: boolean;
}

export function matchPages(oldFps: string[], newFps: string[]): Map<number, number> {
  const m = oldFps.length;
  const n = newFps.length;
  // lengths[i][j] = LCS of oldFps[i..] and newFps[j..]
  const lengths = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lengths[i][j] =
        oldFps[i] === newFps[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const matches = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldFps[i] === newFps[j]) {
      matches.set(i, j);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return matches;
}

export function relocatePage(
  oldIndex: number,
  matches: Map<number, number>,
  oldCount: number,
  newCount: number,
): RelocatedPage {
  const clamp = (index: number) => Math.min(Math.max(index, 0), Math.max(newCount - 1, 0));
  const direct = matches.get(oldIndex);
  if (direct !== undefined) return { index: direct, uncertain: false };

  let before: number | undefined;
  for (let i = oldIndex - 1; i >= 0 && before === undefined; i--) if (matches.has(i)) before = i;
  let after: number | undefined;
  for (let i = oldIndex + 1; i < oldCount && after === undefined; i++) if (matches.has(i)) after = i;

  if (before !== undefined && after !== undefined) {
    const guess = matches.get(before)! + (oldIndex - before);
    const gapUnchanged = matches.get(after)! - matches.get(before)! === after - before;
    return { index: clamp(guess), uncertain: !gapUnchanged };
  }
  if (before !== undefined) {
    // Only pages before it are anchored: certain if the Heft still ends
    // the same distance after the anchor (nothing was appended/removed
    // after it... or it was simply appended to at the end).
    const guess = matches.get(before)! + (oldIndex - before);
    return { index: clamp(guess), uncertain: guess >= newCount };
  }
  if (after !== undefined) {
    const guess = matches.get(after)! - (after - oldIndex);
    return { index: clamp(guess), uncertain: guess < 0 || matches.get(after)! !== after };
  }
  return { index: clamp(oldIndex), uncertain: true };
}
