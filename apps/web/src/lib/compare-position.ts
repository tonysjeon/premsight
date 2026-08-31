import type { Player } from '@/lib/api';

export const COMPARE_POSITIONS = ['GK', 'DEF', 'MID', 'ATT'] as const;
export const DEF_SLOTS = ['CB', 'FB'] as const;
export const ATT_SLOTS = ['ST', 'WG'] as const;
export type DefSlot = (typeof DEF_SLOTS)[number];
export type AttSlot = (typeof ATT_SLOTS)[number];
export type ComparePosition = (typeof COMPARE_POSITIONS)[number] | DefSlot | AttSlot;
export const COMPARE_MAX_PLAYERS = 5;

export const DEF_SLOT_LABELS: Record<DefSlot, string> = {
  FB: 'LB / RB',
  CB: 'CB',
};

export const ATT_SLOT_LABELS: Record<AttSlot, string> = {
  WG: 'LW / RW',
  ST: 'ST',
};

const DEF_SLOT_CODES: Record<DefSlot, readonly string[]> = {
  FB: ['LB', 'LWB', 'RB', 'RWB'],
  CB: ['CB'],
};

const ATT_SLOT_CODES: Record<AttSlot, readonly string[]> = {
  WG: ['LW', 'RW'],
  ST: ['ST', 'CF'],
};

export function isDefSlot(position: ComparePosition): position is DefSlot {
  return (DEF_SLOTS as readonly string[]).includes(position);
}

export function isAttSlot(position: ComparePosition): position is AttSlot {
  return (ATT_SLOTS as readonly string[]).includes(position);
}

export function defFamilyExpanded(position: ComparePosition): boolean {
  return position === 'DEF' || isDefSlot(position);
}

export function attFamilyExpanded(position: ComparePosition): boolean {
  return position === 'ATT' || isAttSlot(position);
}

export function compareFilterChips(): ComparePosition[] {
  return [...COMPARE_POSITIONS];
}

export function expandComparePosition(position: ComparePosition): ComparePosition {
  if (position === 'DEF') return 'CB';
  if (position === 'ATT') return 'ST';
  return position;
}

export type ExpandedCompareFamily = 'DEF' | 'ATT' | null;

export function nextCompareFilterState(
  expanded: ExpandedCompareFamily,
  clicked: ComparePosition,
  current: ComparePosition | null,
): { position: ComparePosition; expanded: ExpandedCompareFamily } {
  if (clicked === 'DEF') {
    if (expanded === 'DEF') return { position: current ?? 'CB', expanded: 'DEF' };
    return { position: 'CB', expanded: 'DEF' };
  }
  if (clicked === 'ATT') {
    if (expanded === 'ATT') return { position: current ?? 'ST', expanded: 'ATT' };
    return { position: 'ST', expanded: 'ATT' };
  }
  if (isDefSlot(clicked)) return { position: clicked, expanded: 'DEF' };
  if (isAttSlot(clicked)) return { position: clicked, expanded: 'ATT' };
  return { position: clicked, expanded: null };
}

export function playerDefSlot(player: Player): DefSlot | null {
  if (playerComparePosition(player) !== 'DEF') return null;
  const detailed = player.positions ?? [];
  const primary = detailed.find((item) => item !== 'DEF') ?? detailed[0] ?? 'DEF';
  if (primary === 'RB' || primary === 'RWB' || primary === 'LB' || primary === 'LWB') return 'FB';
  if (primary === 'CB' || primary === 'DEF') return 'CB';
  for (const slot of DEF_SLOTS) {
    if (detailed.some((item) => DEF_SLOT_CODES[slot].includes(item))) return slot;
  }
  return 'CB';
}

export function playerAttSlot(player: Player): AttSlot | null {
  if (playerHasWgScoutStats(player)) return 'WG';
  if (playerHasStScoutStats(player)) return 'ST';
  if (playerComparePosition(player) !== 'ATT') return null;
  const detailed = player.positions ?? [];
  const primary = detailed.find((item) => item !== 'FWD') ?? detailed[0] ?? 'FWD';
  if (primary === 'LW' || primary === 'RW') return 'WG';
  if (primary === 'ST' || primary === 'CF' || primary === 'FWD') return 'ST';
  for (const slot of ATT_SLOTS) {
    if (detailed.some((item) => ATT_SLOT_CODES[slot].includes(item))) return slot;
  }
  return 'ST';
}

