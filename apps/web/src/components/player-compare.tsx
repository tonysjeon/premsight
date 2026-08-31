'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompareStatTable } from '@/components/compare-stat-table';
import { PlayerRadar } from '@/components/player-radar';
import { PlayerSearch } from '@/components/player-search';
import { api, type Player } from '@/lib/api';
import {
  ATT_SLOTS,
  ATT_SLOT_LABELS,
  COMPARE_COLORS,
  COMPARE_MAX_PLAYERS,
  COMPARE_POSITIONS,
  DEF_SLOTS,
  DEF_SLOT_LABELS,
  addComparePlayer,
  attFamilyExpanded,
  compareFilterFromPlayer,
  compareTableAxes,
  defFamilyExpanded,
  emptyRadarAxes,
  nextCompareFilterState,
  playerCompareName,
  playerMatchesComparePosition,
  removeComparePlayer,
  scoutRadarAxesFromPlayers,
  type ComparePosition,
  type ExpandedCompareFamily,
} from '@/lib/compare-position';

export function PlayerCompare({ initialCatalog = [] }: { initialCatalog?: Player[] }) {
  const router = useRouter();
  const filtersRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<ComparePosition | null>(null);
  const [expandedFamily, setExpandedFamily] = useState<ExpandedCompareFamily>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [catalog, setCatalog] = useState<Player[]>(initialCatalog);
  const [catalogLoading, setCatalogLoading] = useState(initialCatalog.length === 0);

  useEffect(() => {
    if (window.location.search) {
      router.replace('/compare');
    }
  }, [router]);

  useEffect(() => {
    if (initialCatalog.length > 0) return;
    let active = true;
    api
      .players('has_stats=true')
      .then((items) => {
        if (active) setCatalog(items);
      })
      .catch(() => {
        if (active) setCatalog([]);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialCatalog.length]);

  useEffect(() => {
    const open = filtersRef.current?.querySelector<HTMLElement>('.compare-expand-group.is-open');
    open?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [expandedFamily]);

  const removePlayer = useCallback(
    (playerId: string) => {
      const next = removeComparePlayer(players, playerId);
      setPlayers(next);
      if (next.length === 0) {
        setExpandedFamily(null);
        setPosition(null);
      }
    },
    [players],
  );

  const setComparePosition = useCallback(
    (next: ComparePosition) => {
      const resolved = nextCompareFilterState(expandedFamily, next, position);
      if (resolved.expanded === expandedFamily && resolved.position === position) return;
      setExpandedFamily(resolved.expanded);
      setPosition(resolved.position);
      setPlayers([]);
    },
    [expandedFamily, position],
  );

  const addPlayer = useCallback(
    (picked: Player) => {
      if (!position) {
        const filter = compareFilterFromPlayer(picked);
        if (filter) {
          setExpandedFamily(filter.expanded);
          setPosition(filter.position);
        }
      }
      setPlayers((current) => addComparePlayer(current, picked));
    },
    [position],
  );

  const radarAxes =
    position && players.length > 0
      ? scoutRadarAxesFromPlayers(position, players)
      : emptyRadarAxes(position);

  const tableAxes = position ? compareTableAxes(position, radarAxes) : radarAxes;
  const canAdd = players.length < COMPARE_MAX_PLAYERS;
  const searchPool = position
    ? catalog.filter((item) => playerMatchesComparePosition(item, position))
    : catalog;

  return (
    <>
      <nav aria-label="Filter compare by position" className="chips view-filters" ref={filtersRef}>
        {COMPARE_POSITIONS.map((item) => {
          if (item === 'DEF') {
            const open = expandedFamily === 'DEF';
            const familyActive = position !== null && defFamilyExpanded(position);
            return (
              <div className={`compare-expand-group${open ? ' is-open' : ''}`} key="def-group">
                <button
                  aria-current={familyActive ? 'true' : undefined}
                  aria-expanded={open}
                  className="chip compare-expand-parent"
                  onClick={() => setComparePosition('DEF')}
                  type="button"
                >
                  DEF
                </button>
                <div className="compare-expand-slots-clip">
                  <div
                    aria-hidden={!open}
                    aria-label="Defender positions"
                    className="compare-expand-slots"
                    inert={!open}
                    role="group"
                  >
                    {DEF_SLOTS.map((slot) => (
                      <button
                        aria-current={slot === position ? 'true' : undefined}
                        className={`chip${slot === 'FB' ? ' compare-expand-slot-wide' : ''}`}
                        key={slot}
                        onClick={() => setComparePosition(slot)}
                        tabIndex={open ? 0 : -1}
                        type="button"
                      >
                        {DEF_SLOT_LABELS[slot]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          if (item === 'ATT') {
            const open = expandedFamily === 'ATT';
            const familyActive = position !== null && attFamilyExpanded(position);
            return (
              <div className={`compare-expand-group${open ? ' is-open' : ''}`} key="att-group">
                <button
                  aria-current={familyActive ? 'true' : undefined}
                  aria-expanded={open}
                  className="chip compare-expand-parent"
                  onClick={() => setComparePosition('ATT')}
                  type="button"
                >
                  ATT
                </button>
                <div className="compare-expand-slots-clip">
                  <div
                    aria-hidden={!open}
                    aria-label="Attacker positions"
                    className="compare-expand-slots"
                    inert={!open}
                    role="group"
                  >
                    {ATT_SLOTS.map((slot) => (
                      <button
                        aria-current={slot === position ? 'true' : undefined}
                        className={`chip${slot === 'WG' ? ' compare-expand-slot-wide' : ''}`}
                        key={slot}
                        onClick={() => setComparePosition(slot)}
                        tabIndex={open ? 0 : -1}
                        type="button"
                      >
                        {ATT_SLOT_LABELS[slot]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              aria-current={item === position ? 'true' : undefined}
              className="chip"
              key={item}
              onClick={() => setComparePosition(item)}
              type="button"
            >
              {item}
            </button>
          );
        })}
      </nav>

      {canAdd ? (
        <div className="compare-add">
          <div className="compare-pill">
            <PlayerSearch
              excludeIds={players.map((player) => player.id)}
              label="Search players"
              loading={catalogLoading}
              onSelect={addPlayer}
              placeholder="Add player"
              pool={searchPool}
              position={position}
            />
          </div>
        </div>
      ) : null}

      <CompareStatTable
        axes={tableAxes}
        colors={[...COMPARE_COLORS]}
        onRemove={removePlayer}
        players={players}
      />

      <section aria-labelledby="comparison-radar-heading" className="compare-radar-panel">
        <h2 className="sr-only" id="comparison-radar-heading">
          Style radar
        </h2>
        <PlayerRadar
          axes={radarAxes}
          series={players.map((player, index) => ({
            name: playerCompareName(player),
            color: COMPARE_COLORS[index] ?? COMPARE_COLORS[0],
            percents: radarAxes.map((axis) => axis.values[index] ?? 0),
          }))}
        />
      </section>
    </>
  );
}
