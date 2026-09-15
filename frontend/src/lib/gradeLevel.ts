export function formatGradeLevel(n: number): string {
  return n >= 11 && n <= 13 ? `Kursstufe ${n - 10}` : `Klasse ${n}`
}

export function formatGradeLevels(levels: number[]): string {
  return [...levels]
    .sort((a, b) => a - b)
    .map(formatGradeLevel)
    .join(' & ')
}