export const COMPARE_COLORS = [
  'var(--accent)',
  'var(--compare-2)',
  '#2f6fff',
  '#f59e0b',
  '#ec4899',
] as const;

const COMPOUND_LAST_NAME_PREFIXES = new Set([
  'van',
  'von',
  'de',
  'del',
  'da',
  'dos',
  'di',
  'le',
  'la',
  'el',
  'ter',
  'ten',
  'du',
  'mac',
  'mc',
]);

export type CompareAxis = {
  axis: string;
  label: string;
  values: number[];
};

export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/gi, 'ss')
    .replace(/ł/gi, 'l')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase();
}

function foldName(value: string): string {
  return foldSearchText(value).replace(/[.\s]/g, '');
}

function compareLastName(last: string, display: string): string {
  const parts = last.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return last;

  const firstPart = parts[0]?.toLowerCase() ?? '';
  if (COMPOUND_LAST_NAME_PREFIXES.has(firstPart)) {
    return last;
  }

  const foldedDisplay = foldName(display);
  const foldedLast = foldName(last);
  if (foldedLast === foldedDisplay || foldedDisplay.endsWith(foldedLast)) {
    return last;
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    const fp = foldName(part);
    if (
      fp.length >= 3 &&
      (fp === foldedDisplay || foldedDisplay.endsWith(fp) || foldedDisplay.includes(fp))
    ) {
      return part;
    }
  }

  const firstFp = foldName(parts[0] ?? '');
  if (firstFp === foldedDisplay || foldedDisplay.endsWith(firstFp)) {
    return parts[0] ?? last;
  }

  const lastPart = parts[parts.length - 1]!;
  if (!COMPOUND_LAST_NAME_PREFIXES.has(lastPart.toLowerCase())) {
    return lastPart;
  }

  return parts[0] ?? last;
}

export function playerCompareName(player: Player): string {
  const scout = (player.scout_name ?? '').trim();
  if (scout) return scout;

  const first = (player.first_name ?? '').trim();
  const display = (player.display_name ?? '').trim();
  const foldedDisplay = foldName(display);
  const foldedFirst = foldName(first);

  if (foldedFirst === 'alisson' || foldedDisplay === 'alisson') return 'Alisson';
  if (foldedFirst === 'joelinton' || foldedDisplay === 'joelinton') return 'Joelinton';
  if (foldedFirst === 'murillo' || foldedDisplay === 'murillo') return 'Murillo';
  if (foldedFirst === 'reinildo' || foldedDisplay === 'reinildo') return 'Reinildo';
  if (foldedDisplay === 'gabriel') return 'Gabriel';
  if (foldedDisplay === 'yeremy') return 'Yeremy';

  if (display.includes('.')) {
    const partsDot = display.split('.');
    const afterDot = partsDot.slice(1).join('.').trim();
    if (afterDot && !/^\d+$/.test(afterDot)) {
      const initial = first
        ? first.charAt(0).toLocaleUpperCase()
        : partsDot[0]?.trim().toUpperCase() || '';
      return initial ? `${initial}. ${afterDot}` : afterDot;
    }
  }

  const last = compareLastName((player.last_name ?? '').trim(), display);
  if (!first) return display || last;

  const initial = first.charAt(0).toLocaleUpperCase();
  if (last) {
    return `${initial}. ${last}`;
  }
  return first;
}

const OUTFIELD_RADAR_AXES = [
  { axis: 'scoring', label: 'Scoring', fullName: 'Scoring contribution' },
  { axis: 'creation', label: 'Creation', fullName: 'Chance creation' },
  { axis: 'progression', label: 'Progression', fullName: 'Ball progression' },
  { axis: 'dribbling', label: 'Dribbling', fullName: 'Dribbling and carries' },
  { axis: 'defending', label: 'Defending', fullName: 'Defensive actions' },
  { axis: 'aerial', label: 'Aerial', fullName: 'Aerial duels won' },
] as const;

const GK_RADAR_AXES = [
  { axis: 'short_pct', label: 'Short %', fullName: 'Short pass percentage' },
  { axis: 'psxg_ga', label: 'PSxG-GA', fullName: 'Post-shot expected goals minus goals against' },
  { axis: 'save_pct', label: 'Save %', fullName: 'Save percentage' },
  { axis: 'aerials', label: 'Aerials won', fullName: 'Aerials won' },
  { axis: 'int_padj', label: 'Interceptions', fullName: 'Possession-adjusted interceptions' },
  { axis: 'passes_cmp', label: 'Passes', fullName: 'Passes completed' },
  { axis: 'long_pct', label: 'Long %', fullName: 'Long pass percentage' },
] as const;

