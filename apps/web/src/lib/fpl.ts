export type DraftPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

export type DraftPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  globalRank: number;
  position: DraftPosition;
  nationalityCode: string | null;
  photoUrl: string | null;
  teamId: string;
  teamName: string;
  teamCrestUrl: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const POSITIONS = new Set<DraftPosition>(['GK', 'DEF', 'MID', 'FWD']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === 'string' && record[key].trim() ? record[key].trim() : null;
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  return typeof record[key] === 'number' && Number.isInteger(record[key]) ? record[key] : null;
}

function displayTeamName(name: string): string {
  const cleaned = name
    .split(/\s+/)
    .filter((word) => !/^(afc|fc)$/i.test(word))
    .join(' ');
  return cleaned || name;
}

export async function currentDraftPlayers(): Promise<DraftPlayer[]> {
  const response = await fetch(`${API_BASE}/v1/player-snapshots/latest`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Player snapshot request failed: ${response.status}`);

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.players)) {
    throw new Error('Player snapshot response has an unexpected shape');
  }

  const players: DraftPlayer[] = [];
  for (const value of payload.players) {
    if (!isRecord(value)) continue;
    const id = stringField(value, 'id');
    const teamId = stringField(value, 'team_id');
    const firstName = stringField(value, 'first_name');
    const lastName = stringField(value, 'last_name');
    const displayName = stringField(value, 'display_name');
    const globalRank = numberField(value, 'global_rank');
    const teamName = stringField(value, 'team_name');
    const teamCrestUrl = stringField(value, 'team_crest_url');
    const positionValue = stringField(value, 'position');
    const nationalityCode = stringField(value, 'nationality_code');
    const photoUrl = stringField(value, 'photo_url');
    const position = positionValue as DraftPosition | null;
    if (
      !id ||
      !teamId ||
      !firstName ||
      !lastName ||
      !displayName ||
      globalRank === null ||
      !teamName ||
      !position ||
      !POSITIONS.has(position)
    ) {
      continue;
    }
    if (nationalityCode && !/^[A-Z0-9]{2}$/.test(nationalityCode)) continue;
    if (
      photoUrl &&
      !/^https:\/\/resources\.premierleague\.com\/premierleague\/photos\/players\/250x250\/p\d+\.png$/.test(
        photoUrl,
      )
    ) {
      continue;
    }
    players.push({
      id,
      firstName,
      lastName,
      displayName,
      globalRank,
      position,
      nationalityCode,
      photoUrl,
      teamId,
      teamName: displayTeamName(teamName),
      teamCrestUrl,
    });
  }

  return players.sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) ||
      a.firstName.localeCompare(b.firstName) ||
      a.id.localeCompare(b.id),
  );
}
