'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { DraftPlayer, DraftPosition } from '@/lib/fpl';

type Formation = {
  name: string;
  counts: Readonly<Record<DraftPosition, number>>;
};

type SlotGroup = 'starter' | 'bench' | 'reserve';

type SquadSlot = {
  id: string;
  group: SlotGroup;
  position: DraftPosition | null;
  player: DraftPlayer | null;
};

const FORMATIONS: readonly Formation[] = [
  { name: '4-3-3', counts: { GK: 1, DEF: 4, MID: 3, FWD: 3 } },
  { name: '4-4-2', counts: { GK: 1, DEF: 4, MID: 4, FWD: 2 } },
  { name: '3-4-3', counts: { GK: 1, DEF: 3, MID: 4, FWD: 3 } },
  { name: '3-5-2', counts: { GK: 1, DEF: 3, MID: 5, FWD: 2 } },
  { name: '4-5-1', counts: { GK: 1, DEF: 4, MID: 5, FWD: 1 } },
  { name: '5-3-2', counts: { GK: 1, DEF: 5, MID: 3, FWD: 2 } },
  { name: '5-2-3', counts: { GK: 1, DEF: 5, MID: 2, FWD: 3 } },
  { name: '5-4-1', counts: { GK: 1, DEF: 5, MID: 4, FWD: 1 } },
];

const PITCH_LINES: readonly DraftPosition[] = ['FWD', 'MID', 'DEF', 'GK'];

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededSample<T>(items: readonly T[], count: number, seed: string): T[] {
  const result = [...items];
  let state = hashSeed(seed) || 1;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result.slice(0, count);
}

function makeSlots(formation: Formation): SquadSlot[] {
  const starters = PITCH_LINES.flatMap((position) =>
    Array.from({ length: formation.counts[position] }, (_, index) => ({
      id: `starter-${position.toLowerCase()}-${index + 1}`,
      group: 'starter' as const,
      position,
      player: null,
    })),
  );
  const bench = Array.from({ length: 7 }, (_, index) => ({
    id: `bench-${index + 1}`,
    group: 'bench' as const,
    position: null,
    player: null,
  }));
  const reserves = Array.from({ length: 5 }, (_, index) => ({
    id: `reserve-${index + 1}`,
    group: 'reserve' as const,
    position: null,
    player: null,
  }));
  return [...starters, ...bench, ...reserves];
}

function PlayerMark({ player }: { player: DraftPlayer }) {
  const initials = `${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`.toUpperCase();
  return <span className="draft-player-mark">{initials}</span>;
}

function TeamCrest({ player }: { player: DraftPlayer }) {
  return player.teamCrestUrl ? (
    <Image
      alt={`${player.teamName} crest`}
      className="draft-team-crest"
      height={18}
      src={player.teamCrestUrl}
      unoptimized
      width={18}
    />
  ) : null;
}

function PitchMarkings() {
  return (
    <svg className="draft-pitch-markings" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <pattern height="25" id="draft-pitch-stripes" patternUnits="userSpaceOnUse" width="100">
          <rect fill="#1b4934" height="12.5" width="100" />
          <rect fill="#183f2e" height="12.5" width="100" y="12.5" />
        </pattern>
      </defs>
      <polygon className="draft-pitch-surface" points="15,0 85,0 100,100 0,100" />
      <polygon
        className="draft-pitch-outline"
        points="15.6,0.7 84.4,0.7 98.8,99.3 1.2,99.3"
      />
      <path d="M8.4 50 H91.6" />
      <ellipse cx="50" cy="50" rx="9" ry="6" />
      <circle cx="50" cy="50" r="0.7" />

      <path d="M34 0.7 L32.536 19 H67.464 L66 0.7" />
      <path d="M42 0.7 L41.708 8 H58.292 L58 0.7" />
      <circle cx="50" cy="13" r="0.7" />
      <path d="M43.5 19 Q50 27 56.5 19" />

      <path d="M26 99.3 L27.704 78 H72.296 L74 99.3" />
      <path d="M39 99.3 L39.332 91 H60.668 L61 99.3" />
      <circle cx="50" cy="84" r="0.7" />
      <path d="M41.5 78 Q50 68 58.5 78" />

      <path d="M15.25 4.4 Q18.85 4 18.95 0.95" />
      <path d="M84.75 4.4 Q81.15 4 81.05 0.95" />
      <path d="M2.05 94.8 Q5.45 95 5.55 99.05" />
      <path d="M97.95 94.8 Q94.55 95 94.45 99.05" />
    </svg>
  );
}

