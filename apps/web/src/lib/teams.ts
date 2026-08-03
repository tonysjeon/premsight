import type { Team } from '@/lib/api';

/**
 * Club colours are presentation-only identity and are intentionally not stored in the
 * database. Names and abbreviations always come from the API; this module only decides
 * how a club is rendered.
 */
const CLUB_COLORS: Readonly<Record<string, string>> = {
  ARS: '#ef0107',
  AVL: '#670e36',
  BHA: '#0057b8',
  BOU: '#da291c',
  BRE: '#e30613',
  BUR: '#6c1d45',
  CHE: '#034694',
  CRY: '#1b458f',
  EVE: '#003399',
  FUL: '#f2f2f2',
  LEE: '#ffcd00',
  LIV: '#c8102e',
  MCI: '#6cabdd',
  MUN: '#da291c',
  NEW: '#2b2626',
  NOT: '#dd0000',
  SUN: '#eb172b',
  TOT: '#f2f2f2',
  WHU: '#7a263a',
  WOL: '#fdb913',
};

const NAME_NOISE = /^(afc|fc)$|^&$/i;

export type TeamDirectory = ReadonlyMap<string, Team>;

export function buildTeamDirectory(teams: readonly Team[]): TeamDirectory {
  return new Map(teams.map((team) => [team.id, team]));
}

/** Strips club-name boilerplate so rows stay readable at narrow widths. */
export function shortenName(name: string): string {
  const words = name.split(/\s+/).filter((word) => !/^(afc|fc)$/i.test(word));
  return words.join(' ') || name;
}

export function initialsFor(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((word) => !NAME_NOISE.test(word))
    .map((word) => word[0])
    .filter((letter): letter is string => Boolean(letter));
  return (letters.join('') || name.slice(0, 3)).slice(0, 3).toUpperCase();
}

export type TeamVisual = {
  label: string;
  abbr: string;
  color: string;
  textColor: string;
  crestUrl?: string | null;
};

export function teamVisual(
  directory: TeamDirectory | undefined,
  teamId: string,
  fallbackName: string,
): TeamVisual {
  const team = directory?.get(teamId);
  const name = team?.name ?? fallbackName;
  const abbr = team?.tla ?? initialsFor(name);
  const color = CLUB_COLORS[abbr] ?? fallbackColor(name);
  return {
    label: team?.short_name ?? shortenName(name),
    abbr,
    color,
    textColor: readableTextOn(color),
    crestUrl: team?.crest_url,
  };
}

/** Deterministic hue so unmapped clubs still get a stable badge. */
function fallbackColor(name: string): string {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return `hsl(${hash} 58% 42%)`;
}

export function readableTextOn(color: string): string {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (!hex) return '#ffffff';
  const value = Number.parseInt(hex[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.4 ? '#101823' : '#ffffff';
}