const GK_TABLE_AXES = [
  { axis: 'save_pct', label: 'Save %', fullName: 'Save percentage' },
  { axis: 'aerials', label: 'Aerials won', fullName: 'Aerials won' },
  { axis: 'int_padj', label: 'Int (PAdj)', fullName: 'Possession-adjusted interceptions' },
  { axis: 'passes_cmp', label: 'Passes cmp', fullName: 'Passes completed' },
  { axis: 'long_pct', label: 'Long %', fullName: 'Long pass percentage' },
  { axis: 'short_pct', label: 'Short %', fullName: 'Short pass percentage' },
  { axis: 'psxg_ga', label: 'PSxG-GA', fullName: 'Post-shot expected goals minus goals against' },
] as const;

const CB_RADAR_AXES = [
  { axis: 'passes_cmp', label: 'Passes cmp', fullName: 'Passes completed' },
  { axis: 'fwd_pass_pct', label: 'Fwd pass%', fullName: 'Forward pass percentage' },
  { axis: 'prog_passes', label: 'Prog passes', fullName: 'Progressive passes' },
  { axis: 'poss_won', label: 'Poss won', fullName: 'Possession won' },
  { axis: 'def_duel_pct', label: 'Def duel%', fullName: 'Defensive duel win percentage' },
  { axis: 'aerial_duel_pct', label: 'Aerial duel%', fullName: 'Aerial duel win percentage' },
  { axis: 'prog_carries', label: 'Prog carries', fullName: 'Progressive carries' },
] as const;

const FB_RADAR_AXES = [
  { axis: 'aerial_duel_pct', label: 'Aerial%', fullName: 'Aerial duel win percentage' },
  { axis: 'prog_carries', label: 'Carrying', fullName: 'Progressive carries' },
  { axis: 'crosses_cmp', label: 'Crosses', fullName: 'Crosses completed' },
  { axis: 'xa', label: 'xAssist', fullName: 'Expected assists' },
  { axis: 'prog_passes', label: 'Prog passes', fullName: 'Progressive passes' },
  { axis: 'poss_won', label: 'Poss won', fullName: 'Possession won' },
  { axis: 'def_duel_pct', label: 'Def duel%', fullName: 'Defensive duel win percentage' },
] as const;

const FB_TABLE_AXES = [
  { axis: 'crosses_cmp', label: 'Crosses cmp', fullName: 'Crosses completed' },
  { axis: 'xa', label: 'xA', fullName: 'Expected assists' },
  { axis: 'prog_passes', label: 'Prog passes', fullName: 'Progressive passes' },
  { axis: 'poss_won', label: 'Poss won', fullName: 'Possession won' },
  { axis: 'def_duel_pct', label: 'Def duel%', fullName: 'Defensive duel win percentage' },
  { axis: 'aerial_duel_pct', label: 'Aerial duel%', fullName: 'Aerial duel win percentage' },
  { axis: 'prog_carries', label: 'Prog carries', fullName: 'Progressive carries' },
] as const;

const MID_RADAR_AXES = [
  { axis: 'key_passes', label: 'Key passes', fullName: 'Key passes' },
  { axis: 'prog_passes', label: 'Prog passes', fullName: 'Progressive passes' },
  { axis: 'duel_pct', label: 'Duels%', fullName: 'Duel win percentage' },
  { axis: 'poss_won', label: 'Poss won', fullName: 'Possession won' },
  { axis: 'prog_carries', label: 'Carrying', fullName: 'Progressive carries' },
  { axis: 'fwd_passes', label: 'Fwd passes', fullName: 'Forward passes' },
  { axis: 'fwd_pass_pct', label: 'Fwd pass%', fullName: 'Forward pass percentage' },
] as const;

const MID_TABLE_AXES = [
  { axis: 'duel_pct', label: 'Duel%', fullName: 'Duel win percentage' },
  { axis: 'poss_won', label: 'Poss won', fullName: 'Possession won' },
  { axis: 'prog_carries', label: 'Prog carries', fullName: 'Progressive carries' },
  { axis: 'fwd_passes', label: 'Fwd passes', fullName: 'Forward passes' },
  { axis: 'fwd_pass_pct', label: 'Fwd pass%', fullName: 'Forward pass percentage' },
  { axis: 'key_passes', label: 'Key passes', fullName: 'Key passes' },
  { axis: 'prog_passes', label: 'Prog passes', fullName: 'Progressive passes' },
] as const;

