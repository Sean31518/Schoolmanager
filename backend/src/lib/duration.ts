const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parst einfache Dauer-Strings wie "15m", "30d", "1h" in Millisekunden. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${value}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * UNIT_MS[unit];
}
