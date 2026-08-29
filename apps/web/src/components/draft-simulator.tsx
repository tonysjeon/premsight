'use client';

import Image from 'next/image';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { scoreDraft } from '@/lib/draft-score';
import type { DetailedDraftPosition, DraftPlayer, DraftPosition } from '@/lib/fpl';

type Formation = {
  name: string;
  counts: Readonly<Record<DraftPosition, number>>;
  roles: Readonly<Record<DraftPosition, readonly DetailedDraftPosition[]>>;
};

type SlotGroup = 'starter' | 'bench' | 'reserve';

type SquadSlot = {
  id: string;
  group: SlotGroup;
  position: DraftPosition | null;
  detailedPosition: DetailedDraftPosition | null;
  player: DraftPlayer | null;
};

const POINTER_DRAG_THRESHOLD = 10;

function slotIdFromPoint(x: number, y: number, ignoreId: string): string | null {
  const hit = document.elementsFromPoint(x, y);
  for (const node of hit) {
    const slot = node instanceof Element ? node.closest('[data-slot-id]') : null;
    const id = slot?.getAttribute('data-slot-id');
    if (id && id !== ignoreId) return id;
  }
  return null;
}

const FORMATIONS: readonly Formation[] = [
  {
    name: '4-3-3',
    counts: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    roles: {
      GK: ['GK'],
      DEF: ['LB', 'CB', 'CB', 'RB'],
      MID: ['CM', 'CDM', 'CM'],
      FWD: ['LW', 'ST', 'RW'],
    },
  },
  {
    name: '4-4-2',
    counts: { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    roles: {
      GK: ['GK'],
      DEF: ['LB', 'CB', 'CB', 'RB'],
      MID: ['LM', 'CM', 'CM', 'RM'],
      FWD: ['ST', 'ST'],
    },
  },
  {
    name: '3-4-3',
    counts: { GK: 1, DEF: 3, MID: 4, FWD: 3 },
    roles: {
      GK: ['GK'],
      DEF: ['CB', 'CB', 'CB'],
      MID: ['LM', 'CM', 'CM', 'RM'],
      FWD: ['LW', 'ST', 'RW'],
    },
  },
  {
    name: '3-5-2',
    counts: { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    roles: {
      GK: ['GK'],
      DEF: ['CB', 'CB', 'CB'],
      MID: ['LM', 'CM', 'CAM', 'CM', 'RM'],
      FWD: ['ST', 'ST'],
    },
  },
  {
    name: '4-5-1',
    counts: { GK: 1, DEF: 4, MID: 5, FWD: 1 },
    roles: {
      GK: ['GK'],
      DEF: ['LB', 'CB', 'CB', 'RB'],
      MID: ['LM', 'CM', 'CAM', 'CM', 'RM'],
      FWD: ['ST'],
    },
  },
  {
    name: '5-3-2',
    counts: { GK: 1, DEF: 5, MID: 3, FWD: 2 },
    roles: {
      GK: ['GK'],
      DEF: ['LWB', 'CB', 'CB', 'CB', 'RWB'],
      MID: ['CM', 'CDM', 'CM'],
      FWD: ['ST', 'ST'],
    },
  },
  {
    name: '5-2-3',
    counts: { GK: 1, DEF: 5, MID: 2, FWD: 3 },
    roles: {
      GK: ['GK'],
      DEF: ['LWB', 'CB', 'CB', 'CB', 'RWB'],
      MID: ['CM', 'CM'],
      FWD: ['LW', 'ST', 'RW'],
    },
  },
  {
    name: '5-4-1',
    counts: { GK: 1, DEF: 5, MID: 4, FWD: 1 },
    roles: {
      GK: ['GK'],
      DEF: ['LWB', 'CB', 'CB', 'CB', 'RWB'],
      MID: ['LM', 'CM', 'CM', 'RM'],
      FWD: ['ST'],
    },
  },
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
    formation.roles[position].map((detailedPosition, index) => ({
      id: `starter-${position.toLowerCase()}-${index + 1}`,
      group: 'starter' as const,
      position,
      detailedPosition,
      player: null,
    })),
  );
  const bench = Array.from({ length: 7 }, (_, index) => ({
    id: `bench-${index + 1}`,
    group: 'bench' as const,
    position: null,
    detailedPosition: null,
    player: null,
  }));
  const reserves = Array.from({ length: 5 }, (_, index) => ({
    id: `reserve-${index + 1}`,
    group: 'reserve' as const,
    position: null,
    detailedPosition: null,
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
      draggable={false}
      height={18}
      src={player.teamCrestUrl}
      unoptimized
      width={18}
    />
  ) : null;
}

function PremSightCardMark() {
  return (
    <span aria-hidden="true" className="draft-card-brand">
      PREM<span>SIGHT</span>
    </span>
  );
}

function ratingCardClass(rating: number): string {
  if (rating >= 75) return 'draft-card--gold';
  return 'draft-card--silver';
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
      <polygon className="draft-pitch-outline" points="15.6,0.7 84.4,0.7 98.8,99.3 1.2,99.3" />
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
  return (
    <div aria-hidden="true" className="draft-pitch draft-pitch--formation draft-pitch--preview">
      <PitchMarkings />
    </div>
  );
}

function nationalityFlagUrl(code: string | null): string | null {
  if (!code) return null;
  const flagCode = { EN: 'gb-eng', NN: 'gb', S1: 'gb-sct', WA: 'gb-wls' }[code] ?? code;
  return /^[a-z]{2}(?:-[a-z]{3})?$/i.test(flagCode)
    ? `https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
    : null;
}

function PlayerCardArtwork({
  compact = false,
  player,
  position,
}: {
  compact?: boolean;
  player: DraftPlayer;
  position?: DetailedDraftPosition;
}) {
  const flagUrl = nationalityFlagUrl(player.nationalityCode);
  const hasSquareFlag = player.nationalityCode?.toUpperCase() === 'CH';
  const displayPosition = position ?? playerPositions(player)[0];
  return (
    <>
      <span className={`draft-captain-card-meta ${compact ? 'draft-slot-card-meta' : ''}`}>
        <b className="draft-player-rating">{player.eaRating}</b>
        <small data-position={displayPosition}>{displayPosition}</small>
        <TeamCrest player={player} />
        {flagUrl ? (
          <Image
            alt={`${player.nationalityCode} flag`}
            className={`draft-country-flag ${hasSquareFlag ? 'draft-country-flag--square' : ''}`}
            draggable={false}
            height={18}
            src={flagUrl}
            unoptimized
            width={28}
          />
        ) : (
          <span aria-label="Unknown nationality" className="draft-country-flag" role="img" />
        )}
      </span>
    </>
  );
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
      className={`draft-choice ${hideMark ? 'draft-choice--captain' : ''} ${ratingCardClass(player.eaRating)}`}
      onClick={() => onChoose(player)}
      type="button"
    >
      {hideMark ? <PlayerCardArtwork player={player} /> : <PlayerMark player={player} />}
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
  dragSourceId,
  dragTargetId,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onPointerDown,
  onSlot,
  slots,
  swapSourceId,
}: {
  captainId: string | null;
  dragSourceId: string | null;
  dragTargetId: string | null;
  onDragEnd: () => void;
  onDragOver: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onDragStart: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onDrop: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, slot: SquadSlot) => void;
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
                className={`draft-slot ${slot.player ? `draft-slot--filled ${ratingCardClass(slot.player.eaRating)}` : ''} ${swapSourceId === slot.id ? 'draft-slot--swap' : ''} ${dragSourceId === slot.id ? 'draft-slot--dragging' : ''} ${dragTargetId === slot.id ? 'draft-slot--drop-target' : ''}`}
                data-slot-id={slot.id}
                draggable={Boolean(slot.player)}
                key={slot.id}
                onDragEnd={onDragEnd}
                onDragOver={(event) => onDragOver(event, slot)}
                onDragStart={(event) => onDragStart(event, slot)}
                onDrop={(event) => onDrop(event, slot)}
                onPointerDown={(event) => onPointerDown(event, slot)}
                onClick={() => onSlot(slot)}
                type="button"
              >
                {slot.player ? (
                  <>
                    <PlayerCardArtwork
                      compact
                      player={slot.player}
                      position={slot.detailedPosition ?? slot.player.position}
                    />
                    {captainId === slot.player.id ? <b className="draft-captain">C</b> : null}
                    <strong>{slot.player.displayName}</strong>
                  </>
                ) : (
                  <>
                    <span className="draft-slot-plus">+</span>
                    <PremSightCardMark />
                    <strong>{slot.detailedPosition}</strong>
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

function SquadBench({
  benchFilled,
  dragSourceId,
  dragTargetId,
  inert,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onPointerDown,
  onSlot,
  reserveFilled,
  slots,
  swapSourceId,
}: {
  benchFilled: number;
  dragSourceId: string | null;
  dragTargetId: string | null;
  inert?: boolean;
  onDragEnd: () => void;
  onDragOver: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onDragStart: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onDrop: (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, slot: SquadSlot) => void;
  onSlot: (slot: SquadSlot) => void;
  reserveFilled: number;
  slots: readonly SquadSlot[];
  swapSourceId: string | null;
}) {
  return (
    <aside className="draft-squad-side" inert={inert ? true : undefined}>
      {(['bench', 'reserve'] as const).map((group) => (
        <section
          aria-label={group === 'bench' ? 'Substitutes' : 'Reserves'}
          className="draft-squad-group"
          key={group}
        >
          <div className="draft-squad-slots" data-group={group}>
            {slots
              .filter((slot) => slot.group === group)
              .map((slot) => (
                <button
                  className={`draft-squad-slot ${slot.player ? `draft-squad-slot--filled ${ratingCardClass(slot.player.eaRating)}` : ''} ${swapSourceId === slot.id ? 'draft-slot--swap' : ''} ${dragSourceId === slot.id ? 'draft-slot--dragging' : ''} ${dragTargetId === slot.id ? 'draft-slot--drop-target' : ''}`}
                  data-slot-id={slot.id}
                  draggable={Boolean(slot.player)}
                  key={slot.id}
                  onDragEnd={onDragEnd}
                  onDragOver={(event) => onDragOver(event, slot)}
                  onDragStart={(event) => onDragStart(event, slot)}
                  onDrop={(event) => onDrop(event, slot)}
                  onPointerDown={(event) => onPointerDown(event, slot)}
                  onClick={() => onSlot(slot)}
                  type="button"
                >
                  {slot.player ? (
                    <>
                      <PlayerCardArtwork compact player={slot.player} />
                      <strong>{slot.player.displayName}</strong>
                    </>
                  ) : (
                    <>
                      <PremSightCardMark />
                      <strong>{group === 'bench' ? 'SUB' : 'RES'}</strong>
                    </>
                  )}
                </button>
              ))}
          </div>
        </section>
      ))}
      <p
        aria-label={`${benchFilled} of 7 substitutes, ${reserveFilled} of 5 reserves`}
        className="draft-squad-fill"
      >
        {benchFilled} / 7 SUB | {reserveFilled} / 5 RES
      </p>
    </aside>
  );
}

function playerPositions(player: DraftPlayer): readonly DetailedDraftPosition[] {
  return Array.isArray(player.positions) && player.positions.length > 0
    ? player.positions
    : [player.position];
}

const INTERCHANGEABLE_DRAFT_POSITIONS: readonly (readonly DetailedDraftPosition[])[] = [
  ['LB', 'LWB'],
  ['LM', 'LW'],
  ['RB', 'RWB'],
  ['RM', 'RW'],
];

function canDraftInto(slot: SquadSlot, player: DraftPlayer): boolean {
  if (slot.group !== 'starter') return true;
  if (!slot.detailedPosition) return false;
  const primaryPosition = playerPositions(player)[0];
  if (primaryPosition === slot.detailedPosition || primaryPosition === slot.position) return true;
  return INTERCHANGEABLE_DRAFT_POSITIONS.some(
    (positions) =>
      positions.includes(primaryPosition) && positions.includes(slot.detailedPosition!),
  );
}

function canOccupy(slot: SquadSlot, player: DraftPlayer): boolean {
  if (slot.group !== 'starter') return true;
  const positions = playerPositions(player);
  return Boolean(
    slot.detailedPosition &&
    (positions.includes(slot.detailedPosition) ||
      (slot.position !== null && positions.includes(slot.position))),
  );
}

function canSwap(source: SquadSlot, target: SquadSlot): boolean {
  if (!source.player || !target.player || source.id === target.id) return false;
  if (!canOccupy(target, source.player) || !canOccupy(source, target.player)) return false;
  return true;
}

export function DraftSimulator({
  players,
  draftSeed,
}: {
  players: readonly DraftPlayer[];
  draftSeed: string;
}) {
  const [draftRound, setDraftRound] = useState(0);
  const sessionSeed = `${draftSeed}:${draftRound}`;
  const formationOptions = useMemo(
    () => seededSample(FORMATIONS, 5, `${sessionSeed}:formations`),
    [sessionSeed],
  );
  const [previewFormation, setPreviewFormation] = useState<Formation>(formationOptions[0]);
  const [stage, setStage] = useState<'formation' | 'captain' | 'squad'>('formation');
  const [slots, setSlots] = useState<SquadSlot[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [offerDraw, setOfferDraw] = useState(0);
  const [isViewingSquad, setIsViewingSquad] = useState(false);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [swapMessage, setSwapMessage] = useState('');
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [pointerGhost, setPointerGhost] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const pointerDragRef = useRef<{
    active: boolean;
    pointerId: number;
    sourceId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    if (!dragSourceId) return;

    const edgeSize = 72;
    const scrollStep = 18;
    const handleEdgeScroll = (event: DragEvent) => {
      const horizontalScroller = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) => element.closest<HTMLElement>('.draft-squad-slots'))
        .find((element): element is HTMLElement => element !== null);

      if (horizontalScroller) {
        const bounds = horizontalScroller.getBoundingClientRect();
        if (event.clientX < bounds.left + edgeSize) horizontalScroller.scrollLeft -= scrollStep;
        if (event.clientX > bounds.right - edgeSize) horizontalScroller.scrollLeft += scrollStep;
      }

      if (event.clientY < edgeSize) window.scrollBy(0, -scrollStep);
      if (event.clientY > window.innerHeight - edgeSize) window.scrollBy(0, scrollStep);
    };

    window.addEventListener('dragover', handleEdgeScroll);
    return () => window.removeEventListener('dragover', handleEdgeScroll);
  }, [dragSourceId]);

  const captainOptions = useMemo(
    () =>
      seededSample(
        players.filter((player) => player.globalRank <= 15),
        5,
        `${sessionSeed}:captains`,
      ),
    [players, sessionSeed],
  );

  const selectedIds = useMemo(
    () => new Set(slots.flatMap((slot) => (slot.player ? [slot.player.id] : []))),
    [slots],
  );
  const draftScore = useMemo(() => {
    if (slots.length === 0 || slots.some((slot) => !slot.player)) return null;
    return scoreDraft({
      starters: slots.flatMap((slot) =>
        slot.group === 'starter' && slot.player ? [slot.player.eaRating] : [],
      ),
      bench: slots.flatMap((slot) =>
        slot.group === 'bench' && slot.player ? [slot.player.eaRating] : [],
      ),
      reserves: slots.flatMap((slot) =>
        slot.group === 'reserve' && slot.player ? [slot.player.eaRating] : [],
      ),
    });
  }, [slots]);
  const benchFilled = slots.filter((slot) => slot.group === 'bench' && slot.player).length;
  const reserveFilled = slots.filter((slot) => slot.group === 'reserve' && slot.player).length;
  const activeSlot = slots.find((slot) => slot.id === activeSlotId) ?? null;
  const offers = useMemo(() => {
    if (!activeSlot || activeSlot.player) return [];
    const candidates = players.filter(
      (player) => !selectedIds.has(player.id) && canDraftInto(activeSlot, player),
    );
    return seededSample(
      candidates,
      5,
      `${sessionSeed}:${activeSlot.id}:${offerDraw}:${[...selectedIds].sort().join(',')}`,
    );
  }, [activeSlot, offerDraw, players, selectedIds, sessionSeed]);

  const chooseFormation = (selected: Formation) => {
    setSlots(makeSlots(selected));
    setStage('captain');
  };

  const chooseCaptain = (player: DraftPlayer) => {
    setSlots((current) => {
      let slotIndex = current.findIndex(
        (slot) => slot.group === 'starter' && canOccupy(slot, player),
      );
      if (slotIndex === -1) {
        slotIndex = current.findIndex((slot) => slot.group === 'bench');
      }
      return current.map((slot, index) => (index === slotIndex ? { ...slot, player } : slot));
    });
    setCaptainId(player.id);
    setSwapMessage('');
    setStage('squad');
  };

  const choosePlayer = (player: DraftPlayer) => {
    if (!activeSlotId) return;
    const completesDraft = slots.every((slot) => slot.id === activeSlotId || slot.player !== null);
    setSlots((current) =>
      current.map((slot) => (slot.id === activeSlotId ? { ...slot, player } : slot)),
    );
    setActiveSlotId(null);
    if (completesDraft) setIsResultOpen(true);
  };

  const swapOccupiedSlots = (sourceId: string, targetSlot: SquadSlot) => {
    const source = slotsRef.current.find((item) => item.id === sourceId);
    if (!source || !canSwap(source, targetSlot)) {
      setSwapMessage('Those players cannot swap because their positions are incompatible.');
      return false;
    }
    setSlots((current) =>
      current.map((item) => {
        if (item.id === source.id) return { ...item, player: targetSlot.player };
        if (item.id === targetSlot.id) return { ...item, player: source.player };
        return item;
      }),
    );
    setSwapMessage('');
    return true;
  };

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => {
    if (!slot.player || activeSlot || pointerDragRef.current) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', slot.id);
    event.dataTransfer.setDragImage(
      event.currentTarget,
      event.currentTarget.offsetWidth / 2,
      event.currentTarget.offsetHeight / 2,
    );
    setSwapSourceId(null);
    setDragSourceId(slot.id);
    setDragTargetId(null);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => {
    const source = slots.find((item) => item.id === dragSourceId);
    if (!source || !canSwap(source, slot)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragTargetId(slot.id);
  };

  const finishDrag = () => {
    setDragSourceId(null);
    setDragTargetId(null);
  };

  const handleDrop = (event: ReactDragEvent<HTMLButtonElement>, slot: SquadSlot) => {
    event.preventDefault();
    const sourceId = dragSourceId ?? event.dataTransfer.getData('text/plain');
    if (sourceId) swapOccupiedSlots(sourceId, slot);
    finishDrag();
  };

  const clearPointerDrag = () => {
    pointerDragRef.current = null;
    setPointerGhost(null);
    finishDrag();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, slot: SquadSlot) => {
    if (event.pointerType === 'mouse') return;
    if (!slot.player || activeSlotId) return;

    event.currentTarget.draggable = false;
    const pointerId = event.pointerId;
    const sourceId = slot.id;
    const startX = event.clientX;
    const startY = event.clientY;
    pointerDragRef.current = {
      active: false,
      pointerId,
      sourceId,
      startX,
      startY,
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const drag = pointerDragRef.current;
      if (!drag) return;
      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!drag.active) {
        if (distance < POINTER_DRAG_THRESHOLD) return;
        drag.active = true;
        suppressClickRef.current = true;
        setDragSourceId(sourceId);
        moveEvent.preventDefault();
      }
      const source = slotsRef.current.find((item) => item.id === sourceId);
      setPointerGhost({
        name: source?.player?.displayName ?? '',
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });
      const targetId = slotIdFromPoint(moveEvent.clientX, moveEvent.clientY, sourceId);
      const target = slotsRef.current.find((item) => item.id === targetId) ?? null;
      setDragTargetId(source && target && canSwap(source, target) ? target.id : null);

      const horizontalScroller = document
        .elementsFromPoint(moveEvent.clientX, moveEvent.clientY)
        .map((element) => element.closest<HTMLElement>('.draft-squad-slots'))
        .find((element): element is HTMLElement => element !== null);
      if (horizontalScroller) {
        const bounds = horizontalScroller.getBoundingClientRect();
        const edgeSize = 72;
        if (moveEvent.clientX < bounds.left + edgeSize) horizontalScroller.scrollLeft -= 18;
        if (moveEvent.clientX > bounds.right - edgeSize) horizontalScroller.scrollLeft += 18;
      }
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const drag = pointerDragRef.current;
      if (drag?.active) {
        const targetId = slotIdFromPoint(upEvent.clientX, upEvent.clientY, sourceId);
        const target = slotsRef.current.find((item) => item.id === targetId);
        if (target) swapOccupiedSlots(sourceId, target);
      }
      clearPointerDrag();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleSlot = (slot: SquadSlot) => {
    setSwapMessage('');
    if (!slot.player) {
      if (swapSourceId) {
        setSwapMessage('Choose another occupied card to swap players.');
        return;
      }
      setSwapSourceId(null);
      setOfferDraw((current) => current + 1);
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
    swapOccupiedSlots(swapSourceId, slot);
    setSwapSourceId(null);
  };

  const handleSlotClick = (slot: SquadSlot) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    handleSlot(slot);
  };

  const startNewDraft = () => {
    const nextRound = draftRound + 1;
    const nextFormations = seededSample(FORMATIONS, 5, `${draftSeed}:${nextRound}:formations`);
    setDraftRound(nextRound);
    setPreviewFormation(nextFormations[0]);
    setStage('formation');
    setSlots([]);
    setCaptainId(null);
    setActiveSlotId(null);
    setOfferDraw(0);
    setIsViewingSquad(false);
    setSwapSourceId(null);
    setSwapMessage('');
    setDragSourceId(null);
    setDragTargetId(null);
    setIsResultOpen(false);
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
              <h1 id="formation-heading">CHOOSE A FORMATION</h1>
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
      <div className="draft-squad-layout draft-captain-stage">
        <section className="draft-board" inert>
          <StarterPitch
            captainId={null}
            dragSourceId={null}
            dragTargetId={null}
            onDragEnd={finishDrag}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onPointerDown={handlePointerDown}
            onSlot={() => setSwapMessage('Choose your captain before filling the formation.')}
            slots={slots}
            swapSourceId={null}
          />
          {swapMessage ? <p className="draft-captain-message">{swapMessage}</p> : null}
        </section>
        <SquadBench
          benchFilled={benchFilled}
          dragSourceId={null}
          dragTargetId={null}
          inert
          onDragEnd={finishDrag}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onPointerDown={handlePointerDown}
          onSlot={() => setSwapMessage('Choose your captain before filling the formation.')}
          reserveFilled={reserveFilled}
          slots={slots}
          swapSourceId={null}
        />
        <div className="draft-captain-overlay">
          <section className="card draft-step draft-captain-step">
            <h1>Choose your captain</h1>
            <div className="draft-choice-grid draft-choice-grid--captains">
              {captainOptions.map((player) => (
                <PlayerChoice hideMark key={player.id} onChoose={chooseCaptain} player={player} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="draft-squad-layout">
      <section className="draft-board" inert={activeSlot || isResultOpen ? true : undefined}>
        <StarterPitch
          captainId={captainId}
          dragSourceId={dragSourceId}
          dragTargetId={dragTargetId}
          onDragEnd={finishDrag}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onPointerDown={handlePointerDown}
          onSlot={handleSlotClick}
          slots={slots}
          swapSourceId={swapSourceId}
        />
        {draftScore && !isResultOpen ? (
          <button
            aria-label={`Open result: ${draftScore.outcome}, ${draftScore.projectedPoints} points`}
            className="draft-result-summary"
            onClick={() => setIsResultOpen(true)}
            type="button"
          >
            <span className="draft-result-summary-heading">
              <small>Projected finish</small>
              <strong>{draftScore.outcome}</strong>
            </span>
            <span className="draft-result-summary-points">
              <b>{draftScore.projectedPoints}</b>
              <small>PTS</small>
            </span>
          </button>
        ) : null}
      </section>

      <SquadBench
        benchFilled={benchFilled}
        dragSourceId={dragSourceId}
        dragTargetId={dragTargetId}
        inert={Boolean(activeSlot || isResultOpen)}
        onDragEnd={finishDrag}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onPointerDown={handlePointerDown}
        onSlot={handleSlotClick}
        reserveFilled={reserveFilled}
        slots={slots}
        swapSourceId={swapSourceId}
      />

      {activeSlot ? (
        <div
          className={`draft-captain-overlay draft-offer-overlay ${isViewingSquad ? 'draft-offer-overlay--viewing' : ''}`}
        >
          <section
            aria-label="Player choices"
            aria-modal="true"
            className="card draft-step draft-captain-step draft-offers"
            role="dialog"
          >
            <header>
              <h1>Choose a player</h1>
              <button
                aria-label="View squad (click and hold)"
                className="draft-view-squad"
                onBlur={() => setIsViewingSquad(false)}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') setIsViewingSquad(true);
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') setIsViewingSquad(false);
                }}
                onLostPointerCapture={() => setIsViewingSquad(false)}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setIsViewingSquad(true);
                }}
                onPointerUp={() => setIsViewingSquad(false)}
                type="button"
              >
                View squad<span className="draft-view-squad-hint"> (click &amp; hold)</span>
              </button>
            </header>
            <div className="draft-choice-grid draft-choice-grid--captains">
              {offers.map((player) => (
                <PlayerChoice hideMark key={player.id} onChoose={choosePlayer} player={player} />
              ))}
            </div>
          </section>
        </div>
      ) : null}
      {draftScore && isResultOpen ? (
        <div
          className="draft-result-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsResultOpen(false);
          }}
        >
          <section
            aria-labelledby="draft-result-title"
            aria-modal="true"
            className="draft-result"
            role="dialog"
          >
            <button
              aria-label="Close projected finish"
              className="draft-result-close"
              onClick={() => setIsResultOpen(false)}
              type="button"
            >
              ×
            </button>
            <div className="draft-result-heading">
              <span>Projected finish</span>
              <strong id="draft-result-title">{draftScore.outcome}</strong>
            </div>
            <div className="draft-result-points">
              <b>{draftScore.projectedPoints}</b>
              <span>league points</span>
            </div>
            <button className="draft-result-restart" onClick={startNewDraft} type="button">
              Start New Draft
            </button>
          </section>
        </div>
      ) : null}
      {pointerGhost ? (
        <div className="draft-drag-ghost" style={{ left: pointerGhost.x, top: pointerGhost.y }}>
          {pointerGhost.name}
        </div>
      ) : null}
      {swapMessage ? <p className="draft-swap-message">{swapMessage}</p> : null}
    </div>
  );
}
