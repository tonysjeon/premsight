'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '@/lib/api';
import {
  foldSearchText,
  playerCompareName,
  playerMatchesComparePosition,
  playerSearchPosition,
  type ComparePosition,
} from '@/lib/compare-position';
import { tableTeamLabel, teamVisual } from '@/lib/teams';

function searchTeam(player: Player) {
  const name = player.team_name ?? player.display_name;
  const visual = teamVisual(undefined, player.team_id ?? '', name);
  const abbr = player.team_tla ?? visual.abbr;
  return {
    label: tableTeamLabel({ abbr, label: visual.label }),
    crestUrl: player.team_crest_url ?? visual.crestUrl,
  };
}

function SearchOption({
  highlighted,
  onChoose,
  onHighlight,
  player,
}: {
  highlighted: boolean;
  onChoose: () => void;
  onHighlight: () => void;
  player: Player;
}) {
  const team = searchTeam(player);
  const [crestReady, setCrestReady] = useState(!team.crestUrl);
  const positionLabel = playerSearchPosition(player);

  useLayoutEffect(() => {
    if (!team.crestUrl) return;
    const image = new Image();
    const markReady = () => setCrestReady(true);
    image.addEventListener('load', markReady);
    image.addEventListener('error', markReady);
    image.src = team.crestUrl;
    if (image.complete) markReady();
    return () => {
      image.removeEventListener('load', markReady);
      image.removeEventListener('error', markReady);
    };
  }, [team.crestUrl]);

  return (
    <button
      className={`compare-search-option${highlighted ? ' is-highlighted' : ''}${crestReady ? ' is-ready' : ''}`}
      onClick={onChoose}
      onMouseEnter={onHighlight}
      type="button"
    >
      <div className="compare-option-info">
        <span className="compare-option-name">{playerCompareName(player)}</span>
        <span className="compare-option-sub">
          {team.label}
          {positionLabel ? ` · ${positionLabel}` : ''}
          {player.squad_number ? ` · #${player.squad_number}` : ''}
        </span>
      </div>
      {team.crestUrl ? (
        // Native img so the crest is already decoded with the row, not after next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="compare-option-crest"
          decoding="sync"
          height={32}
          src={team.crestUrl}
          width={32}
        />
      ) : null}
    </button>
  );
}

type PlayerSearchProps = {
  pool: Player[];
  excludeIds?: string[];
  label: string;
  placeholder: string;
  autoFocus?: boolean;
  loading?: boolean;
  position?: ComparePosition | null;
  onSelect: (player: Player) => void;
  onDismiss?: () => void;
};

export function PlayerSearch({
  pool,
  excludeIds = [],
  label,
  placeholder,
  autoFocus = false,
  loading = false,
  position,
  onSelect,
  onDismiss,
}: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    const seen = new Set<string>();
    for (const player of pool) {
      const url = player.team_crest_url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const image = new Image();
      image.src = url;
    }
  }, [pool]);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        onDismiss?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss]);

  const matches = useMemo(() => {
    const q = foldSearchText(query.trim());
    if (!q) return [];

    const matched = new Map<string, Player>();
    for (const player of pool) {
      if (excluded.has(player.id)) continue;
      if (position && !playerMatchesComparePosition(player, position)) continue;
      const haystack = foldSearchText(
        [
          player.first_name,
          player.last_name,
          player.display_name,
          player.scout_name ?? '',
          playerCompareName(player),
          player.team_name ?? '',
          player.team_short_name ?? '',
          player.team_tla ?? '',
          player.position ?? '',
          player.scout_position ?? '',
        ].join(' '),
      );
      if (haystack.includes(q)) {
        matched.set(player.id, player);
      }
    }

    return Array.from(matched.values()).slice(0, 10);
  }, [excluded, pool, position, query]);

  const choose = (player: Player) => {
    setOpen(false);
    setQuery('');
    setHighlighted(-1);
    onSelect(player);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      onDismiss?.();
      return;
    }
    if (!open || matches.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev < matches.length - 1 ? prev + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev > 0 ? prev - 1 : matches.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const pick = highlighted >= 0 ? matches[highlighted] : matches[0];
      if (pick) choose(pick);
    }
  };

  return (
    <div className="compare-search-card compare-search-pill" ref={rootRef}>
      <div className="compare-search-input-wrap">
        <span aria-hidden="true" className="compare-search-icon">
          <svg viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.25" />
            <path d="m10.2 10.2 3 3" />
          </svg>
        </span>
        <input
          aria-label={label}
          autoFocus={autoFocus}
          className="compare-search-input"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className="compare-search-clear"
            onClick={() => {
              setQuery('');
              setOpen(false);
              setHighlighted(-1);
              inputRef.current?.focus();
            }}
            type="button"
          >
            <svg viewBox="0 0 12 12">
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
        ) : null}
      </div>

      {open && query.trim().length > 0 ? (
        <div className="compare-search-dropdown" role="listbox">
          {loading && matches.length === 0 ? (
            <div className="compare-search-loading">Searching players</div>
          ) : matches.length > 0 ? (
            matches.map((player, index) => (
              <SearchOption
                highlighted={highlighted === index}
                key={player.id}
                onChoose={() => choose(player)}
                onHighlight={() => setHighlighted(index)}
                player={player}
              />
            ))
          ) : (
            <div className="compare-search-empty">No players found matching “{query.trim()}”</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
