export interface FerienEntry {
  start: string;
  end: string;
  year: number;
  stateCode: string;
  name: string;
  slug: string;
}

export async function fetchSchoolHolidays(
  federalState: string,
  year: number,
): Promise<FerienEntry[]> {
  const res = await fetch(`https://ferien-api.de/api/v1/holidays/${federalState}/${year}`);
  if (!res.ok) {
    throw new Error(`ferien-api.de antwortete mit Status ${res.status}`);
  }
  return (await res.json()) as FerienEntry[];
}
