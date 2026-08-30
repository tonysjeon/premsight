export function nationalityFlagUrl(code: string | null): string | null {
  if (!code) return null;
  const flagCode = { EN: 'gb-eng', NN: 'gb', S1: 'gb-sct', WA: 'gb-wls' }[code] ?? code;
  return /^[a-z]{2}(?:-[a-z]{3})?$/i.test(flagCode)
    ? `https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
    : null;
}

export function playerArtworkSrcs(player: {
  nationalityCode: string | null;
  teamCrestUrl: string | null;
}): string[] {
  const srcs: string[] = [];
  if (player.teamCrestUrl) srcs.push(player.teamCrestUrl);
  const flagUrl = nationalityFlagUrl(player.nationalityCode);
  if (flagUrl) srcs.push(flagUrl);
  return srcs;
}
