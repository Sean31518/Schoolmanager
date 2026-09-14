/**
 * Nager.Date nutzt ISO-3166-2:DE-Codes mit "DE-"-Präfix (z.B. "DE-BW"),
 * die exakt unseren internen FederalState-Werten entsprechen.
 */
export function toNagerCountyCode(federalState: string): string {
  return `DE-${federalState}`;
}