const ST_RADAR_AXES = [
  { axis: 'xa', label: 'xA', fullName: 'Expected assists' },
  { axis: 'off_duels', label: 'Off duels', fullName: 'Offensive duels won' },
  { axis: 'npg', label: 'NPG', fullName: 'Non-penalty goals' },
  { axis: 'npxg', label: 'npxG', fullName: 'Non-penalty expected goals' },
  { axis: 'conv_pct', label: 'Conversion%', fullName: 'Goal conversion percentage' },
  { axis: 'aerial_pct', label: 'Aerial%', fullName: 'Aerial duels won percentage' },
  { axis: 'touches_box', label: 'Touches in box', fullName: 'Touches in penalty box' },
] as const;

const ST_TABLE_AXES = [
  { axis: 'npg', label: 'NPG', fullName: 'Non-penalty goals' },
  { axis: 'npxg', label: 'npxG', fullName: 'Non-penalty expected goals' },
  { axis: 'conv_pct', label: 'Goal conv%', fullName: 'Goal conversion percentage' },
  { axis: 'aerial_pct', label: 'Aerial%', fullName: 'Aerial duels won percentage' },
  { axis: 'touches_box', label: 'Touches in box', fullName: 'Touches in penalty box' },
  { axis: 'xa', label: 'xA', fullName: 'Expected assists' },
  { axis: 'off_duels', label: 'Off duels won', fullName: 'Offensive duels won' },
] as const;

const WG_RADAR_AXES = [
  { axis: 'npg', label: 'NPG', fullName: 'Non-penalty goals' },
  { axis: 'npxg_xa', label: 'npxG + xA', fullName: 'Non-penalty expected goals plus expected assists' },
  { axis: 'assists', label: 'Assists', fullName: 'Assists' },
  { axis: 'key_passes', label: 'Key passes', fullName: 'Key passes' },
  { axis: 'crosses_cmp', label: 'Crosses cmp', fullName: 'Crosses completed' },
  { axis: 'prog_carries', label: 'Carrying', fullName: 'Progressive carries' },
  { axis: 'dribbles_cmp', label: 'Dribbles cmp', fullName: 'Dribbles completed' },
] as const;

const WG_TABLE_AXES = [
  { axis: 'prog_carries', label: 'Prog carries', fullName: 'Progressive carries' },
  { axis: 'dribbles_cmp', label: 'Dribbles cmp', fullName: 'Dribbles completed' },
  { axis: 'npg', label: 'NPG', fullName: 'Non-penalty goals' },
  { axis: 'npxg_xa', label: 'npxG + xA', fullName: 'npxG + xA' },
  { axis: 'assists', label: 'Assists', fullName: 'Assists' },
  { axis: 'key_passes', label: 'Key passes', fullName: 'Key passes' },
  { axis: 'crosses_cmp', label: 'Crosses cmp', fullName: 'Crosses completed' },
] as const;

export function compareTableAxes(position: ComparePosition, axes: CompareAxis[]): CompareAxis[] {
  const template =
    position === 'GK'
      ? GK_TABLE_AXES
      : position === 'CB'
        ? CB_RADAR_AXES
        : position === 'FB'
          ? FB_TABLE_AXES
          : position === 'MID'
            ? MID_TABLE_AXES
            : position === 'ST'
              ? ST_TABLE_AXES
              : position === 'WG'
                ? WG_TABLE_AXES
                : null;
  if (!template) return axes;
  const byKey = new Map(axes.map((axis) => [axis.axis, axis]));
  return template.map((item) => ({
    axis: item.axis,
    label: item.label,
    values: byKey.get(item.axis)?.values ?? [],
  }));
}

export function playerHasGkScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return GK_RADAR_AXES.every((item) => typeof stats[item.axis] === 'number');
}

export function playerHasCbScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return CB_RADAR_AXES.every((item) => typeof stats[item.axis] === 'number');
}

export function playerHasFbScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return FB_TABLE_AXES.every((item) => typeof stats[item.axis] === 'number');
}

export function playerHasMidScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return MID_TABLE_AXES.every((item) => typeof stats[item.axis] === 'number');
}

export function playerHasStScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return ST_TABLE_AXES.every((item) => typeof stats[item.axis] === 'number');
}

export function playerHasWgScoutStats(player: Player): boolean {
  const stats = player.season_stats?.stats;
  if (!stats) return false;
  return WG_TABLE_AXES.every((item) => typeof stats[item.axis] === 'number');
}

