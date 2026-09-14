export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export async function fetchPublicHolidays(year: number): Promise<NagerHoliday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/DE`);
  if (!res.ok) {
    throw new Error(`Nager.Date API antwortete mit Status ${res.status}`);
  }
  return (await res.json()) as NagerHoliday[];
}