function FormationDiagram({ formation, large = false }: { formation: Formation; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`draft-formation-diagram ${large ? 'draft-formation-diagram--large' : ''}`}
    >
      {large ? <PitchMarkings /> : null}
      {PITCH_LINES.map((position) => (
        <span
          className="draft-formation-line"
          data-count={formation.counts[position]}
          key={position}
        >
          {Array.from({ length: formation.counts[position] }, (_, index) => (
            <i key={`${position}-${index}`} />
          ))}
        </span>
      ))}
    </span>
  );
}

function EmptyPitch() {
  return <div aria-hidden="true" className="draft-pitch draft-pitch--preview" />;
}

function nationalityFlagUrl(code: string | null): string | null {
  if (!code) return null;
  const flagCode = { EN: 'gb-eng', NN: 'gb', S1: 'gb-sct', WA: 'gb-wls' }[code] ?? code;
  return /^[a-z]{2}(?:-[a-z]{3})?$/i.test(flagCode)
    ? `https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
    : null;
}

function PlayerChoice({
  hideMark = false,
  player,
  onChoose,
}: {
  hideMark?: boolean;
  player: DraftPlayer;
  onChoose: (player: DraftPlayer) => void;
}) {
  return (
    <button
      className={`draft-choice ${hideMark ? 'draft-choice--captain' : ''}`}
      onClick={() => onChoose(player)}
      type="button"
    >
      {hideMark ? (
        <span className="draft-captain-card-meta">
          <small>{player.position}</small>
          {nationalityFlagUrl(player.nationalityCode) ? (
            <Image
              alt={`${player.nationalityCode} flag`}
              className="draft-country-flag"
              height={18}
              src={nationalityFlagUrl(player.nationalityCode) ?? ''}
              unoptimized
              width={28}
            />
          ) : (
            <span aria-label="Unknown nationality" className="draft-country-flag" role="img" />
          )}
          <TeamCrest player={player} />
        </span>
      ) : (
        <PlayerMark player={player} />
      )}
      {hideMark && player.photoUrl ? (
        <Image
          alt={`${player.displayName} headshot`}
          className="draft-captain-headshot"
          height={250}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
          src={player.photoUrl}
          unoptimized
          width={250}
        />
      ) : null}
      <strong>{player.displayName}</strong>
      {hideMark ? null : (
        <>
          <span>
            <TeamCrest player={player} />
            {player.teamName}
          </span>
          <small>{player.position}</small>
        </>
      )}
    </button>
  );
}

function StarterPitch({
  captainId,
  onSlot,
  slots,
  swapSourceId,
}: {
  captainId: string | null;
  onSlot: (slot: SquadSlot) => void;
  slots: readonly SquadSlot[];
  swapSourceId: string | null;
}) {
  return (
    <div className="draft-pitch draft-pitch--formation">
      <PitchMarkings />
      {PITCH_LINES.map((line) => {
        const lineSlots = slots.filter(
          (slot) => slot.group === 'starter' && slot.position === line,
        );
        return (
          <div
            className={`draft-line draft-line--${line.toLowerCase()}`}
            data-count={lineSlots.length}
            key={line}
          >
            {lineSlots.map((slot) => (
              <button
                className={`draft-slot ${slot.player ? 'draft-slot--filled' : ''} ${swapSourceId === slot.id ? 'draft-slot--swap' : ''}`}
                key={slot.id}
                onClick={() => onSlot(slot)}
                type="button"
              >
                {slot.player ? (
                  <>
                    <PlayerMark player={slot.player} />
                    {captainId === slot.player.id ? <b className="draft-captain">C</b> : null}
                    <strong>{slot.player.displayName}</strong>
                    <span className="draft-slot-team">
                      <TeamCrest player={slot.player} />
                      {slot.player.teamName}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="draft-slot-plus">+</span>
                    <strong>{slot.position}</strong>
                  </>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function canOccupy(slot: SquadSlot, player: DraftPlayer): boolean {
  return slot.group !== 'starter' || slot.position === player.position;
}

export function DraftSimulator({
  players,
  draftSeed,
}: {
  players: readonly DraftPlayer[];
  draftSeed: string;
}) {
  const formationOptions = useMemo(
    () => seededSample(FORMATIONS, 5, `${draftSeed}:formations`),
    [draftSeed],
  );
  const captainOptions = useMemo(
    () =>
      seededSample(
        players.filter((player) => player.globalRank <= 25),
        5,
        `${draftSeed}:captains`,
      ),
    [draftSeed, players],
  );
  const [previewFormation, setPreviewFormation] = useState<Formation>(formationOptions[0]);
  const [stage, setStage] = useState<'formation' | 'captain' | 'squad'>('formation');
  const [formation, setFormation] = useState<Formation | null>(null);
  const [slots, setSlots] = useState<SquadSlot[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [swapMessage, setSwapMessage] = useState('');

  const selectedIds = useMemo(
    () => new Set(slots.flatMap((slot) => (slot.player ? [slot.player.id] : []))),
    [slots],
  );
  const activeSlot = slots.find((slot) => slot.id === activeSlotId) ?? null;
  const offers = useMemo(() => {
    if (!activeSlot || activeSlot.player) return [];
    const candidates = players.filter(
      (player) =>
        !selectedIds.has(player.id) &&
        (activeSlot.group !== 'starter' || player.position === activeSlot.position),
    );
    return seededSample(
      candidates,
      5,
      `${draftSeed}:${activeSlot.id}:${[...selectedIds].sort().join(',')}`,
    );
  }, [activeSlot, draftSeed, players, selectedIds]);

  const chooseFormation = (selected: Formation) => {
    setFormation(selected);
    setSlots(makeSlots(selected));
    setStage('captain');
  };

  const chooseCaptain = (player: DraftPlayer) => {
    setSlots((current) => {
      const slotIndex = current.findIndex(
        (slot) => slot.group === 'starter' && slot.position === player.position,
      );
      return current.map((slot, index) => (index === slotIndex ? { ...slot, player } : slot));
    });
    setCaptainId(player.id);
    setSwapMessage('');
    setStage('squad');
  };

  const choosePlayer = (player: DraftPlayer) => {
    if (!activeSlotId) return;
    setSlots((current) =>
      current.map((slot) => (slot.id === activeSlotId ? { ...slot, player } : slot)),
    );
    setActiveSlotId(null);
  };

  const handleSlot = (slot: SquadSlot) => {
    setSwapMessage('');
    if (!slot.player) {
      setSwapSourceId(null);
      setActiveSlotId(slot.id);
      return;
    }
    setActiveSlotId(null);
    if (!swapSourceId) {
      setSwapSourceId(slot.id);
      return;
    }
    if (swapSourceId === slot.id) {
      setSwapSourceId(null);
      return;
    }
    const source = slots.find((item) => item.id === swapSourceId);
    if (!source?.player || !canOccupy(slot, source.player) || !canOccupy(source, slot.player)) {
      setSwapMessage('Those players cannot swap because their positions are incompatible.');
      setSwapSourceId(null);
      return;
    }
    setSlots((current) =>
      current.map((item) => {
        if (item.id === source.id) return { ...item, player: slot.player };
        if (item.id === slot.id) return { ...item, player: source.player };
        return item;
      }),
    );
    setSwapSourceId(null);
  };

  if (stage === 'formation') {
    return (
      <div className="draft-formation-stage">
        <section className="draft-board">
          <EmptyPitch />
        </section>
        <div className="draft-formation-overlay">
          <section aria-labelledby="formation-heading" className="card draft-formation-modal">
            <div className="draft-formation-list-panel">
              <h1 id="formation-heading">Choose your formation</h1>
              <div className="draft-formation-grid">
                {formationOptions.map((option) => (
                  <button
                    aria-pressed={previewFormation.name === option.name}
                    key={option.name}
                    onClick={() => setPreviewFormation(option)}
                    type="button"
                  >
                    <FormationDiagram formation={option} />
                    <strong>{option.name}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="draft-formation-preview-panel">
              <div>
                <h2>Formation: {previewFormation.name}</h2>
                <p>Once selected, your formation is locked for this draft.</p>
              </div>
              <FormationDiagram formation={previewFormation} large />
              <button onClick={() => chooseFormation(previewFormation)} type="button">
                Select Formation
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (stage === 'captain') {
    return (
      <div className="draft-captain-stage">
        <section className="draft-board">
          <StarterPitch
            captainId={null}
            onSlot={() => setSwapMessage('Choose your captain before filling the formation.')}
            slots={slots}
            swapSourceId={null}
          />
        </section>
        <div className="draft-captain-overlay">
          <section className="card draft-step draft-captain-step">
            <h1>Choose your captain</h1>
            <div className="draft-choice-grid draft-choice-grid--captains">
              {captainOptions.map((player) => (
                <PlayerChoice
                  hideMark
                  key={player.id}
                  onChoose={chooseCaptain}
                  player={player}
                />
              ))}
            </div>
          </section>
        </div>
        {swapMessage ? <p className="draft-captain-message">{swapMessage}</p> : null}
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  return (
    <div className="draft-squad-layout">
      <section className="draft-board">
        <header className="draft-board-head">
          <div>
            <p className="eyebrow">Step 3 of 3 · {formation?.name}</p>
            <h1>Build your squad</h1>
          </div>
          <div className="draft-progress">
            <strong>{selectedCount}/23</strong>
          </div>
        </header>
        <StarterPitch
          captainId={captainId}
          onSlot={handleSlot}
          slots={slots}
          swapSourceId={swapSourceId}
        />
      </section>

      <aside className="draft-squad-side">
        {(['bench', 'reserve'] as const).map((group) => (
          <section className="card draft-squad-group" key={group}>
            <h2>{group === 'bench' ? 'Substitutes' : 'Reserves'}</h2>
            <div className="draft-squad-slots">
              {slots
                .filter((slot) => slot.group === group)
                .map((slot, index) => (
                  <button
                    className={`draft-squad-slot ${slot.player ? 'draft-squad-slot--filled' : ''} ${swapSourceId === slot.id ? 'draft-slot--swap' : ''}`}
                    key={slot.id}
                    onClick={() => handleSlot(slot)}
                    type="button"
                  >
                    {slot.player ? (
                      <>
                        <PlayerMark player={slot.player} />
                        <span>
                          <strong>{slot.player.displayName}</strong>
                          <small>
                            <TeamCrest player={slot.player} />
                            {slot.player.teamName}
                          </small>
                        </span>
                        <b>{slot.player.position}</b>
                      </>
                    ) : (
                      <>
                        <span className="draft-slot-plus">+</span>
                        <strong>
                          {group === 'bench' ? `SUB ${index + 1}` : `RES ${index + 1}`}
                        </strong>
                      </>
                    )}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </aside>

      {activeSlot ? (
        <section aria-label="Player choices" className="card draft-offers">
          <header>
            <div>
              <p className="eyebrow">Choose one</p>
              <h2>
                {activeSlot.group === 'starter'
                  ? activeSlot.position
                  : activeSlot.group === 'bench'
                    ? 'Substitute'
                    : 'Reserve'}
              </h2>
            </div>
            <button onClick={() => setActiveSlotId(null)} type="button">
              Close
            </button>
          </header>
          <div className="draft-choice-grid">
            {offers.map((player) => (
              <PlayerChoice key={player.id} onChoose={choosePlayer} player={player} />
            ))}
          </div>
        </section>
      ) : null}
      {swapMessage ? <p className="draft-swap-message">{swapMessage}</p> : null}
    </div>
  );
}