function scoutValue(player: Player, axis: string): number {
  const raw = player.season_stats?.stats?.[axis];
  return typeof raw === 'number' ? raw : 0;
}

function scoutAxesFor(position: ComparePosition) {
  if (position === 'GK') return GK_RADAR_AXES;
  if (position === 'CB') return CB_RADAR_AXES;
  if (position === 'FB') return FB_RADAR_AXES;
  if (position === 'MID') return MID_RADAR_AXES;
  if (position === 'ST') return ST_RADAR_AXES;
  if (position === 'WG') return WG_RADAR_AXES;
  return OUTFIELD_RADAR_AXES;
}

export function isScoutComparePosition(position: ComparePosition): boolean {
  return (
    position === 'GK' ||
    position === 'CB' ||
    position === 'FB' ||
    position === 'MID' ||
    position === 'ST' ||
    position === 'WG'
  );
}

export function scoutRadarAxesFromPlayers(
  position: ComparePosition,
  players: Player[],
): CompareAxis[] {
  return scoutAxesFor(position).map((item) => ({
    axis: item.axis,
    label: item.label,
    values: players.map((player) => scoutValue(player, item.axis)),
  }));
}

export function gkRadarAxesFromPlayers(players: Player[]): CompareAxis[] {
  return scoutRadarAxesFromPlayers('GK', players);
}

export function playerEligibleForCompare(
  player: Player | null,
  pos: ComparePosition,
): Player | null {
  if (!player || !playerMatchesComparePosition(player, pos)) return null;
  if (pos === 'GK' && !playerHasGkScoutStats(player)) return null;
  if (pos === 'CB' && !playerHasCbScoutStats(player)) return null;
  if (pos === 'FB' && !playerHasFbScoutStats(player)) return null;
  if (pos === 'MID' && !playerHasMidScoutStats(player)) return null;
  if (pos === 'ST' && !playerHasStScoutStats(player)) return null;
  if (pos === 'WG' && !playerHasWgScoutStats(player)) return null;
  return player;
}

export function compareStatLegend(
  position: ComparePosition,
): Array<{ axis: string; label: string; fullName: string }> {
  const template: ReadonlyArray<{ axis: string; label: string; fullName: string }> =
    position === 'GK' ? GK_TABLE_AXES : OUTFIELD_RADAR_AXES;
  const include = new Set(['long_pct', 'short_pct', 'psxg_ga', 'int_padj']);
  const order = ['long_pct', 'short_pct', 'psxg_ga', 'int_padj'];
  const byKey = new Map<string, { axis: string; label: string; fullName: string }>(
    template
      .filter((item) => include.has(item.axis))
      .map((item) => [item.axis, { axis: item.axis, label: item.label, fullName: item.fullName }]),
  );
  return order.flatMap((axis) => {
    const item = byKey.get(axis);
    return item ? [item] : [];
  });
}

export function emptyRadarAxes(position: ComparePosition | null): CompareAxis[] {
  if (!position || position === 'DEF' || position === 'ATT') {
    return Array.from({ length: 7 }, (_, index) => ({
      axis: `axis-${index}`,
      label: '',
      values: [],
    }));
  }
  const template = scoutAxesFor(position);
  return template.map((item) => ({
    axis: item.axis,
    label: item.label,
    values: [],
  }));
}

export function playerScoutSlot(player: Player): ComparePosition | null {
  if (playerHasGkScoutStats(player)) return 'GK';
  if (playerHasCbScoutStats(player)) return 'CB';
  if (playerHasFbScoutStats(player)) return 'FB';
  if (playerHasMidScoutStats(player)) return 'MID';
  if (playerHasWgScoutStats(player)) return 'WG';
  if (playerHasStScoutStats(player)) return 'ST';
  return null;
}

export function compareFilterFromPlayer(
  player: Player,
): { position: ComparePosition; expanded: ExpandedCompareFamily } | null {
  const slot = playerScoutSlot(player);
  if (!slot) return null;
  if (isDefSlot(slot)) return { position: slot, expanded: 'DEF' };
  if (isAttSlot(slot)) return { position: slot, expanded: 'ATT' };
  return { position: slot, expanded: null };
}

export function parseComparePosition(value: string | null | undefined): ComparePosition | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  if (key === 'FWD' || key === 'ATT') return 'ATT';
  if (key === 'GK' || key === 'DEF' || key === 'MID') return key;
  if (key === 'RB' || key === 'LB' || key === 'FB' || key === 'LWB' || key === 'RWB') return 'FB';
  if (key === 'CB') return 'CB';
  if (key === 'LW' || key === 'RW' || key === 'WG') return 'WG';
  if (key === 'ST' || key === 'CF') return 'ST';
  return null;
}

export function playerComparePosition(player: Player): ComparePosition | null {
  if (playerHasWgScoutStats(player) || playerHasStScoutStats(player)) return 'ATT';
  if (playerHasMidScoutStats(player)) return 'MID';
  if (playerHasCbScoutStats(player) || playerHasFbScoutStats(player)) return 'DEF';
  if (playerHasGkScoutStats(player)) return 'GK';
  const family = player.archetype?.position_family ?? player.position ?? null;
  if (family === 'FWD') return 'ATT';
  if (family === 'GK' || family === 'DEF' || family === 'MID') return family;
  return null;
}

export function playerMatchesComparePosition(player: Player, position: ComparePosition): boolean {
  if (position === 'CB') {
    if (playerHasCbScoutStats(player)) return true;
    return playerDefSlot(player) === 'CB';
  }
  if (position === 'FB') {
    if (playerHasFbScoutStats(player)) return true;
    return playerDefSlot(player) === 'FB';
  }
  if (position === 'MID') {
    if (playerHasMidScoutStats(player)) return true;
    return playerComparePosition(player) === 'MID';
  }
  if (position === 'ST') {
    if (playerHasStScoutStats(player)) return true;
    return playerAttSlot(player) === 'ST';
  }
  if (position === 'WG') {
    if (playerHasWgScoutStats(player)) return true;
    return playerAttSlot(player) === 'WG';
  }
  if (position === 'DEF' || isDefSlot(position)) {
    if (playerComparePosition(player) !== 'DEF') return false;
    if (position === 'DEF') return true;
    if (playerHasCbScoutStats(player) || playerHasFbScoutStats(player)) return false;
    return playerDefSlot(player) === position;
  }
  if (position === 'ATT' || isAttSlot(position)) {
    if (playerComparePosition(player) !== 'ATT') return false;
    if (position === 'ATT') return true;
    if (playerHasStScoutStats(player) || playerHasWgScoutStats(player)) return false;
    return playerAttSlot(player) === position;
  }
  return playerComparePosition(player) === position;
}

export function apiPositionFamily(position: ComparePosition): 'GK' | 'DEF' | 'MID' | 'FWD' {
  if (position === 'ATT' || isAttSlot(position)) return 'FWD';
  if (isDefSlot(position)) return 'DEF';
  return position;
}

export function apiPlayersQueryPosition(position: ComparePosition): string {
  if (position === 'CB' || position === 'FB' || position === 'ST' || position === 'WG') return position;
  return apiPositionFamily(position);
}

const FAMILY_POSITIONS = new Set(['GK', 'DEF', 'MID', 'FWD', 'ATT']);

export function playerSearchPosition(player: Player): string | null {
  const scout = player.scout_position?.trim();
  if (scout) return scout;
  const detailed = player.positions ?? [];
  const specific = detailed.find((item) => !FAMILY_POSITIONS.has(item));
  return specific ?? player.position ?? null;
}

export function resolveComparePosition(
  requested: string | null | undefined,
  players: Array<Player | null>,
): ComparePosition {
  const fromQuery = parseComparePosition(requested);
  if (fromQuery) return fromQuery;
  for (const item of players) {
    const fromPlayer = item ? playerComparePosition(item) : null;
    if (fromPlayer) return fromPlayer;
  }
  return 'MID';
}

export function comparePath(players: Array<Player | null>, position: ComparePosition): string {
  const params = new URLSearchParams();
  params.set('pos', position.toLowerCase());
  const keys = ['player', 'vs', 'and', 'with', 'also'] as const;
  players.slice(0, COMPARE_MAX_PLAYERS).forEach((player, index) => {
    if (player) params.set(keys[index] ?? `p${index + 1}`, player.slug || player.id);
  });
  return `/compare?${params.toString()}`;
}

export function addComparePlayer(players: Player[], next: Player): Player[] {
  if (players.some((item) => item.id === next.id)) return players;
  if (players.length >= COMPARE_MAX_PLAYERS) return players;
  return [...players, next];
}

export function removeComparePlayer(players: Player[], playerId: string): Player[] {
  return players.filter((item) => item.id !== playerId);
}
